const { mongoose } = require('../db');

const configSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Config', configSchema);
