# Fuse / BTZ — Element Manifest (alla vyer)

> **Syftet:** en komplett lista på VARJE element som ska designas/byggas, med exakt vilken
> token/regel varje element ska följa — så Claude kan implementera utan att gissa eller
> hitta på ny design. Designen är redan bestämd; detta är bara elementen.
>
> **Sanningskällor (rör inte, följ):**
> - `design/handoff/tokens.css` — alla färg-/font-/canvas-tokens (dark + light). Redan
>   speglad till `styles/tokens.css` i appen.
> - `design/handoff/DEVELOPER_SPEC.md` — regelboken (accentregler, kontroll-states, motion).
> - `design/handoff/FUSE_UI_REDESIGN_CHECKLIST.md` — element-för-element för HUVUDSKÄRMEN.
> - `design/handoff/logo/` — btz-mark, lockup, favicon, app-icon.
>
> Detta dokument **utökar** checklistan till appens ÖVRIGA vyer (arrange, automation,
> mastering, video, live inputs, workspace, ⌘K, AI, record, settings, projects, onboarding,
> help, pricing, landing). Där checklistan redan täcker en yta pekar jag dit istället för
> att upprepa.

---

## 0. De regler som styr ALLT (kondenserat ur DEVELOPER_SPEC.md)

1. **Tre accenter, en roll var — aldrig utbytbara:**
   - **Coral** (`--color-coral`) = primär handling + det enda "aktivt/på"-läget + vald flik/
     segment + vald not + klipp-/loop-kant + EQ-kurva + HUD-accent.
   - **Lime** (`--color-lime`) = användarens *innehåll/data* (not-fyllnad, meter-low, LUFS på mål).
   - **Blå** (`--color-blue`) = info/mätning (fokusring, spektrum, input-meter, waveform, LUFS under mål).
2. **Record-röd** (`--color-record`) är SEPARAT semantik — betyder bara "inspelning armad".
   Får aldrig återanvändas dekorativt. (+ success-grön, warning-amber = bara sin sak.)
3. **Max 2 accenter i samma lilla komponent.**
4. **Ingen glow.** Varje "tänt" tillstånd = skarp linje (border-color, 2px underline, 1px
   outline) eller fylld yta. Aldrig blurrad box-shadow.
5. **Alla siffror i JetBrains Mono** (BPM, bar:beat:tick, dB, LUFS, note-namn, count, "INS N", pris).
6. **Radie-skala överallt:** 12px paneler/kort · 8–10px knappar/pills · 100px äkta pills/toggles · 4px celler.
7. **Typsnitt:** Manrope 600–800 (rubrik/UI/knappar), Sora 400–500 (body/beskrivning), JetBrains Mono (siffror).
8. **Playback visas bara i chrome:** 3-stapel "now playing"-EQ i toppbaren + 1px playhead-linje
   i canvas. ALDRIG tint/flash/overlay på steg, pads, noter eller waveform.

### Kontroll-states (gäller varje interaktivt element — DEVELOPER_SPEC §4)
| State | Bakgrund | Kant | Text |
|---|---|---|---|
| Default | `--color-panel` / transparent | `--color-border-default` | primary/secondary |
| Hover | `--color-hover` | default | oförändrad |
| Aktiv/vald | `--color-coral` (primär) *eller* `--color-selected` (neutralt val) | ingen/accent | `--color-coral-ink` på coral, annars primary |
| Pressed | `--color-pressed` | `--color-border-strong` | oförändrad |
| Disabled | `--color-panel` ~40 % | `--color-border-subtle` | `--color-text-muted` |
| Fokus | oförändrad | 2px `--color-focus-ring` (blå), 2px offset | oförändrad |

### Globalt app-skal (gör en gång — checklista §1)
- Bakgrund överallt `--color-bg` (`#080b12`). Dot-grid-textur bara på baslagret
  (`radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)`, 22–28px tile).
