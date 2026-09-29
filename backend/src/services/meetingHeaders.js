const Meeting = require('../models/Meeting');
const MeetingHeader = require('../models/MeetingHeader');

// The header list is the union of headers still referenced by a meeting and
// headers that exist only as a record. Counts are always over every meeting,
// never the caller's visible subset, so a manager never sees a header as empty
// because of meetings they cannot read.
async function listMeetingHeaders() {
  const [stats, records] = await Promise.all([
    Meeting.aggregate([
      { $match: { meetingHeader: { $nin: ['', null] } } },
      {
        $group: {
          _id: '$meetingHeader',
          meetingCount: { $sum: 1 },
          openCount: { $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] } },
          latestDate: { $max: '$date' },
        },
      },
    ]),
    MeetingHeader.find({}, { _id: 0, name: 1 }).lean(),
  ]);

  const byName = new Map();
  stats.forEach((row) => {
    const name = String(row._id || '').trim();
    if (!name) return;
    byName.set(name, {
      name,
      meetingCount: row.meetingCount,
      openCount: row.openCount,
      latestDate: row.latestDate || '',
    });
  });
  records.forEach((record) => {
    const name = String(record.name || '').trim();
    if (!name || byName.has(name)) return;
    byName.set(name, { name, meetingCount: 0, openCount: 0, latestDate: '' });
  });

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Resolves a typed name to the existing header it matches case-insensitively,
// so "ops review" lands in "Ops Review" instead of forking a near-duplicate.
async function resolveHeaderName(name) {
  const clean = String(name || '').trim();
  if (!clean) return '';
  const headers = await listMeetingHeaders();
  const match = headers.find((header) => header.name.toLowerCase() === clean.toLowerCase());
  return match ? match.name : '';
}

module.exports = { listMeetingHeaders, resolveHeaderName };
