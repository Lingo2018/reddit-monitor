# 迁移到新服务器

本备份包是**完全自包含**的 — 包括源码、配置、数据库、FB 登录 Cookies。不需要 git clone,不需要联网去 GitHub。

## 前置条件

新服务器:
- Linux(Ubuntu 22.04+ / Debian 12 / CentOS 9 推荐)
- sudo 权限(装 Node.js / Xvfb / Chromium 依赖需要)
- 能访问代理(若 `config.json` 里启用了代理)
- 端口 3000(或 `config.json` 里 `webPort` 指定的端口)可对外

## 3 步迁移

```bash
# 1) 把备份 scp 到新机
scp reddit-monitor-backup-*.tar.gz user@newserver:~/

# 2) 新机解压
ssh user@newserver
tar xzf reddit-monitor-backup-*.tar.gz
cd reddit-monitor

# 3) 一键安装(会自动装 Node 22 / Chromium / Xvfb / npm deps)
./install.sh
```

`install.sh` 执行完会打印出 systemd 单元模板,复制粘贴到终端即可:

```bash
sudo tee /etc/systemd/system/reddit-monitor.service > /dev/null <<EOF
...(按脚本打印的内容粘贴)...
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now reddit-monitor
```

## 验证

```bash
# 服务状态
sudo systemctl status reddit-monitor

# 实时日志
tail -f logs/out.log

# Web UI
curl http://localhost:3000/api/me    # 需要先登录
```

浏览器打开 `http://<server-ip>:3000`,用备份里的 `config.json → webPassword` 登录(用户名 `admin`)。

## 检查点

登录后先确认:
- [ ] **数据**:进入"评论数据"页,mentions 数量应和老服务器一致
- [ ] **AI 分析**:随机打开一条,看 sentiment/summary 是否显示
- [ ] **FB 登录态**:进入"设置 → Facebook 浏览器自动化",Cookie 应显示**已登录**
- [ ] **FB 抓取**:点"立即抓取全部 Group",看日志窗口能否正常跑
- [ ] **代理**:Reddit 抓取能否正常拉到数据(需要代理的话)

## 排障

### Chromium 启动失败
```bash
# 重装 + 系统依赖
npx playwright install chromium
sudo npx playwright install-deps chromium
```

### Xvfb 没装上
```bash
sudo apt install -y xvfb       # Debian/Ubuntu
sudo yum install -y xorg-x11-server-Xvfb   # CentOS
```

### FB 登录失效
- Cookie 有时效。在老机器上 UI 重新"启动浏览器 → 登录 FB → 保存 Cookies",再导出一次备份。
- 或者在新机器 UI 里"手动导入 Cookies"重新粘贴。

### better-sqlite3 编译失败
```bash
# 需要 Python 3 + make + gcc
sudo apt install -y python3 make g++
npm rebuild better-sqlite3
```

### 端口已被占用
改 `config.json` 里的 `webPort`,重启服务。

## 回滚 / 并行部署

**不要**直接在老服务器关 systemd 再启新的,先保证新服务器跑通再切:

1. 新服务器装好、验证 OK
2. 老服务器 `sudo systemctl stop reddit-monitor`(仅停止,不删文件)
3. 反向代理 / DNS 切到新服务器
4. 观察 24 小时,确认新机稳定
5. 老服务器清理或保留作为冷备

## 备份里包含什么

- 全部源码(.js / public/ / package.json 等)
- `install.sh` / `MIGRATION.md`(本文档) / `README.md`
- `config.json` — 项目、代理、AI key、FB 配置
- `data/reddit-monitor.db` — 所有 mentions / analysis / reports / accounts
- `data/fb-cookies.json` — FB 登录态

## 备份里**不**包含什么

- `node_modules/`(`install.sh` 会重新 `npm install`)
- `logs/`(历史日志,太大)
- `.git/`
- Playwright 下载的 Chromium(重新装)
- 截图 / 临时文件

## 定期备份建议

- 手动:UI"下载完整备份" → 存到本地或对象存储
- 自动:crontab 每周拉一次
  ```cron
  0 3 * * 1 curl -u admin:PASSWORD http://localhost:3000/api/backup -o /backups/rm-$(date +\%F).tar.gz
  ```
- 保留最近 4 周即可,日志增长主要在 `data/reddit-monitor.db`
