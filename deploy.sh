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
echo "[1/5] 停止服务..."
if $IS_SYSTEMD_USER; then
  systemctl --user stop reddit-monitor 2>/dev/null || true
elif $IS_ROOT && systemctl is-active reddit-monitor &>/dev/null; then
  systemctl stop reddit-monitor 2>/dev/null || true
else
  pkill -f "node index.js" 2>/dev/null || true
fi
sleep 1

# 2. 拉取最新代码
echo "[2/5] 拉取代码..."
git stash 2>/dev/null || true
git pull

# 3. 安装依赖（有变化才装）
echo "[3/5] 检查依赖..."
npm install --omit=dev 2>&1 | tail -1

# 4. 创建必要目录
mkdir -p data logs

# 5. 启动服务
echo "[4/5] 启动服务..."
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
echo "[5/5] 完成!"
echo ""
