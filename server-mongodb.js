const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      console.error('错误: 未设置 MONGODB_URI 环境变量');
      console.log('请在 Render 的环境变量中设置 MONGODB_URI');
      console.log('格式: mongodb+srv://用户名:密码@集群地址.mongodb.net/数据库名?retryWrites=true&w=majority');
      return false;
    }

    // 连接 MongoDB Atlas
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Atlas 连接成功: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`MongoDB 连接错误: ${error.message}`);
    console.log('请检查 MONGODB_URI 是否正确设置');
    console.log('如果连接失败，系统将使用本地 JSON 文件存储（数据不会持久化）');
    return false;
  }
};

module.exports = connectDB;
