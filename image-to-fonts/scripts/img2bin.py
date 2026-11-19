#!/usr/bin/env python3
"""이미지 → RGBA raw 바이너리. 사용: python3 img2bin.py in.png out.bin  (stdout: W H)"""
import sys
from PIL import Image
img = Image.open(sys.argv[1]).convert('RGBA')
W, H = img.size
if max(W, H) > 3400:
    k = 3400 / max(W, H)
    img = img.resize((int(W*k), int(H*k)), Image.LANCZOS)
    W, H = img.size
open(sys.argv[2], 'wb').write(img.tobytes())
print(W, H)
