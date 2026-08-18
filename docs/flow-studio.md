# FLOW Studio

En FL Studio-inspirerad musikstudio (DAW) som kors helt i webblasaren, byggd pa
Web Audio API och React. Ligger pa rutten **`/studio`** i Next.js-appen.

```bash
npm install
npm run dev
# oppna http://localhost:3000/studio
```

Forsta gangen laddas ett demo-projekt (trummor, bas, ackord och lead) sa att det
finns nagot att trycka play pa direkt.

---

## Funktioner

### Transport
Play/stop/record, PAT- och SONG-lage (monster kontra hela laten), tempo som
dras med musen eller skrivs in, positionsvisning i `takt:slag:tick`,
metronom och mastervolym med niva-meter.

### Channel Rack (F6)
Step sequencer i FL-stil. Varje kanal har LED-val, namn (oppnar instrumentet),
mute/solo, pan- och volymratt samt routing till en mixerkanal. Klicka i rutnatet
for att lagga till steg, hogerklicka for att ta bort, dra for att "mala" flera
steg. Monstrets langd stalls i takter (1–16) och swing-ratten fordrojer var
annan sextondel.

### Piano Roll (F7)
Canvas-baserad noteditor for vald kanal och vald monster.

* Klicka pa tomt rutnat = ny not, dra at hoger direkt efter for att satta langd.
* Dra en not for att flytta, dra i hogerkanten for att andra langd.
* Shift-klick lagger till i markeringen, `Delete` tar bort, `Ctrl+A` markerar allt.
* Velocity-fältet langst ner: dra i staplarna.
* Noter fran ovriga kanaler visas som "ghost notes".
* Hjulet skrollar, `Shift`+hjul skrollar i sidled, `Ctrl`+hjul zoomar.
* Klick i linjalen startar uppspelning fran den takten.

### Playlist (F5)
Arrangemang av monster-klipp pa 10 spar. Klicka for att placera det valda
monstret, dra for att flytta, dra i hogerkanten for att forlanga (monstret
upprepas), hogerklicka for att ta bort. Klick i linjalen spelar laten fran den
takten.

### Mixer (F9)
Master plus atta insert-kanaler (fler kan laggas till) med fader, pan, mute,
solo, niva-meter och en seriell effektkedja per kanal. Varje effekt kan
bypassas, tas bort och styras med rattar.

### Instrument
| Instrument | Typ |
| --- | --- |
| FlowKick | syntad bastrumma med pitch-envelope, klick och drive |
| FlowSnare | ton + brus genom bandpass |
| FlowClap | flera brusburstar med spridning |
| FlowHat | 808-style sexoscillator-hihat |
| FlowTom | sinus med pitch-bend |
| FlowPerc | tva sinustoner + brus (rim/clave) |
| 3xFLOW | tre oscillatorer, lagpassfilter med envelope, ADSR |
| FlowFM | tva-operators-FM med index-envelope |
| FlowPluck | subtraktiv pluck med filter-envelope och sub-oscillator |
| FlowSampler | spelar en inladdad ljudfil, tonhojd fran notens tangent |

### Effekter
Filter, Delay (tempo-synkad), Reverb (genererad impulssvarsfil), Chorus,
Distortion, 3-bands parametrisk EQ och kompressor/limiter.

### Filhantering
* **Autospar** till `localStorage` (700 ms efter senaste andring).
* **Spara projekt** laddar ner en `.flow.json`.
* **Oppna** laser tillbaka samma format.
* **Exportera WAV** renderar antingen det aktiva monstret (tva varv) eller hela
  laten offline via `OfflineAudioContext` och laddar ner en 16-bitars WAV.

---

## Kortkommandon

| Tangent | Funktion |
| --- | --- |
| `Mellanslag` | play / stop |
| `F5` / `F6` / `F7` / `F9` | Playlist / Channel Rack / Piano Roll / Mixer |
| `Ctrl+Z` / `Ctrl+Y` | angra / gor om |
| `Ctrl+S` | spara projektfil |
| `Z S X D C V G B H N J M` | nedre oktaven pa datortangentbordet |
| `Q 2 W 3 E R 5 T 6 Y 7 U` | ovre oktaven |
| `Pil upp` / `Pil ner` | byt oktav |
| `Delete` | ta bort markerade noter (piano roll) |

Med REC aktiverat spelas tangentbordsnoter in i det aktiva monstret medan
uppspelningen gar.

---

## Arkitektur

```
lib/studio/
  constants.js          tick-upplosning (PPQ 96), fargpalett, hjalpfunktioner
  project.js            datamodellen + demo-latten
  reducer.js            all projektredigering + undo/redo-historik
  sequencer.js          monster/playlist -> tick-indexerade eventkartor
  StudioContext.js      React-context, autospar, fil-I/O, export
  audio/
    dsp.js              brus, envelopes, distortionskurvor, impulssvar
    instruments.js      instrumentdefinitioner (rena rost-fabriker)
    effects.js          effektdefinitioner
    graph.js            mixer-grafen (kanaler -> inserts -> master)
    engine.js           realtidsmotor med lookahead-schemalaggare
    render.js           offline-rendering + WAV-encoder
components/studio/      UI (Transport, Browser, ChannelRack, PianoRoll,
                        Playlist, Mixer, PluginPanel, Knob)
pages/studio.js         klientrenderad sida
styles/studio.module.css
```

**Tid.** Allt raknas i ticks med `PPQ = 96` (ett steg = 24 ticks, en takt =
384 ticks). Schemalaggaren tittar 160 ms framat var 20:e ms och lagger ut
noter pa AudioContext-klockan, sa timingen paverkas inte av React-renderingar.

**Samma kod live och vid export.** Instrument och effekter ar rena funktioner
som tar emot en `AudioContext`, sa `renderProject()` bygger om exakt samma graf
i en `OfflineAudioContext` och renderar snabbare an realtid.

**Sakerhet pa mastern.** Master gar genom en limiter och en mjuk tanh-mattning,
sa utsignalen hamnar aldrig i hard klippning.

---

## Kanda begransningar

* Endast 4/4-taktart.
* Inladdade samples sparas inte i projektfilen (ljuddatan ligger bara i minnet).
* Ingen automation-kurva an; parametrar ar statiska under uppspelning.
* Om webblasarfliken ligger i bakgrunden strypar webblasaren timers, vilket kan
  ge glapp i uppspelningen. Exporten paverkas inte.