- EN uppsättning hörn-brackets (4 L-märken, coral ~50 %) runt hela app-fönstret — ej per panel.
- Motion: hover 150–250ms expo-out; panelbyte ~350ms "boot" (`scale(.97)→1` + scanline-sweep);
  meny 100ms + 4px translate-up. Håll in-app-motion < 350ms. Respektera `prefers-reduced-motion`.

---

## Vy-index (allt som ska finnas)
Toppbar · Vänster view-rail · Ljudbrowser · **Arrange** · **Instruments/Channel Rack** ·
**Piano Roll** · **Drum Machine** · **Mixer** · **Automation** · **Mastering** · **Video** ·
**Live inputs** · **Workspace** · **⌘K Command Palette** · **Fuse Brain (AI)** · **Record Panel** ·
**Settings** · **Projects Modal** · **Onboarding** · **Help Overlay** · **Plugin/PopOut** ·
**Pricing** · **Landing**. Nedan: elementen per vy → token/regel.

---

## A. Toppbar / Transport  (`Transport.js`, `.header`)
Täcks av checklista §2 — sammanfattat, plus resten av headern:
- [ ] **Logo:** `logo/btz-mark.svg` (coral/lime/blå, aldrig ordna om) + wordmark Manrope 800.
- [ ] **File / Edit / View / Settings:** Manrope 600 12–13px, `--text-secondary`; hover→primary, ingen fyllning.
- [ ] **⌘K-sökfält (`.cmdPill`):** `--color-field` bg, `--border-default` kant, placeholder muted, `⌘K` i mono.
- [ ] **Play / Stop / Record (`.tbtn`):** platta ikon-knappar, `--color-panel-nested` idle, `--color-hover` hover,
      **inga fyllda färgcirklar i vila.** Record armad = `--color-record` fylld. *(Play "på" följer coral per
      state-tabellen — men i vila är den neutral; ingen coral/röd förväxling i vila.)*
- [ ] **MIC / LINE:** 2-segments-kontroll (som Monthly/Yearly): track `--color-panel-nested`, aktivt segment
      2px `--color-record` bottenkant — **INTE full röd fyllning.** *(Detta åtgärdar "oproffsig röd".)*
- [ ] **PAT / SONG:** segmented control; aktivt segment `--text-primary` bg + 2px coral bottenkant.
- [ ] **Tid `001:1:00` / `130.0` / labels:** siffror JetBrains Mono `--text-primary`; captions ("BAR:BEAT:TICK",
      "TEMPO") Manrope versal `--text-muted`, mindre.
- [ ] **MET / taktart-dropdown / count-in:** ghost-knappar (transparent, `--border-default`, text secondary; hover→kantlinje primary).
- [ ] **Master-ratt + slider:** ingen färggradient på ringen; tunn enfärgad coral-båge på `--border-default` track; "MASTER" i mono.
- [ ] **"Now playing"-EQ (`.nowPlaying`):** 3 staplar (3px), `scaleY`-studs, staggade ~160ms, tempo-matchad (`60/BPM`s).
      Enda playback-indikatorn i chrome.

## B. Vänster view-rail  (`.iconRail`, ikoner: Arrange, Instr, Piano, Beat, Auto, Mixer, Master, Video, Inputs, Custom, AI)
Checklista §3 (view-ikoner):
- [ ] Aktiv post: 2px coral **vänster-border** + ikon coral + bg `--color-selected` (neutral tint, ej färgfyllning).
- [ ] Inaktiv ikon `--text-muted`; hover→`--color-hover` bg. Textlabel under ikonen Manrope 600.

## C. Ljudbrowser / vänster bibliotek  (`Browser.js`)
Checklista §3 (browser):
- [ ] **"Search sounds"-fält:** som toppbarens sökfält.
- [ ] **Genre-chips (`.chip`):** `--color-panel-nested` bg, 1px `--border-default`, text secondary; vald/hover→kant blir coral (linje, ingen fyllning/glow).
- [ ] **Sektionsrubrik + räknare ("Drums 45"):** Manrope 600 versal `--text-muted`; siffran i mono.
- [ ] **Sample-rader:** coral play-knapp-ruta (radie 8–10px, ingen skugga); rad-hover `--color-hover`; rad 36px hög.
- [ ] **Ta bort per-kategori-färgade swatch-barer** i ~6 nyanser → droppa eller cykla bara coral/lime/blå.

