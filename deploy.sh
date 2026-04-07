#!/bin/bash
# Reddit Monitor 一键更新部署脚本
# 用法: bash deploy.sh

set -e
cd "$(dirname "$0")"

echo "=== Reddit Monitor 部署 ==="

# 检测运行环境
IS_ROOT=false
IS_SYSTEMD_USER=false
[ "$(id -u)" -eq 0 ] && IS_ROOT=true
systemctl --user status reddit-monitor.service &>/dev/null && IS_SYSTEMD_USER=true

# 1. 停止服务
echo "[1/6] 停止服务..."
if $IS_SYSTEMD_USER; then
  systemctl --user stop reddit-monitor 2>/dev/null || true
elif $IS_ROOT && systemctl is-active reddit-monitor &>/dev/null; then
  systemctl stop reddit-monitor 2>/dev/null || true
else
  pkill -f "node index.js" 2>/dev/null || true
fi
sleep 1

# 2. 拉取最新代码
echo "[2/6] 拉取代码..."
git stash 2>/dev/null || true
git pull

# 3. 安装依赖（有变化才装）
echo "[3/6] 检查依赖..."
npm install --omit=dev 2>&1 | tail -1

# 4. 安装浏览器自动化环境（Playwright + Xvfb）
echo "[4/6] 检查浏览器环境..."
if ! npx playwright install --help &>/dev/null 2>&1; then
  echo "  跳过（playwright-extra 未安装）"
elif [ ! -d "$HOME/.cache/ms-playwright/chromium"* ] 2>/dev/null; then
  echo "  安装 Chromium..."
  npx playwright install chromium 2>&1 | tail -2
  echo "  安装系统依赖..."
  if command -v apt-get &>/dev/null; then
    npx playwright install-deps chromium 2>&1 | tail -2
  fi
else
  echo "  Chromium 已安装"
fi
if command -v apt-get &>/dev/null && ! command -v Xvfb &>/dev/null; then
  echo "  安装 Xvfb..."
  apt-get install -y xvfb 2>&1 | tail -1
fi

# 5. 创建必要目录 + 初始化 config
mkdir -p data logs
# 确保 facebookProjects 字段存在
node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync('config.json','utf8'));if(!c.facebookProjects){c.facebookProjects=[];fs.writeFileSync('config.json',JSON.stringify(c,null,2));console.log('  已添加 facebookProjects');}" 2>/dev/null || true

# 5. 启动服务
echo "[6/6] 启动服务..."
if $IS_SYSTEMD_USER; then
  systemctl --user start reddit-monitor
  sleep 2
  systemctl --user status reddit-monitor --no-pager | head -5
elif $IS_ROOT && [ -f /etc/systemd/system/reddit-monitor.service ]; then
  systemctl start reddit-monitor
  sleep 2
  systemctl status reddit-monitor --no-pager | head -5
else
  nohup node index.js >logs/out.log 2>&1 &
  sleep 2
  echo "PID: $!"
  tail -3 logs/out.log
fi

echo ""
echo "完成!"
echo ""
