# Handoff: BTZ Rebrand — Landing Page, Brand Guide & Studio Concept (Final)

## Overview
A new visual identity, marketing landing page, and studio-app UI concept for BTZ, a browser-based music studio (drum machine, piano roll, mixer, mastering, recording, sound library — works offline). The name "BTZ" is a placeholder; the product will be renamed later, so the brand system is built to be easily re-labeled.

The visual direction is a clean, professional **"HUD" register** — dark base, three accent hues, a dot-grid texture, corner-bracket framing, monospace numeric readouts, and line-based (not glow-based) interaction states — meant to feel advanced and precise without tipping into sci-fi pastiche. **Read `DEVELOPER_SPEC.md` for the full rulebook** (accent usage, canvas hex values, component specs, motion) — this README covers scope and file contents; the spec covers the "how."

## About the Design Files
The files in this bundle are **design references built in HTML** (`.dc.html` — plain HTML/CSS/JS under the hood, viewable in any browser). They are prototypes showing intended look, copy, and interaction — not production code to copy directly. Recreate these designs in the target codebase's existing environment (React, Vue, Next.js, native, etc.) using its established component patterns — or choose the most appropriate framework if none exists yet.

## Fidelity
**High-fidelity** for the landing page and brand guide: colors, typography, spacing, copy, and the full motion/HUD system are final — recreate pixel- and interaction-precisely, including `tokens.css` and `DEVELOPER_SPEC.md`.

**Low-fidelity / conceptual** for the studio app screen (`BTZ Studio (skiss).dc.html`): it illustrates the visual language and layout structure the real product UI should adopt (panel layout, the six core tools, the HUD treatment applied to real app chrome) but has **no real functionality** — no audio engine, no working sequencer logic, no persisted state. Treat pads, faders, the EQ curve, and step grids as illustrative placeholders for a developer to design the real interactive components around.

## Screens / Views

### 1. Landing page (`BTZ Landningssida.dc.html`)
Fluid, responsive marketing page (English copy). Sections top to bottom:
- **Nav**: logo mark (3-bar equalizer icon) + wordmark "BTZ", links (Features, Pricing, Download), pill CTA "Start free."
- **Hero**: two-column (stacks on narrow viewports). Left: eyebrow pill, H1 (3-line headline), subhead, two CTAs, fine-print trust line — all with a staggered fade/rise-in on load. Right: a HUD "session" card — corner brackets, a monospace `SESSION_04471` / `● LIVE` header row, a circular HUD readout (static ring + one slowly counter-rotating dashed ring + one faster rotating scan arc + a small orbiting dot + a monospace "128" BPM readout at the center), and a footer row with BPM and an animated "● Playing" status dot.
- **Features**: intro + responsive 6-card grid (Drum machine, Piano roll, Mixer, Mastering, Recording, Sound library), each with a small CSS-shape icon. Cards lift 4px and their border switches to a solid accent line on hover (no shadow/glow).
- **Offline strip**: full-width light-background inverted-contrast band with a statement + CTA.
- **Pricing**: intro, a Monthly/Yearly toggle (segmented control; active segment gets a 2px coral underline, not a filled glow), two plan cards (Free/Pro) with feature lists and CTAs. Price/billing-note text update live with the toggle; the Pro price is in monospace.
- **Download**: intro + 3-card grid (Web, Desktop, Mobile); each CTA arrow nudges right 4px on hover.
- **Footer**: logo + tagline, one link column, CTA button, copyright.