## D. Arrange / Arrangement  (`Playlist.js`, canvas)  ← utöver checklistan
Syfte: pattern-klipp på spår över tid; fades, klippvolym, keyframes.
- [ ] **Verktygsrad rad 1:** "Arrangement · Placing [Pattern▾] · Snap [1/16▾] · [Select] [Volume] · Zoom +−".
      Aktivt verktyg = `--color-selected` (neutralt), ej coral-fyllt. Dropdowns: `--color-field`.
- [ ] **Verktygsrad rad 2:** "Tracks · +Track −Track · Play song · +Marker · +Tempo · Loop" → ghost-knappar.
- [ ] **Grid:** botten `--color-panel-deep`; takt-linjer `--pr-grid-bar` (14 %), beat 8 %, sub 4 %; bar-nr i mono `--text-muted`.
- [ ] **Klipp (`--tl-clip-*`):** fyllnad = **ägande spårs accent @ 18 %** + heldragen kant i samma accent
      (recompute per spår — coral/lime/blå-rotation, EJ allt coral). Klippnamn Manrope, `--text-primary`.
- [ ] **Vald klipp:** coral kant (`--tl-clip-border`) + vita hörnhandtag.
- [ ] **Fades:** dra övre hörn; linje `--tl-volume-line` (primary text-färg).
- [ ] **Volymlinje + keyframes:** linje `--tl-volume-line`; punkter små rutor (vald=coral, annars primary),
      radie 3px, träffyta 12px. **Beteende:** se §Interaktioner nedan (flera punkter, dra, ta bort).
- [ ] **Playhead:** 1px `--tl-playhead`. **Marker:** `--tl-marker` (amber). **Loop:** coral @ 10–12 % + coral kant.
- [ ] **Takes:** växla `--tl-take-a`/`--tl-take-b` (panel vs nested).
- [ ] **Spår-labels (Tr 1..N):** `--text-muted`. **M/S:** neutralt `--color-selected` aktivt (ej färgfyllt).

## E. Instruments / Channel Rack  (`ChannelRack.js`)
Täcks helt av checklista §4 — nyckelpunkter:
- [ ] **"+ Add to Arrangement":** den ENDA primära coral-fyllda knappen på skärmen (`--color-coral-ink` text, ~10px).
- [ ] **Sekundära (Piano Roll▸, Duplicate, Clear all, Pop out):** ghost, hover→coral kantlinje.
- [ ] **Kanalrader (`.chanRow`):** cykla coral/lime/blå per rad (1 coral, 2 lime, 3 blå, 4 coral…); swatch OCH note-celler samma nyans.
- [ ] **Note-celler (`.bigStep`):** bg = radens accent; text = accentens "ink" i mono. Tomma celler `--color-panel-nested`, statiska.
- [ ] **M/S:** neutralt `--color-selected` (ej färgfyllt). **Record-arm:** `--color-record`.
- [ ] **Vol/pan-rattar:** EN coral linje-båge (tunn, ingen fyllning) — inte röd+grön tvåfärg.
- [ ] **"INS 1/INS 2" + ×:** ghost-pill, "INS N" i mono `--text-secondary`.
- [ ] **Footer-status:** mono `--text-muted`.

## F. Piano Roll  (`PianoRoll.js`, canvas)  ← utöver checklistan
- [ ] **Klaviatur:** vit-rad `--pr-key-white`, svart-rad `--pr-key-black`; C-oktaver i mono.
- [ ] **Grid:** bar 14 % / beat 8 % / sub 4 % (`--pr-grid-*`).
- [ ] **Noter:** fyllnad `--pr-note-fill` (**lime**); vald `--pr-note-selected` (**coral**); ghost/andra kanaler `--pr-note-ghost` (18 %).
- [ ] **Velocity-lane:** staplar lime, dämpade.
- [ ] **Playhead:** 1px linje, ingen glow. **Marquee-val:** blå-tonad ruta.
- [ ] **Interaktion:** rita + dra-ut-längd i EN gest (se §Interaktioner).

