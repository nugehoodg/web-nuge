# Anugerah portfolio promo — design spec (production release)

Mode: **co-creation** (video-shotcraft). All items below were confirmed by the user in chat on
2026-11-19 (brief → decisions → direction B "Hands-on" → styleframes → shot map → storyboard).
This file is the review baseline for `final-review.md`.

## 1. Product brief (approved as recommended)

| Item | Decision |
|---|---|
| Product | Personal portfolio of Anugerah, creative designer (graphic design, video editing, games). Static site `index.html` / `style.css` / `main.js` / `cursor.js`, served locally at http://localhost:5173 |
| Audience | Prospective clients and studios; Instagram followers |
| Purpose | Short teaser that drives traffic to the site; shows the site is a playable toy |
| Core message | 8 years of design range, presented on a site you can play with |
| Must show | (1) orbit ring + "Anugerah / Creative Designer"; (2) Graphic Design: car drives the masonry wall, Destroy drops the designs; (3) Video Editing: playhead scrub changes clip; (4) the box: hover item → info card; toy hand cursor throughout; (5) stamp + site address |
| Format | ~30 s (storyboard: 32.5 s), 1920×1080, 30 fps, English |
| Music | Mixkit "House Vibez" (Lily J), Mixkit Free License, no attribution required. Delivered with BGM and SFX-only |
| Data | Only what is public on the site, including client work (brands/faces as already published). Email address never on screen; CTA is `anugerah.vercel.app` |

## 2. Decisions table

| Decision | Execution |
|---|---|
| Teaser to site | Site toys are the stars; ending = stamp → `anugerah.vercel.app` |
| Audience | Lead with range (orbit of work), then 3 playable moments |
| Must-show | One main move per screen, ~4–6 s each, plus opening and ending |
| 16:9 ~30 s EN | 9 storyboard rows, minimal on-screen text (site's own words) |
| Music 122 BPM | Every cut/accent on the measured beat grid; two deliverables |
| Data | Real captures of the live site; no email on screen |

## 3. Visual direction — B "Hands-on" (confirmed with styleframes)

Styleframes: `styleframes/hands-on-f1.png` (opening tap), `-f2.png` (Destroy, tilted push-in, "02 / 04"),
`-f3.png` (stamp + URL end card).

Tokens (from the site's `style.css`, no new colours):
- Colours: ink `#0a0a0a`, paper `#ffffff`, chip `#f2f2f2`; orange only on the toy hand
  (`#f6b24a` → `#c97708` gradient) and the stamp. Hand outline `#0a0a0a`, rod `#f3f3f3`.
- Type: Neue Haas Grotesk Display XThin (200) / Light (300) for display; Text Roman (400) for small UI.
  Files: `../fonts/`. Letter-spacing −0.03em on display.
- Rules: 2 px black hairlines (divider, timeline). Corners: 2–3 px radius on cards.
- Toy hand: identical drawing to `../cursor.js`, scaled ~2.2–3×, enters from bottom-right, tap = black ring ripple.
- Restraint: exactly one big physical moment (Destroy). Springy settles, small squash.

## 4. Shot map (all first choices; names validated in `gallery/api/library.json`)

| Part | Card · style-key |
|---|---|
| Hand behaviour (all shots) | `cursor-flyover` (arrival-before-click, ripple, UI reacts) |
| Opening orbit | `carousel-3d` (re-skinned to the site's tilted, DOF ring) |
| Opening → Graphic Design | `line-carry-transition` (the divider line) |
| Car drive | `depth-layer-moves · multiplane` |
| Destroy | `tension-camera-moves · bullet-time-freeze-orbit` |
| Video scrub | `timeline-travel` |
| Box | `element-body-moves · contact-shadow-lift` |
| End | `riso-print-hits · misregistration-hit` + `blur-slide` |
| Cuts | `transition-hidden-cut · invisible-cut` |

## 5. Beat grid (analysis/beat_data.json, analysis/grid_drift.json)

House Vibez: 122.002 BPM, T = 0.49180 s, t0 = 7.9356 s; grid 1x: match 98.1 %, mean 6.8 ms, drift 1.4 ms.
Excerpt: beat 96 (55.15 s) → beat 162. Video frame of beat n = round((n − 96) · T · 30).
Full-frame impacts (≤3, ≥16 beats apart): b132 Destroy landing, b152 stamp hit.

## 6. Storyboard (approved)

| # | Time (s) / beats | Shot | Action |
|---|---|---|---|
| 1 | 0.0–4.9 · b96–106 | carousel-3d | White; hand taps at b97; ring of 16 works blooms into tilted DOF orbit; b100 hero title blur-slide; hold while orbiting |
| 2 | 4.9–7.9 · b106–112 | line-carry | Divider line draws, camera follows through the drum dropout (b109–110), folds into Graphic Design on the drop b112 |
| 3 | 7.9–12.8 · b112–122 | multiplane | Hand grabs car on the drop, drives right; road wobbles; rows parallax; car bounces on b116, b120; "02 / 04" top-right |
| 4 | 12.8–19.2 · b122–135 | bullet-time | Hand taps Destroy b124; designs pop/fall; freeze b126; camera orbits; resume b131; land on road b132 (impact #1); rest |
| 5 | 19.2–19.7 | invisible-cut | Rod sweeps past lens |
| 6 | 19.7–23.1 · b136–143 | timeline-travel | Hand drags playhead; clip changes per beat (1→2→3→4); push into preview b140; timecode runs |
| 7 | 23.1–23.6 | invisible-cut | Rod sweep |
| 8 | 23.6–27.0 · b144–151 | contact-shadow-lift | Pokes: camera (Instagram @brief.look) b144, controller (My Games) b146, photo (About Me) b148 + hold. Resume paper omitted (pace) |
| 9 | 27.0–32.5 · b151–162 | misregistration-hit + blur-slide | Hand presses like a stamp; stamp hits b152 (impact #2); URL b154; rule + "Anugerah Creative Designer"; hold ≥3 s; music fades |

SFX plan: plastic tap; ring whoosh; line swish; toy-car roll; road boing; paper flutter; tape-stop; reverse swell;
pile thud; tape-scrub ticks; push swell; cardboard rustle; rubber-stamp thunk. Freesound, CC0 by default.

## 7. Recorded adaptations (production)

- Ending: a minimal stamp end card (misregistration-hit + blur-slide), by design, instead of the
  aesthetic-rules "group photo" outro. The approved storyboard chose a quiet stamp landing after the
  Destroy peak, matching the site's restrained Swiss look.
- Destroy orbit: rotateY 34° instead of the card's 52°; a full-width page leaves the frame at 52°.
- Line-carry: vertical travel (the site stacks its screens), the line lands on the road.
- Video Editing push: the push-in lands on the preview element (1 → 1.2) instead of a camera push,
  so header text is never cropped.
- Car drive: ~1500 px drive (peak ≈ 33 px/f) with horizontal motion blur, second row lags mid-drive
  for visible parallax; near pills use the site's chip style (#f2f2f2 + ink).
- Beat sync: v1 render measured all anchors +1.72f late in the same direction; fixed with the single
  picture-offset constant (OUTPUT_AUDIO_OFFSET_SEC = 0.057 s). Audio-chain delay (23.3 ms, measured
  by cross-correlation) is subtracted from SFX start times only.
- Media proxies (promo only, site untouched): videos and animated GIFs as H.264 loops, stills
  downscaled to ≤1200 px, for deterministic, memory-safe renders.
