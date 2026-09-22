const { mongoose } = require('../db');

// One row per person per app: which local user ID they are inside that app.
const appLinkSchema = new mongoose.Schema(
  {
    centralId: { type: String, required: true, index: true, lowercase: true, trim: true },
    app: { type: String, required: true, index: true, trim: true },
    localUserId: { type: String, required: true, trim: true },
    // Display-only hint for the admin screen (name or email inside the app)
    localLabel: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

appLinkSchema.index({ centralId: 1, app: 1 }, { unique: true });
appLinkSchema.index({ app: 1, localUserId: 1 }, { unique: true });

module.exports = mongoose.model('AppLink', appLinkSchema);
