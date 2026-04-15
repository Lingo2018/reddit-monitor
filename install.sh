#!/bin/bash
# Reddit Monitor — standalone install script
#
# Run this script from inside an extracted backup directory:
#   tar xzf reddit-monitor-backup-XXXX.tar.gz
#   cd reddit-monitor
#   ./install.sh
#
# What it does:
#   1. Install Node.js 22 LTS (if missing)
#   2. npm install
#   3. Install Playwright Chromium + deps (for FB automation)
#   4. Install Xvfb (headful stealth on server)
#   5. Print systemd unit snippet
#
# No network dependency on GitHub — the tar.gz is self-contained.
set -e

echo "=== Reddit Monitor 安装 ==="
echo ""

# Sanity check: we should be inside the repo dir
if [ ! -f "package.json" ] || [ ! -f "index.js" ]; then
  echo "Error: must run from the extracted backup directory (missing package.json / index.js)"
  echo "Usage: tar xzf backup.tar.gz && cd reddit-monitor && ./install.sh"
  exit 1
fi

# 1. Node.js
if ! command -v node &> /dev/null || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]; then
  echo "[1/5] Installing Node.js 22..."
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
    echo "Error: install Node.js 18+ manually: https://nodejs.org/"
    exit 1
  fi
fi
echo "[1/5] Node.js: $(node -v)"

# 2. npm deps
echo "[2/5] npm install..."
npm install --production

# 3. Playwright Chromium (bundled browser + system deps)
echo "[3/5] Installing Playwright Chromium..."
npx playwright install chromium || echo "  (warning: chromium install failed, FB scraping will not work)"
if command -v apt &> /dev/null; then
  sudo npx playwright install-deps chromium 2>/dev/null || true
fi

# 4. Xvfb (required for headful stealth on headless servers)
echo "[4/5] Installing Xvfb..."
if command -v apt &> /dev/null; then
  sudo apt install -y xvfb
elif command -v yum &> /dev/null; then
  sudo yum install -y xorg-x11-server-Xvfb
elif command -v dnf &> /dev/null; then
  sudo dnf install -y xorg-x11-server-Xvfb
fi

# 5. Data dirs
mkdir -p data logs

if [ ! -f config.json ]; then
  if [ -f config.example.json ]; then
    cp config.example.json config.json
    echo "  Created config.json from example (edit it before starting)"
  else
    echo "  Warning: no config.json and no config.example.json — you must create one"
  fi
else
  echo "  config.json found (from backup)"
fi

if [ -f data/reddit-monitor.db ]; then
  DB_SIZE=$(du -h data/reddit-monitor.db | cut -f1)
  echo "  Database found: data/reddit-monitor.db ($DB_SIZE)"
fi
if [ -f data/fb-cookies.json ]; then
  echo "  FB cookies found: data/fb-cookies.json"
fi

echo ""
echo "=== [5/5] 安装完成 ==="
echo ""
echo "--- Next steps ---"
echo "  Test run:    node index.js"
echo "  Systemd:     sudo tee /etc/systemd/system/reddit-monitor.service > /dev/null <<EOF"
cat <<EOF
[Unit]
Description=Reddit/Facebook Monitor
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/env node index.js
Restart=always
RestartSec=5
StandardOutput=append:$(pwd)/logs/out.log
StandardError=append:$(pwd)/logs/out.log

[Install]
WantedBy=multi-user.target
EOF
echo "EOF"
echo "               sudo systemctl daemon-reload"
echo "               sudo systemctl enable --now reddit-monitor"
echo ""
echo "  Web UI:      http://<server>:\$(grep webPort config.json | head -1 | grep -o '[0-9]\+')"
