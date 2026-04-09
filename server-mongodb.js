const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./db');
const User = require('./models/User');
const Report = require('./models/Report');
const InviteCode = require('./models/InviteCode');

const app = express();
const PORT = process.env.PORT || 3001;

// SSE 客户端列表
const sseClients = [];

// 发送实时更新给所有连接的客户端
function broadcastUpdate(type, data) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${message}\n\n`);
    } catch (e) {
      // 忽略发送失败的客户端
    }
  });
}

// 固定邀请码列表
const FIXED_INVITE_CODES = [
  'CSJK2024A', 'CSJK2024B', 'CSJK2024C', 'CSJK2024D', 'CSJK2024E',
  'CSJK2024F', 'CSJK2024G', 'CSJK2024H', 'CSJK2024I', 'CSJK2024J',
  'CSJK2024K', 'CSJK2024L', 'CSJK2024M', 'CSJK2024N', 'CSJK2024O',
  'CSJK2024P', 'CSJK2024Q', 'CSJK2024R', 'CSJK2024S', 'CSJK2024T'
];

// 中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ SSE 实时推送 API ============

// SSE 连接端点
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // 发送初始连接成功消息
  res.write(`data: ${JSON.stringify({ type: 'connected', message: '实时连接已建立' })}\n\n`);
  
  // 保存客户端连接
  const clientId = Date.now() + Math.random();
  const client = { id: clientId, res };
  sseClients.push(client);
  
  console.log(`SSE 客户端连接，当前连接数: ${sseClients.length}`);
  
  // 客户端断开连接时清理
  req.on('close', () => {
    const index = sseClients.findIndex(c => c.id === clientId);
    if (index !== -1) {
      sseClients.splice(index, 1);
      console.log(`SSE 客户端断开，当前连接数: ${sseClients.length}`);
    }
  });
});

// 初始化管理员
async function initAdmin() {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      await User.create({
        id: 'admin_default',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      console.log('默认管理员账号已创建: admin / admin123');
    }
  } catch (err) {
    console.error('初始化管理员失败:', err);
  }
}

// ============ 用户认证相关 API ============

// 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password }).lean();

    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, inviteCode, realName, phone, institutionName } = req.body;

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    // 验证邀请码
    const isFixedCode = FIXED_INVITE_CODES.includes(inviteCode);
    const existingCode = await InviteCode.findOne({ code: inviteCode });

    if (!isFixedCode && (!existingCode || existingCode.isUsed)) {
      return res.status(400).json({ success: false, message: '邀请码无效或已被使用' });
    }

    // 创建新用户
    const newUser = await User.create({
      id: 'user_' + Date.now(),
      username,
      password,
      role: 'user',
      realName,
      phone,
      inviteCode,
      institutionName,
      createdAt: new Date().toISOString()
    });

    // 更新动态邀请码状态
    if (existingCode && !existingCode.isUsed) {
      existingCode.isUsed = true;
      existingCode.usedBy = newUser.id;
      existingCode.usedAt = new Date().toISOString();
      existingCode.institutionName = institutionName;
      await existingCode.save();
    }

    const { password: _, ...userWithoutPassword } = newUser.toObject();
    
    // 广播新用户注册事件
    broadcastUpdate('user_registered', userWithoutPassword);
    
    res.json({ success: true, message: '注册成功', user: userWithoutPassword });
  } catch (err) {
    console.error('注册错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ============ 用户管理 API ============

// 获取所有用户
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().lean();
    const usersWithoutPassword = users.map(({ password, ...user }) => user);
    res.json({ success: true, users: usersWithoutPassword });
  } catch (err) {
    console.error('获取用户错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除用户
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ id });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: '不能删除管理员' });
    }

    await User.deleteOne({ id });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('删除用户错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 修改密码
app.post('/api/users/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    const user = await User.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    if (user.password !== oldPassword) {
      return res.status(400).json({ success: false, message: '原密码错误' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    console.error('修改密码错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新用户信息
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { realName, phone, institutionName } = req.body;

    const user = await User.findOne({ id });
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    if (realName !== undefined) user.realName = realName;
    if (phone !== undefined) user.phone = phone;
    if (institutionName !== undefined) user.institutionName = institutionName;

    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();
    res.json({ success: true, message: '用户信息更新成功', user: userWithoutPassword });
  } catch (err) {
    console.error('更新用户信息错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ============ 邀请码管理 API ============

// 获取所有邀请码
app.get('/api/invite-codes', async (req, res) => {
  try {
    const inviteCodes = await InviteCode.find().lean();

    // 获取已使用的固定邀请码
    const usersWithFixedCodes = await User.find({
      inviteCode: { $in: FIXED_INVITE_CODES }
    }).lean();
    const usedFixedCodes = usersWithFixedCodes.map(u => u.inviteCode);

    res.json({
      success: true,
      inviteCodes,
      usedFixedCodes,
      fixedCodes: FIXED_INVITE_CODES
    });
  } catch (err) {
    console.error('获取邀请码错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 生成邀请码
app.post('/api/invite-codes', async (req, res) => {
  try {
    const { institutionName, createdBy } = req.body;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    await InviteCode.create({
      code,
      createdBy,
      createdAt: new Date().toISOString(),
      isUsed: false,
      institutionName
    });

    res.json({ success: true, code });
  } catch (err) {
    console.error('生成邀请码错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除邀请码
app.delete('/api/invite-codes/:code', async (req, res) => {
  try {
    const { code } = req.params;
    await InviteCode.deleteOne({ code });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('删除邀请码错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ============ 上报数据 API ============

// 获取所有上报数据
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find().lean();
    res.json({ success: true, reports });
  } catch (err) {
    console.error('获取上报数据错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 添加上报数据
app.post('/api/reports', async (req, res) => {
  try {
    const { userId, institution, indicators } = req.body;

    const newReport = await Report.create({
      id: 'report_' + Date.now(),
      userId,
      institution,
      indicators,
      submittedAt: new Date().toISOString()
    });

    // 广播新上报事件
    broadcastUpdate('report_submitted', newReport);
    
    res.json({ success: true, message: '上报成功', report: newReport });
  } catch (err) {
    console.error('添加上报数据错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除上报数据
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Report.deleteOne({ id });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('删除上报数据错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ============ 统计数据 API ============

// 获取统计数据
app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCodes = await InviteCode.countDocuments();
    const usedCodes = await InviteCode.countDocuments({ isUsed: true });
    const usedFixedCodes = await User.countDocuments({
      inviteCode: { $in: FIXED_INVITE_CODES }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCodes: totalCodes + FIXED_INVITE_CODES.length,
        usedCodes: usedCodes + usedFixedCodes,
        unusedCodes: (totalCodes - usedCodes) + (FIXED_INVITE_CODES.length - usedFixedCodes)
      }
    });
  } catch (err) {
    console.error('获取统计数据错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 清理旧集合（解决Schema变更问题）
async function cleanupOldCollections() {
  try {
    // 等待连接就绪
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      console.log('MongoDB 未连接，跳过集合清理');
      return;
    }
    
    const db = mongoose.connection.db;
    if (!db) {
      console.log('数据库对象不存在，跳过集合清理');
      return;
    }
    
    const collections = await db.listCollections().toArray();
    const reportCollection = collections.find(c => c.name === 'reports');
    if (reportCollection) {
      console.log('检测到旧reports集合，正在删除以应用新Schema...');
      await db.dropCollection('reports');
      console.log('旧reports集合已删除');
    } else {
      console.log('reports集合不存在，无需清理');
    }
  } catch (err) {
    console.log('清理旧集合时出错（可忽略）:', err.message);
  }
}

// 启动服务器
async function startServer() {
  try {
    const dbConnected = await connectDB();

    if (dbConnected) {
      try {
        await cleanupOldCollections();
      } catch (e) {
        console.log('清理集合时出错:', e.message);
      }
      try {
        await initAdmin();
      } catch (e) {
        console.log('初始化管理员时出错:', e.message);
      }
    } else {
      console.log('警告: MongoDB 连接失败，部分功能可能不可用');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`API 地址: http://localhost:${PORT}/api`);
      console.log(`健康检查: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('启动服务器时出错:', error);
    // 即使出错也要启动服务器
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`服务器运行在端口 ${PORT} (降级模式)`);
    });
  }
}

startServer();
