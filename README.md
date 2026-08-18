# FLOW Studio

A music studio that runs straight in your browser — drum machine, piano roll,
playlist, mixer, automation, mastering, recording and its own sound library.
It works on desktop, mobile and tablet, and can be installed as an app.

This is a **standalone Next.js app** and can point to its own domain
(e.g. `flowstudio.se`).

## Running locally

```bash
npm install
npm run dev
```

Then open **http://localhost:3000** — the studio lives on the home page, no
path required.

If the port is taken: `npm run dev -- -p 3001` and open
`http://localhost:3001`.

## Building and running in production

```bash
npm run build
npm start
```

## Publishing on your own address

The app is a plain Next.js app with no backend, so it can be hosted on any
static/Node host.

* **Vercel**: create a new project from the repo (Root Directory = repo root).
  Then point your domain there.
* **Netlify**: build `npm run build`.
* **Your own server**: `npm run build && npm start` behind a reverse proxy.

Run it over https in production — microphone recording, installing as an app and
offline mode require a secure context (localhost counts as secure during
development).

A full feature description is available in [DOCS.md](DOCS.md).
