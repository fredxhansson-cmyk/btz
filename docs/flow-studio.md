# FLOW Studio

En FL Studio-inspirerad musikstudio (DAW) som kors helt i webblasaren, byggd pa
Web Audio API och React. Ligger pa rutten **`/studio`** i Next.js-appen.

```bash
npm install
npm run dev
# oppna http://localhost:3000/studio
```

Studion ar en **PWA**: den kan installeras pa hemskarmen (dator, mobil och
surfplatta) och fungerar helt utan natverk efter forsta besoket. En knapp
"Installera appen" dyker upp i statusraden nar webblasaren tillater det.

Forsta gangen laddas ett demo-projekt (trummor, bas, ackord och lead) sa att det
finns nagot att trycka play pa direkt.

---

## Ljudbiblioteket

Allt i biblioteket ar **syntesparametrar, inte ljudfiler**. Ett helt trumkit ar
nagra hundra byte, vilket betyder att biblioteket laddar direkt, fungerar
offline, inte kostar nagot i licenser eller bandbredd — och att varje ljud gar
att skruva vidare pa efter att du lagt in det.

* **39 trumljud** (kick, snare, clap, hihat, perc, tom, cymbal)
* **32 instrumentljud** (bas, lead, pad, keys, FX)
* **10 trumkit** som byter alla pads samtidigt utan att rora dina traffar
* Sok pa namn, kategori eller tagg (`808`, `acid`, `lofi`, `trap`…)
* Forhandslyssna med ▸ utan att lagga till nagot
* **Mina ljud**: spara vilken skruvad kanal som helst i biblioteket

## FLOW Brain — den inbyggda generatorn

Studion har en inbyggd generator som skapar nya ljud och beats, och som lar sig
av det du behaller. Den ar **en lokal statistisk modell**, inte ett moln:
allt raknas fram i din webblasare, ingenting skickas nagonstans.

**Sa fungerar den**

* Den startar med statistiken fran det inbyggda biblioteket — for varje
  kategori (Kick, Snare, Pad, Bas …) medelvarde och spridning per parameter.
* Varje ljud du sparar med ♥ eller lagger till som kanal vags in i modellen med
  en online-uppdatering av medelvarde och varians. Ju fler du behaller, desto
  mer dominerar din smak over grundinstallningen.
* Den lar sig ocksa **var du lagger dina traffar**: ett histogram per
  trumroll over de sexton stegen. Det anvands nar den genererar beats, sa
  groovet borjar lata som ditt.
* Modellen lar sig automatiskt av projektet du jobbar i (som mest en gang per
  minut), och du kan trycka "Lar av det har projektet nu" nar som helst.
* Genererade ljud du sparar hamnar under **AI-ljud** i Browser — biblioteket
  vaxer alltsa for varje pass du gor.

**Vad du kan gora**

| Knapp | Vad den gor |
| --- | --- |
| Generera 8 ljud | Nya varianter i vald kategori, med "vagat" som spridningsreglage |
| ♥ | Sparar ljudet i biblioteket och lar modellen |
| + | Lagger till som kanal i projektet (och lar modellen) |
| Generera nytt beat | Skriver ett helt nytt trummonster utifran din inlarda feel |
| Variera det jag har | Behaller delar av monstret och lagger till nytt |
| Nollstall inlarning | Tommer modellen (dina sparade ljud finns kvar) |

## Ljudinspelning

Panelen **Spela in** (mikrofonknappen i transporten) tar in mikrofon, gitarr,
keyboard eller vad som helst som gar in i ljudkortet.

* Val av ingang, insignalsgain och nivamatare.
* **Medhorning** genom mixern sa du hor dig sjalv (anvand horlurar).
* Spela in medan latten rullar, med inrakning om du har stallt in det.
* Automatisk trimning av tystnad och normalisering.
* Resultatet blir en WAV i projektet: skapa en ny sampler-kanal eller lagg den
  i den kanal du star pa, och spela den sedan med tonhojd fran piano rollen.

## Mastering

