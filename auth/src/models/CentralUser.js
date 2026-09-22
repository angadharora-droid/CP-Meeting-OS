const { mongoose } = require('../db');

const recentSchema = new mongoose.Schema(
  {
    app: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const centralUserSchema = new mongoose.Schema(
  {
    centralId: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    role: { type: String, enum: ['admin', 'user'], default: 'user', index: true },
    active: { type: Boolean, default: true },
    secretType: { type: String, enum: ['pin', 'password'], required: true },
    secretHash: { type: String, required: true },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    prefs: {
      favourites: { type: [String], default: [] },
      recents: { type: [recentSchema], default: [] },
    },
  },
  { timestamps: true },
);

// What the browser is allowed to see about a user
centralUserSchema.methods.toPublic = function toPublic() {
  return {
    centralId: this.centralId,
    name: this.name,
    email: this.email,
    role: this.role,
    active: this.active,
    secretType: this.secretType,
    lockedUntil: this.lockedUntil,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('CentralUser', centralUserSchema);
