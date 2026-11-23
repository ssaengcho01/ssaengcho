"""예능 자막 영상 만들기.
사용: python make.py 프로젝트.json
1) 컷 편집본(자막 없음) -> 2) 자막 프레임 -> 3) 합성 -> 최종본 + 모바일본
같은 폴더의 '자막_멘트.txt'가 있으면 멘트를 거기서 읽고, 없으면 새로 만들어 준다.
"""
import sys as _s; _s.stdout.reconfigure(encoding="utf-8")
import json, math, os, re, subprocess, sys, tempfile, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter

P = sys.argv[1]
BASE = os.path.dirname(os.path.abspath(P))
cfg = json.load(open(P, encoding="utf-8"))
W, H, FPS = cfg.get("width", 1280), cfg.get("height", 720), cfg.get("fps", 24)


def ab(p):
    return p if os.path.isabs(p) else os.path.join(BASE, p)


OUT = ab(cfg["output"])
MENT = ab(cfg.get("ment_file", "자막_멘트.txt"))
UF = os.path.expandvars(r"%LOCALAPPDATA%/Microsoft/Windows/Fonts/")


def font_path(names):
    for n in names:
        for d in (UF, "C:/Windows/Fonts/"):
            if os.path.exists(d + n):
                return d + n
    return "C:/Windows/Fonts/malgunbd.ttf"


FONT = {
    "pop": font_path(["Jalnan2.otf", "JalnanGothic.otf", "BlackHanSans-Regular.ttf"]),
    "caption": font_path(["Cafe24Ssurround.ttf", "GmarketSansTTFBold.ttf", "malgunbd.ttf"]),
    "handwrite": font_path(["KyoboHandwriting2021sjy.ttf", "malgun.ttf"]),
}
STYLE_KO = {"pop": "효과음 자막", "caption": "하단 자막", "handwrite": "손글씨 자막"}
subs = cfg.get("subtitles", [])

# ---------- 멘트 파일 ----------
HEAD = (
    "# 자막 멘트만 고치는 파일이에요. 각 줄에서 [ ] 뒤 글자만 바꾸고 저장하세요.\n"
    "# 번호와 [ ] 안은 그대로 두세요. 멘트를 비우면 그 자막은 빠져요.\n"
    "# {중괄호} 안 글자는 노란색 강조, 손글씨 자막의 / 는 줄바꿈이에요.\n\n"
)
if os.path.exists(MENT):
    found = {}
    for line in open(MENT, encoding="utf-8"):
        m = re.match(r"^\s*(\d+)\s*\[[^\]]*\]\s*(.*?)\s*$", line)
        if m:
            found[int(m.group(1))] = m.group(2)
    subs = [dict(s, text=found[s["id"]]) for s in subs if found.get(s["id"])]
else:
    with open(MENT, "w", encoding="utf-8") as f:
        f.write(HEAD)
        for s in subs:
            f.write(f'{s["id"]:02d} [{s["start"]:.1f}초 · {STYLE_KO[s["style"]]}] {s["text"]}\n')

# ---------- 1) 컷 편집 ----------
tmp = tempfile.mkdtemp()
base = os.path.join(tmp, "base.mp4")
srcs = [ab(s) for s in cfg["sources"]]
cuts = cfg["cuts"]
has_audio = cfg.get("audio", "original") == "original"
F, L, total = "", "", 0.0
for n, c in enumerate(cuts):
    s, e = c["start"], c["end"]
    d = e - s
    total += d
    F += f"[{c['src']}:v]trim={s}:{e},setpts=PTS-STARTPTS,fps={FPS},scale={W}:{H},format=yuv420p[v{n}];"
    if has_audio:
        F += (f"[{c['src']}:a]atrim={s}:{e},asetpts=PTS-STARTPTS,aresample=48000,"
              f"aformat=channel_layouts=stereo,afade=t=in:d=0.02,afade=t=out:st={max(0, d - 0.03):.4f}:d=0.03[a{n}];")
        L += f"[v{n}][a{n}]"
    else:
        L += f"[v{n}]"
