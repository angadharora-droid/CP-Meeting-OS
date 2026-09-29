const crypto = require('crypto');
const express = require('express');

const Person = require('../models/Person');
const User = require('../models/User');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const { syncMeetingToCalendars } = require('../services/meetingSync');
const { listMeetingHeaders, resolveHeaderName } = require('../services/meetingHeaders');

// Endpoints for Executive Scheduler's server. The Scheduler creates meetings here from its own
// Meeting tab, and brings the action points assigned to its users into their Submissions inbox.
// Every call must carry the shared MEETING_OS_SECRET in X-Integration-Secret; while that
// variable is not set these routes answer 404, as if they did not exist.
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

const str = (value) => String(value == null ? '' : value).trim();

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

// Meeting dates are kept as dd/mm/yyyy, due dates as yyyy-mm-dd; the Scheduler speaks yyyy-mm-dd.
function toIsoDate(value) {
  const s = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : '';
}
const toDmy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

// The same ids and reference numbers the New Meeting form makes.
const uid = () => String(Date.now()) + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
const generateRefNo = () => `MO/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;

const DURATIONS = { '30 minutes': 30, '45 minutes': 45, '1 hour': 60, '1.5 hours': 90, '2 hours': 120, '3 hours': 180 };
const MODES = ['inperson', 'vc', 'hybrid'];

// Everyone who can call or attend a meeting: the Meeting OS accounts and the people registry,
// once each (a manager is in both, under the same id or email).
async function loadContacts() {
  const [users, people] = await Promise.all([
    User.find({}, { _id: 0, id: 1, name: 1, desig: 1, email: 1 }).sort({ createdAt: 1 }).lean(),
    Person.find({}, { _id: 0, id: 1, name: 1, desig: 1, email: 1, mobile: 1 }).sort({ createdAt: 1 }).lean(),
  ]);
  const contacts = [];
  const byId = new Map();
  const byEmail = new Map();
  const add = (p) => {
    const email = str(p.email).toLowerCase();
    const known = (p.id && byId.get(str(p.id))) || (email && byEmail.get(email));
    if (known) {
      known.mobile = known.mobile || str(p.mobile);
      known.desig = known.desig || str(p.desig);
      return;
    }
    const contact = { id: str(p.id), name: str(p.name), desig: str(p.desig), email, mobile: str(p.mobile) };
    if (!contact.id || !contact.name) return;
    contacts.push(contact);
    byId.set(contact.id, contact);
    if (email) byEmail.set(email, contact);
  };
  users.forEach(add);
  people.forEach(add);
  return contacts.sort((a, b) => a.name.localeCompare(b.name));
}

// Who can be picked as caller and attendees, and the meeting headers in use.
router.get('/directory', async (_req, res) => {
  try {
    const [people, headers] = await Promise.all([loadContacts(), listMeetingHeaders()]);
    return res.json({ ok: true, people, headers: headers.map((h) => h.name) });
  } catch (err) {
    console.error('Integration directory failed:', err.message);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// A meeting created from Executive Scheduler — saved exactly as the New Meeting form saves one,
// and put into the invited attendees' calendars the same way. The caller and most attendees
// come from /directory; people who are not in it can be added by hand (name, designation,
// email, mobile) and are sent the invite too when they have an email, unless `invite: false`.
router.post('/meetings', async (req, res) => {
  const b = req.body || {};
  const title = str(b.title);
  const date = str(b.date);
  const time = str(b.time);
  const topics = (Array.isArray(b.topics) ? b.topics : [])
    .map((t) => ({ topic: str(t?.topic), purpose: str(t?.purpose), desiredOutcome: str(t?.desiredOutcome), documents: str(t?.documents) }))
    .filter((t) => t.topic || t.purpose || t.desiredOutcome || t.documents);
  if (!title) return res.status(400).json({ ok: false, error: 'Give the meeting a name' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ ok: false, error: 'Choose the date' });
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return res.status(400).json({ ok: false, error: 'Choose the time' });
  if (!topics.some((t) => t.purpose)) return res.status(400).json({ ok: false, error: 'Add at least one agenda purpose' });

  try {
    const contacts = await loadContacts();
    const caller = contacts.find((p) => p.id === str(b.calledById));
    if (!caller) return res.status(400).json({ ok: false, error: 'Choose who is calling the meeting' });

    const attendeeDetails = [];
    const seen = new Set();
    const add = (p, source) => {
      const email = str(p.email).toLowerCase();
      const key = str(p.id) || email || str(p.name).toLowerCase();
      if (!str(p.name) || seen.has(key)) return;
      seen.add(key);
      const invite = source === 'manual' ? p.invite !== false && !!email : true;
      attendeeDetails.push({ id: str(p.id), name: str(p.name), desig: str(p.desig), email, mobile: str(p.mobile), source, invite });
    };
    add(caller, 'database');
    (Array.isArray(b.attendeeIds) ? b.attendeeIds : []).forEach((id) => {
      const person = contacts.find((p) => p.id === str(id));
      if (person) add(person, 'database');
    });
    (Array.isArray(b.manualAttendees) ? b.manualAttendees : []).forEach((p) => add({ ...p, id: '' }, 'manual'));

    const mode = MODES.includes(b.mode) ? b.mode : 'inperson';
    const venue = mode === 'vc' ? '' : str(b.venue);
    const vcLink = mode === 'inperson' ? '' : str(b.vcLink);
    const duration = DURATIONS[b.duration] ? b.duration : '1 hour';
    const header = str(b.meetingHeader);
    const meeting = {
      meetingId: uid(),
      meetingHeader: header ? (await resolveHeaderName(header)) || header : '',
      title,
      date: toDmy(date),
      time,
      duration,
      mode,
      venue,
      vcLink,
      type: mode,
      location: venue || vcLink,
      unit: str(b.unit),
      calledById: caller.id,
      calledBy: caller.name,
      attendees: attendeeDetails.map((a) => a.name).join('\n'),
      attendeeDetails,
      topics,
      includeAdditionalPoints: false,
      purpose: topics.map((t) => [t.topic, t.purpose].filter(Boolean).join(': ')).filter(Boolean).join('\n'),
      desiredOutcome: topics.map((t) => t.desiredOutcome).filter(Boolean).join('\n'),
      documents: topics.map((t) => t.documents).filter(Boolean).join('\n'),
      specialNote: str(b.note),
      status: 'Open',
      refNo: generateRefNo(),
    };
    await Meeting.create(meeting);

    // Invites go out after the answer: email can take a while, and the meeting is saved already.
    Meeting.findOne({ meetingId: meeting.meetingId }).lean()
      .then((saved) => saved && syncMeetingToCalendars(saved, meeting.meetingId))
      .catch((err) => console.error('Calendar sync failed:', err.message));

    return res.json({
      ok: true,
      meeting: {
        meetingId: meeting.meetingId,
        refNo: meeting.refNo,
        title,
        date,
        time,
        duration,
        minutes: DURATIONS[duration],
        mode,
        venue,
        vcLink,
        calledBy: caller.name,
        attendees: attendeeDetails.map((a) => ({
          id: a.id, name: a.name, desig: a.desig, email: a.email, mobile: a.mobile, inDirectory: a.source !== 'manual', invited: a.invite && !!a.email,
        })),
      },
    });
  } catch (err) {
    console.error('Integration create meeting failed:', err.message);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// The action points assigned to one person — by name, or by mobile number when one is given —
// that are not done yet, created at or after `since` (milliseconds since 1970; default: all),
// each with the meeting it came out of. Oldest first, at most 200.
router.get('/action-points', async (req, res) => {
  const byName = nameRegex(req.query.name);
  const byMobile = mobileRegex(req.query.mobile);
  if (!byName && !byMobile) return res.status(400).json({ ok: false, error: 'name or mobile required' });
  const since = Number(req.query.since) || 0;

  try {
    const tasks = await Task.find(
      {
        $or: [byName && { assignedTo: byName }, byMobile && { assignedToMobile: byMobile }].filter(Boolean),
        status: { $ne: 'Done' },
        ...(since ? { createdAt: { $gte: new Date(since) } } : {}),
      },
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
