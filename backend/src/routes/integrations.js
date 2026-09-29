const crypto = require('crypto');
const express = require('express');

const Person = require('../models/Person');
const User = require('../models/User');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');

// Read-only endpoints for other CPG apps' servers. Executive Scheduler uses them to link its
// accounts to Meeting OS accounts and to bring the action points assigned to a linked person
// into their Submissions inbox. Every call must carry the shared MEETING_OS_SECRET in
// X-Integration-Secret; while that variable is not set these routes answer 404, as if they did
// not exist. Nothing here writes to the database.
const router = express.Router();

router.use((req, res, next) => {
  const secret = process.env.MEETING_OS_SECRET || '';
  if (!secret) return res.status(404).json({ ok: false, error: 'Not found' });
  const given = Buffer.from(String(req.get('X-Integration-Secret') || ''));
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  return next();
});

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// "Assigned to" is typed by hand when a meeting is closed, so a name matches the way a person
// reads it: ignoring capitals and extra spaces.
function nameRegex(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean).map(escapeRegex);
  return words.length ? new RegExp(`^\\s*${words.join('\\s+')}\\s*$`, 'i') : null;
}

// Mobile numbers are typed by hand too (+91 78230 26662, 07823026662 …): the last ten digits decide.
function mobileRegex(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? new RegExp(`${digits.split('').join('\\D*')}\\D*$`) : null;
}

// Meeting dates are kept as dd/mm/yyyy, due dates as yyyy-mm-dd; callers get yyyy-mm-dd.
function toIsoDate(value) {
  const s = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : '';
}

// The Meeting OS accounts (admin and managers) another app's account can be linked to, with the
// mobile number from the people registry where there is one. Only these people use Meeting OS.
router.get('/people', async (_req, res) => {
  try {
    const [users, people] = await Promise.all([
      User.find({}, { _id: 0, id: 1, name: 1, desig: 1, email: 1, role: 1 }).sort({ createdAt: 1 }).lean(),
      Person.find({}, { _id: 0, id: 1, email: 1, mobile: 1 }).lean(),
    ]);
    const mobileOf = (u) => {
      const person = people.find((p) => (p.id && p.id === u.id) || (p.email && p.email === u.email));
      return String(person?.mobile || '').trim();
    };
    return res.json({
      ok: true,
      people: users.map((u) => ({
        id: u.id, name: u.name, desig: u.desig || '', email: u.email || '', role: u.role, mobile: mobileOf(u),
      })),
    });
  } catch (err) {
    console.error('Integration people failed:', err.message);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// The action points assigned to one Meeting OS account — by its current name, or by mobile
// number when one is given — that are not done yet, created at or after `since` (milliseconds
// since 1970; default: all), each with the meeting it came out of. Oldest first, at most 200.
router.get('/action-points', async (req, res) => {
  const userId = String(req.query.userId || '').trim();
  if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
  const since = Number(req.query.since) || 0;

  try {
    const user = await User.findOne({ id: userId }, { _id: 0, id: 1, name: 1 }).lean();
    if (!user) return res.status(404).json({ ok: false, error: 'No such Meeting OS account' });
    const byName = nameRegex(user.name);
    const byMobile = mobileRegex(req.query.mobile);
    const who = [byName && { assignedTo: byName }, byMobile && { assignedToMobile: byMobile }].filter(Boolean);
    if (!who.length) return res.json({ ok: true, user: { id: user.id, name: user.name }, actionPoints: [] });

    const tasks = await Task.find(
      { $or: who, status: { $ne: 'Done' }, ...(since ? { createdAt: { $gte: new Date(since) } } : {}) },
      { _id: 0, __v: 0 },
    )
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    const meetingIds = [...new Set(tasks.map((t) => t.meetingId).filter(Boolean))];
    const meetings = meetingIds.length
      ? await Meeting.find({ meetingId: { $in: meetingIds } }, { _id: 0, meetingId: 1, title: 1, date: 1, unit: 1, calledBy: 1 }).lean()
      : [];
    const meetingById = new Map(meetings.map((m) => [m.meetingId, m]));

    return res.json({
      ok: true,
      user: { id: user.id, name: user.name },
      actionPoints: tasks.map((t) => {
        const m = meetingById.get(t.meetingId) || {};
        return {
          taskId: t.taskId,
          task: t.task,
          assignedTo: t.assignedTo,
          dueDate: toIsoDate(t.dueDate),
          status: t.status,
          meetingId: t.meetingId || '',
          meetingTitle: t.meetingTitle || m.title || '',
          meetingDate: toIsoDate(t.meetingDate || m.date),
          unit: m.unit || '',
          calledBy: m.calledBy || '',
          createdAt: t.createdAt,
        };
      }),
    });
  } catch (err) {
    console.error('Integration action points failed:', err.message);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

module.exports = router;
