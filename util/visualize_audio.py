#!/usr/bin/env python3

from PIL import Image, ImageDraw
import binascii
import argparse
import codecs
import math
import sys
import os

WIDTH = 40
CHUNK_SIZE = WIDTH * 100  # Read 100 lines at a time for better performance

# Parse path to DLC file
parser = argparse.ArgumentParser()
parser.add_argument("dlcfile", help="Path to DLC file")
args = parser.parse_args()
print("Opening " + args.dlcfile)

# Create new image, height depends on DLC file size
dlcsize = os.path.getsize(args.dlcfile)
im = Image.new("RGB", (WIDTH, math.ceil(dlcsize / WIDTH)), "white")

y = 0
with open(args.dlcfile, "rb") as dlc:
	# Read in larger chunks for better I/O performance
	while True:
		chunk = dlc.read(CHUNK_SIZE)
		if not chunk:
			break
		
		# Process chunk line by line
		for line_offset in range(0, len(chunk), WIDTH):
			data = chunk[line_offset:line_offset + WIDTH]
			if len(data) < WIDTH:
				break  # Skip incomplete last line
			
			for x in range(WIDTH):
				val = data[x]
				color = (val, val, val)
				im.putpixel((x, y), color)
			y += 1

# write to stdout
im.save("audio.bmp")
