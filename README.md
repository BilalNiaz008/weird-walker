# Weird Walker

Draw a creature, place two leg attachments, then bring it to life.

## Design

The landing page follows the paper studio layout at https://weirdwalker.polsia.io/: cream paper, lime and purple accents, a rounded headline beside the drawing studio, a three-step guide, local-saving notice, questions, and a purple closing section. The studio keeps our drawing, naming, fill, face, walking, and export controls. A tilted paper backing gives it a handmade feel without rotating the interactive canvas or affecting pointer coordinates.

Styles live in `assets/site.css`. Nunito is bundled locally in `assets/fonts/` with its SIL Open Font License, so typography works offline without a font service. The header and footer use the reference site's SVG logo, lime badge, and two-colour wordmark. Its favicon is bundled in `assets/weird-walker-icon.svg`, with a matching PNG for sharing previews. Interface icons also use inline SVG. The warm paper palette stays consistent under light and dark system preferences; reduced motion is respected.

Browser tabs use the SVG favicon with a PNG fallback. Both favicon links carry `?v=2` to refresh the previously cached lilac icon; bump this version when replacing the favicon again.

## Run

Open `index.html` in a modern browser. No build, account, server, or package installation is needed. Drawing and animation work even when Google Analytics is blocked or offline.

For a local web address, run `python -m http.server 8790 --bind 127.0.0.1` from this folder, then open http://127.0.0.1:8790.

## Use

- Start with the outline-only blob, or Clear and draw using a mouse, pen, or finger. Drawing never creates legs, a face, or a fill automatically.
- Draw creates freehand outlines. Closing an outline makes it fillable but does not add colour.
- Circle creates a clean circle or oval by dragging between opposite corners. Very small drags are rejected.
- Fill offers purple, pink, yellow, mint, blue, and orange. Choose a colour and tap inside a closed shape; choose Remove fill to return it to an outline. Open lines and empty space are ignored, and the topmost shape wins when shapes overlap.
- Choose Add legs, then tap two attachment spots on the body. Walking, GIFs, and video require exactly two explicitly placed legs; trying any of these actions guides the user back to Add legs without discarding a first placement.
- New drawings and example blobs start without a face. Choose Add face, then tap inside the body's bounding rectangle to place the eyes and mouth together, including in gaps between strokes. Tap again to reposition the same face.
- In Add face mode, Place in centre provides a keyboard alternative and Remove face makes the creature faceless. Placement is optional: creatures can walk, react, and export without a face.
- Face positions stay attached to the drawing during animation and export, and stay fixed when you add strokes. Clear and Try a blob remove the face; Undo restores it. Face placement is unavailable while walking or recording.
- Bring it to life, Pause, or go Back to drawing.
- Walking keeps the creature's drawn size whenever it fits. Sideways travel is reduced near the stage edges; oversized creatures scale down only enough to keep the body, legs, face, and reactions in view.
- Undo restores up to 30 edits, including Clear and changes to leg and face placement.
- Save image downloads a PNG of the current stage.
- Save GIF downloads a looping six-second, 480 × 480 animation at 20 fps, including your creature's name, colours, face, and selected walk. Frames use fixed animation times, so a slower device takes longer to export without slowing down the saved walk. GIF encoding happens locally using the bundled MIT-licensed [gifenc 1.0.3](https://github.com/mattdesl/gifenc) in `assets/vendor/`; no build or external service is needed.
- Give your creature a name (up to 40 characters). Names and walk choices save locally and are independent of drawing undo.
- Automatic walking uses body height / width, excluding legs: above 1.35 is Wobble, below 0.75 is Shuffle, and everything else is Bounce. Choose any walk manually to experiment.
- While walking, eyes blink every four seconds. Tap the body or use Say hello for a surprised expression and a small hop. Pause freezes movement and reactions.
- Walking follows elapsed time, so a lower frame rate makes movement less smooth without slowing the walk. Pausing or leaving the tab freezes the animation clock.
- Save video records a silent six-second, 720 × 720 clip at a requested 30 fps, including your creature's name. Transparent video background is on by default and uses WebM to preserve alpha; browsers without WebM recording must turn transparency off. Turning it off includes the stage colour and chooses MP4 when available, otherwise WebM. Some players and editing apps display transparent areas as black or discard alpha when converting the file. Encoding support and actual frame pacing depend on the browser and device. PNG and GIF exports keep their existing backgrounds.
- GIF and video exports use a snapshot and temporarily lock editing. Cancel, export errors, or leaving the tab discard unfinished output and release resources. Your drawing and previous playback position remain intact; returning from a hidden tab requires Keep walking.
- If video recording is unavailable, GIF and PNG export still work. Files download locally; the app does not publish them.
- The latest creature is stored locally in this browser. Clearing browser data removes it; changing browsers or the page address does not transfer it. If storage is blocked, image export still works.

