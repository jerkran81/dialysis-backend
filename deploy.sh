#!/bin/bash

# 血液透析感染防控监测数据上报系统 - 后端部署脚本

echo "=========================================="
echo "  后端服务部署脚本"
echo "=========================================="

# 检查 Node.js 版本
echo "检查 Node.js 版本..."
node -v
if [ $? -ne 0 ]; then
    echo "错误: 未安装 Node.js，请先安装 Node.js 18+"
    exit 1
fi

# 安装依赖
echo "安装依赖..."
npm install

# 创建数据目录
echo "创建数据目录..."
mkdir -p data

# 启动服务
echo "启动后端服务..."
echo "服务将运行在 http://localhost:3001"
echo "按 Ctrl+C 停止服务"
echo ""

npm start