Masterbussen har en egen effektkedja och en **loudness-matare** (ungefarlig
LUFS enligt K-viktning: integrerad, kortsiktig, momentan och topp). Valj
masterkanalen i mixern for att komma at den.

* Presets: Rent, Streaming −14, Klubb −9, Tape/varm, Bred & luftig,
  Podcast/rost — var och en med malniva och en fardig kedja.
* **Matcha malniva** justerar mastervolymen sa att den uppmatta integrerade
  nivan hamnar pa malet.
* Kedjan renderas ocksa i WAV-exporten, sa det du hor ar det du far.

## Pa mobil och surfplatta

Studion byter automatiskt till ett touch-lage nar den kors pa en pekskarm:

* Bottennavigering i stallet for flikar, och Browser som en utfallbar panel
* Storre traffytor (steg 40 px, pads 84 px) och storre kontroller
* **Tryck och hall** ersatter hogerklick overallt: ta bort noter och klipp,
  roll i trummaskinen, mute pa en pad
* **Nyp for att zooma** och tva fingrar for att panorera i piano roll,
  playlist och automation
* Kompakt topprad med en ⋯-meny for filhantering, taktart och metronom

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

* Verktygslagen **Rita / Markera / Radera**. `Ctrl`+dra ger marquee-markering
  aven i ritlaget.
* Klicka pa tomt rutnat = ny not, dra at hoger direkt efter for att satta langd.
  Dra en not for att flytta, dra i hogerkanten for att andra langd.
* `Ctrl+C/X/V/D` kopiera, klipp, klistra och duplicera. `Ctrl+A` markerar allt,
  `Delete` tar bort, piltangenter transponerar (`Shift` = oktav) och flyttar i tid.
* **Ackordstamplar**: valj ackordtyp och klicka — hela ackordet placeras.
  18 typer fran dur/moll till maj9, m7b5 och power.
* **Skalor**: 13 skalor med rotton. Toner utanfor skalan dimmas, och laset
  tvingar nya och flyttade noter till skalan.
* **Verktyg**: kvantisera (med styrka i procent), strum, arpeggiera, humanisera
  och slumpa velocity, legato, invertera, vand och oktavskift.
* **Arpeggiator per kanal** (rate, riktning, oktaver) som expanderar hallna
  ackord vid uppspelning utan att andra noterna.
* Velocity-fältet langst ner: dra i staplarna.
* Noter fran ovriga kanaler visas som "ghost notes" (kan slas av).
* Hjulet skrollar, `Shift`+hjul skrollar i sidled, `Ctrl`+hjul zoomar.
* Klick i linjalen startar uppspelning fran den takten.

### Automation (F10)
Automationsbanor per monster mot vilken parameter som helst — kanalvolym och
pan, mixervolym och pan, master, alla effektparametrar och alla
instrumentparametrar (over 100 mal i ett vanligt projekt).

* Klicka i rutnatet for att lagga punkter, dra for att flytta, hogerklick tar bort.
* Snabbfyllning: ramp upp/ner, LFO (sinus, sag, fyrkant) och **Pump** for
  klassisk sidechain-kansla.
* Banor foljer monstret, sa de spelar bade i PAT-lage och nar monstret ligger i
  playlisten. Lagg en 16-takters "automationslat" som ett eget monster for
  latnivavepningar.
* Mixer- och effektbanor ar kontinuerliga; instrumentparametrar sätts vid varje
  notstart (for kontinuerliga svep, lagg ett filter pa insertet i stallet).

### Playlist (F5)
Arrangemang av monster-klipp pa 10 spar. Klicka for att placera det valda
monstret, dra for att flytta, dra i hogerkanten for att forlanga (monstret
upprepas), hogerklicka for att ta bort. Klick i linjalen spelar laten fran den
takten.

### Trummaskin (F8)
En egen trummaskin ovanpa samma monsterdata som resten av programmet — allt du
programmerar har syns ocksa i Channel Rack, Piano Roll och Playlist.

