---
name: card-news
description: Design polished Korean mobile 4:5 card-news pages as finished HTML visual artifacts. Use for Instagram carousels, Korean card-news, and 1080x1350 social designs; do not build an editor unless the user explicitly requests editing controls.
---

# Card News

Build polished 1080x1350 card-news pages as a finished HTML design. The deliverable is the actual visual card-news, not a template product, dashboard, or editor. Preserve the established visual language while letting the layout adapt to the story.

## Start Here

1. Read `references/style-system.md` before designing.
2. Read `references/render-export-contract.md` only when the user explicitly requests a reusable editor, animation, or video export.
3. Inventory supplied copy, media, fonts, page count, motion requests, durations, and audio requirements.
4. Preserve explicit user wording, line breaks, emphasis, and latest corrections. Newer instructions override older ones.
5. Build the actual pages first. Do not create a marketing landing page, editing interface, or controls around them unless the user explicitly asks for those features.

## Choose The Output

- For an ordinary card-news request, create one self-contained HTML design that visually presents every 1080x1350 page.
- Use HTML/CSS/SVG/canvas as appropriate; choose the simplest approach that produces a polished visual result.
- Use a reusable editor, image/video upload controls, or export architecture only when the user explicitly asks for editing, animation, or video delivery.
- Keep each artboard fixed at 1080x1350 and scale only the completed artboard for preview.

## Build Workflow

### 1. Plan The Story

- Establish one communication job per page: hook, contrast/evidence, mechanism, participation/CTA, or another content-driven role.
- Let layout change with content, but retain the shared typography, color, spacing, frame, icon, and motion language.
- Keep mobile scanning order obvious. Use a strong headline, one supporting idea, and only the media frames needed by the story.
- Keep page margins generous and avoid dense card grids or cards inside cards.

### 2. Build The Visual System

- Copy required local fonts and assets into the deliverable; do not depend on a CDN.
- Start from `assets/style-tokens.json`, then adjust only when the content genuinely needs it.
- Use `assets/card-news-icon.svg` as the skill icon only, not as page artwork.
- Draw tasteful interface/story icons from a consistent SVG family. Preserve previously approved icons instead of silently substituting new ones.
- Use refined SVG icons only when they clarify the story. Do not use platform emoji as decorative substitutes.

### 3. Use Supplied Media Well

- Use a supplied cover or reference image as the visual language for the inner pages unless the user directs otherwise.
- Crop supplied images around the evidence that matters; do not invent unrelated imagery.
- Do not add upload states, placeholders, selection handles, sidebars, or editing controls to a finished design.
- Only implement media editing when the user specifically asks for a reusable editor.

### 4. Motion Only When Requested

- For static requests, prioritize a strong, readable first frame; do not add animation infrastructure.
- When the user asks for motion, use deterministic timing and animate only to direct attention.
- Avoid frantic blinking, repeated ghost outlines, excessive bouncing, or unrelated simultaneous motion.

### 5. Deliver

- Save the finished HTML design and its required assets in the workspace.
- Provide page PNG previews when useful for review or posting.
- Provide MP4 only when animation or video delivery was explicitly requested.

## Verification Gate

Do not present the work as finished until every page has been checked for clipped text, overlap, unintended font fallback, inconsistent spacing, and incorrect image crops. If animation/video was requested, also verify that the final frames match the intended HTML composition.

## Deliverables

- Finished HTML design with local assets bundled.
- One PNG preview per page when useful.
- A short page-by-page content-flow note.
