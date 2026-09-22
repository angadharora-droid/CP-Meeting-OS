require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { connectToMongo } = require('./db');
const CentralUser = require('./models/CentralUser');
const { hashSecret } = require('./lib/crypto');
const { normalizeCentralId, validCentralId, secretError } = require('./lib/validate');
const { loadSession } = require('./middleware/session');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');

const PORT = process.env.PORT ? Number(process.env.PORT) : 4100;
const MONGO_URI = process.env.MONGO_URI;
const CORS_ORIGINS = (process.env.AUTH_CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsOptions(req, callback) {
  const origin = req.header('Origin');
  // Cookies need an explicit origin echo; "*" is not allowed with credentials.
  if (!origin || CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes(origin)) {
    callback(null, { origin: true, credentials: true });
    return;
  }
  callback(null, { origin: false });
}

async function ensureAdminUser() {
  if (await CentralUser.exists({ role: 'admin' })) return;
  const centralId = normalizeCentralId(process.env.AUTH_ADMIN_ID);
  const secret = String(process.env.AUTH_ADMIN_SECRET || '');
  const secretType = process.env.AUTH_ADMIN_SECRET_TYPE || 'password';
  if (!validCentralId(centralId) || secretError(secretType, secret)) {
    // eslint-disable-next-line no-console
    console.warn('No admin exists and AUTH_ADMIN_ID / AUTH_ADMIN_SECRET are not usable; skipping admin bootstrap');
    return;
  }
  await CentralUser.create({
    centralId,
    name: process.env.AUTH_ADMIN_NAME || 'Administrator',
    role: 'admin',
    secretType,
    secretHash: hashSecret(secret),
  });
  // eslint-disable-next-line no-console
  console.log(`Created first admin "${centralId}"`);
}

function startKeepAlivePing() {
  if (process.env.KEEP_ALIVE_ENABLED !== 'true' || !process.env.KEEP_ALIVE_URL) return;
  let pingUrl;
  try {
    pingUrl = new URL('/health', process.env.KEEP_ALIVE_URL).toString();
  } catch {
    return;
  }
  const intervalMs = Math.max(60 * 1000, Number(process.env.KEEP_ALIVE_INTERVAL_MS) || 5 * 60 * 1000);
  setInterval(() => {
    fetch(pingUrl).catch(() => {});
  }, intervalMs).unref();
}

async function start() {
  if (!process.env.AUTH_TOKEN_SECRET) {
    throw new Error('AUTH_TOKEN_SECRET must be set');
  }
  await connectToMongo(MONGO_URI);
  await ensureAdminUser();

  const app = express();
  app.set('trust proxy', 1);
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(loadSession);

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/auth', authRouter);
  app.use('/admin', adminRouter);

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Auth service listening on http://localhost:${PORT}`);
    startKeepAlivePing();
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Auth service failed to start:', err);
  process.exit(1);
});