* **12 pads** i MPC-layout (kick nere till vanster). Klicka for att spela,
  hogerklicka for mute. Paden lyser nar den triggas under uppspelning.
* **Kit-presets**: FLOW-808, FLOW-909, Acoustic, Trap och LoFi. Ett kit byter
  ljud pa befintliga pads via deras roll (kick forblir kick) och skapar de pads
  som saknas, utan att rora dina programmerade traffar.
* **Stegeditor** for vald pad: klick = traff, `Shift`+klick = accent,
  dra upp/ner pa ett steg = velocity, hogerklick = roll (2–4 traffar inom
  samma steg, med stigande velocity).
* **Choke-grupper**: pads i samma grupp klipper varandra, sa en stangd hihat
  tystar en oppen. Fungerar likadant live som vid WAV-export.
* **Verktyg**: Slumpa beat (rollmedveten sannolikhet per steg), Euclid
  (jamnt fordelade traffar), Humanisera (slumpar timing ±3 ticks och velocity
  ±15 %), Dubbla (dubblar monsterlangden och kopierar beatet), Rensa pad och
  Rensa alla.
* **Snabbrattar** for vald pad: level, pan och de viktigaste
  instrumentparametrarna (tune, decay, punch, snap …).
* **Oversikt** langst ner visar alla pads samtidigt.
* Med **REC** aktiverat spelas pad-traffar in kvantiserade till narmaste steg.

Pad-tangenter nar trummaskinen ar oppen:

```
Q W E R   ->  Low Tom  Mid Tom  Hi Tom  Cymbal
A S D F   ->  Rim      Shaker   Tamb    Open Hat
Z X C V   ->  Kick     Snare    Clap    Closed Hat
```

### Mixer (F9)
Master plus atta insert-kanaler (fler kan laggas till) med fader, pan, mute,
solo, niva-meter och en seriell effektkedja per kanal. Varje effekt kan
bypassas, tas bort och styras med rattar.

* **Sends** (post-fader) fran vilken insert som helst till vilken annan som
  helst — kedjor som skulle bli aterkoppling filtreras bort automatiskt.
* **Spektrumanalys** pa master.

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
| FlowSampler | spelar en inladdad ljudfil med vagform, start/slut, loop, reverse och tonhojd fran notens tangent |

### Effekter
Elva effekter: Filter, Delay (tempo-synkad), Reverb (genererad impulssvarsfil),
Chorus, Phaser, Distortion, Bitcrusher, 3-bands parametrisk EQ,
kompressor/limiter, **Sidechain Duck** (tempo-lasst pumpande ducking) och
**Stereo Shaper** (mid/side-bredd med monobas).

### Samples
Dra en ljudfil var som helst i studion sa skapas en sampler-kanal; slapp den pa
vagformen i instrumentpanelen sa laddas den i just den kanalen. Filerna sparas
base64-kodade i projektet, sa en `.flow.json` ar komplett och gar att flytta
mellan datorer. Max 4 MB per sample. Om webblasarens lagring inte racker till
autosparas projektet utan samples (de finns kvar tills du laddar om).

### MIDI
* **Exportera MIDI** skriver en Standard MIDI File (format 1) med en spar per
  kanal. Trumpads gar ut pa GM-trumkanalen med GM-nottummer, sa filen later
  ratt i andra program.
* **Importera MIDI** skapar ett nytt monster, mappar GM-trummor tillbaka till
  pads och skapar syntkanaler for ovriga sparr. Tempo lases fran filen.
* **Web MIDI**: anslutna keyboards spelar och spelar in vald kanal — eller ratt
  pad nar trummaskinen ar oppen. Anslutna enheter listas i Browser under MIDI.

### Filhantering
* **Autospar** till `localStorage` (700 ms efter senaste andring).
* **Spara projekt** laddar ner en `.flow.json`.
* **Oppna** laser tillbaka samma format.
* **Exportera WAV** renderar antingen det aktiva monstret (tva varv) eller hela
  laten offline via `OfflineAudioContext` och laddar ner en 16-bitars WAV.
