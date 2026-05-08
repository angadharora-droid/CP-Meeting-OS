const { google } = require('googleapis');

function getMeetingVenue(meeting) {
  return meeting.venue || meeting.location || meeting.vcLink || '';
}

const DURATION_MINUTES = {
  '30 minutes': 30,
  '45 minutes': 45,
  '1 hour': 60,
  '1.5 hours': 90,
  '2 hours': 120,
  '3 hours': 180,
};

function isConfigured() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
}

function buildEventBody(meeting) {
  const timeZone = process.env.MEETING_TIMEZONE || 'Asia/Dhaka';
  const [h, m] = meeting.time.split(':').map(Number);
  const durationMins = DURATION_MINUTES[meeting.duration] || 60;
  const endTotalMins = h * 60 + m + durationMins;
  const endH = Math.floor(endTotalMins / 60) % 24;
  const endM = endTotalMins % 60;

  const startDateTime = `${meeting.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  const endDateTime = `${meeting.date}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

  const descParts = [];
  if (meeting.purpose) descParts.push(`Purpose: ${meeting.purpose}`);
  if (meeting.desiredOutcome) descParts.push(`Desired Outcome: ${meeting.desiredOutcome}`);
  if (meeting.calledBy) descParts.push(`Organized by: ${meeting.calledBy}`);
  if (meeting.refNo) descParts.push(`Ref: ${meeting.refNo}`);

  // No attendees — service accounts cannot invite guests without domain-wide delegation
  return {
    summary: meeting.title,
    location: getMeetingVenue(meeting),
    description: descParts.join('\n\n'),
    start: { dateTime: startDateTime, timeZone },
    end: { dateTime: endDateTime, timeZone },
  };
}

async function pushMeetingToCalendar(meeting) {
  if (!isConfigured()) return null;

  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  const auth = getAuth();
  const calendar = google.calendar({ version: 'v3', auth });
  const eventBody = buildEventBody(meeting);

  if (meeting.googleEventId) {
    const res = await calendar.events.update({
      calendarId,
      eventId: meeting.googleEventId,
      requestBody: eventBody,
    });
    return res.data.id;
  }

  const res = await calendar.events.insert({
    calendarId,
    requestBody: eventBody,
  });
  return res.data.id;
}

async function cancelCalendarEvent(googleEventId) {
  if (!googleEventId || !isConfigured()) return;

  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  const auth = getAuth();
  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.events.delete({ calendarId, eventId: googleEventId });
}

async function pushEventDirectly(meeting, refreshToken) {
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) return;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const eventBody = buildEventBody(meeting);

  await calendar.events.insert({
    calendarId: 'primary',
    requestBody: eventBody,
  });
}

module.exports = { pushMeetingToCalendar, cancelCalendarEvent, pushEventDirectly };
