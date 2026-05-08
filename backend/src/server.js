require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { connectToMongo } = require('./db');
const apiRouter = require('./routes/api');
const authRouter = require('./routes/auth');

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MONGO_URI = process.env.MONGO_URI;
const KEEP_ALIVE_ENABLED = process.env.KEEP_ALIVE_ENABLED === 'true';
const KEEP_ALIVE_URL = process.env.KEEP_ALIVE_URL || process.env.BACKEND_URL;
const KEEP_ALIVE_INTERVAL_MS = process.env.KEEP_ALIVE_INTERVAL_MS
  ? Number(process.env.KEEP_ALIVE_INTERVAL_MS)
  : 5 * 60 * 1000;

function startKeepAlivePing() {
  if (!KEEP_ALIVE_ENABLED || !KEEP_ALIVE_URL) return;

  let parsedUrl;
  try {
    parsedUrl = new URL(KEEP_ALIVE_URL);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`Keep-alive disabled: invalid KEEP_ALIVE_URL (${err.message})`);
    return;
  }

  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname);
  if (isLocalhost) {
    // eslint-disable-next-line no-console
    console.warn('Keep-alive disabled for localhost URL');
    return;
  }

  const pingUrl = new URL('/health', parsedUrl).toString();
  const intervalMs = Number.isFinite(KEEP_ALIVE_INTERVAL_MS)
    ? Math.max(60 * 1000, KEEP_ALIVE_INTERVAL_MS)
    : 5 * 60 * 1000;

  setInterval(async () => {
    try {
      const res = await fetch(pingUrl);
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.warn(`Keep-alive ping failed: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`Keep-alive ping failed: ${err.message}`);
    }
  }, intervalMs).unref();
}

async function start() {
  await connectToMongo(MONGO_URI);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', apiRouter);
  app.use('/auth', authRouter);

  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: 'Not found' });
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${PORT}`);
    startKeepAlivePing();
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
