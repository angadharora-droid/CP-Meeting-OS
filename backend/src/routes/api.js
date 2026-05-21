const express = require('express');

const Person = require('../models/Person');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const PinResetRequest = require('../models/PinResetRequest');
const User = require('../models/User');
const Config = require('../models/Config');
const { google } = require('googleapis');
const { pushMeetingToCalendar, cancelCalendarEvent, pushEventDirectly } = require('../services/googleCalendar');
const { sendCalendarInvites, sendCancellationNotices } = require('../services/calendarInvite');

const SAFE_USER_PROJECTION = { _id: 0, __v: 0, pin: 0, googleRefreshToken: 0 };

async function syncMeetingToCalendars(meeting, meetingId) {
  const inviteAttendees = (meeting.attendeeDetails || []).filter(
    (a) => a.email && a.invite !== false,
  );
  if (!inviteAttendees.length) return;

  const attendeeEmails = inviteAttendees.map((a) => a.email);

  // Find managers who have connected their Google Calendar
  const connectedUsers = await User.find(
    { email: { $in: attendeeEmails }, googleCalendarConnected: true, googleRefreshToken: { $ne: '' } },
    { email: 1, googleRefreshToken: 1 },
  ).lean();

  const tokenByEmail = {};
  connectedUsers.forEach((u) => { tokenByEmail[u.email] = u.googleRefreshToken; });

  // Push directly into each connected manager's calendar
  const pushedDirectly = new Set();
  for (const [email, token] of Object.entries(tokenByEmail)) {
    try {
      await pushEventDirectly(meeting, token);
      pushedDirectly.add(email);
    } catch (err) {
      console.error(`Direct calendar push failed for ${email}:`, err.message);
    }
  }

  // Also update the service-account event (for record-keeping), best-effort
  try {
    const googleEventId = await pushMeetingToCalendar(meeting);
    if (googleEventId && !meeting.googleEventId) {
      await require('../models/Meeting').updateOne({ meetingId }, { $set: { googleEventId } });
    }
  } catch (_) {}

  // Send email invites to attendees who haven't connected
  const needsEmail = {
    ...meeting,
    attendeeDetails: inviteAttendees.filter((a) => !pushedDirectly.has(a.email)),
  };
  if (needsEmail.attendeeDetails.length) {
    await sendCalendarInvites(needsEmail);
  }
}

const router = express.Router();
const ADMIN_ID = 'admin';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Angadh Arora';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();

function isGmail(email) {
  return /^[^\s@]+@gmail\.com$/i.test(String(email || '').trim());
}

