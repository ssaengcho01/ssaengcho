#!/usr/bin/env python3
"""assets/preview_template.html을 채워 최종 미리보기 HTML을 생성한다.
사용: python3 make_preview.py <font.otf> <폰트이름> <out.html> [샘플문구1] [샘플문구2] [샘플문구3]
"""
import sys, os, base64, re, html, io, zipfile
from fontTools.ttLib import TTFont

font_path, font_name, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
samples = sys.argv[4:5]
if not samples:
    samples = ["The quick brown fox jumps over the lazy dog"]

tpl_path = os.path.join(os.path.dirname(__file__), "..", "assets", "preview_template.html")
tpl = open(tpl_path, encoding="utf-8").read()

b64 = base64.b64encode(open(font_path, "rb").read()).decode()

f = TTFont(font_path)
cmap = f.getBestCmap()
have = set(chr(cp) for cp in cmap.keys())
upper = "".join(c for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ" if c in have)
lower = "".join(c for c in "abcdefghijklmnopqrstuvwxyz" if c in have)
digits = "".join(c for c in "0123456789" if c in have)
SYMBOLS = "!@#$%^&*()-+_=~[]{}'\"\u2018\u2019\u201c\u201d;:.,<>/?|\\`"
symbols = "".join(c for c in SYMBOLS if c in have)
char_count = len(upper) + len(lower) + len(digits) + len(symbols)
rows = [r for r in [upper, lower, digits, html.escape(symbols)] if r]

# 아티팩트 뷰어용 zip(안에 .otf 하나)
zbuf = io.BytesIO()
with zipfile.ZipFile(zbuf, "w", zipfile.ZIP_DEFLATED) as z:
    z.write(font_path, arcname=font_name + ".otf")
zip_b64 = base64.b64encode(zbuf.getvalue()).decode()

# 요청 샘플 문구에 폰트가 지원 못 하는 글자가 있으면 경고 노트
all_sample_chars = set("".join(samples))
missing = sorted(c for c in all_sample_chars if c.isalnum() and c not in have and not c.isspace())
missing_note = ""
if missing:
    missing_note = (f'<p class="note" style="color:#C0392B;margin-top:8px">'
                     f'⚠ 이 폰트에 없는 글자(샘플 문구에서 시스템 기본체로 대체 표시됨): {" ".join(missing)}</p>')

safe_name = re.sub(r'[^A-Za-z0-9]', '', font_name) or "CustomFont"

out = (tpl
    .replace("{{FONT_NAME}}", font_name)
    .replace("{{FONT_NAME_SAFE}}", safe_name)
    .replace("{{FONT_B64}}", b64)
    .replace("{{CHAR_COUNT}}", str(char_count))
    .replace("{{CHARSET_ROWS}}", "<br>".join(rows))
    .replace("{{ZIP_B64}}", zip_b64)
    .replace("{{FONT_FILE_NAME}}", font_name)
    .replace("{{MISSING_NOTE}}", missing_note)
    .replace("{{SAMPLE_1}}", html.escape(samples[0]))
)
open(out_path, "w", encoding="utf-8").write(out)
print(f"미리보기 생성 완료 → {out_path} ({char_count}자, {len(out)//1024}KB)")
