# Fuse — Competitive Research & Future-Proofing (2026)

> Goal (your framing): **the ease of GarageBand + the depth of Logic / FL Studio**, in the
> browser, AI-native, offline-first. This doc maps where Fuse stands vs the market, what we're
> missing (ranked by value vs effort), and the bets that future-proof us. Sourced from 2025–2026
> material — links at the bottom.

---

## 1. The landscape (who we're really up against)

Three overlapping camps, not one:

**A. Browser DAWs (our direct arena)** — BandLab, Soundtrap (Spotify-owned), Audiotool, Soundation.
- Their shared moat is **collaboration + cloud + community + sample libraries + education**, not depth.
- BandLab: free, huge social/community layer; distribution now gated behind paid Membership.
- Soundtrap: ~$9.99/mo, strong in **schools & real-time collaboration**.
- Audiotool: free, **modular patching** (drag I/O like a modular rig), live collab, cloud samples.
- Soundation: ~$4.99/mo, clean arrangement + beatmaker, good tutorials.
- **None of them is "GarageBand-easy AND Logic-deep."** That gap is exactly our wedge.

**B. AI music generators** — Suno, Udio, Stable Audio.
- Suno V5 + **Suno Studio** now ships a built-in DAW with stem editing + natural vocals; Warner deal → licensed training data.
- Udio: best raw audio realism, section-editing; Universal settlement → a licensed service in 2026.
- **Their weakness is our opening:** they generate finished audio but give **limited precise control** over arrangement/instrumentation/harmony, and don't emit clean DAW-ready stems. Fuse's model — **AI picks parameters, your synths render, everything stays editable** — is the controllable, "own-it" alternative.

**C. Desktop depth** — Ableton, FL Studio, Logic, GarageBand.
- This is the *depth* half of our promise. We don't beat them on DSP maturity; we win on **zero-install, AI-native, frictionless, collaborative**. GarageBand is the "ease" bar to clear; Logic/FL the "there's-a-deeper-layer" bar.

---

## 2. Where Fuse stands (honest scorecard)

| Capability | Fuse today | BandLab | Soundtrap | Audiotool | Suno/Udio | GarageBand | Ableton/FL/Logic |
|---|---|---|---|---|---|---|---|
| Zero-install browser | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Offline / PWA | ✅ **(rare edge)** | ⚠️ | ❌ | ❌ | ❌ | ✅(app) | ✅ |
| Step seq + piano roll + arrange | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Mixer + insert FX + buses | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅✅ |
| Mastering (LUFS/auto) | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | ✅ |
| Clip volume keyframes + fades | ✅ (new) | ✅ | ✅ | ⚠️ | ❌ | ✅ | ✅ |
| AI generate (prompt→editable) | ✅ **(editable, param-level)** | ⚠️ | ⚠️ | ❌ | ✅(but not editable) | ❌ | ❌ |
| In-app AI help assistant | ✅ **(rare)** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sound library | ✅ 234 synth presets | ✅ samples | ✅ samples | ✅ samples | n/a | ✅ | ✅✅ |
| **Real-time collaboration** | ❌ | ⚠️ | ✅ | ✅ | ❌ | ❌ | ⚠️ |
| **Cloud project sync / accounts** | ❌ (local only) | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| **3rd-party plugins (VST/WAM)** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅(AU) | ✅✅ |
| **Audio recording of real instruments** | ✅ mic/line | ✅ | ✅ | ⚠️ | ❌ | ✅ | ✅ |
| **Stem separation** | ❌ | ⚠️ | ⚠️ | ❌ | ✅(gen stems) | ❌ | ✅(Logic) |
| **WebMIDI hardware** | ⚠️ (MIDI file only) | ⚠️ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Mobile app** | ⚠️ PWA | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ |
| **Distribution / release** | ❌ | ✅(paid) | ⚠️ | ❌ | ⚠️ | ❌ | ❌ |

**Where we already lead:** offline-first PWA, editable/controllable AI (vs black-box generators), the in-app AI *help* assistant, and a legally-clean **no-samples, synth-preset, you-own-it** content model.
**Where we're behind:** collaboration, cloud sync/accounts, plugin extensibility, WebMIDI hardware, stem separation, mobile, distribution.

---

## 3. What we're missing — prioritized (value × effort)

**Tier 1 — highest impact, do first**
1. **Cloud accounts + project sync** (M effort). Everything else — collab, sharing, mobile continuity, marketplace — depends on this. Local-only is our biggest ceiling. (We already have Clerk/Stripe scaffolding.)
2. **Real-time collaboration** (L effort, big moat). CRDT-based multiplayer editing (Figma-for-audio). Soundtrap/Audiotool have it; Endlesss proved the *jam* format (and vacated the space when it went bankrupt in 2024). This is the single biggest differentiator we can own.
3. **WebMIDI hardware input** (S effort, high value). Real MIDI keyboards/controllers into the piano roll and channels. Table-stakes for "serious" users; cheap to add. Turns us from toy → instrument.
4. **Stem separation** (M effort). Drag in any track → split to vocals/drums/bass/etc. Browser-feasible via WASM Demucs or a cloud call; competitors (Moises/LALAL) charge for it. Feeds remixing + "edit any audio."

