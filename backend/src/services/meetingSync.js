const User = require('../models/User');
const Meeting = require('../models/Meeting');
const { pushMeetingToCalendar, pushEventDirectly } = require('./googleCalendar');
const { sendCalendarInvites } = require('./calendarInvite');

// Puts a saved meeting into the invited attendees' calendars: straight into the Google Calendar
// of managers who connected one, and as an emailed invite for everyone else. Used by the New
// Meeting form (routes/api.js) and by meetings created from Executive Scheduler
// (routes/integrations.js).
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
      await Meeting.updateOne({ meetingId }, { $set: { googleEventId } });
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

module.exports = { syncMeetingToCalendars };
