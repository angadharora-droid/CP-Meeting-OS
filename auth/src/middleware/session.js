const Session = require('../models/Session');
const CentralUser = require('../models/CentralUser');
const { COOKIE_NAME } = require('../lib/cookies');

// Attaches req.session (Session doc) and req.user (CentralUser doc) when the
// cookie names a live session. Never rejects on its own.
async function loadSession(req, _res, next) {
  req.session = null;
  req.user = null;
  const sid = req.cookies?.[COOKIE_NAME];
  if (!sid) return next();
  try {
    const session = await Session.findOne({ sid, expiresAt: { $gt: new Date() } });
    if (!session) return next();
    const user = await CentralUser.findOne({ centralId: session.centralId, active: true });
    if (!user) return next();
    req.session = session;
    req.user = user;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Session load failed:', err.message);
  }
  return next();
}

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ ok: false, error: 'not_logged_in' });
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ ok: false, error: 'not_logged_in' });
  if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'admin_required' });
  return next();
}

module.exports = { loadSession, requireUser, requireAdmin };
