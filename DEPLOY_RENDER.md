# 免费部署到 Render 指南

Render 提供免费的 Node.js 托管服务，适合部署本后端服务。

## Render 免费额度

- **Web Services**: 免费，永久运行
- **带宽**: 100GB/月
- **构建时间**: 400 小时/月
- **磁盘**: 512MB（数据文件存储）

## 部署步骤

### 1. 注册 Render 账号

访问 https://render.com 注册账号（可用 GitHub 账号直接登录）

### 2. 创建 Web Service

1. 登录后点击 "New +" → "Web Service"
2. 选择 "Build and deploy from a Git repository"
3. 连接你的 GitHub/GitLab 仓库，或选择 "Upload Code"

### 3. 上传代码（如果没有 Git 仓库）

如果没有 Git 仓库，可以使用以下方法：

#### 方法 A: 使用 GitHub

1. 在 GitHub 创建新仓库
2. 上传 `backend` 文件夹内容
3. 在 Render 中连接该仓库

#### 方法 B: 直接上传（推荐）

1. 将 `backend` 文件夹压缩为 ZIP
2. 在 Render 选择 "Upload Code"
3. 上传 ZIP 文件

### 4. 配置服务

填写以下信息：

| 配置项 | 值 |
|--------|-----|
| Name | `dialysis-backend` |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `node server.js` |

### 5. 环境变量（可选）

点击 "Advanced" → "Add Environment Variable":

```
NODE_ENV = production
```

### 6. 创建服务

点击 "Create Web Service"

等待部署完成（约 2-5 分钟）

### 7. 获取服务地址

部署完成后，Render 会提供一个类似以下的 URL：

```
https://dialysis-backend.onrender.com
```

这就是你的后端 API 地址！

---

## 配置前端连接后端

### 1. 修改前端环境变量

编辑 `/mnt/okcomputer/output/app/.env.production`：

```
VITE_API_URL=https://你的服务名.onrender.com/api
```

例如：
```
VITE_API_URL=https://dialysis-backend.onrender.com/api
```

### 2. 重新构建前端

```bash
cd /mnt/okcomputer/output/app
npm run build
```

### 3. 部署前端

将 `dist` 文件夹部署到任何静态托管服务（如 GitHub Pages、Vercel、Netlify）

---

## 数据持久化说明

**重要**: Render 的免费 Web Service 会在每次部署时重置文件系统。

### 解决方案

#### 方案 1: 使用 Render Disk（付费）

Render 提供付费的 Disk 服务用于持久化存储。

#### 方案 2: 使用外部数据库（推荐免费方案）

将数据存储改为 MongoDB Atlas（免费 512MB）：

1. 注册 https://www.mongodb.com/atlas
2. 创建免费集群
3. 修改后端代码连接 MongoDB

#### 方案 3: 定期备份数据

编写脚本定期导出数据：

```bash
# 备份脚本 backup.sh
curl https://你的服务名.onrender.com/api/users > backup/users.json
curl https://你的服务名.onrender.com/api/reports > backup/reports.json
```

---

## 测试 API

部署完成后，测试 API 是否正常工作：

```bash
# 测试健康检查
curl https://你的服务名.onrender.com/health

# 测试登录
curl -X POST https://你的服务名.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 故障排查

### 服务启动失败

查看 Render Dashboard 的 Logs 标签页，检查错误信息。

### CORS 错误

确保后端 `server.js` 中的 CORS 配置正确：

```javascript
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 数据丢失

免费 Web Service 的文件系统不是持久的，建议使用外部数据库。

---

## 其他免费托管选项

如果 Render 不合适，还可以考虑：

### Railway
- 网址: https://railway.app
- 免费额度: $5/月
- 优点: 部署简单，支持持久化存储

### Fly.io
- 网址: https://fly.io
- 免费额度: 3 个共享 CPU 应用
- 优点: 性能较好

### Glitch
- 网址: https://glitch.com
- 免费但有限制
- 适合小型项目

---

## 推荐方案总结

| 方案 | 优点 | 缺点 |
|------|------|------|
| Render | 免费、简单 | 数据不持久 |
| Railway | 简单易用 | 免费额度有限 |
| MongoDB Atlas + Render | 数据持久 | 需要配置数据库 |

**推荐**: 使用 Render + MongoDB Atlas 免费版，实现完整的后端服务。
