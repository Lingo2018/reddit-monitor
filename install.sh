#!/bin/bash
# Reddit Monitor — one-shot install / migration script
#
# Usage:
#   Fresh install:       ./install.sh
#   Restore from backup: ./install.sh /path/to/backup.tar.gz
#
# Does:
#   1. Install Node.js 22 LTS (if missing)
#   2. git clone the repo (if not already in it)
#   3. npm install
#   4. Install Playwright Chromium (for FB automation)
#   5. Install Xvfb (for headful FB stealth on servers)
#   6. If backup path provided: extract config.json + data/ from tar.gz
#   7. Otherwise: copy config.example.json → config.json (user edits manually)
#   8. Print systemd unit snippet
set -e

BACKUP="${1:-}"
REPO_URL="https://github.com/Lingo2018/reddit-monitor.git"
INSTALL_DIR="${INSTALL_DIR:-$PWD/reddit-monitor}"

echo "=== Reddit Monitor 安装脚本 ==="
echo ""

# 1. Node.js
if ! command -v node &> /dev/null || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]; then
  echo "[1/7] 安装 Node.js 22..."
  if command -v apt &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
  elif command -v yum &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo -E bash -
    sudo yum install -y nodejs
  else
    echo "Error: please install Node.js 18+ manually: https://nodejs.org/"
    exit 1
  fi
fi
echo "[1/7] Node.js: $(node -v)"

# 2. Repo
if [ ! -f "package.json" ] || [ ! -f "index.js" ]; then
  echo "[2/7] Cloning repo to $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
else
  echo "[2/7] Already in repo dir"
fi

# 3. npm deps
echo "[3/7] npm install..."
npm install --production

# 4. Playwright Chromium
echo "[4/7] Installing Playwright Chromium..."
npx playwright install chromium || echo "  (warning: playwright install failed, FB scraping will not work)"

# 5. Xvfb (required for headful stealth on headless servers)
echo "[5/7] Installing Xvfb..."
if command -v apt &> /dev/null; then
  sudo apt install -y xvfb
elif command -v yum &> /dev/null; then
  sudo yum install -y xorg-x11-server-Xvfb
fi

# 6. Data dirs + config
mkdir -p data logs

if [ -n "$BACKUP" ] && [ -f "$BACKUP" ]; then
  echo "[6/7] Restoring from backup: $BACKUP"
  tar xzf "$BACKUP" -C .
  echo "  restored: $(tar tzf "$BACKUP" | tr '\n' ' ')"
else
  if [ ! -f config.json ]; then
    cp config.example.json config.json
    echo "[6/7] Created config.json (edit before starting)"
  else
    echo "[6/7] config.json already exists, skipping"
  fi
fi

# 7. Systemd unit template
echo ""
echo "[7/7] Installation complete."
echo ""
echo "--- Next steps ---"
if [ -z "$BACKUP" ]; then
  echo "  1. Edit config.json (API keys, projects, webPassword)"
fi
echo "  2. Test run:    node index.js"
echo "  3. Systemd:     sudo tee /etc/systemd/system/reddit-monitor.service <<EOF"
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
echo "     sudo systemctl daemon-reload"
echo "     sudo systemctl enable --now reddit-monitor"
echo ""
echo "  Web UI: http://<server>:3000 (or configured webPort)"
