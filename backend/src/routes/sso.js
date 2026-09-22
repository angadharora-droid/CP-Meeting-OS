const express = require('express');
const User = require('../models/User');
const { directoryGuard } = require('../lib/ssoClient');

const router = express.Router();

// User directory for the central sign-on admin screen. Includes the PIN so the
// central login can carry it over; only reachable with the shared secret.
router.get('/users', directoryGuard, async (_req, res) => {
  const users = await User.find({}, { _id: 0, id: 1, name: 1, email: 1, role: 1, pin: 1 })
    .sort({ createdAt: 1 })
    .lean();
  return res.json(users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, secret: u.pin })));
});

module.exports = router;
