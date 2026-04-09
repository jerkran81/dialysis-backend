const mongoose = require('mongoose');

// 删除已存在的模型缓存，确保使用新Schema
if (mongoose.models.Report) {
  delete mongoose.models.Report;
}

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
    tpCount: String,
    dialysisMachines: String,
    waterTreatment: String,
    infoSystem: String,
    serviceFrequency: String,
    staffTraining: String,
    patientEducation: String,
    address: String,
    reporter: String,
    reportType: { type: String, enum: ['month', 'quarter', 'year'], default: 'month' },
    reportYear: { type: String, default: () => new Date().getFullYear().toString() },
    reportMonth: { type: String, default: '1' },
    reportQuarter: { type: String, default: '1' }
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
}, { 
  strict: false,
  timestamps: false
});

module.exports = mongoose.model('Report', reportSchema);