## G. Drum Machine  (`DrumMachine.js`)
- [ ] **Pattern-chips A–D:** segmented/pills, aktiv = coral 2px underline.
- [ ] **Pads (`.dmPad`):** idle `--color-panel-nested`; triggad = **coral flash ~80ms** → decay till idle (motion §9). Ingen glow.
- [ ] **16-steg-grid:** av `--color-panel-nested`; på = spårets accent; ghost/probability<100 % = accent lägre alpha. **Statiskt vid playback.**
- [ ] **Per-track pan-knob:** coral linje-båge. **Lane-namn:** `--text-secondary`. Groove/swing: ghost + mono-värde.

## H. Mixer  (`Mixer.js`, `MixerColumn.js`)
Täcks av checklista §5:
- [ ] **"MIXER"-label + "Mastering →":** Manrope 600; länk coral text, hover→4px translateX.
- [ ] **Kanal-"C"-ikoner:** cykla coral/lime/blå per kanal (EN accent/kanal). **Fader:** track `--border-default`, cap `--text-primary` (ingen färg per kanal på själva fadern).
- [ ] **M/S:** neutralt `--color-selected`. **"Insert 1–8"-labels:** mono `--text-muted`.
- [ ] **Meter (`.meter`):** 3-stopp `--meter-low`(lime)→`--meter-mid`(amber)→`--meter-peak`(röd).
- [ ] **Mastering-chain-lista (Eq3, Multiband, Comp, Dist):** namn Sora; delare `--border-subtle`; på=liten coral prick, av=`--text-muted` outline-prick; "on/off" i mono muted.
- [ ] **FX-slot (`.fxSlot`):** `--color-panel-nested`; tom = streckad `--text-muted` kant.

## I. Automation  (`Automation.js`, canvas)  ← utöver checklistan
- [ ] **Parameter-väljare:** dropdown `--color-field`; vald parameter-rad `--color-selected`.
- [ ] **Envelope-kurva:** aktivt redigerad parameter = coral linje (som "det du formar", jfr EQ-kurva).
- [ ] **Keyframe-punkter:** som Arrange (§Interaktioner) — flera punkter, dra, ta bort. **Grid/snap:** som canvas ovan.
- [ ] **Playhead:** 1px linje.

## J. Mastering  (`Mastering.js`)
Canvas-hex ur DEVELOPER_SPEC §3:
- [ ] **Spektrum:** staplar `--spectrum-bar` (blå); referenskurva streckad `--spectrum-reference-line` (40 %).
- [ ] **LUFS-mätare:** under mål blå, på mål lime, över röd (`--lufs-*`); stort tal i mono.
- [ ] **EQ-kurva:** alltid coral (`--eq-curve-line`) i båda teman.
- [ ] **Genre-preset-knappar:** vald = `--color-selected` (ej coral-fylld). **Limiter-dial:** coral linje-båge.
- [ ] **Gain-reduction-meter:** röd endast vid faktisk GR.

## K. Video  (`VideoPanel.js`)  ← utöver checklistan
- [ ] **Videopreview:** 16:9, bg `--color-panel-deep`, 1px kant. **Scrubber:** synk med playhead `--tl-playhead`.
- [ ] **Videoklipp-thumbs:** neutrala; vald = coral kant. Ingen accent utom vald.

## L. Live inputs  (`LiveInputsPanel.js`)  ← utöver checklistan
- [ ] **Input-kort:** enhetsnamn Manrope; **nivåmeter** `--spectrum-bar`/blå (input-monitoring); routing-select `--color-field`.
- [ ] **Arm-knapp (`.armOn`):** `--color-record` (armad inspelning). **Monitor-toggle:** blå. *(Enda röda ytorna: här + Record + meter-peak.)*

## M. Workspace / Custom  (`WorkspacePanel.js`)  ← utöver checklistan
- [ ] **Block:** `--color-panel`, drag-handtag `--text-muted`, 1px kant, radie 12px. **Redigeringsläge:** hörn-brackets (coral 50 %) på blocket som flyttas.
- [ ] **Preset-piller:** neutrala; valt = coral underline.

