const { mongoose } = require('../db');

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    desig: { type: String, trim: true, default: '' },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    pin: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'manager'], default: 'manager', index: true },
    googleRefreshToken: { type: String, default: '' },
    googleCalendarConnected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
