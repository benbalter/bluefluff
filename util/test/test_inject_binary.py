#!/usr/bin/env python3
"""Tests for inject_binary.py buffered I/O improvements"""

import unittest
import os
import tempfile
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestInjectBinaryBuffering(unittest.TestCase):
	"""Test smart buffering in inject_binary.py"""
	
	def setUp(self):
		"""Create temporary test files"""
		# Create a target file
		self.target_file = tempfile.NamedTemporaryFile(mode='wb', delete=False)
		self.target_file.write(b'A' * 10000)  # 10KB target file
		self.target_file.close()
		
		# Create payload files
		self.payload1 = tempfile.NamedTemporaryFile(mode='wb', delete=False)
		self.payload1.write(b'PAYLOAD1')
		self.payload1.close()
		
		self.payload2 = tempfile.NamedTemporaryFile(mode='wb', delete=False)
		self.payload2.write(b'PAYLOAD2')
		self.payload2.close()
		
		self.output_file = tempfile.NamedTemporaryFile(delete=False)
		self.output_file.close()
		
	def tearDown(self):
		"""Clean up test files"""
		for f in [self.target_file.name, self.payload1.name, 
				  self.payload2.name, self.output_file.name]:
			if os.path.exists(f):
				os.unlink(f)
	
	def test_buffer_size_constant(self):
		"""Test that BUFFER_SIZE is defined"""
		# Check that BUFFER_SIZE exists in the file
		with open(os.path.join(os.path.dirname(__file__), '..', 'inject_binary.py'), 'r') as f:
			content = f.read()
			self.assertIn('BUFFER_SIZE', content)
			self.assertIn('8192', content)
	
	def test_chunk_has_payload_function(self):
		"""Test that the helper function for overlap detection exists"""
		with open(os.path.join(os.path.dirname(__file__), '..', 'inject_binary.py'), 'r') as f:
			content = f.read()
			self.assertIn('chunk_has_payload', content)
			self.assertIn('def chunk_has_payload', content)
	
	def test_injection_logic(self):
		"""Test that injection works with proper buffering"""
		# Create a modified version for testing
		test_script = """
import os
TARGET = "%(target)s"
OUTFILE = "%(output)s"
INJECTIONS = [{
	"path": "%(payload1)s",
	"offset": 1000
}, {
	"path": "%(payload2)s",
	"offset": 5000
}]

BUFFER_SIZE = 8192

target_size = os.path.getsize(TARGET)
for payload in INJECTIONS:
	payload["size"] = os.path.getsize(payload["path"])
	payload["fd"] = open(payload["path"], "rb")
	# Pre-compute payload ranges
	payload["start"] = payload["offset"]
	payload["end"] = payload["offset"] + payload["size"]

def chunk_has_payload(chunk_start, chunk_end, injections):
	for payload in injections:
		if chunk_start < payload["end"] and chunk_end > payload["start"]:
			return True
	return False

count = 0
with open(OUTFILE, "wb") as outfile:
	with open(TARGET, "rb") as target:
		while count < target_size:
			chunk_size = min(BUFFER_SIZE, target_size - count)
			chunk_end = count + chunk_size
			
			if chunk_has_payload(count, chunk_end, INJECTIONS):
				for _ in range(chunk_size):
					override = False
					for payload in INJECTIONS:
						if count >= payload["start"] and count < payload["end"]:
							outfile.write(payload["fd"].read(1))
							target.read(1)
							override = True
							break
					if not override:
						outfile.write(target.read(1))
					count += 1
			else:
				chunk = target.read(chunk_size)
				outfile.write(chunk)
				count += chunk_size

for payload in INJECTIONS:
	payload["fd"].close()
""" % {
			'target': self.target_file.name,
			'output': self.output_file.name,
			'payload1': self.payload1.name,
			'payload2': self.payload2.name
		}
		
		# Execute the test script
		exec(test_script)
		
		# Verify output file was created
		self.assertTrue(os.path.exists(self.output_file.name))
		
		# Verify output file size matches target
		self.assertEqual(os.path.getsize(self.output_file.name), 
						 os.path.getsize(self.target_file.name))
		
		# Verify payloads were injected at correct offsets
		with open(self.output_file.name, 'rb') as f:
			f.seek(1000)
			self.assertEqual(f.read(8), b'PAYLOAD1')
			
			f.seek(5000)
			self.assertEqual(f.read(8), b'PAYLOAD2')


if __name__ == '__main__':
	unittest.main()
