const { mongoose } = require('../db');

const taskSchema = new mongoose.Schema(
  {
    taskId: { type: String, required: true, unique: true, index: true },
    task: { type: String, required: true, trim: true },
    assignedTo: { type: String, default: '' },
    dueDate: { type: String, default: '' },

    meetingId: { type: String, default: '' },
    meetingTitle: { type: String, default: '' },
    meetingDate: { type: String, default: '' },

    status: { type: String, enum: ['Open', 'Overdue', 'Done'], default: 'Open' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
