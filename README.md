# Weird Walker

Draw a creature, place two leg attachments, then bring it to life.

## Logo

The lilac walking doodle and custom lowercase wordmark are in `assets/weird-walker-logo.svg`; the standalone mascot and favicon are in `assets/weird-walker-icon.svg`. Both are scalable vector artwork with no font dependencies. The wordmark and mascot legs adapt to dark mode. Transparent PNG exports are available alongside the SVGs.

## Run

Open `index.html` in a modern browser. No build, account, server, or runtime dependencies are needed.

For a local web address, run `python -m http.server 8790 --bind 127.0.0.1` from this folder, then open http://127.0.0.1:8790.

## Use

- Start with the outline-only blob, or Clear and draw using a mouse, pen, or finger. Drawing never creates legs, a face, or a fill automatically.
- Draw creates freehand outlines. Closing an outline makes it fillable but does not add colour.
- Circle creates a clean circle or oval by dragging between opposite corners. Very small drags are rejected.
- Fill offers purple, pink, yellow, mint, blue, and orange. Choose a colour and tap inside a closed shape; choose Remove fill to return it to an outline. Open lines and empty space are ignored, and the topmost shape wins when shapes overlap.
- Choose Add legs, then tap two attachment spots on the body. Walking and video require exactly two explicitly placed legs; trying either action guides the user back to Add legs without discarding a first placement.
- New drawings and example blobs start without a face. Choose Add face, then tap inside the body's bounding rectangle to place the eyes and mouth together, including in gaps between strokes. Tap again to reposition the same face.
- In Add face mode, Place in centre provides a keyboard alternative and Remove face makes the creature faceless. Placement is optional: creatures can walk, react, and export without a face.
- Face positions stay attached to the drawing during animation and export, and stay fixed when you add strokes. Clear and Try a blob remove the face; Undo restores it. Face placement is unavailable while walking or recording.
- Bring it to life, Pause, or go Back to drawing.
- Undo restores up to 30 edits, including Clear and changes to leg and face placement.
- Save image downloads a PNG of the current stage.
- Give your creature a name (up to 40 characters). Names and walk choices save locally and are independent of drawing undo.
- Automatic walking uses body height / width, excluding legs: above 1.35 is Wobble, below 0.75 is Shuffle, and everything else is Bounce. Choose any walk manually to experiment.
- While walking, eyes blink every four seconds. Tap the body or use Say hello for a surprised expression and a small hop. Pause freezes movement and reactions.
- Save video records a silent six-second, 720 × 720 clip at a requested 30 fps, including your creature's name. The browser chooses MP4 when available, otherwise WebM. Encoding support and actual frame pacing depend on the browser and device.
- Recording uses a snapshot and temporarily locks editing. Cancel, recording errors, or leaving the tab discard unfinished output and release the recorder. Your drawing and previous playback position remain intact; returning from a hidden tab requires Keep walking.
- If video recording is unavailable, PNG export still works. MP4/WebM files download locally; the app does not publish them.
- The latest creature is stored locally in this browser. Clearing browser data removes it; changing browsers or the page address does not transfer it. If storage is blocked, image export still works.

Keyboard users can name a blob, choose a walk, place a centred face, remove it, undo, animate, say hello, pause, and save through native controls. Freehand drawing, custom leg placement, and custom face positioning use a pointing device. Reduced-motion preferences remove lateral travel and hops while retaining gentle steps and facial reactions; leaving the tab pauses animation.

## Check

The app uses a plain HTML file and local SVG logo assets. `check.cjs` uses Node.js and Playwright for desktop, phone, touch, persistence, undo, PNG export, shape thresholds, explicit legs, circles and ovals, per-shape fills, old saved drawings, different gaits, blinking, body-only reactions, reduced motion, and video export checks. It decodes real MP4 and WebM recordings and checks their dimensions, duration, and changing frames, plus cancellation, tab hiding, resize, unsupported recording, and recorder failures. With Playwright available, run `node check.cjs`. Set `NODE_PATH` to an existing Playwright installation if it is outside this folder. Tests produce images and videos in the system temporary directory. Full tests take approximately 30 seconds and require a Chromium build with MP4 recording support for the MP4 assertion.

## Scope

Walking uses a procedural animation, not a physics simulation. There is no server, public gallery, live sharing, GIF export, collection, or obstacle course. Nothing is sent over the network by the app. A drawing is limited to 500 strokes / 20,000 points to keep browser work bounded. Existing saved drawings load with the default name Little weirdo and Automatic walk.

Saved creatures from before face placement keep their former centred face through a one-time local conversion. Saved drawings from before explicit fills keep purple on closed shapes and no fill on open strokes. New and migrated saves use data version 2 with a `fills` entry aligned to every stroke. Missing, extra, or unsupported fill values become unfilled without discarding the drawing. Explicitly faceless saves remain faceless, and invalid stored face coordinates are ignored. Face placement and fill colour do not affect shape-based walk selection.
