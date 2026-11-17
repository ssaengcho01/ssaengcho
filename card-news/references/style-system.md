# Card News Style System

## Visual Character

Aim for bright, friendly, editorial social content made by a designer: warm but not beige-heavy, energetic but not noisy, and informal without becoming childish. Avoid generic AI decoration, decorative blobs, faux-3D gloss, purple gradients, and rigid dashboard styling.

## Canvas And Grid

- Artboard: 1080x1350, mobile 4:5.
- Safe outer margin: about 88-96 px; never below 72 px without a content reason.
- Background: near-white cream `#FFFDF7`.
- Accent: one fresh green, `#23AC3A`. Do not create light/dark green families or green gradients.
- Main text: `#303234`; secondary text: `#65676A`; white surfaces: `#FFFFFF`.
- Use stable frame dimensions, grid tracks, and aspect ratios so content and animation cannot shift layout.

## Typography

- Titles and emphasis: FlightSans Title/Bold.
- Lighter display copy: FlightSans Regular.
- FlightSans (제주항공 플라이트 산스) is free to use but its files are not bundled in this skill. If `assets/fonts/` has no FlightSans OTF files, ask the user to download them from the official page (https://www.jejuair.net/flightSans.do) and put them in `assets/fonts/`. If they are not available, fall back to SUIT or Pretendard Bold/ExtraBold and say so.
- General Korean copy: SUIT when available, then a bundled/system sans fallback.
- Never scale type with viewport width; preview the fixed 1080x1350 artboard and CSS-scale the artboard itself.
- Suggested scale: hero 92-122 px, page title 66-78 px, section emphasis 54-70 px, body 35-44 px, labels 28-34 px.
- Use letter-spacing `0`. Keep line-height slightly open: roughly 1.12 for display and 1.35-1.5 for body.
- Make hierarchy decisive. Large type must feel large; supporting copy must remain comfortably readable on a phone.
- Preserve approved wording and intentional line breaks. Do not insert a line break into a phrase the user asked to keep on one line.

## Surfaces And Frames

- Media frames and genuine callouts may have a maximum 6 px radius; use square or lightly rounded geometry.
- Standard green outline: about 4 px at 1080x1350. Increase only for a deliberate emphasis moment.
- Text callouts: white fill with green stroke. Do not add faint decorative outlines around whole sections.
- Do not nest cards or turn each page section into a floating card.
- Give content breathing room; avoid squeezing lower content to fill the canvas.

## Media Treatment

- Cover media is full bleed. Overlay text directly rather than placing it in a blocking card.
- On a cover, use a restrained lower readability wash that starts in the lower-middle region. Keep the upper image clear and allow the bottom media to remain faintly visible, around 10 percent presence rather than becoming solid white.
- For comparison pages, crop each source around the evidence that matters. It is acceptable for irrelevant UI such as a promotion button to fall outside the frame.
- Keep labels aligned and size their outlined containers to the actual text.

## Icon And Emoji Language

- Use consistent, refined SVG icons with intentional stroke width and optical alignment.
- Sparkles near a title word are filled shapes, normally two pieces, placed close enough to read as a sparkle on that word. Animate them softly.
- Arrows are thin, simple, and tightly spaced between values. Align both values and the arrow optically on one baseline.
- Use official animated Noto Emoji assets for raising hands, thinking face, wink, and clapper board. Align each emoji optically to the text baseline and lower it slightly when needed.
- Avoid native color emoji screenshots because appearance changes by operating system and renderer.

## Motion Language

- Motion should have a clear subject and settle quickly.
- Metric stamp: reveal one character at a time with a fast stagger; each character begins slightly oversized and settles into place. Play once with no blinking.
- Evidence circle: draw a full green hand-mark circle around the metric. Let start and end overlap in a small V at the bottom; never obscure the digits.
- Loop/equality box: enter strongly and quickly, then hold. Use one outline only; no duplicate green trail.
- Prompt boxes: enter sequentially with a short, smooth slide and settle.
- Title reveal: use a left-to-right wipe or similarly clean reveal.
- Animated emoji may loop smoothly and subtly while text motion remains finite.

## Established Page Patterns

These are examples, not fixed page layouts:

- Cover: full-bleed media, lower wash, thin introductory line, large multi-line title, compact metric transformation, one-line participation CTA, no page number.
- Evidence/contrast: two media frames, short captions, emphasized counts with stamp motion and evidence circles, static concluding statement, page number.
- Mechanism/loop: paired first/last frames, labels fitted to text, a strong green outlined equality statement, explanatory copy, repeat icon, page number.
- Participation/CTA: one hero media frame, animated title, two or more imagination prompts, an invitation to comment, and an additional production-method line, page number.

Adapt these patterns to content instead of forcing every project into four identical compositions.

