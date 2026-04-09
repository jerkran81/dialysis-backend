const mongoose = require('mongoose');

// 删除已存在的模型缓存，确保使用新Schema
if (mongoose.models.Report) {
  delete mongoose.models.Report;
}

const reportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  // institution 接受任意对象，不验证字段
  institution: { type: mongoose.Schema.Types.Mixed },
  // indicators 接受任意数组，不验证字段
  indicators: { type: mongoose.Schema.Types.Mixed },
  submittedAt: { type: String, default: () => new Date().toISOString() }
}, { 
  strict: false,
  timestamps: false
});

module.exports = mongoose.model('Report', reportSchema);
