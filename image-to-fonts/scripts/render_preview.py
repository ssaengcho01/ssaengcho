#!/usr/bin/env python3
"""폰트 QC 렌더. 사용: python3 render_preview.py font.otf out.png [샘플문구]"""
import sys
from PIL import Image, ImageDraw, ImageFont
fp, out = sys.argv[1], sys.argv[2]
sample = sys.argv[3] if len(sys.argv) > 3 else 'Hello Type!'
img = Image.new('RGB', (1600, 760), 'white')
d = ImageDraw.Draw(img)
big = ImageFont.truetype(fp, 100)
mid = ImageFont.truetype(fp, 64)
d.text((30, 20), sample, font=big, fill='black')
d.text((30, 190), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[:18], font=mid, fill='black')
d.text((30, 300), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[18:], font=mid, fill='black')
d.text((30, 410), 'abcdefghijklmnopqrstuvwxyz'[:18], font=mid, fill='black')
d.text((30, 520), 'abcdefghijklmnopqrstuvwxyz'[18:] + ' 0123456789', font=mid, fill='black')
img.save(out)
print(out)
