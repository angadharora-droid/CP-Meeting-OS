const { mongoose } = require('../db');

// A header only needs a record of its own once no meeting references it —
// in-use headers are discovered from Meeting.meetingHeader. Records are what
// keep a header visible (and therefore deletable) after it has been emptied.
const meetingHeaderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('MeetingHeader', meetingHeaderSchema);
