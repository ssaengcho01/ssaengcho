"""영상 1초 간격 캡처 시트. 사용: python sheet.py 영상.mp4 [출력.jpg] [간격초=1]"""
import sys, os, subprocess, tempfile, glob
from PIL import Image, ImageDraw, ImageFont
src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(src)[0] + "_캡처시트.jpg"
step = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
tmp = tempfile.mkdtemp()
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", f"fps=1/{step},scale=480:-1", f"{tmp}/f_%04d.jpg"], check=True)
fs = sorted(glob.glob(tmp + "/f_*.jpg"))
w, h = Image.open(fs[0]).size; cols = 6; pad = 6; rows = (len(fs) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (w + pad) + pad, rows * (h + pad) + pad), (20, 20, 20))
try: font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 24)
except OSError: font = ImageFont.load_default()
for i, p in enumerate(fs):
    im = Image.open(p); d = ImageDraw.Draw(im); lab = f"{i*step:g}초"
    d.rectangle([0, 0, 24 + 14 * len(lab), 34], fill=(0, 0, 0)); d.text((8, 2), lab, font=font, fill=(255, 220, 0))
    sheet.paste(im, (pad + (i % cols) * (w + pad), pad + (i // cols) * (h + pad)))
sheet.save(out, quality=88); print(out)
