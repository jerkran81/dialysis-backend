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

// 删除旧索引，确保Schema更新生效
reportSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const collection = mongoose.connection.collection('reports');
      const indexes = await collection.indexes();
      for (const index of indexes) {
        if (index.name !== '_id_') {
          await collection.dropIndex(index.name);
        }
      }
    } catch (e) {
      // 忽略索引删除错误
    }
  }
  next();
});

module.exports = mongoose.model('Report', reportSchema);
