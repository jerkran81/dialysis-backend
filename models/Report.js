const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  institution: {
    name: String,
    type: String,
    contact: String,
    phone: String,
    reportDate: String,
    patientCount: String,
    doctors: String,
    nurses: String,
    technicians: String,
    hbvCount: String,
    hcvCount: String,
    hivCount: String,
    tpCount: String
  },
  indicators: [{
    name: String,
    description: String,
    numerator: Number,
    denominator: Number,
    result: Number,
    unit: String
  }],
  submittedAt: { type: String, default: () => new Date().toISOString() }
});

module.exports = mongoose.model('Report', reportSchema);
