#!/bin/bash
set -e

echo "=== Reddit Monitor 部署 ==="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "错误: 需要 Node.js >= 18，请先安装"
  exit 1
fi
echo "Node.js: $(node -v)"

# 安装依赖
echo ""
echo "安装依赖..."
npm install --production

# 创建数据目录
mkdir -p data logs

# 生成配置
if [ ! -f config.json ]; then
  cp config.example.json config.json
  echo ""
  echo "已生成 config.json，请编辑填入你的配置："
  echo "  - proxy: 住宅代理信息（必填，Reddit 会封服务器 IP）"
  echo "  - projects: 监控项目、关键词、subreddit"
  echo "  - kookeey: 第二层代理（可选，enabled 设 false 即可跳过）"
  echo ""
  echo "编辑完成后运行: npm start"
else
  echo ""
  echo "config.json 已存在，跳过"
fi

echo ""
echo "=== 部署完成 ==="
echo ""
echo "运行方式："
echo "  前台测试: npm start"
echo "  systemd:  参考 README.md 中的 systemd 配置"
