#!/usr/bin/env python3
"""조각들을 번호 붙은 한 장으로 합성 (Claude가 눈으로 라벨링할 때 사용).
사용: python3 contact_sheet.py <workdir> <out.png>"""
import sys, json, math
from PIL import Image, ImageDraw
workdir, out = sys.argv[1], sys.argv[2]
meta = json.load(open(f'{workdir}/comps.json'))
cell = 96
cols = min(12, max(4, math.ceil(math.sqrt(len(meta)))))
rows = math.ceil(len(meta)/cols)
sheet = Image.new('RGB', (cols*cell, rows*cell), 'white')
d = ImageDraw.Draw(sheet)
for c in meta:
    i = c['i']
    gx, gy = (i % cols)*cell, (i // cols)*cell
    d.rectangle([gx, gy, gx+cell-1, gy+cell-1], outline=(220,220,220))
    d.text((gx+4, gy+2), str(i), fill=(200,0,0))
    crop = Image.open(f'{workdir}/crops/{i}.pgm')
    k = min((cell-26)/crop.width, (cell-26)/crop.height)
    crop = crop.resize((max(1,int(crop.width*k)), max(1,int(crop.height*k))))
    sheet.paste(crop, (gx+(cell-crop.width)//2, gy+18+(cell-18-crop.height)//2))
sheet.save(out)
print(f'{out} ({len(meta)} cells, {cols}x{rows})')