Keyboard users can name a blob, choose a walk, place a centred face, remove it, undo, animate, say hello, pause, and save through native controls. Freehand drawing, custom leg placement, and custom face positioning use a pointing device. Reduced-motion preferences remove lateral travel and hops while retaining gentle steps and facial reactions; leaving the tab pauses animation.

## Check

The app uses a plain HTML file, a local stylesheet and font, SVG assets, and a bundled GIF encoder. `check.cjs` uses Node.js and Playwright for desktop, phone, touch, persistence, undo, PNG export, shape thresholds, explicit legs, circles and ovals, per-shape fills, old saved drawings, different gaits, blinking, body-only reactions, reduced motion, and animation export checks. It also checks the headline and guide without JavaScript, canonical and sharing metadata, structured data, local sharing images, robots.txt, and sitemap XML. It decodes real MP4, WebM, and GIF files and checks duration and changing frames, transparent WebM alpha and opaque MP4/WebM backgrounds, plus GIF looping and frame count, cancellation, tab hiding, resize, unsupported recording, and encoder failures. With Playwright available, run `node check.cjs`. Set `NODE_PATH` to an existing Playwright installation if it is outside this folder. Tests produce images, GIFs, and videos in the system temporary directory. Full tests require a Chromium build with MP4 recording and GIF ImageDecoder support.

## Search and deployment

The preferred public URL is `https://www.weirdwalker.online/`. The title, description, visible drawing guide, and questions describe the creature drawing game in the initial HTML. Website and web application structured data describe the actual free app without invented reviews or ratings. Open Graph and Twitter metadata use the existing PNG mascot for sharing previews; these tags do not directly improve search rankings.

Deploy `index.html`, `robots.txt`, `sitemap.xml`, `ads.txt`, and `assets/` together. The sitemap lists only the canonical homepage. If the domain changes, update the absolute URLs in `index.html`, `robots.txt`, `sitemap.xml`, and the SEO check. Keep the existing redirect from the non-www domain to the www domain; the canonical link also identifies the homepage when `/index.html` is requested.

After deployment, verify that `/robots.txt` and `/sitemap.xml` return their actual files with HTTP 200. In Google Search Console, verify ownership of the site, submit `https://www.weirdwalker.online/sitemap.xml`, and inspect the homepage to request indexing. Use Search Console's search performance report to measure impressions, clicks, and queries over time. Indexing and ranking improvements are not guaranteed by these changes.

## Analytics

The page head includes the Google tag for GA4 measurement ID `G-HPRPYP1GHM`. It loads asynchronously and uses Google's default page-view tracking. No custom events send creature names, strokes, or exported images/videos. The page includes a notice that Google Analytics measures site traffic.

After deployment, open the site and select the matching property at https://analytics.google.com/. Go to Reports → Realtime to check visits. Browser tracking protection or ad blockers can prevent visits from appearing. The browser checks run offline, verify the tag's initialization queue, and confirm that the drawing tools still work without Analytics; tests do not send traffic to the live property.

## Scope

Walking uses a procedural animation, not a physics simulation. There is no server, public gallery, live sharing, collection, or obstacle course. Drawings stay local; Google Analytics sends site usage data to Google. A drawing is limited to 500 strokes / 20,000 points to keep browser work bounded. Existing saved drawings load with the default name Little weirdo and Automatic walk.

Saved creatures from before face placement keep their former centred face through a one-time local conversion. Saved drawings from before explicit fills keep purple on closed shapes and no fill on open strokes. New and migrated saves use data version 2 with a `fills` entry aligned to every stroke. Missing, extra, or unsupported fill values become unfilled without discarding the drawing. Explicitly faceless saves remain faceless, and invalid stored face coordinates are ignored. Face placement and fill colour do not affect shape-based walk selection.
