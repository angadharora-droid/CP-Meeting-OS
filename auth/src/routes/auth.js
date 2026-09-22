const express = require('express');

const CentralUser = require('../models/CentralUser');
const AppLink = require('../models/AppLink');
const Session = require('../models/Session');
const { isKnownApp } = require('../apps');
const { randomId, verifySecret, hashSecret, signToken, verifyToken } = require('../lib/crypto');
const { COOKIE_NAME, SESSION_DAYS, sessionCookieOptions, clearCookieOptions, sessionExpiry } = require('../lib/cookies');
const { normalizeCentralId, secretError } = require('../lib/validate');
const { requireUser } = require('../middleware/session');

const router = express.Router();

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;
const HANDOFF_TTL_SECONDS = 60;
const MAX_RECENTS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

function tokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) throw new Error('AUTH_TOKEN_SECRET is not set');
  return secret;
}

async function sessionPayload(user) {
  const links = await AppLink.find({ centralId: user.centralId }, { _id: 0, app: 1, localUserId: 1 }).lean();
  return {
    ok: true,
    user: { centralId: user.centralId, name: user.name, role: user.role, secretType: user.secretType },
    links,
    prefs: {
      favourites: user.prefs?.favourites || [],
      recents: user.prefs?.recents || [],
    },
  };
}

router.post('/login', async (req, res) => {
  const centralId = normalizeCentralId(req.body?.centralId);
  const secret = String(req.body?.secret || '');
  if (!centralId || !secret) {
    return res.status(400).json({ ok: false, error: 'ID and PIN or password are required' });
  }

  const user = await CentralUser.findOne({ centralId, active: true });
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Incorrect ID or PIN/password' });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const retryAfterSeconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
    return res.status(423).json({ ok: false, error: `Too many attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s)`, retryAfterSeconds });
  }

  if (!verifySecret(secret, user.secretHash)) {
    user.failedAttempts = (user.failedAttempts || 0) + 1;
    if (user.failedAttempts >= MAX_ATTEMPTS) {
      user.failedAttempts = 0;
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    }
    await user.save();
    return res.status(401).json({ ok: false, error: 'Incorrect ID or PIN/password' });
  }

  user.failedAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  const sid = randomId(32);
  await Session.create({
    sid,
    centralId: user.centralId,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
    expiresAt: sessionExpiry(),
  });
  res.cookie(COOKIE_NAME, sid, sessionCookieOptions());
  return res.json(await sessionPayload(user));
});

router.post('/logout', async (req, res) => {
  const sid = req.cookies?.[COOKIE_NAME];
  if (sid) await Session.deleteOne({ sid });
  res.clearCookie(COOKIE_NAME, clearCookieOptions());
  return res.json({ ok: true });
});

router.get('/me', requireUser, async (req, res) => {
  // Sliding expiry: extend once the session is more than a day old
  const remaining = req.session.expiresAt.getTime() - Date.now();
  if (remaining < (SESSION_DAYS - 1) * DAY_MS) {
    req.session.expiresAt = sessionExpiry();
    await req.session.save();
    res.cookie(COOKIE_NAME, req.session.sid, sessionCookieOptions());
  }
  return res.json(await sessionPayload(req.user));
});

// Browser asks: "who am I inside app X?" and receives a short-lived hand-off token
// that the app's backend verifies with POST /auth/verify.
router.get('/resolve', requireUser, async (req, res) => {
  const app = String(req.query.app || '').trim();
  if (!isKnownApp(app)) {
    return res.status(400).json({ ok: false, error: 'unknown_app' });
  }
  const link = await AppLink.findOne({ centralId: req.user.centralId, app }).lean();
  if (!link) {
    return res.status(404).json({ ok: false, error: 'not_linked' });
  }
  const token = signToken(
    { app, sub: link.localUserId, cid: req.user.centralId, name: req.user.name, role: req.user.role },
    tokenSecret(),
    HANDOFF_TTL_SECONDS,
  );
  return res.json({ ok: true, app, localUserId: link.localUserId, token });
});

// App backends call this with the hand-off token they received from their frontend.
router.post('/verify', (req, res) => {
  const payload = verifyToken(req.body?.token, tokenSecret());
  if (!payload) {
    return res.status(401).json({ ok: false, error: 'invalid_token' });
  }
  const expectedApp = String(req.headers['x-sso-app'] || '').trim();
  if (expectedApp && expectedApp !== payload.app) {
    return res.status(403).json({ ok: false, error: 'app_mismatch' });
  }
  return res.json({
    ok: true,
    app: payload.app,
    localUserId: payload.sub,
    centralId: payload.cid,
    name: payload.name,
    role: payload.role,
  });
});

// Change own PIN or password (and optionally switch between the two)
router.post('/secret', requireUser, async (req, res) => {
  const current = String(req.body?.current || '');
  const next = String(req.body?.next || '');
  const type = String(req.body?.type || req.user.secretType);

  if (!verifySecret(current, req.user.secretHash)) {
    return res.status(401).json({ ok: false, error: 'Current PIN/password is incorrect' });
  }
  const error = secretError(type, next);
  if (error) return res.status(400).json({ ok: false, error });

  req.user.secretType = type;
  req.user.secretHash = hashSecret(next);
  await req.user.save();
  // Other devices must log in again with the new secret
  await Session.deleteMany({ centralId: req.user.centralId, sid: { $ne: req.session.sid } });
  return res.json({ ok: true, secretType: type });
});

function cleanRecents(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const rows = [];
  for (const item of input) {
    const app = String(item?.app || '');
    const at = new Date(item?.at || 0);
    if (!isKnownApp(app) || Number.isNaN(at.getTime()) || seen.has(app)) continue;
    seen.add(app);
    rows.push({ app, at });
  }
  rows.sort((a, b) => b.at - a.at);
  return rows.slice(0, MAX_RECENTS);
}

router.put('/prefs', requireUser, async (req, res) => {
  const favourites = Array.isArray(req.body?.favourites)
    ? [...new Set(req.body.favourites.map(String).filter(isKnownApp))].slice(0, 50)
    : req.user.prefs?.favourites || [];
  const recents = req.body?.recents !== undefined ? cleanRecents(req.body.recents) : req.user.prefs?.recents || [];
  req.user.prefs = { favourites, recents };
  await req.user.save();
  return res.json({ ok: true, prefs: { favourites, recents } });
});

module.exports = router;
