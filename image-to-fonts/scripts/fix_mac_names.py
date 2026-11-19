#!/usr/bin/env python3
"""Windows/Adobe 호환성 수정 스크립트.
opentype.js가 생성하는 폰트에서 발견된 두 가지 실제 버그를 고친다 (fontbakery로 검증됨):
  1) Apple 전용 'ltag' 테이블이 끼어들어 Windows 계열 폰트 엔진(포토샵 등)이
     폰트를 무효 처리하는 문제 → 'ltag'를 유발하는 Unicode(플랫폼 0) 이름 레코드를
     제거하고 표준 Windows(3,1)/Mac(1,0) 레코드만 남긴다.
  2) 레거시 Macintosh(1,0,0) 이름 레코드의 필수 항목(패밀리명 등)이 비어있어
     일부 앱이 폰트를 인식 못 하는 문제 → ASCII 값으로 채운다.
사용: python3 fix_mac_names.py font.otf psname_ascii "화면표시이름(한글가능)" out.otf"""
import sys, re, unicodedata
from fontTools.ttLib import TTFont

fp, psname, display, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
font = TTFont(fp)
nt = font['name']

def ascii_fallback(s, fallback):
    s2 = unicodedata.normalize('NFKD', s).encode('ascii','ignore').decode('ascii')
    s2 = re.sub(r'[^A-Za-z0-9 _-]', '', s2).strip()
    return s2 if len(s2) >= 3 else fallback  # 너무 짧으면(한글만 걸러진 경우) psname 기반 사용

fam_ascii = ascii_fallback(display, psname.split('-')[0])
full_ascii = fam_ascii + " Regular"

# 1) 플랫폼 0(Unicode) 레코드 전부 제거 — 이게 ltag 테이블을 유발하는 원인.
#    Windows(3,1)+Mac(1,0)만으로 모든 주요 앱(Adobe, MS Office, 브라우저)에 충분하다.
nt.names = [r for r in nt.names if r.platformID != 0]
if 'ltag' in font:
    del font['ltag']

# 2) 빈 레코드 제거 (fontbakery가 문제 삼는 empty-record)
nt.names = [r for r in nt.names if str(r).strip() != "" or r.nameID in (1,2,3,4,6,16,17)]

# 3) Windows(3,1,1033) 필수 레코드가 비어있으면 채움 (한글 이름 유지)
win_vals = {1:display, 2:"Regular", 3:"CustomFonts:"+psname, 4:display+" Regular",
            6:psname, 16:display, 17:"Regular"}
for nid, val in win_vals.items():
    existing = nt.getDebugName(nid)
    if not existing or nid in (1,4,16):
        nt.setName(val, nid, 3, 1, 0x409)

# 4) Macintosh(1,0,0) 필수 레코드 — MacRoman은 한글 불가하므로 ASCII로
mac_vals = {1:fam_ascii, 2:"Regular", 3:"CustomFonts:"+psname, 4:full_ascii,
            6:psname, 16:fam_ascii, 17:"Regular"}
for nid, val in mac_vals.items():
    nt.setName(val, nid, 1, 0, 0)

# 5) head.fontRevision과 name Version 문자열 불일치 정리 (fontbakery mismatch 경고 해소)
if 'head' in font:
    font['head'].fontRevision = 0.1
    nt.setName("Version 0.1", 5, 3, 1, 0x409)
    nt.setName("Version 0.1", 5, 1, 0, 0)

font.save(out)
print(f"Windows/Adobe 호환 정리 완료 → {out}")