dur = cfg.get("duration", round(total, 3))
if has_audio:
    F += f"{L}concat=n={len(cuts)}:v=1:a=1[v][ac];[ac]loudnorm=I=-16:TP=-1.5,afade=t=out:st={dur - 0.05}:d=0.05[a]"
    maps = ["-map", "[v]", "-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
else:
    F += f"{L}concat=n={len(cuts)}:v=1:a=0[v]"
    maps = ["-map", "[v]"]
cmd = ["ffmpeg", "-v", "error", "-y"]
for s in srcs:
    cmd += ["-i", s]
cmd += ["-filter_complex", F] + maps + ["-t", str(dur), "-c:v", "libx264", "-preset", "slow", "-crf", "15", base]
print("1/3 컷 편집 중...", flush=True)
subprocess.run(cmd, check=True)

# ---------- 2) 자막 프레임 ----------
DARK = (58, 34, 20, 255); CREAM = (255, 246, 224, 255); ORANGE = (255, 138, 61, 255)
YEL = (255, 206, 60, 255); PURP = (52, 24, 84, 255); WHITE = (255, 255, 255, 255)


def pop_ease(p):
    if p <= 0:
        return 0
    if p >= 1:
        return 1
    c = 1.9
    p -= 1
    return 1 + (c + 1) * p ** 3 + c * p ** 2


_cache = {}


def char_sprite(ch, size, fill):
    k = (ch, size, fill)
    if k in _cache:
        return _cache[k]
    f = ImageFont.truetype(FONT["pop"], size)
    sw, ex = max(4, size // 16), max(4, size // 18)
    bb = f.getbbox(ch, stroke_width=sw)
    im = Image.new("RGBA", (bb[2] - bb[0] + ex + 4, bb[3] - bb[1] + ex + 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ox, oy = -bb[0] + 2, -bb[1] + 2
    side = YEL if fill == CREAM else (255, 190, 120, 255)
    for k2 in range(ex, 0, -1):
        d.text((ox + k2, oy + k2), ch, font=f, fill=side, stroke_width=sw, stroke_fill=DARK)
    d.text((ox, oy), ch, font=f, fill=fill, stroke_width=sw, stroke_fill=DARK)
    _cache[k] = (im, ex)
    return _cache[k]


def paste(cv, sp, cx, cy, s, a=1.0, rot=0):
    if s <= 0.01 or a <= 0:
        return
    sp = sp.resize((max(1, int(sp.width * s)), max(1, int(sp.height * s))), Image.LANCZOS)
    if rot:
        sp = sp.rotate(rot, resample=Image.BICUBIC, expand=True)
    if a < 1:
        sp.putalpha(sp.split()[3].point(lambda v: int(v * a)))
    cv.alpha_composite(sp, (int(cx - sp.width / 2), int(cy - sp.height / 2)))


def parts(text):
    out = []
    for seg in re.split(r"(\{[^}]*\})", text):
        if seg:
            out.append((seg[1:-1], YEL) if seg.startswith("{") else (seg, WHITE))
    return out


_cap = {}


def caption_img(text, size):
    k = (text, size)
    if k in _cap:
        return _cap[k]
    f = ImageFont.truetype(FONT["caption"], size)
    ps = parts(text)
    tw = sum(f.getlength(t) for t, _ in ps)
    im = Image.new("RGBA", (int(tw) + 60, size + 60), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = 30
    for t, _ in ps:
        d.text((x + 3, 34), t, font=f, fill=(30, 10, 50, 160), stroke_width=7, stroke_fill=(30, 10, 50, 160))
        x += f.getlength(t)
    im = im.filter(ImageFilter.GaussianBlur(3))
    d = ImageDraw.Draw(im)
    x = 30
    for t, c in ps:
        d.text((x, 30), t, font=f, fill=c, stroke_width=6, stroke_fill=PURP)
        x += f.getlength(t)
    _cap[k] = im
    return im


_hw = {}


def hand_img(txt, size):
    k = (txt, size)
    if k in _hw:
        return _hw[k]
    f = ImageFont.truetype(FONT["handwrite"], size)
    im = Image.new("RGBA", (int(f.getlength(txt)) + 40, size + 40), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((20, 15), txt, font=f, fill=(255, 236, 200, 255))
    # 은은한 빛 번짐: 좁게(블러 2.5) 한 번만, 투명도 55%
    g = im.filter(ImageFilter.GaussianBlur(2.5))
    g.putalpha(g.split()[3].point(lambda v: int(v * 0.55)))
    o = Image.new("RGBA", im.size, (0, 0, 0, 0))
    o.alpha_composite(g)
    ImageDraw.Draw(o).text((20, 15), txt, font=f, fill=WHITE)
    _hw[k] = o
    return o


# 안전 여백: 모든 자막은 가장자리에서 이만큼 떨어진다 (가로 8%, 세로 9%)
MX, MY = cfg.get("margin_x", 0.08) * W, cfg.get("margin_y", 0.09) * H


def safe_center(cx, cy, bw, bh):
    lo_x, hi_x = MX + bw / 2, W - MX - bw / 2
    lo_y, hi_y = MY + bh / 2, H - MY - bh / 2
    cx = W / 2 if lo_x > hi_x else min(max(cx, lo_x), hi_x)
    cy = H / 2 if lo_y > hi_y else min(max(cy, lo_y), hi_y)
    return cx, cy


def draw(cv, t, s):
    t0, t1 = s["start"], s["end"]
    if not (t0 <= t < t1):
        return
    x, y = s.get("x", 0.5) * W, s.get("y", 0.5) * H
    last = t1 >= dur  # 영상 끝까지 남는 자막은 사라지지 않음
    out = 0 if last else max(0, (t - (t1 - 0.15)) / 0.15)
    if s["style"] == "pop":
        size = s.get("size", 150)
        chars = [c for c in s["text"] if c != " "]
        sps = [char_sprite(c, size, CREAM if i % 2 == 0 else ORANGE) for i, c in enumerate(chars)]
        ws = [sp.width - ex for sp, ex in sps]
        x, y = safe_center(x, y, sum(ws), max(sp.height for sp, _ in sps))
        cx = x - sum(ws) / 2
        for i, ((sp, _), w) in enumerate(zip(sps, ws)):
            p = (t - t0 - i * 0.07) / 0.22
            wob = math.sin((t - t0) * 14 + i) * 2.5 if p > 1 else 0
            paste(cv, sp, cx + w / 2, y, pop_ease(p) * (1 - out), rot=wob)
            cx += w
    elif s["style"] == "caption":
        im = caption_img(s["text"], s.get("size", 54))
        cx, cy = safe_center(x, s.get("y", 0.86) * H, im.width - 60, im.height - 60)
        paste(cv, im, cx, cy, pop_ease((t - t0) / 0.25), a=1 - out)
    elif s["style"] == "handwrite":
        lines = [l.strip() for l in s["text"].split("/")]
        sizes = [44, 70] if len(lines) > 1 else [64]
        imgs = [hand_img(ln, sizes[min(i, len(sizes) - 1)]) for i, ln in enumerate(lines)]
        bw = max(im.width - 40 for im in imgs)
        bh = sum(sizes[min(i, len(sizes) - 1)] + 6 for i in range(len(lines)))
        cx, cy = safe_center(x + bw / 2, y + bh / 2, bw, bh)
        x, yy = cx - bw / 2 - 20, cy - bh / 2 - 15
        for i, ln in enumerate(lines):
            sz = sizes[min(i, len(sizes) - 1)]
            im = hand_img(ln, sz)
            p = min(1, max(0, (t - t0 - i * 0.45) / 0.6))
            fo = 0 if last else max(0, (t - (t1 - 0.5)) / 0.5)
            a = p * (1 - fo)
            if a > 0:
                sp = im.copy()
                sp.putalpha(sp.split()[3].point(lambda v: int(v * a)))
                cv.alpha_composite(sp, (int(x), int(yy + (1 - p) * 14)))
            yy += sz + 6


fr = os.path.join(tmp, "subs")
os.makedirs(fr)
N = int(round(dur * FPS))
print(f"2/3 자막 {len(subs)}개 그리는 중...", flush=True)
for n in range(N):
    cv = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for s in subs:
        draw(cv, n / FPS, s)
    cv.save(f"{fr}/s_{n:05d}.png", compress_level=1)

# ---------- 3) 합성 ----------
print("3/3 합성 중...", flush=True)
am = ["-map", "0:a", "-c:a", "copy"] if has_audio else []
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", base, "-framerate", str(FPS), "-i", f"{fr}/s_%05d.png",
                "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]", "-map", "[v]"] + am +
               ["-c:v", "libx264", "-preset", "slow", "-crf", "15", "-movflags", "+faststart", OUT], check=True)
if cfg.get("mobile", True):
    mob = os.path.splitext(OUT)[0] + "_모바일.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", OUT, "-vf", "scale=-2:480", "-c:v", "libx264", "-preset", "slow",
                    "-crf", "27", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", mob], check=True)
shutil.rmtree(tmp, ignore_errors=True)
print("완료:", OUT)
print("멘트 파일:", MENT)
