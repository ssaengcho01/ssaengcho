#!/usr/bin/env python3
"""GPOS 커닝 주입. 사용: python3 apply_kerning.py font.otf kerning.fea out.otf"""
import sys
from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
font = TTFont(sys.argv[1])
fea = open(sys.argv[2]).read()
addOpenTypeFeaturesFromString(font, fea)
font.save(sys.argv[3])
print(f"GPOS 커닝 적용 완료 → {sys.argv[3]}")
