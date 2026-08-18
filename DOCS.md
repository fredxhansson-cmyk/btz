# FLOW Studio

A browser-based music studio (DAW) that runs entirely in the browser,
built on the Web Audio API and React. A standalone app — the studio lives on
the home page (`/`).

```bash
cd flow-studio
npm install
npm run dev
# open http://localhost:3000
```

The studio is a **PWA**: it can be installed on your home screen (desktop,
mobile and tablet) and works completely offline after the first visit. An
"Install app" button appears in the status bar when the browser allows it.

On first launch a demo project loads (drums, bass, chords and lead) so there's
something to press play on right away.

---

## The sound library

Everything in the library is **synthesis parameters, not audio files**. A whole
drum kit is a few hundred bytes, which means the library loads instantly, works
offline, costs nothing in licenses or bandwidth — and every sound can be tweaked
further after you've added it.

* **39 drum sounds** (kick, snare, clap, hihat, perc, tom, cymbal)
* **32 instrument sounds** (bass, lead, pad, keys, FX)
* **10 drum kits** that swap all pads at once without touching your hits
* Search by name, category or tag (`808`, `acid`, `lofi`, `trap`…)
* Preview with ▸ without adding anything
* **My sounds**: save any tweaked channel to the library

## FLOW Brain — the built-in generator

The studio has a built-in generator that creates new sounds and beats, and
learns from what you keep. It's **a local statistical model**, not a cloud:
everything is computed in your browser, nothing is sent anywhere.

**How it works**

* It starts with the statistics of the built-in library — for each category
  (Kick, Snare, Pad, Bass …), the mean and spread per parameter.
* Every sound you save with ♥ or add as a channel is folded into the model with
  an online update of the mean and variance. The more you keep, the more your
  taste dominates over the default settings.
* It also learns **where you place your hits**: a histogram per drum role over
  the sixteen steps. This is used when it generates beats, so the groove starts
  to sound like yours.
* The model learns automatically from the project you're working in (at most
  once a minute), and you can press "Learn from this project now" at any time.
* Generated sounds you save land under **AI sounds** in the Browser — so the
  library grows with every session you do.

**What you can do**

| Button | What it does |
| --- | --- |
| Generate 8 sounds | New variants in the selected category, with "boldness" as a spread control |
| ♥ | Saves the sound to the library and teaches the model |
| + | Adds it as a channel in the project (and teaches the model) |
| Generate new beat | Writes a whole new drum pattern from your learned feel |
| Vary what I have | Keeps parts of the pattern and adds new material |
| Reset learning | Empties the model (your saved sounds remain) |

## Audio recording

The **Record** panel (the microphone button in the transport) captures
microphone, guitar, keyboard or anything else that comes into the audio
interface.

* Input selection, input gain and level meter.
* **Monitoring** through the mixer so you can hear yourself (use headphones).
* Record while the song plays, with a count-in if you've set one up.
* Automatic silence trimming and normalization.
* The result becomes a WAV in the project: create a new sampler channel or drop
  it into the channel you're on, and then play it back with pitch from the piano
  roll.

## Mastering

The master bus has its own effect chain and a **loudness meter** (approximate
LUFS by K-weighting: integrated, short-term, momentary and peak). Select the
master channel in the mixer to access it.

* Presets: Clean, Streaming −14, Club −9, Tape/warm, Wide & airy,
  Podcast/voice — each with a target level and a ready-made chain.
* **Match target level** adjusts the master volume so the measured integrated
  level hits the target.
* The chain is also rendered into the WAV export, so what you hear is what you
  get.

## On mobile and tablet

The studio automatically switches to a touch mode when it runs on a touchscreen:

* Bottom navigation instead of tabs, and the Browser as a slide-out panel
* Larger hit targets (steps 40 px, pads 84 px) and larger controls
* **Press and hold** replaces right-click everywhere: delete notes and clips,
  roll in the drum machine, mute on a pad
* **Pinch to zoom** and two fingers to pan in the piano roll, playlist and
  automation
* A compact top bar with a ⋯ menu for file handling, time signature and
  metronome

## Features

### Transport
Play/stop/record, PAT and SONG mode (pattern versus full song), tempo dragged
with the mouse or typed in, position display in `bar:beat:tick`, metronome and
master volume with a level meter.

### Channel Rack (F6)
FL-style step sequencer. Each channel has an LED selector, a name (opens the
instrument), mute/solo, pan and volume knobs, plus routing to a mixer channel.
Click in the grid to add steps, right-click to remove, drag to "paint" multiple
steps. The pattern length is set in bars (1–16) and the swing knob delays every
other sixteenth note.

### Piano Roll (F7)
Canvas-based note editor for the selected channel and selected pattern.

* **Draw / Select / Erase** tool modes. `Ctrl`+drag gives a marquee selection
  even in draw mode.
* Click on empty grid = new note, drag right immediately after to set the
  length. Drag a note to move it, drag the right edge to change the length.
