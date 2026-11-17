# Render And Export Contract

> This reference applies only when the user explicitly asks for a reusable editor, animation, or video export. Ordinary card-news requests should produce a finished HTML design without an editor or export UI.

## Non-Negotiable Architecture

The preview and final file must be the same visual program. Do not maintain a DOM/CSS preview and a separate canvas recreation for export; they will drift.

1. Maintain all page content, media crop state, and timeline state in structured data.
2. Render the page at a fixed 1080x1350 internal resolution through `renderFrame(ctx, timeMs, state)`.
3. Display that renderer canvas in the editor. Scale only the canvas element with CSS.
4. Keep controls in a sibling overlay or side panel outside the canvas.
5. Export the exact canvas stream or invoke the same `renderFrame` function for every encoded frame.

## Deterministic Timeline

- Compute animation values only from `timeMs`, page state, and fixed easing functions.
- Do not read live DOM geometry during export.
- Do not depend on CSS animations, transition events, requestAnimationFrame drift, or wall-clock delays to decide the exported state.
- Seek video sources from the timeline and wait for each requested frame to decode before drawing it.
- Load and await all fonts before preview snapshots or export.
- Give animated emoji a deterministic frame lookup from the same timeline.

## Cover Crop Math

For source size `sw x sh` and frame size `fw x fh`:

```text
coverScale = max(fw / sw, fh / sh)
drawScale = coverScale * userScale
drawW = sw * drawScale
drawH = sh * drawScale
maxX = max(0, (drawW - fw) / 2)
maxY = max(0, (drawH - fh) / 2)
x = clamp(userX, -maxX, maxX)
y = clamp(userY, -maxY, maxY)
```

Draw from the frame center plus clamped offsets. Re-clamp whenever the frame, source, or zoom changes. This prevents white gaps and keeps preview/export crops identical.

## Audio

- Keep audio separate from pixels.
- In-browser, connect uploaded video audio through Web Audio to a `MediaStreamAudioDestinationNode`, then merge its tracks with the canvas video track.
- Respect the user's mute/audio state.
- Offline, map source audio in ffmpeg, trim it to page duration, and encode AAC.
- Never request screen-share permission to capture audio.

## Encoding

- Target MP4/H.264, 1080x1350, 30 fps, `yuv420p`.
- Default durations: cover 10.0 s; other pages about 5.2 s unless explicitly changed.
- Use a visually strong bitrate around 14 Mbps or CRF 16-20.
- If the browser cannot produce MP4, record a deterministic canvas WebM and convert it with ffmpeg. Do not capture the tab.

## Prohibited Shortcuts

- `getDisplayMedia`, screen capture, tab capture, browser recording, or desktop recording.
- Cropping a browser screenshot to imitate export.
- Capturing the mouse cursor or editor UI.
- Rebuilding the exported page with an independently styled html2canvas clone.
- Mutating user crop state only for export.
- Hiding a placeholder by opacity while leaving it draw-able.
- Allowing CSS SVG rules to override `[hidden]`.

## Frame Identity QA

Compare a near-start frame, the main motion beat, and the settled final composition for every page. Save preview canvas snapshots at exact timestamps, extract matching MP4 frames, and run `scripts/verify_export.py`. Require identical dimensions and pixel registration. Allow a small mean absolute error only for H.264 color/compression noise; layout, text, crop, transparency, and motion state must be exact.

Also inspect the frame sequence for flicker and temporal jumps. A still-frame match does not excuse stuttering motion.
