const mongoose = require('mongoose');

const inviteCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  createdBy: String,
  createdAt: { type: String, default: () => new Date().toISOString() },
  isUsed: { type: Boolean, default: false },
  usedBy: String,
  usedAt: String,
  institutionName: String
});

module.exports = mongoose.model('InviteCode', inviteCodeSchema);
