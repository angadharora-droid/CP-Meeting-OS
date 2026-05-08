const { mongoose } = require('../db');

const pinResetRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'issued', 'resolved'],
      default: 'pending',
      index: true,
    },
    tempPin: { type: String, default: '' },
    requestedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    issuedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PinResetRequest', pinResetRequestSchema);