### 2. Brand guide (`BTZ Varumärkesguide.dc.html`)
Static reference document, 5 sections: Logo, Color, Typography, Tone of voice, and **05 — Tech texture & motion** (the HUD system rulebook: monospace-for-data, corner brackets used once per screen, dot-grid texture, motion easing, and "glow confirmation" — note this last item is superseded by `DEVELOPER_SPEC.md` §2, which documents the final line-based (no-glow) treatment; the brand guide's illustration of a glow pill is a leftover from an earlier pass and should be read as "solid accent border/underline," not a blurred shadow).

### 3. Studio concept (`BTZ Studio (skiss).dc.html`)
A single "app window" (browser-chrome frame) with:
- A dot-grid background texture and four corner brackets framing the whole window (the one "focal HUD frame" per screen — see `DEVELOPER_SPEC.md` §9).
- A top bar: logo, session name, a 3-bar "now playing" equalizer icon + monospace BPM + timecode, Export button.
- A segmented tab control for 6 tools (Drum machine, Piano roll, Mixer, Mastering, Recording, Sound library) — active tab has a 2px coral bottom border, not a glow.
- Each tool panel plays a ~350ms scale/opacity "boot" transition plus a single scan-line sweep when it mounts (i.e. every time you switch tabs), simulating a panel "powering on."
- Panel content: Drum machine (pattern chips A–D, per-track pan knobs, 16-step grid — **the grid cells themselves are static and untouched by playback state**, per the "now playing" rule below), Piano roll (ruler, keys, notes, grid lines, a moving playhead line, a velocity lane), Mixer (per-channel insert-effect chips + pan knob + fader), Mastering (EQ curve SVG, loudness bars, limiter dial), Recording (multi-track waveform lanes, input meter, drag-drop import), Sound library (search/filter row + sound cards with hover border-line).

**Important behavior note**: earlier iterations tried showing "the beat playing" by animating a line/overlay across the step grid or flashing individual step cells — both were rejected in review as visually noisy and as touching content the user is editing. The **final, correct pattern** is: playback state is shown *only* via the transport-bar "now playing" equalizer icon (chrome-level) and, where a canvas genuinely has a moving position (piano roll, arrangement view), a plain 1px playhead line with no glow — never a tint, flash, or overlay on the grid/pad/note elements themselves.

## Interactions & Behavior
- **Pricing toggle**: two-state segmented control. Toggling recomputes displayed price and billing-note text; active segment shown via a 2px coral bottom border, no fill/glow.
- **Studio tool tabs**: 6-way single-select segmented control; switching plays the boot transition (see above) on the new panel.
- **Hero HUD ring**: continuous CSS keyframe loops (no user interaction) — recreate as CSS animations, not JS-driven. Three independent rotations at different speeds (a ~4s scan arc, a ~14s counter-rotating dashed ring, a ~3s orbiting dot) — keep these three distinct speeds; a single shared rotation reads as one dumb spinner instead of an instrument.
- All hover/active states across both files are line-based (border-color swap, underline, or outline) — **do not add box-shadow/glow** anywhere; an earlier draft did and it was explicitly removed in review.
- All other elements (feature cards' internal graphics, download cards, library grid content, mixer fader positions, EQ curve shape, waveforms) are static in this prototype — no click handlers. In the real product these are where the actual audio engine/interactions attach (mixer faders draggable, step grid cells clickable, library items draggable onto tracks, etc.) — functionality to be designed and implemented by engineering, not specified here.
- **Responsive behavior**: the landing page is fluid (grid `auto-fit`/`minmax`, `clamp()` type sizes, flex-wrap) — no fixed breakpoints, reflows naturally to mobile widths. The studio concept window is a fixed-size app frame (1120×700) as a desktop reference only — see `DEVELOPER_SPEC.md` §10 for touch/mobile guidance.

## State Management
- `billingPeriod`: `'monthly' | 'yearly'` — drives displayed Pro price and note on the pricing section.
- `activeTool`: `'drums' | 'piano' | 'mixer' | 'mastering' | 'record' | 'library'` — drives which studio panel renders (and re-triggers the boot transition).
No other state exists in these prototypes; real app state (projects, tracks, playback position, mixer levels, etc.) is out of scope here.

## Design Tokens
Full token sheet (dark + light, every surface/text/border/accent/semantic/canvas role) is in **`tokens.css`** — that file is the source of truth, not the summary below.

- Base background: `oklch(15% 0.015 260)` / `#080b12`
- Surface: `oklch(19% 0.02 260)` / `#0f141d` (nested surfaces run `oklch(18–24% 0.02 260)`)
- Text primary: `oklch(96% 0.01 260)` / `#eef2f9`
- Accent Coral (primary): `oklch(75% 0.19 25)` / `#ff746e`
- Accent Lime: `oklch(75% 0.19 130)` / `#85c425`
- Accent Blue: `oklch(75% 0.19 250)` / `#36b2ff`
- Only these 3 accent hues are used anywhere — no off-hues.

**Typography**:
- Headlines & UI chrome: **Manrope**, 600–800.
- Body copy: **Sora**, 400–600.
- Numeric/technical readouts (BPM, timecode, prices, session IDs): **JetBrains Mono**, 500–600 — see `DEVELOPER_SPEC.md` §6 for the full rule.

**Spacing / radius** (tightened from the first draft — use these, not 20/24px):
- Card radius: **12px** (content/marketing cards), **14px** (pricing cards), 100px (pills/buttons).
- Section max-width: 1240px (landing page), 1000px (brand guide), centered with 24px side padding.
- Grid gaps: 16–24px typical.

## Assets
No image/photo assets — all graphics are CSS shapes (divs) or inline SVG (the EQ curve line in Mastering; the logo files in `logo/`). No external icon libraries. Fonts loaded from Google Fonts (Manrope, Sora, JetBrains Mono).

Logo files in `logo/`: `btz-mark.svg` (bars only), `btz-lockup.svg` (mark + wordmark), `favicon.svg`, `app-icon-maskable.svg`.

## Files
- `BTZ Landningssida.dc.html` — marketing landing page (final)
- `BTZ Varumärkesguide.dc.html` — brand guide (logo, color, type, tone, tech texture) — see note in §2 above re: superseded glow illustration
- `BTZ Studio (skiss).dc.html` — studio app UI concept, 6 tool panels, final HUD treatment
- `tokens.css` — full dark+light CSS custom properties, source of truth for all colors
- `DEVELOPER_SPEC.md` — full answer to the engineering brief: accent rules, canvas hex values, component specs, typography, motion system, mobile guidance, naming
- `logo/` — SVG mark, lockup, favicon, maskable app icon
- `browser-window.jsx` — cosmetic browser-chrome frame used only to present the studio concept in this file; not part of the real app
