const express = require('express');

const CentralUser = require('../models/CentralUser');
const AppLink = require('../models/AppLink');
const Session = require('../models/Session');
const { APPS, isKnownApp, directoryEnvName } = require('../apps');
const { hashSecret } = require('../lib/crypto');
const { normalizeCentralId, validCentralId, secretError, ROLES } = require('../lib/validate');
const { requireAdmin } = require('../middleware/session');

const router = express.Router();
router.use(requireAdmin);

async function usersWithLinks() {
  const [users, links] = await Promise.all([
    CentralUser.find({}).sort({ createdAt: 1 }),
    AppLink.find({}, { _id: 0, centralId: 1, app: 1, localUserId: 1, localLabel: 1 }).lean(),
  ]);
  const byUser = {};
  links.forEach((link) => {
    if (!byUser[link.centralId]) byUser[link.centralId] = [];
    byUser[link.centralId].push({ app: link.app, localUserId: link.localUserId, localLabel: link.localLabel });
  });
  return users.map((u) => ({ ...u.toPublic(), links: byUser[u.centralId] || [] }));
}

function cleanLink(input) {
  const app = String(input?.app || '').trim();
  const localUserId = String(input?.localUserId || '').trim();
  const localLabel = String(input?.localLabel || '').trim();
  if (!isKnownApp(app)) return { error: `Unknown app "${app}"` };
  if (!localUserId) return { error: 'localUserId is required' };
  return { app, localUserId, localLabel };
}

router.get('/users', async (_req, res) => {
  return res.json({ ok: true, users: await usersWithLinks() });
});

router.post('/users', async (req, res) => {
  const centralId = normalizeCentralId(req.body?.centralId);
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const role = ROLES.has(req.body?.role) ? req.body.role : 'user';
  const secretType = String(req.body?.secretType || 'pin');
  const secret = String(req.body?.secret || '');
  const rawLinks = Array.isArray(req.body?.links) ? req.body.links : [];

  if (!validCentralId(centralId)) {
    return res.status(400).json({ ok: false, error: 'Central ID must be 2-40 characters: letters, digits, dot, dash or underscore' });
  }
  if (!name) return res.status(400).json({ ok: false, error: 'Name is required' });
  const err = secretError(secretType, secret);
  if (err) return res.status(400).json({ ok: false, error: err });

  const links = [];
  for (const raw of rawLinks) {
    const link = cleanLink(raw);
    if (link.error) return res.status(400).json({ ok: false, error: link.error });
    links.push(link);
  }

  if (await CentralUser.exists({ centralId })) {
    return res.status(409).json({ ok: false, error: 'That central ID already exists' });
  }
  for (const link of links) {
    const taken = await AppLink.findOne({ app: link.app, localUserId: link.localUserId }).lean();
    if (taken) {
      return res.status(409).json({ ok: false, error: `${link.app} user "${link.localUserId}" is already linked to ${taken.centralId}` });
    }
  }

  await CentralUser.create({ centralId, name, email, role, secretType, secretHash: hashSecret(secret) });
  if (links.length) {
    await AppLink.insertMany(links.map((l) => ({ ...l, centralId })));
  }
  const created = (await usersWithLinks()).find((u) => u.centralId === centralId);
  return res.status(201).json({ ok: true, user: created });
});

