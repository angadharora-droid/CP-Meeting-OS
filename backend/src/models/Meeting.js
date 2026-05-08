const { mongoose } = require('../db');

const topicSchema = new mongoose.Schema(
  {
    topic: { type: String, default: '' },
    purpose: { type: String, default: '' },
    desiredOutcome: { type: String, default: '' },
    documents: { type: String, default: '' },
  },
  { _id: false }
);

const actionPointSchema = new mongoose.Schema(
  {
    taskId: { type: String, required: true },
    task: { type: String, required: true },
    assignedTo: { type: String, default: '' },
    dueDate: { type: String, default: '' },
  },
  { _id: false }
);

const attendeeSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    name: { type: String, required: true },
    desig: { type: String, default: '' },
    email: { type: String, default: '' },
    mobile: { type: String, default: '' },
    source: { type: String, enum: ['database', 'manual'], default: 'database' },
    invite: { type: Boolean, default: true },
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    meetingId: { type: String, required: true, unique: true, index: true },
    meetingHeader: { type: String, default: '', index: true },
    title: { type: String, required: true },

    date: { type: String, default: '' },
    time: { type: String, default: '' },
    duration: { type: String, default: '' },

    mode: { type: String, default: '' },
    venue: { type: String, default: '' },
    vcLink: { type: String, default: '' },
    type: { type: String, default: '' },
    location: { type: String, default: '' },

    unit: { type: String, default: '' },
    calledById: { type: String, default: '' },
    calledBy: { type: String, default: '' },
    attendees: { type: String, default: '' },
    attendeeDetails: { type: [attendeeSchema], default: [] },

    topics: { type: [topicSchema], default: [] },
    includeAdditionalPoints: { type: Boolean, default: true },

    purpose: { type: String, default: '' },
    desiredOutcome: { type: String, default: '' },
    documents: { type: String, default: '' },
    specialNote: { type: String, default: '' },

    status: { type: String, enum: ['Open', 'Closed', 'Postponed', 'Cancelled'], default: 'Open' },

    noticeText: { type: String, default: '' },
    formText: { type: String, default: '' },
    refNo: { type: String, default: '' },

    closingNotes: { type: String, default: '' },
    actionPoints: { type: [actionPointSchema], default: [] },
    closedOn: { type: Date },
    postponedOn: { type: Date },
    postponedToDate: { type: String, default: '' },
    postponedToTime: { type: String, default: '' },
    postponeReason: { type: String, default: '' },
    cancelledOn: { type: Date },
    cancellationReason: { type: String, default: '' },
    googleEventId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Meeting', meetingSchema);