**Tier 2 — strong, differentiating**
5. **Web Audio Modules (WAM 2.0) plugin host** (L effort, durable moat). "VSTs for the web" — an open standard to load 3rd-party (and our own) instruments/FX, reusing C++ DSP via WASM. This is the *Logic/FL depth* half: an extensibility ecosystem no browser DAW has nailed.
6. **Richer/neural instruments** (M–L). More synth engines (wavetable, granular, physical model) + description-driven neural instruments — leans into our "no-samples, described-not-sampled" identity.
7. **Mobile-first touch UI** (M). PWA works; a genuinely touch-native layout captures the BandLab/mobile audience.

**Tier 3 — ecosystem / monetization**
8. **Sample/preset marketplace** (M, needs accounts) — creator economy, revenue share.
9. **Distribution/release** (M) — one-click to streaming (BandLab's paid hook).
10. **Notation view** (M) — opens the education/composer segment Soundtrap courts.

---

## 4. Future-proofing bets (build toward these)

1. **AI-native but *controllable & licensed*.** The whole industry is settling toward **licensed training data** (UMG↔Udio Oct 2025, Warner↔Suno Nov 2025; Sony still litigating; a pivotal US fair-use ruling expected summer 2026; AFM sued the majors June 2026 over uncredited recordings). Fuse's edge: **AI picks parameters, our own synths render the sound** — no copyrighted audio in the pipeline, output is fully owned and editable. Lean into this hard; it's a legal + creative moat as the black-box generators get entangled.
2. **Real-time collaboration as a primitive (CRDT).** Multiplayer isn't a feature, it's the platform shift (Figma/Docs for audio). Build the data model on CRDTs now so every later feature is collab-ready.
3. **Modern Web Audio stack.** Move heavy DSP to **AudioWorklet + WASM/SIMD**; adopt **WebCodecs** for fast encode/decode (export/import), **WebMIDI** for hardware, and evaluate **WebGPU** for neural-instrument/stem inference on-device. This keeps us fast and offline as models grow.
4. **On-device *and* cloud AI, tiered.** Small models on-device (offline, private, free tier); heavy generation/stem-sep in the cloud (Pro). Matches our offline identity while scaling quality.
5. **Stem-based "living" tracks + spatial audio.** Deliver not just a WAV but a stemmed, re-mixable project; spatial/immersive as an export target. Aligns with where distribution is heading.
6. **Plugin & content ecosystem (WAM + marketplace).** The durable moat isn't features we ship — it's the platform others build on.

---

## 5. The one-line strategy

**Be the only tool that is GarageBand-easy on the surface and Logic/FL-deep underneath — AI-native, collaborative, offline, and legally clean because you own everything you make.** The concrete path: **accounts+sync → real-time collab → WebMIDI → stem separation → WAM plugin host**, all riding on a CRDT + AudioWorklet/WASM foundation, with the "AI-picks-parameters, you-own-the-output" model as the defensible core.

---

## Sources
- [Best Online DAWs 2026 — Slooply](https://slooply.com/blog/best-online-daws/) · [Musician Wave](https://www.musicianwave.com/best-online-daws/) · [Veena: Soundtrap/BandLab compared](https://www.veena.studio/blog/best-browser-daws-compared) · [BandLab pricing 2026](https://checkthat.ai/brands/bandlab/pricing)
- [AI music generators 2026 — Dubspot](https://blog.dubspot.com/best-ai-music-generators-2026) · [Suno vs Udio 2026 — TLDL](https://www.tldl.io/blog/suno-vs-udio-comparison) · [We Rave You: what AI music can/can't do](https://weraveyou.com/2026/05/ai-music-generators-2026-what-they-can-cannot-do/)
- [Web Audio Modules 2.0 (standard)](https://www.webaudiomodules.com/docs/intro/) · [WAM-Studio DAW paper (ACM)](https://dl.acm.org/doi/fullHtml/10.1145/3543873.3587987) · [Oli Larkin: WAM overview (KVR)](https://www.kvraudio.com/news/web-audio-modules-wam---a-new-audio-plug-in-format-for-the-web-browser-39307)
- [Multiplayer DAWs & remote collab — AudioCipher](https://www.audiocipher.com/post/multiplayer-daw-remote-music-collaboration-apps) · [Real-time collaborative DAW 2026 — SoundBridge](https://www.soundbridge.io/real-time-collaborative-daw-your-2026-production-guide) · [Endlesss](https://endlesss.net/)
- [Best AI stem separation 2026 — MixingGPT](https://mixinggpt.com/blog/best-ai-stem-separation-tools-2026) · [Stem splitter API comparison — DEV](https://dev.to/stevecase430/ai-stem-splitter-api-comparison-2026-stemsplit-vs-lalalai-vs-moises-with-benchmarks-372l) · [Moises review 2026 — Chartlex](https://www.chartlex.com/blog/marketing/moises-ai-review-2026)
- [UMG settles Udio, licensed AI service — MBW](https://www.musicbusinessworldwide.com/universal-music-settles-udio-lawsuit-strikes-deal-for-licensed-ai-music-platform/) · [AI music lawsuits timeline 2026 — Dynamoi](https://dynamoi.com/learn/ai-music-distribution/ai-music-copyright-cases-timeline) · [AI music licensing explained 2026 — Dubspot](https://blog.dubspot.com/ai-music-licensing-explained-2026)
