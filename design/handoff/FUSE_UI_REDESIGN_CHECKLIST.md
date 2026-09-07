# BTZ Redesign Checklist — Fuse UI → BTZ HUD system

This is a **complete visual redesign spec** for the current app screenshot ("Fuse"), element by element. Nothing here is optional polish — every colored/typeset element in the current build needs to change. Cross-reference `tokens.css` and `DEVELOPER_SPEC.md` for exact values; this file maps THIS SPECIFIC SCREEN's current elements to those tokens so nothing is missed.

**The single biggest problem with the current build**: it uses an uncontrolled rainbow palette — teal, purple, pink, orange, yellow-green, plus red, scattered across channels, mixer strips, and browser tags. The whole point of the BTZ system is exactly three accents (coral/lime/blue) plus one separate semantic record-red. Collapsing this palette is the most important single change.

## 1. App shell (do once, globally)
- Background everywhere: `--color-bg` (`#080b12`), never the current flat black/near-black.
- Add the dot-grid texture (`radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)`, 22–28px tile) to the app's base background layer only — not layered on top of dense panels where it'd hurt legibility.
- Add ONE set of corner brackets (4 small L-marks, coral, ~50% opacity) framing the entire app window — not per-panel, not repeated on every card.
- Fonts: swap whatever grotesk/system sans is currently loaded for **Manrope** (headings, nav labels, button text, section headers) + **Sora** (body/description text) + **JetBrains Mono** (every number: BPM, bar:beat:tick, note names, counts, "384 ticks," "Insert N," etc.) — see `DEVELOPER_SPEC.md` §6.
- Radius audit: standardize every rounded-rect to 12px (panels/cards), 8–10px (buttons/pills that aren't fully round), 100px (true pills/toggles). The current build's radii are inconsistent — some elements look more rounded than others; flatten to this scale everywhere.
- No glow anywhere. Every "active/lit" state below is a solid line (border, underline, or fill), never a blurred shadow.

## 2. Top bar
- **Logo**: replace the current green/teal/yellow 3-bar "Fuse" mark with the BTZ mark (`logo/btz-mark.svg`, coral/lime/blue) + wordmark, Manrope 800.
- **File / Edit / View / Settings**: Manrope 600, 12–13px, `--color-text-secondary`; hover → `--color-text-primary`, no underline, no background.
- **Search bar ("Search / do anything ⌘K")**: `--color-field` background, `--color-border-default` outline, placeholder muted; the `⌘K` badge in JetBrains Mono.
- **Transport (play / stop / record circles)**: flat icon buttons, `--color-panel-nested` idle, `--color-hover` on hover — no filled colored circles at rest. The record button, when armed, fills with `--color-record` (the semantic recording red from tokens — distinct from and never confused with coral).
- **MIC / LINE toggle**: currently a solid red filled pill — restyle as a 2-segment control matching the Monthly/Yearly pattern: track `--color-panel-nested`, active segment gets a 2px `--color-record` bottom border (this is the one place `--color-record` doubles as an accent, since it's directly tied to input monitoring) — not a full red fill.
- **PAT / SONG toggle**: standard segmented control (see `DEVELOPER_SPEC.md` §4) — active segment `--color-text-primary` bg + 2px coral bottom border, inactive transparent/muted.
- **Time readouts (`001:1:00`, `130.0`, "BAR:BEAT:TICK", "TEMPO")**: numbers in JetBrains Mono `--color-text-primary`; the tiny caption labels underneath in Sora/Manrope, uppercase, `--color-text-muted`, smaller size.
- **MET / 4/4 dropdown / "No count-in"**: ghost buttons — transparent bg, `--color-border-default` outline, text `--color-text-secondary`; hover → border-color line to `--color-text-primary`, no fill change.
- **Master dial (top-right circular knob) + horizontal slider**: remove any colored gradient fill on the ring; use a thin single-color coral arc/line indicator on a `--color-border-default` track. "MASTER 1.40" label in JetBrains Mono.

## 3. Left sidebar
- **View icons (Arrange, Instr, Piano, Beat, Auto, Mixer, Master, Video, Inputs, Custom)**: the current "Instr" active state is a solid red/pink filled block — replace with the line convention: a 2px coral **left-border** on the active item, icon color coral, background `--color-selected` (a subtle neutral tint, not a colored fill); inactive icons `--color-text-muted`, hover → `--color-hover` background only.
- **AI / Custom tool icons**: same line treatment as above.
- **"Search sounds" field**: same styling as the top search bar.
- **Genre chips (808, trap, house, techno, lofi, edm, organic, latin, ambient, acid)**: `--color-panel-nested` bg, `--color-border-default` 1px border, text `--color-text-secondary`; selected/hover → border-color switches to coral (solid line, no fill change, no glow).
- **"Drums" section header + count ("45")**: Manrope 600, uppercase, `--color-text-muted`, small letter-spacing; the count number in JetBrains Mono.
- **Sample rows (808 Deep, 909 Punch, Acoustic Kick, etc.)**: the coral play-button squares are correct in hue — just tighten radius to 8–10px and confirm no shadow/glow on them. Row hover → `--color-hover` background, matching our sidebar-row spec in `DEVELOPER_SPEC.md` §5. **Remove the per-category colored tick/swatch bars** currently shown in ~6 different hues (teal, purple, pink, orange, yellow-green) — either drop them or recolor to cycle through only coral/lime/blue.

## 4. Center panel (channel rack / step sequencer)
- **"Instruments" label, "Pattern 1" dropdown, Bars stepper, Swing readout**: standard field/dropdown styling — `--color-field` bg, `--color-border-default`, hover line, numeric values in JetBrains Mono.
- **"+ Add to Arrangement"**: this is the one true primary action on this screen → solid coral fill, `--color-coral-ink` text, ~10px radius, hover → `--color-coral-hover`. No competing second coral-filled button on this screen.
- **"Piano Roll ▸", "Duplicate", "Clear all", "Pop out"**: secondary/ghost buttons — transparent bg, `--color-border-default` outline, hover → border-color to coral (line only).
- **Channel rows — the core fix**: every row currently gets its own hue from a wide rainbow (yellow-green, orange-red, teal, purple, pink, yellow ×2). Reassign so only coral/lime/blue are ever used, cycling per row (row 1 coral, row 2 lime, row 3 blue, row 4 coral, row 5 lime, row 6 blue, row 7 coral, etc.) — both the row's identifying tick/swatch AND its note cells must use the same reassigned hue.
- **Note cells (D#5, C4, E5, etc.)**: background = the row's reassigned accent; text = that accent's "ink" color (`--color-coral-ink` / `--color-lime-ink` / `--color-blue-ink`) in JetBrains Mono, since these are technical note-name labels.
- **M / S (mute/solo) buttons**: ghost text buttons; active state = `--color-selected` background + `--color-text-primary` text — **not** a colored fill. Mute/solo state is structural, not decorative, so it stays neutral.
- **Record-arm circle**: `--color-record` fill when armed (matches the top-bar transport record button) — this is correct as red in the screenshot, just make sure it's the token's specific red, not an arbitrary one.
- **Volume/pan knob icons**: the screenshot pairs a red arc knob with a green arc knob per row — collapse both to a single coral line-arc indicator (thin stroke, no fill) on a muted track; don't use red+green as a two-color knob convention, it reads as a 4th and 5th hue.
- **"INS 1" / "INS 2" instrument-slot pills + × remove**: ghost pill, JetBrains Mono for "INS N" (it's a technical index), `--color-text-secondary`.
- **Empty step cells**: `--color-panel-nested`, flat, static — no animation tied to playback (see `DEVELOPER_SPEC.md` §9's "now playing" rule: transport state never touches these cells).
- **Footer status line ("7 channels · 16 steps · 384 ticks", "Click = add · right-click = remove...")**: JetBrains Mono, `--color-text-muted`, small.

## 5. Right sidebar (Mixer + Mastering chain)
- **"MIXER" label + "Mastering →" link**: Manrope 600 label; the link in coral text, hover → 4px translateX nudge (matches the landing page's download-link convention), no underline needed.
- **8 channel-strip "C" icons**: same fix as the channel rack — collapse the ~6 current hues to a coral/lime/blue rotation, one accent per channel, cycling.
- **Faders**: track = `--color-border-default`, cap = `--color-text-primary` (flat, no color-per-channel on the fader itself — only the header "C" icon carries the channel's identifying hue, to avoid doubling up on color).
- **M / S buttons**: same neutral `--color-selected` treatment as the channel rack, not colored.
- **"Insert 1"–"Insert 8" labels**: JetBrains Mono, small, `--color-text-muted`.
- **MASTERING CHAIN list (Eq3, Multiband, Comp, Dist)**: Sora for the name, `--color-border-subtle` divider between rows; the "on" indicator — replace the current plain dot with a small filled coral dot when on, `--color-text-muted` outline dot when off (a line/outline, not a colored glow), "on"/"off" text itself in JetBrains Mono, muted.

## 6. Bottom bar
- **Status message ("Press PLAY to start...")**: Sora, `--color-text-muted`.
- **"Install app" button**: make this secondary (ghost/outline coral border, transparent fill) so it doesn't visually compete with "+ Add to Arrangement" as a second loud coral-filled CTA on screen at once.
- **Theme (sun) icon**: line icon, muted, hover → coral.
- **"0 notes/s · timer", "Octave 4", "130.0 BPM", "PATTERN"**: JetBrains Mono, `--color-text-muted`, separated by thin `--color-border-subtle` vertical dividers instead of the current "·" characters if that's easy — otherwise the dot separators are fine, just set them in the muted color too.

## Summary of what must never survive into the redesigned screen
- Teal, purple, pink, orange, or yellow-green anywhere (channel colors, browser tags, knob pairs) — only coral, lime, blue, plus the one semantic record-red.
- Any blurred glow/box-shadow on an active/hover state — replace with a solid border, underline, or fill.
- Two coral-filled primary buttons visible on screen at the same time ("+ Add to Arrangement" and "Install app" both solid coral, currently).
- Non-monospace numbers anywhere technical (BPM, timecodes, note names, counts, insert indices).
- Inconsistent corner radii — flatten to the 12px / 8–10px / 100px scale.
