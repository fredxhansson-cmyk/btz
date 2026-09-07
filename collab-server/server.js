/**
 * Fuse collaboration signaling server.
 *
 * A tiny y-webrtc–compatible signaling relay: it does NOT see project data —
 * WebRTC carries the actual audio project peer-to-peer (end-to-end). This server
 * only helps peers in the same room find each other (topic pub/sub) and relays
 * the WebRTC handshake. Stateless and cheap to host.
 *
 * Run:   PORT=4444 node server.js
 * Deploy: Railway / Render / Fly / any Node host that exposes a public wss:// URL.
 * Then set in the Fuse app env:  NEXT_PUBLIC_COLLAB_SIGNALING=wss://your-host
 *
 * Protocol (y-webrtc): messages are JSON — subscribe/unsubscribe to topics,
 * publish to a topic (relayed to all other subscribers), and ping/pong keepalive.
 */
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 4444;
const PING_TIMEOUT = 30000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); res.end('ok'); return; }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Fuse signaling server — WebSocket only.');
});

const wss = new WebSocketServer({ server });

/** topic -> Set<ws> */
const topics = new Map();

const send = (conn, msg) => {
  if (conn.readyState !== 0 && conn.readyState !== 1) { conn.close(); return; }
  try { conn.send(JSON.stringify(msg)); } catch (e) { conn.close(); }
};

wss.on('connection', (conn) => {
  const subscribed = new Set();
  let alive = true;

  conn.on('pong', () => { alive = true; });

  const pingTimer = setInterval(() => {
    if (!alive) { conn.terminate(); clearInterval(pingTimer); return; }
    alive = false;
    try { conn.ping(); } catch (e) { conn.terminate(); }
  }, PING_TIMEOUT);

  conn.on('close', () => {
    for (const topic of subscribed) {
      const subs = topics.get(topic);
      if (subs) { subs.delete(conn); if (subs.size === 0) topics.delete(topic); }
    }
    subscribed.clear();
    clearInterval(pingTimer);
  });

  conn.on('message', (data) => {
    let message;
    try { message = JSON.parse(data); } catch (e) { return; }
    if (!message || !message.type) return;

    switch (message.type) {
      case 'subscribe':
        (message.topics || []).forEach((topic) => {
          if (typeof topic !== 'string') return;
          let subs = topics.get(topic);
          if (!subs) { subs = new Set(); topics.set(topic, subs); }
          subs.add(conn);
          subscribed.add(topic);
        });
        break;
      case 'unsubscribe':
        (message.topics || []).forEach((topic) => {
          const subs = topics.get(topic);
          if (subs) subs.delete(conn);
          subscribed.delete(topic);
        });
        break;
      case 'publish': {
        if (!message.topic) break;
        const receivers = topics.get(message.topic);
        if (receivers) receivers.forEach((r) => send(r, message));
        break;
      }
      case 'ping':
        send(conn, { type: 'pong' });
        break;
      default:
        break;
    }
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Fuse signaling server listening on :${PORT}`);
});
