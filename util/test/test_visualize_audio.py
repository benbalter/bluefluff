#!/usr/bin/env python3
"""Tests for visualize_audio.py buffered I/O improvements"""

import unittest
import os
import tempfile
import sys
import subprocess
from PIL import Image

# Add parent directory to path to import the module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestVisualizeAudioBuffering(unittest.TestCase):
	"""Test buffered I/O in visualize_audio.py"""
	
	def setUp(self):
		"""Create a temporary test DLC file"""
		self.test_file = tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.dlc')
		# Create test data: 200 lines of 40 bytes each
		test_data = bytes(range(256)) * 32  # 8192 bytes total
		self.test_file.write(test_data[:8000])  # 200 complete lines
		self.test_file.close()
		
	def tearDown(self):
		"""Clean up test files"""
		if os.path.exists(self.test_file.name):
			os.unlink(self.test_file.name)
		if os.path.exists("audio.bmp"):
			os.unlink("audio.bmp")
	
	def test_chunked_reading_constants(self):
		"""Test that visualize_audio has proper constants defined"""
		script_path = os.path.join(os.path.dirname(__file__), '..', 'visualize_audio.py')
		with open(script_path, 'r') as f:
			content = f.read()
			self.assertIn('LINES_PER_CHUNK', content)
			self.assertIn('CHUNK_SIZE', content)
			self.assertIn('WIDTH * LINES_PER_CHUNK', content)
		
	def test_file_processing(self):
		"""Test that the file is processed correctly with buffering"""
		# Run the visualization script
		result = subprocess.run(
			[sys.executable, 
			 os.path.join(os.path.dirname(__file__), '..', 'visualize_audio.py'),
			 self.test_file.name],
			capture_output=True,
			text=True
		)
		
		# Should complete successfully
		self.assertEqual(result.returncode, 0)
		
		# Output image should be created
		self.assertTrue(os.path.exists("audio.bmp"))
		
		# Verify image dimensions
		with Image.open("audio.bmp") as img:
			self.assertEqual(img.width, 40)
			self.assertEqual(img.height, 200)  # 8000 bytes / 40 bytes per line


class TestBufferingPerformance(unittest.TestCase):
	"""Test that buffered reading is more efficient"""
	
	def test_chunk_size_optimization(self):
		"""Verify chunk size is appropriate for performance"""
		script_path = os.path.join(os.path.dirname(__file__), '..', 'visualize_audio.py')
		
		# Read and parse the constants from the file
		with open(script_path, 'r') as f:
			content = f.read()
			
		# Extract WIDTH value
		import re
		width_match = re.search(r'WIDTH\s*=\s*(\d+)', content)
		self.assertIsNotNone(width_match)
		width = int(width_match.group(1))
		self.assertEqual(width, 40)
		
		# Extract LINES_PER_CHUNK value
		lines_match = re.search(r'LINES_PER_CHUNK\s*=\s*(\d+)', content)
		self.assertIsNotNone(lines_match)
		lines_per_chunk = int(lines_match.group(1))
		self.assertEqual(lines_per_chunk, 100)
		
		# Calculate chunk size
		chunk_size = width * lines_per_chunk
		
		# Chunk size should be reasonable (at least 1KB for efficiency)
		self.assertGreaterEqual(chunk_size, 1000)
		
		# Chunk size should be multiple of line width
		self.assertEqual(chunk_size % width, 0)


if __name__ == '__main__':
	unittest.main()