* **Exportera stems** renderar en WAV per mixerkanal.
* **Mallar** i Browser: elva genrer — Techno, Trap, House, Drum & Bass,
  LoFi Hip Hop, Afrobeats, Reggaeton, Amapiano, Synthwave, Dubstep och Ambient.
  Varje mall satter tempo, swing, kit, groove, ackord, arrangemang **och**
  en passande masteringkedja.

---

## Kortkommandon

| Tangent | Funktion |
| --- | --- |
| `Mellanslag` | play / stop |
| `F5` / `F6` / `F7` / `F8` / `F9` / `F10` | Playlist / Channel Rack / Piano Roll / Trummaskin / Mixer / Automation |
| `Ctrl+Z` / `Ctrl+Y` | angra / gor om |
| `Ctrl+S` | spara projektfil |
| `Z S X D C V G B H N J M` | nedre oktaven pa datortangentbordet |
| `Q 2 W 3 E R 5 T 6 Y 7 U` | ovre oktaven |
| `Z X C V / A S D F / Q W E R` | pads (nar trummaskinen ar oppen) |
| `Pil upp` / `Pil ner` | byt oktav |
| `Delete` | ta bort markerade noter (piano roll) |
| `Ctrl+C / X / V / D` | kopiera / klipp / klistra / duplicera noter |
| `Ctrl+A` | markera alla noter |
| `Ctrl+Q` | kvantisera markering |
| `?` | kortkommandopanel |
| `Shift`+dra i playlistens linjal | satt loopregion |

Med REC aktiverat spelas tangentbordsnoter in i det aktiva monstret medan
uppspelningen gar.

---

## Arkitektur

```
lib/studio/
  constants.js          tick-upplosning (PPQ 96), fargpalett, hjalpfunktioner
  project.js            datamodellen + demo-latten
  reducer.js            all projektredigering + undo/redo-historik
  drums.js              pad-roller, kit-presets och rytmverktyg
  theory.js             skalor, ackord och notverktyg
  automation.js         automationsmal, kurvor och LFO-former
  samples.js            base64-lagring och vagformsdata
  midi.js               SMF-export och -import
  ai.js                 den lokala generatorn och inlarningsmodellen
  mastering.js          masterpresets och nivamatchning
  recording.js          ingangar, trimning och sample-konvertering
  sequencer.js          monster/playlist -> tick-indexerade eventkartor
  StudioContext.js      React-context, autospar, fil-I/O, export
  audio/
    dsp.js              brus, envelopes, distortionskurvor, impulssvar
    instruments.js      instrumentdefinitioner (rena rost-fabriker)
    effects.js          effektdefinitioner
    graph.js            mixer-grafen (kanaler -> inserts -> master)
    trigger.js          gemensam nottrigger med choke-grupper
    engine.js           realtidsmotor med lookahead-schemalaggare
    render.js           offline-rendering + WAV-encoder
components/studio/      UI (Transport, Browser, ChannelRack, PianoRoll,
                        DrumMachine, Playlist, Mixer, PluginPanel, Knob)
pages/studio.js         klientrenderad sida
public/flow-clock.worklet.js  klocka pa ljudtraden
styles/studio.module.css
```

**Tid.** Allt raknas i ticks med `PPQ = 96` (ett steg = 24 ticks, en takt i 4/4
= 384 ticks). Taktarten stalls i transporten och paverkar taktlangd, rutnat och
metronom. Schemalaggaren tittar 160 ms framat och lagger ut noter pa
AudioContext-klockan, sa timingen paverkas inte av React-renderingar. Klockan
drivs av en **AudioWorklet** pa ljudtraden, vilket gor att uppspelningen haller
takten aven nar fliken ligger i bakgrunden (statusraden visar vilken klocka som
anvands).

**En datamodell.** Trummaskinens pads ar vanliga kanaler med en `role`, sa
samma traffar syns i stegsequencern, piano rollen och arrangemanget. Rolls ar
helt enkelt flera noter inom ett steg, vilket gor att de fungerar overallt utan
specialfall i motorn.

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