## N. Command Palette ⌘K  (`CommandPalette.js`)
DEVELOPER_SPEC §5:
- [ ] **Overlay:** centrerad, `--color-panel`, 12px radie, scrim `--color-bg` @ 70 %. **Input-rad:** `--color-field`.
- [ ] **Grupprubriker (View/Transport/File/AI):** Manrope 600 versal `--text-muted`. **Resultatrader:** som browser-rad; markerad = `--color-selected` + coral vänsterkant. **Esc-hint:** mono.

## O. Fuse Brain (AI)  (`AiPanel.js`)  ← utöver checklistan
- [ ] **Flikar (`.aiTabs`):** segmented, aktiv coral underline. **Promptfält:** stort `--color-field`.
- [ ] **Generera-knapp:** panelens ENDA primära coral-fyllda CTA. **Resultatkort (`.aiCard`):** neutrala; "Keep"=success-grön kant vid hover; "Behåll"-markering (`.aiKept`) lime; spark/analys (`.aiSpark`) blå.

## P. Record Panel  (`RecordPanel.js`)  ← utöver checklistan
- [ ] **Källval:** ghost-knappar. **Nivåmeter:** token-gradient. **Count-in:** mono.
- [ ] **Stor Record-knapp:** `--color-record` fylld, puls vid inspelning. **Waveform-preview:** `--waveform-fill` (blå), vald region `--waveform-selected` (coral).

## Q. Settings  (`Settings.js`)
DEVELOPER_SPEC §5 (modal 640px):
- [ ] **Sektionslista (vänster):** vald = `--color-selected` + coral vänsterkant. **Formulär (höger):** fält `--color-field`.
- [ ] **Toggles/checkbox:** av-track `--border-default`, på-track `--color-coral`, knopp alltid `--text-primary`.
- [ ] **Beskrivningstext:** Sora `--text-secondary`. **Farlig åtgärd (`.dangerBtn`):** röd text/kant, fylld röd bara vid bekräftelse.

## R. Projects Modal  (`ProjectsModal.js`)  ← utöver checklistan
- [ ] **Projektkort:** `--color-panel-nested`, 12px radie; namn Manrope + tid i mono; hover→kant `--border-strong`; valt = coral kant.
- [ ] **"New project":** primär coral CTA. **Radera:** danger-röd (som Settings).

## S. Onboarding  (`Onboarding.js`)  ← utöver checklistan
- [ ] Få, lugna steg; EN primär coral CTA per steg ("Make a beat"); hoppa-över neutral. Bg near-black + dot-grid. Text Sora, luftig.

## T. Help Overlay  (`HelpOverlay.js`)  ← utöver checklistan
- [ ] Kolumner (`.helpCol`): rad = handling + `<kbd>` i mono. Rubriker (`.helpTitle`) `--text-secondary` versal. Scrim `--color-bg` @ 70 %. Ingen accent.

## U. Plugin / PopOut  (`PluginPanel.js`, `PopOut.js`)  ← utöver checklistan
- [ ] Fönster `--color-panel`, titelrad med detach/close (neutrala ikon-knappar). PopOut = identisk styling, egen neutral badge.

## V. Pricing  (`pages/pricing.js`)
Ur README (landing-pricing) + DEVELOPER_SPEC §5 (14px kort):
- [ ] **Monthly/Yearly-toggle:** segmented, aktivt segment 2px coral underline (ingen fyllning/glow); pris uppdateras live.
- [ ] **Plan-kort (Free/Pro):** 14px radie; Pro framhävt med coral kant + "Recommended"-pill (enda coral); Pro-pris i mono; Pro-CTA primär coral, övriga ghost.

