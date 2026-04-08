# MongoDB Atlas 免费数据库配置指南

由于 Render 免费版的文件系统不是持久的（每次部署会重置），建议使用 **MongoDB Atlas 免费版** 来存储数据。

## MongoDB Atlas 免费额度

- **存储**: 512MB
- **传输**: 10GB/月
- **完全免费**，无需信用卡

---

## 注册和配置步骤

### 1. 注册账号

访问 https://www.mongodb.com/atlas 注册账号

### 2. 创建集群

1. 登录后点击 "Build a Cluster"
2. 选择 "M0 Sandbox"（免费版）
3. 选择云服务提供商（推荐 AWS）
4. 选择地区（推荐离你最近的）
5. 点击 "Create Cluster"

等待集群创建完成（约 2-3 分钟）

### 3. 创建数据库用户

1. 点击 "Database Access"
2. 点击 "Add New Database User"
3. 填写用户名和密码（记住密码！）
4. 权限选择 "Read and Write to Any Database"
5. 点击 "Add User"

### 4. 配置网络访问

1. 点击 "Network Access"
2. 点击 "Add IP Address"
3. 选择 "Allow Access from Anywhere"（或输入 Render 的 IP）
4. 点击 "Confirm"

### 5. 获取连接字符串

1. 点击 "Clusters"
2. 点击 "Connect"
3. 选择 "Connect your application"
4. 复制连接字符串，类似：

```
mongodb+srv://用户名:密码@cluster0.xxxxx.mongodb.net/dialysis?retryWrites=true&w=majority
```

将 `用户名` 和 `密码` 替换为实际值。

---

## 修改后端代码使用 MongoDB

### 1. 安装 mongoose

```bash
cd /mnt/okcomputer/output/backend
npm install mongoose
```

### 2. 创建数据库连接文件

创建 `db.js`：

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### 3. 创建数据模型

创建 `models/User.js`：

```javascript
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
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
```

创建 `models/Report.js`：

```javascript
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  institution: Object,
  indicators: Array,
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
```

创建 `models/InviteCode.js`：

```javascript
const mongoose = require('mongoose');

const inviteCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  isUsed: { type: Boolean, default: false },
  usedBy: String,
  usedAt: Date,
  institutionName: String
});

module.exports = mongoose.model('InviteCode', inviteCodeSchema);
```

### 4. 修改 server.js

```javascript
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const User = require('./models/User');
const Report = require('./models/Report');
const InviteCode = require('./models/InviteCode');

const app = express();
const PORT = process.env.PORT || 3001;

// 连接数据库
connectDB();

// 固定邀请码列表
const FIXED_INVITE_CODES = [
  'CSJK2024A', 'CSJK2024B', 'CSJK2024C', 'CSJK2024D', 'CSJK2024E',
  'CSJK2024F', 'CSJK2024G', 'CSJK2024H', 'CSJK2024I', 'CSJK2024J',
  'CSJK2024K', 'CSJK2024L', 'CSJK2024M', 'CSJK2024N', 'CSJK2024O',
  'CSJK2024P', 'CSJK2024Q', 'CSJK2024R', 'CSJK2024S', 'CSJK2024T'
];

// 中间件
app.use(cors({ origin: '*' }));
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 初始化管理员
async function initAdmin() {
  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    await User.create({
      id: 'admin_default',
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    });
    console.log('管理员账号已创建');
  }
}

// ... 其他 API 路由改为使用 Mongoose 模型

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initAdmin();
});
```

---

## 部署到 Render

### 1. 添加环境变量

在 Render Dashboard 中添加：

```
MONGODB_URI = mongodb+srv://用户名:密码@cluster0.xxxxx.mongodb.net/dialysis?retryWrites=true&w=majority
```

### 2. 重新部署

提交代码后，Render 会自动重新部署。

---

## 验证数据库连接

部署后查看 Render Logs，确认显示：

```
MongoDB Connected: cluster0.xxxxx.mongodb.net
```

---

## 数据迁移（如有旧数据）

如果之前使用 JSON 文件存储了数据，可以编写迁移脚本：

```javascript
// migrate.js
const fs = require('fs');
const mongoose = require('mongoose');
const User = require('./models/User');
const Report = require('./models/Report');

async function migrate() {
  await mongoose.connect('你的 MongoDB URI');
  
  // 读取旧数据
  const users = JSON.parse(fs.readFileSync('./data/users.json'));
  const reports = JSON.parse(fs.readFileSync('./data/reports.json'));
  
  // 导入到 MongoDB
  await User.insertMany(users);
  await Report.insertMany(reports);
  
  console.log('Migration completed!');
  process.exit(0);
}

migrate();
```

运行：

```bash
node migrate.js
```

---

## 总结

使用 MongoDB Atlas 免费版 + Render 免费版，可以实现：
- ✅ 免费的后端托管
- ✅ 免费的数据库存储（512MB）
- ✅ 数据持久化（不会随部署丢失）
- ✅ 跨浏览器数据共享

这套方案完全免费，适合中小型应用使用。