router.patch('/users/:centralId', async (req, res) => {
  const centralId = normalizeCentralId(req.params.centralId);
  const user = await CentralUser.findOne({ centralId });
  if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

  const isSelf = user.centralId === req.user.centralId;
  const body = req.body || {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return res.status(400).json({ ok: false, error: 'Name is required' });
    user.name = name;
  }
  if (body.email !== undefined) user.email = String(body.email).trim().toLowerCase();
  if (body.role !== undefined) {
    if (isSelf) return res.status(400).json({ ok: false, error: 'You cannot change your own role' });
    if (!ROLES.has(body.role)) return res.status(400).json({ ok: false, error: 'Role must be admin or user' });
    user.role = body.role;
  }
  if (body.active !== undefined) {
    if (isSelf) return res.status(400).json({ ok: false, error: 'You cannot deactivate yourself' });
    user.active = Boolean(body.active);
  }
  if (body.secret !== undefined) {
    const secretType = String(body.secretType || user.secretType);
    const err = secretError(secretType, body.secret);
    if (err) return res.status(400).json({ ok: false, error: err });
    user.secretType = secretType;
    user.secretHash = hashSecret(String(body.secret));
    user.failedAttempts = 0;
    user.lockedUntil = null;
    await Session.deleteMany({ centralId: user.centralId });
  } else if (body.unlock === true) {
    user.failedAttempts = 0;
    user.lockedUntil = null;
  }

  await user.save();
  if (user.active === false) await Session.deleteMany({ centralId: user.centralId });
  const updated = (await usersWithLinks()).find((u) => u.centralId === centralId);
  return res.json({ ok: true, user: updated });
});

router.delete('/users/:centralId', async (req, res) => {
  const centralId = normalizeCentralId(req.params.centralId);
  if (centralId === req.user.centralId) {
    return res.status(400).json({ ok: false, error: 'You cannot delete yourself' });
  }
  const user = await CentralUser.findOne({ centralId });
  if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
  await Promise.all([
    AppLink.deleteMany({ centralId }),
    Session.deleteMany({ centralId }),
    CentralUser.deleteOne({ centralId }),
  ]);
  return res.json({ ok: true });
});

router.put('/users/:centralId/links', async (req, res) => {
  const centralId = normalizeCentralId(req.params.centralId);
  if (!(await CentralUser.exists({ centralId }))) {
    return res.status(404).json({ ok: false, error: 'User not found' });
  }
  const link = cleanLink(req.body);
  if (link.error) return res.status(400).json({ ok: false, error: link.error });

  const taken = await AppLink.findOne({ app: link.app, localUserId: link.localUserId }).lean();
  if (taken && taken.centralId !== centralId) {
    return res.status(409).json({ ok: false, error: `${link.app} user "${link.localUserId}" is already linked to ${taken.centralId}` });
  }
  await AppLink.updateOne(
    { centralId, app: link.app },
    { $set: { localUserId: link.localUserId, localLabel: link.localLabel } },
    { upsert: true },
  );
  return res.json({ ok: true, link: { ...link, centralId } });
});

router.delete('/users/:centralId/links/:app', async (req, res) => {
  const centralId = normalizeCentralId(req.params.centralId);
  const app = String(req.params.app || '');
  await AppLink.deleteOne({ centralId, app });
  return res.json({ ok: true });
});

router.get('/apps', (_req, res) => {
  return res.json({
    ok: true,
    apps: APPS.map((a) => ({ ...a, directory: Boolean(process.env[directoryEnvName(a.key)]) })),
  });
});

// Pulls an app's user list so the admin can match people without leaving the portal.
router.get('/apps/:app/users', async (req, res) => {
  const app = String(req.params.app || '');
  if (!isKnownApp(app)) return res.status(400).json({ ok: false, error: 'unknown_app' });
  const url = process.env[directoryEnvName(app)];
  if (!url) return res.status(404).json({ ok: false, error: 'no_directory', hint: `Set ${directoryEnvName(app)}` });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      headers: { 'X-SSO-Secret': process.env.SSO_SHARED_SECRET || '' },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data)) {
      return res.status(502).json({ ok: false, error: `App directory returned ${response.status}` });
    }
    const users = data.map((u) => ({
      id: String(u.id ?? u._id ?? '').trim(),
      name: String(u.name || '').trim(),
      email: String(u.email || '').trim().toLowerCase(),
      role: String(u.role || '').trim(),
      secret: u.secret !== undefined && u.secret !== null ? String(u.secret) : '',
    })).filter((u) => u.id);
    return res.json({ ok: true, app, users });
  } catch (err) {
    return res.status(502).json({ ok: false, error: `Could not reach app directory: ${err.message}` });
  } finally {
    clearTimeout(timer);
  }
});

module.exports = router;