* `Ctrl+C/X/V/D` copy, cut, paste and duplicate. `Ctrl+A` selects all,
  `Delete` removes, arrow keys transpose (`Shift` = octave) and move in time.
* **Chord stamps**: pick a chord type and click — the whole chord is placed.
  18 types from major/minor to maj9, m7b5 and power.
* **Scales**: 13 scales with a root note. Notes outside the scale are dimmed,
  and the lock forces new and moved notes into the scale.
* **Tools**: quantize (with strength in percent), strum, arpeggiate, humanize
  and randomize velocity, legato, invert, flip and octave shift.
* **Per-channel arpeggiator** (rate, direction, octaves) that expands held
  chords on playback without changing the notes.
* The velocity lane at the bottom: drag the bars.
* Notes from other channels appear as "ghost notes" (can be turned off).
* The wheel scrolls, `Shift`+wheel scrolls sideways, `Ctrl`+wheel zooms.
* Clicking in the ruler starts playback from that bar.

### Automation (F10)
Automation lanes per pattern against any parameter — channel volume and pan,
mixer volume and pan, master, all effect parameters and all instrument
parameters (over 100 targets in a typical project).

* Click in the grid to add points, drag to move, right-click to remove.
* Quick fill: ramp up/down, LFO (sine, saw, square) and **Pump** for the
  classic sidechain feel.
* Lanes follow the pattern, so they play both in PAT mode and when the pattern
  sits in the playlist. Add a 16-bar "automation song" as its own pattern for
  song-level sweeps.
* Mixer and effect lanes are continuous; instrument parameters are set at each
  note start (for continuous sweeps, put a filter on the insert instead).

### Playlist (F5)
Arrangement of pattern clips across 10 tracks. Click to place the selected
pattern, drag to move, drag the right edge to extend (the pattern repeats),
right-click to remove. Clicking in the ruler plays the song from that bar.

### Drum machine (F8)
A dedicated drum machine on top of the same pattern data as the rest of the
program — everything you program here also shows up in the Channel Rack, Piano
Roll and Playlist.

* **12 pads** in MPC layout (kick at the bottom left). Click to play,
  right-click to mute. The pad lights up when it's triggered during playback.
* **Kit presets**: FLOW-808, FLOW-909, Acoustic, Trap and LoFi. A kit swaps the
  sound on existing pads by their role (kick stays kick) and creates the missing
  pads, without touching your programmed hits.
* **Step editor** for the selected pad: click = hit, `Shift`+click = accent,
  drag up/down on a step = velocity, right-click = roll (2–4 hits within the
  same step, with rising velocity).
* **Choke groups**: pads in the same group cut each other off, so a closed hihat
  silences an open one. It works the same live as on WAV export.
* **Tools**: Randomize beat (role-aware probability per step), Euclid (evenly
  distributed hits), Humanize (randomizes timing ±3 ticks and velocity ±15 %),
  Double (doubles the pattern length and copies the beat), Clear pad and
  Clear all.
* **Quick knobs** for the selected pad: level, pan and the most important
  instrument parameters (tune, decay, punch, snap …).
* An **overview** at the bottom shows all pads at once.
* With **REC** active, pad hits are recorded quantized to the nearest step.

Pad keys when the drum machine is open:

```
Q W E R   ->  Low Tom  Mid Tom  Hi Tom  Cymbal
A S D F   ->  Rim      Shaker   Tamb    Open Hat
Z X C V   ->  Kick     Snare    Clap    Closed Hat
```

### Mixer (F9)
Master plus eight insert channels (more can be added) with fader, pan, mute,
solo, level meter and a serial effect chain per channel. Each effect can be
bypassed, removed and controlled with knobs.

* **Sends** (post-fader) from any insert to any other — chains that would create
  feedback are filtered out automatically.
* **Spectrum analysis** on the master.

### Instruments
| Instrument | Type |
| --- | --- |
| FlowKick | synthesized kick drum with pitch envelope, click and drive |
| FlowSnare | tone + noise through a bandpass |
| FlowClap | multiple noise bursts with spread |
| FlowHat | 808-style six-oscillator hihat |
| FlowTom | sine with pitch bend |
| FlowPerc | two sine tones + noise (rim/clave) |
| 3xFLOW | three oscillators, low-pass filter with envelope, ADSR |
| FlowFM | two-operator FM with an index envelope |
| FlowPluck | subtractive pluck with filter envelope and sub-oscillator |
| FlowSampler | plays a loaded audio file with waveform, start/end, loop, reverse and pitch from the note's key |

### Effects
Eleven effects: Filter, Delay (tempo-synced), Reverb (generated impulse
response), Chorus, Phaser, Distortion, Bitcrusher, 3-band parametric EQ,
compressor/limiter, **Sidechain Duck** (tempo-locked pumping ducking) and
**Stereo Shaper** (mid/side width with mono bass).

### Samples
Drop an audio file anywhere in the studio and a sampler channel is created; drop
it on the waveform in the instrument panel and it loads into that specific
channel. The files are stored base64-encoded in the project, so a `.flow.json`
is complete and can be moved between computers. Max 4 MB per sample. If the
browser's storage isn't enough, the project autosaves without samples (they
remain until you reload).

