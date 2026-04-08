const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dialysis');
    console.log('MongoDB Connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    return false;
  }
};

module.exports = connectDB;