## W. Landing  (`BTZ Landningssida.dc.html` → recreate i `pages/`)
High-fidelity, recreate exakt. Sektioner (README):
- [ ] **Nav:** logo-mark + wordmark, länkar (Features, Pricing, Download), pill-CTA "Start free".
- [ ] **Hero:** vänster eyebrow-pill + H1 (3 rader) + subhead + 2 CTA + trust-rad (staggad fade/rise). Höger: HUD-"session"-kort — hörn-brackets, mono `SESSION_04471` / `● LIVE`, cirkulär HUD-readout (statisk ring + långsam moturs streckad ring ~14s + snabb scan-arc ~4s + orbiterande punkt ~3s + mono "128" BPM i mitten), footer med BPM + animerad "● Playing".
- [ ] **Features:** 6-kort-grid (Drum machine, Piano roll, Mixer, Mastering, Recording, Sound library), CSS-ikon; hover lyft 4px + kant→accent-linje (ingen glow).
- [ ] **Offline-strip:** helbred ljus invers-band + CTA.
- [ ] **Pricing:** som §V.
- [ ] **Download:** 3-kort (Web, Desktop, Mobile); CTA-pil nudge 4px höger vid hover.
- [ ] **Footer:** logo + tagline, en länkkolumn, CTA, copyright.

---

## Interaktioner (exakt beteende — de två du efterfrågade)

### I1. Sätt not/klipp och dra ut längd i SAMMA gest (ingen extra klick)
- **Piano Roll (`PianoRoll.js`):** pointer-down på tom yta → skapa not vid `lastLen` och gå
  DIREKT in i `mode:'resize', fresh:true`. Håll + dra höger = längd live; släpp = klar. Rent
  klick (ingen rörelse) = not med senaste längd. Ska gälla **mus OCH touch** (touch: horisontell
  rörelse → resize, vertikal → move/pitch). Min-längd = ett snap-steg; ingen negativ längd.
- **Arrange (`Playlist.js`):** pointer-down på tom del av spår → skapa klipp och gå direkt in i
  `mode:'resize'` (samma mönster). Rent klick = klipp på en pattern-längd.
- **DoD:** aldrig ett läge där man måste släppa och klicka igen för att sätta längd.

### I2. Flera keyframes per klipp/spår i arrange (Volume/pen) — måste fungera
- Med **Volume/pen**-verktyget aktivt: varje klick PÅ ett klipp lägger till EN volym-keyframe
  vid klickets tick/nivå. Man ska kunna lägga **många** punkter på samma klipp. `gainPoints` =
  sorterad lista `{t, v}`.
- Dra en punkt = flytta nivå (upp/ned) + tid (sidled), live. Shift-klick / högerklick = ta bort.
- Volymlinjen ritas alltid (även 0 punkter) som synlig dragbar linje (upptäckbarhet). Med ≥1 punkt
  polyline mellan punkter + platta segment ut till klippkanterna. Punkter = rutor (vald coral,
  annars `--tl-volume-line`), radie 3px, träffyta 12px.
- Empty-klick i pen-läge skapar INGET klipp → hint "Volume: click a clip to add a keyframe."
- Samma modell i **Automation**-vyn för spår-/parameterenveloper.
- **DoD:** lägg 4 punkter, dra en, ta bort en → linje + uppspelnings-gain följer med.

---

## Definition of done (bocka per yta)
- [ ] Bara coral/lime/blå + record-röd förekommer — ingen teal/lila/rosa/orange/gulgrön någonstans.
- [ ] Coral rör bara: primär CTA (en per skärm) · aktivt/på · vald · klipp-/loop-kant · EQ-kurva.
- [ ] Rött bara: Record/arm/input-monitor-underline + meter-peak.
- [ ] Ingen blurrad glow/box-shadow på något state.
- [ ] Alla tekniska siffror i JetBrains Mono.
- [ ] Radier 12/8–10/100/4px konsekvent.
- [ ] Playback rör aldrig innehållsceller (steg/pads/noter/waveform) — bara EQ-ikon + 1px playhead.
- [ ] Dra-ut-not och dra-ut-klipp fungerar i en gest; flera keyframes fungerar (arrange + automation).
- [ ] Ljust tema har paritet (`[data-theme="light"]`).
- [ ] Logo = `logo/btz-mark.svg`, färgordning coral→lime→blå.
