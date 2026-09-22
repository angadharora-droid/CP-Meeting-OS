const { mongoose } = require('../db');

const sessionSchema = new mongoose.Schema(
  {
    sid: { type: String, required: true, unique: true, index: true },
    centralId: { type: String, required: true, index: true },
    userAgent: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// MongoDB removes expired sessions on its own
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
