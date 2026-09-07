# BTZ — Developer Design Spec (response to implementation brief)

Companion to `tokens.css` and `logo/`. Read `README.md` first for general context.

## 2. Accent usage rules
One rule per hue — accents are never interchangeable:
- **Coral** = primary action everywhere: primary buttons/CTAs, the single "active/on" state (armed track focus ring aside — see semantic colors), selected tab/segment, EQ curve line, selected piano-roll note, timeline clip/loop borders, the HUD/scan accent (see §9).
- **Lime** = "content/data" color: default piano-roll note fill, default waveform/meter-low, on-target LUFS. Use it for anything representing the user's actual audio content, not UI chrome.
- **Blue** = informational/monitoring: focus ring, spectrum analyzer bars, input-level meter, default waveform in the Recording view, "under target" LUFS state.
- Never use more than 2 accents in the same small component (e.g. one control shouldn't mix coral+lime+blue). Semantic colors (record red, success green, warning amber) are separate from the 3 brand accents and only ever mean their one thing (recording-armed, on-target/success, warning) — don't reuse them decoratively.
- **No glow.** An earlier pass used blurred coral `box-shadow` glow as the interaction signal; that's been replaced everywhere with **crisp lines**: a solid border-color change, a 2px bottom-border/underline on the active tab or toggle segment, or a 1px outline. Do not reintroduce blurred glow/shadow effects — every "lit up" state in the final files is a line, not a shadow.

## 3. Canvas hex values
All in `tokens.css` under the "Canvas" sections. Summary:
- **Piano roll**: notes `--pr-note-fill` (lime), selected `--pr-note-selected` (coral), ghost notes from other channels `--pr-note-ghost` (18% white/black depending on theme). Grid: bar lines 14% white, beat lines 8%, sub-beat 4% (`--pr-grid-*`). Row shading: white-key rows use `--pr-key-white`, black-key rows `--pr-key-black`.
- **Arrangement/timeline**: clip fill is the owning track's accent at 18% opacity with a full-opacity border in that same accent (`--tl-clip-fill`/`--tl-clip-border` shown for coral; recompute per track color). Fade line and volume/keyframe line both use `--tl-volume-line` (primary text color) for max contrast over any clip color. Playhead = `--tl-playhead`. Loop region = coral at 10–12% fill with coral border. Markers = warning amber. Alternate takes shade between `--tl-take-a`/`--tl-take-b` (panel vs nested-panel).
- **Mixer meter**: 3-stop gradient low→mid→hot using `--meter-low` (lime) → `--meter-mid` (amber) → `--meter-hot`/`--meter-peak` (red). Fader track `--fader-track`, cap `--fader-cap`.
- **Spectrum analyzer**: bars in `--spectrum-bar` (blue), reference curve a dashed line in `--spectrum-reference-line` (40%/35% white/black).
- **Mastering**: LUFS bar recolors live — under target blue, on target lime, over target red (`--lufs-*`). EQ curve line is always coral (`--eq-curve-line`), regardless of theme, so it reads as "the thing you're shaping."
- **Waveform**: default blue, selected/active region switches to coral (`--waveform-fill`/`--waveform-selected`).

## 4. Interactive control states
General pattern used everywhere (buttons, segmented control, dropdown, input, slider, menu item, toggle):
| State | Background | Border | Text |
|---|---|---|---|
| Default | `--color-panel` / transparent | `--color-border-default` | `--color-text-primary` or `-secondary` |
| Hover | `--color-hover` | `--color-border-default` | unchanged |
| Active/selected | `--color-coral` (primary) or `--color-selected` (neutral selection, e.g. selected list row) | none / accent | `--color-coral-ink` on coral, else `--color-text-primary` |
| Pressed | `--color-pressed` | `--color-border-strong` | unchanged |
| Disabled | `--color-panel` at reduced opacity (~40%) | `--color-border-subtle` | `--color-text-muted` |
| Focus-visible | unchanged | add 2px outline `--color-focus-ring`, 2px offset | unchanged |

Component-specific notes:
- **Segmented control (tabs)**: track = `--color-panel-nested`; active segment = `--color-text-primary` bg with `--color-bg` text (matches the studio concept file exactly) — this is an exception to "coral = active," used because it's chrome-level navigation, not a content action.
- **Step/grid cell**: off = `--color-panel-nested`; on = the track's assigned accent; accented/ghost (e.g. probability <100%) = accent at reduced opacity.
- **Drum pad**: idle = `--color-panel-nested`; lit (triggered) = `--color-coral` flash for ~80ms then decay back to idle (see Motion §9).
- **Toggle/checkbox**: off track = `--color-border-default`; on track = `--color-coral`; knob always `--color-text-primary`.

## 5. Component visual specs
- **Top transport bar**: `--color-chrome` background, 1px `--color-border-subtle` bottom border, 56px height. Play/pause/stop as icon buttons (see button states above); BPM and bar:beat:tick in tabular-numeral monospace (§6); a 3-bar "now playing" equalizer icon sits beside the BPM readout (see §9) — this is the only playback indicator, nothing on the canvas itself pulses or tints to show transport state.
- **Sounds browser sidebar**: `--color-panel` background, list rows 36px tall, `--color-hover` on row hover, `--color-selected` when a sound is loaded/previewing. Category headers: 11px uppercase `--color-text-muted`, letter-spacing 0.05em. Each row has a small circular play button (18px, `--color-panel-nested` idle → coral on hover/playing).
- **Dropdown menus (File/Edit/View)**: `--color-panel` bg, 1px `--color-border-default`, 8px radius, 6px padding, item height 32px, `--color-hover` on hover, disabled items at `--color-text-muted` with no hover.
- **Modals/dialogs**: `--color-panel` on a scrim of `--color-bg` at 70% opacity, 16px radius, 32px padding, max-width 480px for confirmation dialogs / 640px for settings.
- **Command bar (⌘K)**: centered overlay, `--color-panel` bg, 12px radius, same scrim as modals; input row uses `--color-field`; results list rows match sidebar row spec.
- Card padding standard: 16px (dense contexts like mixer channel strips) / 24px (marketing/content cards, matches landing page). Corner radius was tightened from the first draft: 12px on marketing/content cards (was 20px), 14px on pricing cards (was 24px), pills stay fully round (100px) — sharper radii read more "instrument," less "consumer app." Apply this 12/14px scale everywhere in the app UI too, not just marketing.

## 6. Typography
- **Headings / section titles**: Manrope 700–800.
- **Control labels, UI chrome (buttons, tabs, menu items)**: Manrope 600, 12–13px — do not use Sora here, it reads too soft at small UI sizes.
- **Body copy (settings descriptions, empty states, tooltips)**: Sora 400–500.
- **Monospace/tabular numeric readouts (BPM, bar:beat:tick, dB, LUFS)**: use a tabular-figure monospace, e.g. **JetBrains Mono** or **IBM Plex Mono** (both on Google Fonts, both have a true monospace numeral 0 that won't wobble in a fast-updating readout) at 500 weight.
- Confirmed: replace Instrument Sans with **Manrope** (weights 500/600/700/800) for headings/UI and **Sora** (weights 400/500/600/700) for body, loaded via Google Fonts.

## 7. Logo
See `logo/`: `btz-mark.svg` (bars only, for toolbar/favicon), `btz-lockup.svg` (mark + wordmark), `favicon.svg`, `app-icon-maskable.svg` (512×512, safe-zone padding built in for maskable use — generate the regular/non-maskable icon by dropping the padding). Color order left-to-right is fixed: **coral, lime, blue** — never reorder. The mark does not animate anywhere in-app in this concept; if you want a launch/loading state, pulsing the bars with the same `btz-pulse` keyframe used on the landing page (scaleY, staggered delay) is consistent with the brand, but this wasn't specified as a requirement — confirm before building it.

## 8. Light theme
Full light-theme token set is in `tokens.css` under `[data-theme="light"]`, covering every role from §1 (surfaces, borders, text, accents+ink, semantic, and all canvas roles). Accent hues are unchanged; lightness/chroma are retuned slightly darker so they hold 4.5:1 text contrast on white where used as text, and ink flips to white on all three accents in light mode.

## 9. Motion — "HUD" system
The final direction is a light holographic/HUD register, used consistently across marketing and app, built from a small, repeatable set of pieces — not decoration added per-screen:

- **Dot-grid texture**: 1px dots on a 22–28px grid, ~4–6% white opacity, on dark surfaces only (`radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)` sized 22–28px). Gives a "precision instrument" backdrop.
- **Corner brackets**: four small L-shaped marks (2px border, ~16–18px arms, coral, ~50% opacity) at the corners of exactly **one** focal panel per screen — the hero player card on the landing page, the whole app window frame in the studio. Never repeat on every card; it stops meaning anything if overused.
- **Monospace for data**: JetBrains Mono for BPM, timecodes, prices, session IDs — see §6. Never for headings/body.
- **Line-based interaction states**: see §2 — hover/active/selected is always a solid border-color, an underline, or a 1px outline. No blurred glow.
- **Boot/open transition**: when a window or tool panel opens (e.g. switching the studio's tool tabs), play a ~350ms `scale(0.97)→1` + opacity fade (`cubic-bezier(0.16,1,0.3,1)`), plus a single 1px horizontal line sweeping top-to-bottom over ~700ms, ease-out, fading out as it goes — a quick "power-on" beat, not a slide or bounce. This replays every time the panel mounts, not just on first load.
- **"Now playing" indicator**: rhythm/playback state is shown via a small 3-bar equalizer icon (3px bars, `scaleY` bounce, staggered ~160ms delays, tempo-matched duration e.g. `60/BPM` seconds) placed in the transport bar next to the BPM readout — never as an overlay on the step grid, piano roll, or any content the user is editing. Content cells (drum pads, piano notes, waveform) stay visually untouched by transport state; only chrome-level indicators (this icon, a moving playhead line in the arrangement/piano-roll canvas itself) show playback.
- Hover transitions: 150–250ms `cubic-bezier(0.16,1,0.3,1)` (expo-out) on color/background/border — fast start, soft landing, no bounce/elastic easing anywhere.
- Panel/tab switches: the boot transition above (~350ms), not a slide.
- Menu/dropdown open: 100ms ease-out, 4px translate-up + fade.
- Keep in-app motion under ~350ms — this is a fast, professional tool, not a marketing site; the landing page's slower (600–700ms) hero entrance animation is marketing-only and shouldn't be reused in-app.

## 10. Mobile/touch layout
The studio concept's 1120×700 window is a desktop reference only. For touch: keep the same token set as-is (no mobile-specific colors needed). Layout guidance: bottom nav should reuse the segmented-control token treatment (active = `--color-text-primary` pill on `--color-panel-nested` track) rather than introducing a new nav style. Touch targets should hit 44px minimum, which likely means the drum pad grid and mixer fader hit-areas need larger invisible padding beyond their visual size — visual size can stay as designed.

## 11. Naming
No final name yet — "BTZ" is a working placeholder per the brief. The mark's structure (3 bars, coral/lime/blue) is designed to survive a rename (it doesn't spell anything), so you can ship the visual system now and swap only the wordmark text/typeset later. We'll share the final name and any updated wordmark as soon as it's decided.
