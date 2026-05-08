const nodemailer = require('nodemailer');
const ical = require('ical-generator');
const Config = require('../models/Config');

const DURATION_MINUTES = {
  '30 minutes': 30,
  '45 minutes': 45,
  '1 hour': 60,
  '1.5 hours': 90,
  '2 hours': 120,
  '3 hours': 180,
};

function getMeetingVenue(meeting) {
  return meeting.venue || meeting.location || meeting.vcLink || '';
}

async function getTransport() {
  // Prefer Gmail OAuth2 if the admin has connected a sender account
  const tokenCfg = await Config.findOne({ key: 'gmail_refresh_token' }).lean();
  const emailCfg = await Config.findOne({ key: 'gmail_sender_email' }).lean();

  if (
    tokenCfg?.value &&
    emailCfg?.value &&
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET
  ) {
    return {
      transport: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: emailCfg.value,
          clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
          clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
          refreshToken: tokenCfg.value,
        },
      }),
      from: emailCfg.value,
    };
  }

  // Fall back to plain SMTP (custom domain mail server, Zoho, etc.)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      transport: nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
      from: process.env.SMTP_USER,
    };
  }

  return null;
}

async function getSenderEmail() {
  const emailCfg = await Config.findOne({ key: 'gmail_sender_email' }).lean();
  return emailCfg?.value || process.env.SMTP_USER || '';
}

function buildCalendar(meeting, method = 'REQUEST') {
  const timeZone = process.env.MEETING_TIMEZONE || 'Asia/Dhaka';
  const [h, m] = meeting.time.split(':').map(Number);
  const durationMins = DURATION_MINUTES[meeting.duration] || 60;

  const start = new Date(`${meeting.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  const end = new Date(start.getTime() + durationMins * 60 * 1000);

  const descParts = [];
  if (meeting.purpose) descParts.push(`Purpose: ${meeting.purpose}`);
  if (meeting.desiredOutcome) descParts.push(`Desired Outcome: ${meeting.desiredOutcome}`);
  if (meeting.calledBy) descParts.push(`Organized by: ${meeting.calledBy}`);
  if (meeting.refNo) descParts.push(`Ref: ${meeting.refNo}`);

  const cal = ical.default({ method });

  cal.createEvent({
    uid: `${meeting.meetingId}@meetingos`,
    start,
    end,
    timezone: timeZone,
    summary: meeting.title,
    description: descParts.join('\n\n'),
    location: getMeetingVenue(meeting),
    organizer: { name: process.env.SMTP_FROM_NAME || 'Meeting OS', email: 'noreply@meetingos.app' },
  });

  return cal;
}

async function sendCalendarInvites(meeting) {
  const result = await getTransport();
  if (!result) return;
  const { transport, from } = result;

  const recipients = (meeting.attendeeDetails || []).filter(
    (a) => a.email && a.invite !== false,
  );
  if (!recipients.length) return;

  const fromName = process.env.SMTP_FROM_NAME || 'Meeting OS';
  const cal = buildCalendar(meeting, 'REQUEST');

  await Promise.all(
    recipients.map((person) =>
      transport.sendMail({
        from: `"${fromName}" <${from}>`,
        to: `"${person.name}" <${person.email}>`,
        subject: `Meeting Invite: ${meeting.title}`,
        text: `You have been invited to: ${meeting.title}\n\nDate: ${meeting.date} at ${meeting.time}\nLocation: ${getMeetingVenue(meeting) || 'TBD'}\n\nPlease find the calendar invite attached.`,
        icalEvent: {
          method: 'REQUEST',
          content: cal.toString(),
        },
      }),
    ),
  );
}

async function sendCancellationNotices(meeting) {
  const result = await getTransport();
  if (!result) return;
  const { transport, from } = result;

  const recipients = (meeting.attendeeDetails || []).filter(
    (a) => a.email && a.invite !== false,
  );
  if (!recipients.length) return;

  const fromName = process.env.SMTP_FROM_NAME || 'Meeting OS';
  const cal = buildCalendar(meeting, 'CANCEL');

  await Promise.all(
    recipients.map((person) =>
      transport.sendMail({
        from: `"${fromName}" <${from}>`,
        to: `"${person.name}" <${person.email}>`,
        subject: `Cancelled: ${meeting.title}`,
        text: `The following meeting has been cancelled:\n\n${meeting.title}\nDate: ${meeting.date} at ${meeting.time}\nReason: ${meeting.cancellationReason || ''}`,
        icalEvent: {
          method: 'CANCEL',
          content: cal.toString(),
        },
      }),
    ),
  );
}

module.exports = { sendCalendarInvites, sendCancellationNotices };
