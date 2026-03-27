#!/bin/bash
set -e

echo "=== Reddit Monitor 部署 ==="
echo ""

# 检查 Node.js，没有则自动安装
if ! command -v node &> /dev/null || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]; then
  echo "Node.js 未安装或版本 < 18，正在自动安装 Node.js 22 LTS..."
  echo ""

  # 检测包管理器
  if command -v apt &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
  elif command -v yum &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo -E bash -
    sudo yum install -y nodejs
  elif command -v dnf &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo -E bash -
    sudo dnf install -y nodejs
  else
    echo "错误: 无法识别包管理器，请手动安装 Node.js >= 18"
    echo "  https://nodejs.org/"
    exit 1
  fi

  echo ""
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
  echo "  - proxy: 住宅代理信息（可选，不用代理设 enabled: false）"
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