### MIDI
* **Export MIDI** writes a Standard MIDI File (format 1) with one track per
  channel. Drum pads go out on the GM drum channel with GM note numbers, so the
  file sounds right in other programs.
* **Import MIDI** creates a new pattern, maps GM drums back to pads and creates
  synth channels for the other tracks. Tempo is read from the file.
* **Web MIDI**: connected keyboards play and record the selected channel — or
  the right pad when the drum machine is open. Connected devices are listed in
  the Browser under MIDI.

### File handling
* **Autosave** to `localStorage` (700 ms after the last change).
* **Save project** downloads a `.flow.json`.
* **Open** reads the same format back.
* **Export WAV** renders either the active pattern (two loops) or the whole song
  offline via `OfflineAudioContext` and downloads a 16-bit WAV.
* **Export stems** renders one WAV per mixer channel.
* **Templates** in the Browser: eleven genres — Techno, Trap, House, Drum & Bass,
  LoFi Hip Hop, Afrobeats, Reggaeton, Amapiano, Synthwave, Dubstep and Ambient.
  Each template sets tempo, swing, kit, groove, chords, arrangement **and**
  a matching mastering chain.

---

## Keyboard shortcuts

| Key | Function |
| --- | --- |
| `Space` | play / stop |
| `F5` / `F6` / `F7` / `F8` / `F9` / `F10` | Playlist / Channel Rack / Piano Roll / Drum machine / Mixer / Automation |
| `Ctrl+Z` / `Ctrl+Y` | undo / redo |
| `Ctrl+S` | save project file |
| `Z S X D C V G B H N J M` | lower octave on the computer keyboard |
| `Q 2 W 3 E R 5 T 6 Y 7 U` | upper octave |
| `Z X C V / A S D F / Q W E R` | pads (when the drum machine is open) |
| `Arrow up` / `Arrow down` | change octave |
| `Delete` | delete selected notes (piano roll) |
| `Ctrl+C / X / V / D` | copy / cut / paste / duplicate notes |
| `Ctrl+A` | select all notes |
| `Ctrl+Q` | quantize selection |
| `?` | shortcut panel |
| `Shift`+drag in the playlist ruler | set loop region |

With REC active, keyboard notes are recorded into the active pattern while
playback runs.

---

## Architecture

```
lib/studio/
  constants.js          tick resolution (PPQ 96), color palette, helper functions
  project.js            the data model + the demo song
  reducer.js            all project editing + undo/redo history
  drums.js              pad roles, kit presets and rhythm tools
  theory.js             scales, chords and note tools
  automation.js         automation targets, curves and LFO shapes
  samples.js            base64 storage and waveform data
  midi.js               SMF export and import
  ai.js                 the local generator and learning model
  mastering.js          master presets and level matching
  recording.js          inputs, trimming and sample conversion
  sequencer.js          pattern/playlist -> tick-indexed event maps
  StudioContext.js      React context, autosave, file I/O, export
  audio/
    dsp.js              noise, envelopes, distortion curves, impulse responses
    instruments.js      instrument definitions (pure voice factories)
    effects.js          effect definitions
    graph.js            the mixer graph (channels -> inserts -> master)
    trigger.js          shared note trigger with choke groups
    engine.js           real-time engine with lookahead scheduler
    render.js           offline rendering + WAV encoder
components/studio/      UI (Transport, Browser, ChannelRack, PianoRoll,
                        DrumMachine, Playlist, Mixer, PluginPanel, Knob)
pages/index.js          client-rendered page (the studio at /)
public/flow-clock.worklet.js  clock on the audio thread
public/sw.js            service worker for offline mode
styles/studio.module.css
```

**Time.** Everything is counted in ticks with `PPQ = 96` (one step = 24 ticks,
one bar in 4/4 = 384 ticks). The time signature is set in the transport and
affects bar length, grid and metronome. The scheduler looks 160 ms ahead and
lays out notes on the AudioContext clock, so timing isn't affected by React
renders. The clock is driven by an **AudioWorklet** on the audio thread, which
keeps playback in time even when the tab is in the background (the status bar
shows which clock is in use).

**One data model.** The drum machine's pads are ordinary channels with a `role`,
so the same hits show up in the step sequencer, the piano roll and the
arrangement. Rolls are simply multiple notes within one step, which makes them
work everywhere without special cases in the engine.

**Same code live and on export.** Instruments and effects are pure functions
that take an `AudioContext`, so `renderProject()` rebuilds the exact same graph
in an `OfflineAudioContext` and renders faster than real time.

**Safety on the master.** The master goes through a limiter and a soft tanh
saturation, so the output never ends up in hard clipping.

---

## Known limitations

* 4/4 time signature only.
* Loaded samples aren't saved in the project file (the audio data lives in
  memory only).
* No automation curves yet; parameters are static during playback.
