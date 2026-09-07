# Fuse — Activation guide (turn on the cloud/AI/collab features)

Fuse is **offline-first**: everything below already works with **zero configuration**.
The env vars here only *upgrade* a feature (cloud, higher-quality AI, reliable collab).
Nothing breaks if they're unset — each feature degrades to its local/offline path.

Set these in your host (Vercel → Project → Settings → Environment Variables), then redeploy.

---

## Works out of the box (no config)
- Full studio: drum machine, channel rack, piano roll, arrangement (clip keyframes/fades), mixer, mastering, recording, 234-preset sound library, MIDI import/export, WebMIDI hardware.
- **AI beat generator + AI help assistant** — local fallback (no key needed).
- **Stem separation** — fast offline split (Instrumental / Vocal / Bass / Drums-Highs).
- **Project library** — saved locally in the browser.
- **Real-time collaboration** — works P2P via public signaling (fine for demos).

---

## 1. Accounts + cloud project sync (library follows you across devices)
| Var | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | your Clerk publishable key |
| `CLERK_SECRET_KEY` | your Clerk secret key |
| `BLOB_READ_WRITE_TOKEN` | a Vercel Blob store token (Storage → Blob → create) |

Without these: projects stay in the local browser library.

## 2. High-quality AI stem separation (neural 4-stem)
| Var | Value |
|---|---|
| `REPLICATE_API_TOKEN` | your Replicate API token |
| `REPLICATE_STEM_MODEL` *(optional)* | `"owner/name"` of a Demucs model (default `ryan5453/demucs`) |
| `REPLICATE_STEM_VERSION` *(optional)* | pin an exact model version hash |

Without these: the fast offline split is used automatically.

## 3. AI (Fuse Brain generator + Fuse Assistant)
| Var | Value |
|---|---|
| `OPENAI_API_KEY` | your OpenAI key |
| `OPENAI_BASE_URL` *(optional)* | custom/compatible endpoint |
| `BTZ_AI_MODEL` *(optional)* | model id (default `gpt-4o-mini`) |

Without these: the built-in local beat parser + offline help knowledge base are used.

## 4. Reliable real-time collaboration (production)
The app ships with a signaling server in **`collab-server/`** (it only relays the WebRTC
handshake — no project data passes through it; audio/projects go peer-to-peer end-to-end).

1. Deploy `collab-server/` to any Node host (Railway / Render / Fly):
   ```
   cd collab-server && npm install && PORT=4444 npm start
   ```
   Expose it over TLS so it's reachable as `wss://your-signaling-host`.
2. Set in the Fuse app:
   | Var | Value |
   |---|---|
   | `NEXT_PUBLIC_COLLAB_SIGNALING` | `wss://your-signaling-host` |

Without this: collaboration uses public y-webrtc signaling (works, but flaky).
Optional next step for cross-device persistence beyond one browser: run a
y-websocket/Hocuspocus server and attach it to the same Y.Doc (local IndexedDB
persistence is already built in).

## 5. Billing (already wired)
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the `NEXT_PUBLIC_STRIPE_PRICE_*` /
`STRIPE_PRICE_LIFETIME` price ids power the pricing page + checkout.

---

## Forward roadmap (from docs/COMPETITIVE-RESEARCH.md — not yet built)
Biggest remaining moats, in priority order:
1. **Field-granular collab polish** — live cursors in piano roll (Arrange clip-presence is done), server persistence.
2. **WAM plugin host** ("VSTs for the web") — the durable extensibility moat = Logic/FL depth.
3. **Mobile-first touch UI** — capture the BandLab/mobile audience.
4. **Sample/preset marketplace** + **one-click distribution** to streaming.
5. **Notation view** — opens the education/composer segment.