function uid() {
  return String(Date.now()) + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

function generateTempPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function ensureAdminUser() {
  await User.updateMany(
    { role: 'admin', id: { $ne: ADMIN_ID } },
    { $set: { role: 'manager' } }
  );

  const admin = await User.findOne({ id: ADMIN_ID }).lean();
  if (admin) {
    await User.updateOne(
      { id: ADMIN_ID },
      { $set: { name: ADMIN_NAME, email: ADMIN_EMAIL, role: 'admin' } }
    );
    return User.findOne({ id: ADMIN_ID }).lean();
  }

  await User.create({
    id: ADMIN_ID,
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    pin: process.env.ADMIN_PIN || '131313',
    role: 'admin',
  });

  return User.findOne({ id: ADMIN_ID }).lean();
}

async function getRequestUser(req) {
  const userId = String(req.query.userId || req.body?.userId || '').trim();
  if (!userId) return null;
  return User.findOne({ id: userId }, SAFE_USER_PROJECTION).lean();
}

async function getMeetingActor(req, meeting) {
  const user = await getRequestUser(req);
  if (!user) return null;
  if (user.role === 'admin') return user;
  if (meeting.calledById && meeting.calledById === user.id) return user;
  if (meeting.calledBy && meeting.calledBy === user.name) return user;
  return null;
}

function managerMeetingQuery(user) {
  if (!user || user.role === 'admin') return {};
  return {
    $or: [
      { calledById: user.id },
      { calledBy: user.name },
      { attendees: { $regex: user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
    ],
  };
}

router.get('/', async (req, res) => {
  const action = String(req.query.action || '').trim();

  try {
    await ensureAdminUser();

    if (action === 'get_users') {
      const user = await getRequestUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Admin access required' });
      }

      const users = await User.find({}, SAFE_USER_PROJECTION)
        .sort({ createdAt: 1 })
        .lean();
      return res.json(users);
    }

    if (action === 'get_people') {
      const people = await Person.find({}, { _id: 0, __v: 0 })
        .sort({ createdAt: 1 })
        .lean();
      return res.json(people);
    }

    if (action === 'get_meetings') {
      const user = await getRequestUser(req);
      const meetings = await Meeting.find(managerMeetingQuery(user), { _id: 0, __v: 0 })
        .sort({ createdAt: -1 })
        .lean();
      return res.json(meetings);
    }

    if (action === 'get_action_points') {
      const user = await getRequestUser(req);
      const query = user && user.role !== 'admin' ? { assignedTo: user.name } : {};
      const tasks = await Task.find(query, { _id: 0, __v: 0 })
        .sort({ createdAt: -1 })
        .lean();
      return res.json(tasks);
    }

    if (action === 'get_pin_reset_requests') {
      const user = await getRequestUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Admin access required' });
      }

      const requests = await PinResetRequest.find({}, { _id: 0, __v: 0 })
        .sort({ createdAt: -1 })
        .lean();
      return res.json(requests);
    }

    if (action === 'get_profile') {
      const userId = String(req.query.userId || '').trim();
      if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
      const user = await User.findOne({ id: userId }, SAFE_USER_PROJECTION).lean();
      if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
      return res.json({ ok: true, user });
    }

    if (action === 'gmail_sender_status') {
      const user = await getRequestUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Admin access required' });
      }
      const cfg = await Config.findOne({ key: 'gmail_refresh_token' }).lean();
      const emailCfg = await Config.findOne({ key: 'gmail_sender_email' }).lean();
      return res.json({ ok: true, connected: !!cfg?.value, senderEmail: emailCfg?.value || '' });
    }

    if (action === 'gmail_auth_url') {
      const user = await getRequestUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Admin access required' });
      }
      if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
        return res.status(503).json({ ok: false, error: 'Google OAuth not configured' });
      }
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        `${process.env.BACKEND_URL || 'http://localhost:4000'}/auth/gmail/callback`,
      );
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/gmail.send', 'openid', 'email'],
      });
      return res.json({ ok: true, url });
    }

    if (action === 'google_auth_url') {
      const userId = String(req.query.userId || '').trim();
      if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });

      if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
        return res.status(503).json({ ok: false, error: 'Google OAuth not configured' });
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_REDIRECT_URI,
      );

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/calendar.events'],
        state: userId,
      });

      return res.json({ ok: true, url });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const action = String(req.body?.action || '').trim();

  try {
    await ensureAdminUser();

    if (action === 'login') {
      const pin = String(req.body?.pin || '').trim();
      const user = await User.findOne({ pin }, SAFE_USER_PROJECTION).lean();
      if (!user) {
        return res.status(401).json({ ok: false, error: 'Incorrect PIN' });
      }
      return res.json({ ok: true, user });
    }

    if (action === 'add_manager') {
      const user = await getRequestUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Admin access required' });
      }

      const name = String(req.body?.name || '').trim();
      const desig = String(req.body?.desig || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();
      const pin = String(req.body?.pin || '').trim();

      if (!name || !desig || !email || !pin) {
        return res.status(400).json({ ok: false, error: 'name, designation, email, pin required' });
      }
      if (!isGmail(email)) {
        return res.status(400).json({ ok: false, error: 'Must be a Gmail address' });
      }
      if (!/^\d{6}$/.test(pin)) {
        return res.status(400).json({ ok: false, error: 'PIN must be six digits' });
      }

      const existingByEmail = await User.findOne({ email }).lean();
      if (existingByEmail) {
        return res.status(409).json({ ok: false, error: 'Manager already exists' });
      }
      const existingByPin = await User.findOne({ pin }).lean();
      if (existingByPin) {
        return res.status(409).json({ ok: false, error: 'PIN already in use' });
      }

      const manager = {
        id: uid(),
        name,
        desig,
        email,
        pin,
        role: 'manager',
      };

      await User.create(manager);
      await Person.updateOne(
        { email },
        { $set: { id: manager.id, name, desig, email } },
        { upsert: true }
      );

      return res.json({ ok: true, user: { id: manager.id, name, desig, email, role: manager.role } });
    }

    if (action === 'update_manager') {
      const user = await getRequestUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Admin access required' });
      }

      const id = String(req.body?.id || '').trim();
      const name = String(req.body?.name || '').trim();
      const desig = String(req.body?.desig || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();
      const pin = String(req.body?.pin || '').trim();

      if (!id || !name || !desig || !email) {
        return res.status(400).json({ ok: false, error: 'id, name, designation, email required' });
      }
      if (id === ADMIN_ID) {
        return res.status(400).json({ ok: false, error: 'Admin cannot be edited here' });
      }
      if (!isGmail(email)) {
        return res.status(400).json({ ok: false, error: 'Must be a Gmail address' });
      }
      if (pin && !/^\d{6}$/.test(pin)) {
        return res.status(400).json({ ok: false, error: 'PIN must be six digits' });
      }

      const existingByEmail = await User.findOne({ email, id: { $ne: id } }).lean();
      if (existingByEmail) {
        return res.status(409).json({ ok: false, error: 'Email already in use' });
      }
      if (pin) {
        const existingByPin = await User.findOne({ pin, id: { $ne: id } }).lean();
        if (existingByPin) {
          return res.status(409).json({ ok: false, error: 'PIN already in use' });
        }
      }

      const update = { name, desig, email, role: 'manager' };
      if (pin) update.pin = pin;

      await User.updateOne({ id, role: 'manager' }, { $set: update });
      await Person.updateOne(
        { id },
        { $set: { id, name, desig, email } },
        { upsert: true }
      );

      return res.json({ ok: true, user: { id, name, desig, email, role: 'manager' } });
    }

    if (action === 'delete_manager') {
      const user = await getRequestUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Admin access required' });
      }

      const id = String(req.body?.id || '').trim();
      if (!id) return res.status(400).json({ ok: false, error: 'id required' });
      if (id === ADMIN_ID) {
        return res.status(400).json({ ok: false, error: 'Admin cannot be deleted' });
      }

      await User.deleteOne({ id, role: 'manager' });
      await Person.deleteOne({ id });
      return res.json({ ok: true });
    }

    if (action === 'add_person') {
      const id = String(req.body?.id || '').trim();
      const name = String(req.body?.name || '').trim();
      const desig = String(req.body?.desig || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();

      if (!id || !name || !email) {
        return res.status(400).json({ ok: false, error: 'id, name, email required' });
      }
      if (!isGmail(email)) {
        return res.status(400).json({ ok: false, error: 'Must be a Gmail address' });
      }

      const existingByEmail = await Person.findOne({ email }).lean();
      if (existingByEmail && existingByEmail.id !== id) {
        return res.status(409).json({ ok: false, error: 'Already registered' });
      }

      await Person.updateOne(
        { id },
        { $set: { id, name, desig, email } },
        { upsert: true }
      );

      return res.json({ ok: true });
    }

    if (action === 'delete_person') {
      const id = String(req.body?.id || '').trim();
      if (!id) return res.status(400).json({ ok: false, error: 'id required' });

      await Person.deleteOne({ id });
      return res.json({ ok: true });
    }

    if (action === 'request_pin_reset') {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const name = String(req.body?.name || '').trim();

      if (!email) {
        return res.status(400).json({ ok: false, error: 'email required' });
      }

      const user = await User.findOne({ email }, { _id: 0, __v: 0, pin: 0 }).lean();
      if (!user) {
        return res.status(404).json({ ok: false, error: 'No manager found for that email' });
      }

      await PinResetRequest.create({
        requestId: uid(),
        userId: user.id,
        name: name || user.name,
        email: user.email,
        status: 'pending',
        requestedAt: new Date(),
      });

      return res.json({ ok: true });
    }

    if (action === 'issue_temp_pin') {
      const user = await getRequestUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Admin access required' });
      }

      const requestId = String(req.body?.requestId || '').trim();
      if (!requestId) {
        return res.status(400).json({ ok: false, error: 'requestId required' });
      }

      const request = await PinResetRequest.findOne({ requestId }).lean();
      if (!request) {
        return res.status(404).json({ ok: false, error: 'Request not found' });
      }

      const targetUser = await User.findOne({ id: request.userId }).lean();
      if (!targetUser) {
        return res.status(404).json({ ok: false, error: 'Linked manager account not found' });
      }

      const tempPin = generateTempPin();
      await User.updateOne({ id: targetUser.id }, { $set: { pin: tempPin } });
      await PinResetRequest.updateOne(
        { requestId },
        {
          $set: {
            status: 'issued',
            tempPin,
            resolvedAt: new Date(),
            issuedBy: user.name,
          },
        }
      );

      return res.json({ ok: true, tempPin, user: { id: targetUser.id, name: targetUser.name, email: targetUser.email } });
    }

    if (action === 'change_pin') {
      const user = await getRequestUser(req);
      if (!user) {
        return res.status(403).json({ ok: false, error: 'Login required' });
      }

      const currentPin = String(req.body?.currentPin || '').trim();
      const newPin = String(req.body?.newPin || '').trim();
      if (!currentPin || !newPin) {
        return res.status(400).json({ ok: false, error: 'currentPin and newPin required' });
      }
      if (!/^\d{6}$/.test(newPin)) {
        return res.status(400).json({ ok: false, error: 'New PIN must be six digits' });
      }

      const targetUser = await User.findOne({ id: user.id }).lean();
      if (!targetUser || targetUser.pin !== currentPin) {
        return res.status(401).json({ ok: false, error: 'Current PIN is incorrect' });
      }

      await User.updateOne({ id: user.id }, { $set: { pin: newPin } });
      return res.json({ ok: true });
    }

    if (action === 'disconnect_google') {
      const user = await getRequestUser(req);
      if (!user) return res.status(401).json({ ok: false, error: 'Login required' });

      const targetId = String(req.body?.targetUserId || user.id).trim();
      if (user.role !== 'admin' && user.id !== targetId) {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
      }

      await User.updateOne(
        { id: targetId },
        { $set: { googleRefreshToken: '', googleCalendarConnected: false } },
      );
      return res.json({ ok: true });
    }

    if (action === 'disconnect_gmail') {
      const user = await getRequestUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Admin access required' });
      }
      await Config.deleteMany({ key: { $in: ['gmail_refresh_token', 'gmail_sender_email'] } });
      return res.json({ ok: true });
    }

    if (action === 'log_meeting') {
      const meetingId = String(req.body?.meetingId || '').trim();
      const title = String(req.body?.title || '').trim();

      if (!meetingId || !title) {
        return res
          .status(400)
          .json({ ok: false, error: 'meetingId and title required' });
      }

      const update = {
        meetingId,
        meetingHeader: String(req.body?.meetingHeader || '').trim(),
        title,
        date: String(req.body?.date || ''),
        time: String(req.body?.time || ''),
        duration: String(req.body?.duration || ''),
        mode: String(req.body?.mode || req.body?.type || ''),
        venue: String(req.body?.venue || ''),
        vcLink: String(req.body?.vcLink || ''),
        type: String(req.body?.type || req.body?.mode || ''),
        location: String(req.body?.location || req.body?.venue || req.body?.vcLink || ''),
        unit: String(req.body?.unit || ''),
        calledById: String(req.body?.calledById || ''),
        calledBy: String(req.body?.calledBy || req.body?.calledByName || ''),
        attendees: String(req.body?.attendees || ''),
        attendeeDetails: Array.isArray(req.body?.attendeeDetails)
          ? req.body.attendeeDetails
              .map((person) => ({
                id: String(person?.id || '').trim(),
                name: String(person?.name || '').trim(),
                desig: String(person?.desig || '').trim(),
                email: String(person?.email || '').trim().toLowerCase(),
                mobile: String(person?.mobile || '').trim(),
                source: person?.source === 'manual' ? 'manual' : 'database',
                invite: person?.invite !== false,
              }))
              .filter((person) => person.name)
          : [],
        topics: Array.isArray(req.body?.topics)
          ? req.body.topics
              .filter((t) => t?.topic || t?.purpose)
              .map((t) => ({
                topic: String(t?.topic || ''),
                purpose: String(t?.purpose || ''),
                desiredOutcome: String(t?.desiredOutcome || ''),
                documents: String(t?.documents || ''),
              }))
          : [],
        includeAdditionalPoints: req.body?.includeAdditionalPoints !== false,
        purpose: String(req.body?.purpose || ''),
        desiredOutcome: String(req.body?.desiredOutcome || req.body?.outcome || ''),
        documents: String(req.body?.documents || req.body?.docs || ''),
        specialNote: String(req.body?.specialNote || req.body?.note || ''),
        status: String(req.body?.status || 'Open'),
        noticeText: String(req.body?.noticeText || ''),
        formText: String(req.body?.formText || ''),
        momText: String(req.body?.momText || ''),
        refNo: String(req.body?.refNo || ''),
        followupOfMeetingId: String(req.body?.followupOfMeetingId || ''),
      };

      await Meeting.updateOne({ meetingId }, { $set: update }, { upsert: true });

      // Link the source meeting to its newly created follow-up.
      if (update.followupOfMeetingId) {
        await Meeting.updateOne(
          { meetingId: update.followupOfMeetingId },
          { $set: { followupMeetingId: meetingId } },
        );
      }

      try {
        const saved = await Meeting.findOne({ meetingId }).lean();
        if (saved) {
          await syncMeetingToCalendars(saved, meetingId);
        }
      } catch (calErr) {
        console.error('Calendar sync failed:', calErr.message);
      }

      return res.json({ ok: true });
    }

    if (action === 'save_action_points') {
      const meetingId = String(req.body?.meetingId || '').trim();
      const meetingTitle = String(req.body?.meetingTitle || '').trim();
      const meetingPurpose = String(req.body?.meetingPurpose || '').trim();
      const meetingDate = String(req.body?.meetingDate || '').trim();
      const points = Array.isArray(req.body?.points) ? req.body.points : [];

      if (!meetingId) {
        return res.status(400).json({ ok: false, error: 'meetingId required' });
      }

      const normalizedPoints = points
        .map((p) => ({
          taskId: String(p?.taskId || '').trim(),
          task: String(p?.task || '').trim(),
          assignedTo: String(p?.assignedTo || '').trim(),
          assignedToDesig: String(p?.assignedToDesig || '').trim(),
          assignedToMobile: String(p?.assignedToMobile || '').trim(),
          assignedToSource: p?.assignedToSource === 'manual' ? 'manual' : 'database',
          dueDate: String(p?.dueDate || '').trim(),
        }))
        .filter((p) => p.taskId && p.task);

      if (normalizedPoints.length) {
        const docs = normalizedPoints.map((p) => ({
          ...p,
          meetingId,
          meetingTitle,
          meetingPurpose,
          meetingDate,
          status: 'Open',
        }));

        try {
          await Task.insertMany(docs, { ordered: false });
        } catch (e) {
          // Ignore duplicate key errors for taskId
        }

        await Meeting.updateOne(
          { meetingId },
          { $set: { actionPoints: normalizedPoints } },
          { upsert: true }
        );
      }

      return res.json({ ok: true });
    }

    if (action === 'update_task') {
      const taskId = String(req.body?.taskId || '').trim();
      const status = String(req.body?.status || '').trim();

      if (!taskId || !status) {
        return res.status(400).json({ ok: false, error: 'taskId and status required' });
      }

      await Task.updateOne({ taskId }, { $set: { status } });
      return res.json({ ok: true });
    }

    if (action === 'rename_meeting_header') {
      const user = await getRequestUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Admin access required' });
      }

      const oldHeader = String(req.body?.oldHeader || '').trim();
      const newHeader = String(req.body?.newHeader || '').trim();

      if (!oldHeader || !newHeader) {
        return res.status(400).json({ ok: false, error: 'oldHeader and newHeader required' });
      }

      const result = await Meeting.updateMany(
        { meetingHeader: oldHeader },
        { $set: { meetingHeader: newHeader } },
      );

      return res.json({ ok: true, modifiedCount: result.modifiedCount || 0 });
    }

    if (action === 'delete_meeting_header') {
      const user = await getRequestUser(req);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Admin access required' });
      }

      const header = String(req.body?.header || '').trim();
      if (!header) {
        return res.status(400).json({ ok: false, error: 'header required' });
      }

      const result = await Meeting.updateMany(
        { meetingHeader: header },
        { $set: { meetingHeader: '' } },
      );

      return res.json({ ok: true, modifiedCount: result.modifiedCount || 0 });
    }

    if (action === 'close_meeting') {
      const meetingId = String(req.body?.meetingId || '').trim();
      const notes = String(req.body?.notes || '').trim();
      const closedOnRaw = req.body?.closedOn;
      const closedOn = closedOnRaw ? new Date(closedOnRaw) : new Date();
      const actionPoints = Array.isArray(req.body?.actionPoints)
        ? req.body.actionPoints
            .map((p) => ({
              taskId: String(p?.taskId || '').trim(),
              task: String(p?.task || '').trim(),
              assignedTo: String(p?.assignedTo || '').trim(),
              assignedToDesig: String(p?.assignedToDesig || '').trim(),
              assignedToMobile: String(p?.assignedToMobile || '').trim(),
              assignedToSource: p?.assignedToSource === 'manual' ? 'manual' : 'database',
              dueDate: String(p?.dueDate || '').trim(),
            }))
            .filter((p) => p.taskId && p.task)
        : [];
      const followup = req.body?.followup || {};
      const momText = String(req.body?.momText || '').trim();

      if (!meetingId) {
        return res.status(400).json({ ok: false, error: 'meetingId required' });
      }

      const meeting = await Meeting.findOne({ meetingId }).lean();
      if (!meeting) {
        return res.status(404).json({ ok: false, error: 'Meeting not found' });
      }

      const actor = await getMeetingActor(req, meeting);
      if (!actor) {
        return res.status(403).json({ ok: false, error: 'Only the caller or admin can close this meeting' });
      }

      await Meeting.updateOne(
        { meetingId },
        {
          $set: {
            status: 'Closed',
            closingNotes: notes,
            actionPoints,
            momText,
            closedOn,
            followupRequired: Boolean(followup?.required),
            followupDate: String(followup?.date || '').trim(),
            followupTime: String(followup?.time || '').trim(),
            followupPurpose: String(followup?.purpose || '').trim(),
            followupNote: String(followup?.note || '').trim(),
          },
        },
        { upsert: true }
      );

      return res.json({ ok: true });
    }

    if (action === 'postpone_meeting') {
      const meetingId = String(req.body?.meetingId || '').trim();
      const postponedToDate = String(req.body?.postponedToDate || '').trim();
      const postponedToTime = String(req.body?.postponedToTime || '').trim();
      const reason = String(req.body?.reason || '').trim();

      if (!meetingId || !postponedToDate || !postponedToTime || !reason) {
        return res.status(400).json({ ok: false, error: 'meetingId, postponedToDate, postponedToTime and reason required' });
      }

      const meeting = await Meeting.findOne({ meetingId }).lean();
      if (!meeting) {
        return res.status(404).json({ ok: false, error: 'Meeting not found' });
      }

      const actor = await getMeetingActor(req, meeting);
      if (!actor) {
        return res.status(403).json({ ok: false, error: 'Only the caller or admin can postpone this meeting' });
      }

      await Meeting.updateOne(
        { meetingId },
        {
          $set: {
            status: 'Postponed',
            date: postponedToDate,
            time: postponedToTime,
            postponedToDate,
            postponedToTime,
            postponeReason: reason,
            postponedOn: new Date(),
          },
        }
      );

      try {
        const updated = await Meeting.findOne({ meetingId }).lean();
        if (updated) {
          await syncMeetingToCalendars(updated, meetingId);
        }
      } catch (calErr) {
        console.error('Calendar sync failed:', calErr.message);
      }

      return res.json({ ok: true });
    }

    if (action === 'cancel_meeting') {
      const meetingId = String(req.body?.meetingId || '').trim();
      const reason = String(req.body?.reason || '').trim();

      if (!meetingId || !reason) {
        return res.status(400).json({ ok: false, error: 'meetingId and reason required' });
      }

      const meeting = await Meeting.findOne({ meetingId }).lean();
      if (!meeting) {
        return res.status(404).json({ ok: false, error: 'Meeting not found' });
      }

      const actor = await getMeetingActor(req, meeting);
      if (!actor) {
        return res.status(403).json({ ok: false, error: 'Only the caller or admin can cancel this meeting' });
      }

      await Meeting.updateOne(
        { meetingId },
        {
          $set: {
            status: 'Cancelled',
            cancellationReason: reason,
            cancelledOn: new Date(),
          },
        }
      );

      try {
        if (meeting.googleEventId) {
          await cancelCalendarEvent(meeting.googleEventId);
        }
        await sendCancellationNotices(meeting);
      } catch (calErr) {
        console.error('Google Calendar cancel failed:', calErr.message);
      }

      return res.json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

module.exports = router;
