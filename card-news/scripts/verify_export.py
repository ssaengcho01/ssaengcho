#!/usr/bin/env python3
"""Verify card-news MP4 metadata and optional timestamped frame matches."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def executable(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    common = Path(r"C:\Program Files (x86)\iMobie\FocuSee\FFmpeg") / f"{name}.exe"
    if common.exists():
        return str(common)
    raise SystemExit(f"{name} was not found. Install ffmpeg or add it to PATH.")


def run_json(command: list[str]) -> dict:
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def parse_reference(value: str) -> tuple[float, Path]:
    try:
        timestamp, path = value.split("=", 1)
        return float(timestamp), Path(path)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("Use TIME=PATH, for example 1.5=preview.png") from exc


def frame_mae(reference: Path, actual: Path) -> float:
    try:
        from PIL import Image, ImageChops, ImageStat
    except ImportError as exc:
        raise SystemExit("Pillow is required for --reference comparisons.") from exc

    with Image.open(reference).convert("RGB") as expected, Image.open(actual).convert("RGB") as encoded:
        if expected.size != encoded.size:
            raise SystemExit(f"Frame size mismatch: {expected.size} vs {encoded.size}")
        stats = ImageStat.Stat(ImageChops.difference(expected, encoded))
        return sum(stats.mean) / len(stats.mean)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True, type=Path)
    parser.add_argument("--width", type=int, default=1080)
    parser.add_argument("--height", type=int, default=1350)
    parser.add_argument("--fps", type=float, default=30.0)
    parser.add_argument("--duration", type=float)
    parser.add_argument("--duration-tolerance", type=float, default=0.08)
    parser.add_argument("--require-audio", action="store_true")
    parser.add_argument("--reference", action="append", default=[], type=parse_reference)
    parser.add_argument("--max-mae", type=float, default=8.0)
    args = parser.parse_args()

    if not args.video.exists():
        raise SystemExit(f"Video not found: {args.video}")

    ffprobe = executable("ffprobe")
    ffmpeg = executable("ffmpeg")
    probe = run_json([ffprobe, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(args.video)])
    video_streams = [s for s in probe["streams"] if s.get("codec_type") == "video"]
    audio_streams = [s for s in probe["streams"] if s.get("codec_type") == "audio"]
    if len(video_streams) != 1:
        raise SystemExit(f"Expected one video stream, found {len(video_streams)}")

    stream = video_streams[0]
    width, height = int(stream["width"]), int(stream["height"])
    num, den = stream.get("avg_frame_rate", "0/1").split("/")
    fps = float(num) / float(den)
    duration = float(probe["format"]["duration"])
    failures: list[str] = []

    if (width, height) != (args.width, args.height):
        failures.append(f"resolution {width}x{height}, expected {args.width}x{args.height}")
    if abs(fps - args.fps) > 0.02:
        failures.append(f"fps {fps:.3f}, expected {args.fps:.3f}")
    if args.duration is not None and abs(duration - args.duration) > args.duration_tolerance:
        failures.append(f"duration {duration:.3f}s, expected {args.duration:.3f}s")
    if args.require_audio and not audio_streams:
        failures.append("audio stream missing")

    comparisons = []
    with tempfile.TemporaryDirectory(prefix="card-news-verify-") as temp_dir:
        for index, (timestamp, reference) in enumerate(args.reference):
            if not reference.exists():
                failures.append(f"reference missing: {reference}")
                continue
            extracted = Path(temp_dir) / f"frame-{index}.png"
            subprocess.run([ffmpeg, "-v", "error", "-ss", f"{timestamp:.6f}", "-i", str(args.video), "-frames:v", "1", "-y", str(extracted)], check=True)
            mae = frame_mae(reference, extracted)
            comparisons.append({"time": timestamp, "mae": round(mae, 4), "reference": str(reference)})
            if mae > args.max_mae:
                failures.append(f"frame at {timestamp:.3f}s MAE {mae:.3f} exceeds {args.max_mae:.3f}")

    report = {
        "video": str(args.video), "resolution": f"{width}x{height}",
        "fps": round(fps, 3), "duration_seconds": round(duration, 3),
        "audio": bool(audio_streams), "frame_comparisons": comparisons,
        "passed": not failures, "failures": failures,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
