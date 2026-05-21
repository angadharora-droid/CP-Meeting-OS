/**
 * Backfill follow-up meetings.
 *
 * Older closed meetings stored their follow-up only as fields on the closed
 * meeting itself (followupRequired / followupDate / ...) without ever creating
 * a separate meeting. This script turns each such follow-up into a real Open
 * meeting under the same header, mirroring what closeMeeting() now does live.
 *
 * It is idempotent: a source meeting is skipped if a follow-up already links
 * back to it (followupOfMeetingId) or it already points to one (followupMeetingId).
 *
 * Usage: node src/scripts/backfillFollowupMeetings.js [--dry]
 */
require('dotenv').config();

const { connectToMongo, mongoose } = require('../db');
const Meeting = require('../models/Meeting');

const DRY_RUN = process.argv.includes('--dry');

function uid() {
  return String(Date.now()) + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

function generateRefNo() {
  return `MO/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
}

function toDateLabel(dateString) {
  if (!dateString) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return dateString;
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function buildFollowupMeeting(source) {
  const followupPurpose = (source.followupPurpose || '').trim() || `Follow-up on: ${source.title}`;
  return {
    meetingId: uid(),
    // Keep the follow-up under the same header as the meeting it follows.
    meetingHeader: source.meetingHeader || '',
    title: `Follow-up: ${source.title}`,
    date: source.followupDate || '',
    time: source.followupTime || source.time || '',
    duration: source.duration || '1 hour',
    mode: source.mode || source.type || 'inperson',
    venue: source.venue || '',
    vcLink: source.vcLink || '',
    type: source.type || source.mode || 'inperson',
    location: source.location || source.venue || source.vcLink || '',
    unit: source.unit || '',
    calledById: source.calledById || '',
    calledBy: source.calledBy || '',
    attendees: source.attendees || '',
    attendeeDetails: source.attendeeDetails || [],
    topics: [{ topic: '', purpose: followupPurpose, desiredOutcome: '', documents: '' }],
    includeAdditionalPoints: true,
    purpose: followupPurpose,
    desiredOutcome: '',
    documents: '',
    specialNote: (source.followupNote || '').trim() || `Follow-up to meeting held on ${toDateLabel(source.date)}`,
    status: 'Open',
    refNo: generateRefNo(),
    followupOfMeetingId: source.meetingId,
  };
}

async function run() {
  await connectToMongo(process.env.MONGO_URI);

  const candidates = await Meeting.find({
    followupRequired: true,
    followupDate: { $nin: ['', null] },
  }).lean();

  console.log(`Found ${candidates.length} meeting(s) with a stored follow-up.`);

  let created = 0;
  let skipped = 0;

  for (const source of candidates) {
    const existing = await Meeting.findOne({ followupOfMeetingId: source.meetingId }).lean();
    if (existing || source.followupMeetingId) {
      skipped += 1;
      console.log(`  - skip "${source.title}" (${source.meetingId}) — follow-up already exists`);
      continue;
    }

    const followup = buildFollowupMeeting(source);
    console.log(
      `  - ${DRY_RUN ? '[dry] would create' : 'create'} "${followup.title}" on ${followup.date} under header "${followup.meetingHeader || '(none)'}"`,
    );

    if (!DRY_RUN) {
      await Meeting.create(followup);
      await Meeting.updateOne(
        { meetingId: source.meetingId },
        { $set: { followupMeetingId: followup.meetingId } },
      );
    }
    created += 1;
  }

  console.log(`\nDone. ${DRY_RUN ? 'Would create' : 'Created'} ${created}, skipped ${skipped}.`);
  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('Backfill failed:', err.message);
  try {
    await mongoose.connection.close();
  } catch (_) {}
  process.exit(1);
});
