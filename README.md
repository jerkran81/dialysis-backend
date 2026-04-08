# 血液透析感染防控监测数据上报系统 - 后端服务

## 项目说明

这是血液透析感染防控监测数据上报系统的后端服务，使用 Node.js + Express 构建，数据存储在 JSON 文件中。

## 功能特性

- 用户认证（登录、注册）
- 邀请码管理（生成、删除、固定邀请码）
- 用户管理（查看、删除）
- 数据上报（添加、删除、查看）
- 统计数据

## 安装运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
npm start
```

服务默认运行在 `http://localhost:3001`

### 3. 默认管理员账号

- 用户名: `admin`
- 密码: `admin123`

## API 接口

### 认证相关

- `POST /api/auth/login` - 登录
- `POST /api/auth/register` - 注册

### 用户管理

- `GET /api/users` - 获取所有用户
- `DELETE /api/users/:id` - 删除用户
- `PUT /api/users/:id` - 更新用户信息
- `POST /api/users/change-password` - 修改密码

### 邀请码管理

- `GET /api/invite-codes` - 获取所有邀请码
- `POST /api/invite-codes` - 生成邀请码
- `DELETE /api/invite-codes/:code` - 删除邀请码

### 数据上报

- `GET /api/reports` - 获取所有上报数据
- `POST /api/reports` - 添加上报数据
- `DELETE /api/reports/:id` - 删除上报数据

### 统计数据

- `GET /api/stats` - 获取统计数据

## 数据存储

数据存储在 `data/` 目录下的 JSON 文件中：

- `users.json` - 用户数据
- `reports.json` - 上报数据
- `inviteCodes.json` - 动态邀请码
- `usedFixedCodes.json` - 已使用的固定邀请码

## 固定邀请码

系统预置了 20 个固定邀请码：
- CSJK2024A ~ CSJK2024T

## 部署说明

### 使用 PM2 部署

```bash
npm install -g pm2
pm2 start server.js --name dialysis-backend
```

### 使用 Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

## 前端配置

修改前端 `.env` 文件中的 `VITE_API_URL` 为实际的后端地址：

```
VITE_API_URL=http://your-backend-domain/api
```

## 注意事项

1. 生产环境请修改默认管理员密码
2. 建议定期备份 `data/` 目录下的数据文件
3. 如需更高性能，可将 JSON 文件存储替换为 MongoDB 或 MySQL
