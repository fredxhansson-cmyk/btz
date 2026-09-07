# Fuse — Build Spec for Claude Code (Consolidated, Final)

This replaces all prior handoff docs as the single source of truth. If anything here conflicts with `README.md`, `DEVELOPER_SPEC.md`, `FUSE_UI_REDESIGN_CHECKLIST.md`, or `ELEMENTS.md`, **this file wins** — those are background reading, this is the build order.

The product is named **Fuse** (previously called "BTZ" during design — that name is gone, don't use it anywhere in code, copy, or file names).

## Why this doc exists
The previous attempt at implementing this design (screenshot the team reviewed) came out looking like a generic DAW: teal/purple/pink/orange channel colors, blurred glow on hover states, inconsistent radii, no monospace on numbers. That is NOT this design. This doc exists to remove every place that could be misread.

## The 5 things that make this Fuse and not a generic DAW
If you implement nothing else, these 5 rules are what make the UI recognizably "Fuse":

1. **Exactly 3 accent colors, never more, cycled per-item — not per-preference.** Coral `#ff746e`, Lime `#85c425`, Blue `#36b2ff`. Every channel/track/instrument row in a list gets ONE of these three, assigned by cycling through them in order (row 1 = coral, row 2 = lime, row 3 = blue, row 4 = coral again, and so on). Never introduce a 4th hue. Never let two adjacent rows share a hue if avoidable.
2. **One separate red, one meaning.** `--color-record` (`#f1383e`) means "recording is armed" or "this meter is clipping." Nothing else in the UI is ever this red. It is not a general-purpose accent.
3. **No glow, ever.** Every hover/active/selected state is a flat border-color change, a 2px underline, or a solid fill — never a `box-shadow` blur. If you're tempted to add a shadow to make something feel "lit up," use a solid-color border or fill instead.
4. **Every number is monospace.** BPM, timecodes, note names, dB, LUFS, counts, prices — all in JetBrains Mono. Every label/word around those numbers is Manrope or Sora. Mixing these up (numbers in Sora, or labels in monospace) is the single most common mistake to avoid.
5. **Playback state never touches content.** When something is playing, the ONLY thing that shows it is a small 3-bar equalizer icon in the transport bar and a plain 1px playhead line in canvases (piano roll, arrangement). Step cells, drum pads, notes, and waveforms never flash, tint, or pulse because of playback. If you're about to animate a grid cell because the beat is playing, stop — that's the exact mistake the last build made.

## Build order
1. Import `tokens.css` as-is into the app's global styles. Do not rename variables. Do not invent additional colors — if you need a color not in this file, you're about to break rule 1 or 2 above; ask instead.
2. Set global fonts: Manrope (headings/UI/buttons), Sora (body), JetBrains Mono (numbers). Load all three from Google Fonts, weights per `DEVELOPER_SPEC.md` §6.
3. Set global radii: 12px on panels/cards, 8–10px on buttons/pills that aren't fully round, 100px on true pills/toggles, 4px on grid/step cells. Audit every existing rounded corner against this scale — no exceptions, no "close enough."
4. Implement the control-state table in `DEVELOPER_SPEC.md` §4 as a shared component/mixin so every button, tab, toggle, and menu item in the app inherits it automatically, instead of being styled ad hoc per screen. This is what prevents color drift screen-to-screen.
5. Build screens in this order, checking off `ELEMENTS.md`'s per-screen checklist as you go: Top bar/Transport → Left view rail → Sound browser → Arrange → Channel Rack → Piano Roll → Drum Machine → Mixer → Mastering → the remaining secondary screens (Automation, Video, Live Inputs, Command Palette, Settings, etc.).
6. Two required interaction behaviors (do not skip, they were called out as commonly missed):
   - **Draw + resize in one gesture**: in the Piano Roll and Arrangement view, pointer-down on empty space creates a note/clip AND immediately enters resize mode — the user drags right to set length in the same motion, no second click. A plain click with no drag uses the last-used length.
   - **Multiple volume/automation keyframes per clip**: with the Volume/pen tool active, every click on a clip adds one keyframe point; many points are allowed per clip; dragging a point moves it; shift-click or right-click removes it. The volume line is always visible and draggable, even with zero points.
7. Reference screens already built as ground truth for exact visual output — recreate these pixel-for-pixel, don't reinterpret:
   - `BTZ Landningssida.dc.html` → the marketing landing page (rename all "BTZ" text to "Fuse" — already done in this file, verify no leftovers).
   - `BTZ Studio (skiss).dc.html` → the 6-tool studio concept (drum machine, piano roll, mixer, mastering, recording, sound library) — shows correct tab styling, boot/panel-switch transition, and the "now playing" equalizer pattern.
   - `Fuse Arrangement (skiss).dc.html` → the Arrangement/Mixer/Mastering-chain screen, a direct redesign of the old "Fuse-generic" screenshot — use this as the literal reference for that view's layout and every color/type/radius decision on it.
   - `BTZ Varumärkesguide.dc.html` → brand rules (logo usage, color, type, tone). Ignore its "glow confirmation" swatch — that was an earlier draft and is superseded by rule 3 above (no glow).

## Definition of done
Copy the checklist from `ELEMENTS.md`'s "Definition of done" section at the bottom — it is unchanged and still authoritative. The short version: only 3 accents + record-red appear anywhere; no glow anywhere; all technical numbers are monospace; radii are 12/8–10/100/4px consistently; playback never animates content cells; light theme has full parity; the logo never has its bar order changed.

## If something is genuinely ambiguous
Don't guess and don't default to a "safe" generic DAW look (grey panels, mixed accent colors, drop shadows) — that is the exact failure mode this doc exists to prevent. Flag the ambiguity back to the design team instead of shipping a guess.
