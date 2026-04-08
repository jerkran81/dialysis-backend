const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 数据文件路径
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const INVITE_CODES_FILE = path.join(DATA_DIR, 'inviteCodes.json');
const USED_FIXED_CODES_FILE = path.join(DATA_DIR, 'usedFixedCodes.json');

// 固定邀请码列表
const FIXED_INVITE_CODES = [
  'CSJK2024A', 'CSJK2024B', 'CSJK2024C', 'CSJK2024D', 'CSJK2024E',
  'CSJK2024F', 'CSJK2024G', 'CSJK2024H', 'CSJK2024I', 'CSJK2024J',
  'CSJK2024K', 'CSJK2024L', 'CSJK2024M', 'CSJK2024N', 'CSJK2024O',
  'CSJK2024P', 'CSJK2024Q', 'CSJK2024R', 'CSJK2024S', 'CSJK2024T'
];

// 默认管理员
const DEFAULT_ADMIN = {
  id: 'admin_default',
  username: 'admin',
  password: 'admin123',
  role: 'admin',
  createdAt: new Date().toISOString()
};

// 中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('创建数据目录失败:', err);
  }
}

// 读取数据文件
async function readData(filePath, defaultValue = []) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return defaultValue;
    }
    throw err;
  }
}

// 写入数据文件
async function writeData(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// 初始化数据
async function initData() {
  await ensureDataDir();

  // 初始化用户数据
  const users = await readData(USERS_FILE, []);
  if (users.length === 0) {
    await writeData(USERS_FILE, [DEFAULT_ADMIN]);
  }

  // 初始化其他数据文件
  const inviteCodes = await readData(INVITE_CODES_FILE, []);
  if (inviteCodes.length === 0) {
    await writeData(INVITE_CODES_FILE, []);
  }

  const usedFixedCodes = await readData(USED_FIXED_CODES_FILE, []);
  if (usedFixedCodes.length === 0) {
    await writeData(USED_FIXED_CODES_FILE, []);
  }

  const reports = await readData(REPORTS_FILE, []);
  if (reports.length === 0) {
    await writeData(REPORTS_FILE, []);
  }
}

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ 用户认证相关 API ============

// 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await readData(USERS_FILE);

    const user = users.find(u => u.username === username && u.password === password);
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

    const users = await readData(USERS_FILE);
    const inviteCodes = await readData(INVITE_CODES_FILE);
    const usedFixedCodes = await readData(USED_FIXED_CODES_FILE);

    // 检查用户名是否已存在
    if (users.some(u => u.username === username)) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    // 验证邀请码
    const codeIndex = inviteCodes.findIndex(c => c.code === inviteCode && !c.isUsed);
    const isFixedCode = FIXED_INVITE_CODES.includes(inviteCode);
    const isFixedCodeUsed = usedFixedCodes.includes(inviteCode);

    if (codeIndex === -1 && (!isFixedCode || isFixedCodeUsed)) {
      return res.status(400).json({ success: false, message: '邀请码无效或已被使用' });
    }

    // 创建新用户
    const newUser = {
      id: 'user_' + Date.now(),
      username,
      password,
      role: 'user',
      realName,
      phone,
      inviteCode,
      institutionName,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await writeData(USERS_FILE, users);

    // 更新动态邀请码状态
    if (codeIndex !== -1) {
      inviteCodes[codeIndex] = {
        ...inviteCodes[codeIndex],
        isUsed: true,
        usedBy: newUser.id,
        usedAt: new Date().toISOString(),
        institutionName
      };
      await writeData(INVITE_CODES_FILE, inviteCodes);
    }

    // 记录固定邀请码已使用
    if (isFixedCode && !isFixedCodeUsed) {
      usedFixedCodes.push(inviteCode);
      await writeData(USED_FIXED_CODES_FILE, usedFixedCodes);
    }

    const { password: _, ...userWithoutPassword } = newUser;
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
    const users = await readData(USERS_FILE);
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
    const users = await readData(USERS_FILE);

    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    if (users[userIndex].role === 'admin') {
      return res.status(403).json({ success: false, message: '不能删除管理员' });
    }

    users.splice(userIndex, 1);
    await writeData(USERS_FILE, users);

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
    const users = await readData(USERS_FILE);

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    if (users[userIndex].password !== oldPassword) {
      return res.status(400).json({ success: false, message: '原密码错误' });
    }

    users[userIndex].password = newPassword;
    await writeData(USERS_FILE, users);

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

    const users = await readData(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    if (realName !== undefined) users[userIndex].realName = realName;
    if (phone !== undefined) users[userIndex].phone = phone;
    if (institutionName !== undefined) users[userIndex].institutionName = institutionName;

    await writeData(USERS_FILE, users);

    const { password, ...userWithoutPassword } = users[userIndex];
    res.json({ success: true, message: '更新成功', user: userWithoutPassword });
  } catch (err) {
    console.error('更新用户信息错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ============ 邀请码管理 API ============

// 获取所有邀请码
app.get('/api/invite-codes', async (req, res) => {
  try {
    const inviteCodes = await readData(INVITE_CODES_FILE);
    const usedFixedCodes = await readData(USED_FIXED_CODES_FILE);

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

    const inviteCodes = await readData(INVITE_CODES_FILE);
    const newCode = {
      code,
      createdBy,
      createdAt: new Date().toISOString(),
      isUsed: false,
      institutionName
    };

    inviteCodes.push(newCode);
    await writeData(INVITE_CODES_FILE, inviteCodes);

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
    const inviteCodes = await readData(INVITE_CODES_FILE);

    const filteredCodes = inviteCodes.filter(c => c.code !== code);
    await writeData(INVITE_CODES_FILE, filteredCodes);

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
    const reports = await readData(REPORTS_FILE);
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

    const reports = await readData(REPORTS_FILE);
    const newReport = {
      id: 'report_' + Date.now(),
      userId,
      institution,
      indicators,
      submittedAt: new Date().toISOString()
    };

    reports.push(newReport);
    await writeData(REPORTS_FILE, reports);

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
    const reports = await readData(REPORTS_FILE);

    const filteredReports = reports.filter(r => r.id !== id);
    await writeData(REPORTS_FILE, filteredReports);

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
    const users = await readData(USERS_FILE);
    const inviteCodes = await readData(INVITE_CODES_FILE);
    const usedFixedCodes = await readData(USED_FIXED_CODES_FILE);

    res.json({
      success: true,
      stats: {
        totalUsers: users.length,
        totalCodes: inviteCodes.length + FIXED_INVITE_CODES.length,
        usedCodes: inviteCodes.filter(c => c.isUsed).length + usedFixedCodes.length,
        unusedCodes: inviteCodes.filter(c => !c.isUsed).length + (FIXED_INVITE_CODES.length - usedFixedCodes.length)
      }
    });
  } catch (err) {
    console.error('获取统计数据错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 启动服务器
initData().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`API 地址: http://localhost:${PORT}/api`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
  });
});
