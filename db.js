const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // 简化连接选项
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected`);
    return true;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    return false;
  }
};

module.exports = connectDB;
