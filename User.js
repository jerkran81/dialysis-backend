const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  realName: String,
  phone: String,
  inviteCode: String,
  institutionName: String,
  createdAt: { type: String, default: () => new Date().toISOString() }
});

module.exports = mongoose.model('User', userSchema);
