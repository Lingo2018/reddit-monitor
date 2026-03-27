# Reddit Monitor

Monitor Reddit for brand, industry, and competitor keyword mentions using public JSON endpoints (no OAuth required).

## Features

- **Keyword monitoring** — track brand, industry, and competitor mentions
- **Subreddit tracking** — monitor new posts and comments in specific subreddits
- **Comment rate analysis** — track subreddit activity frequency
- **Multi-project** — monitor multiple brands/campaigns simultaneously
- **Proxy support** — residential proxy (Evomi) + optional double-proxy (Kookeey) for IP rotation
- **Rate limiting** — respects Reddit's 10 QPM limit with randomized delays and exponential backoff
- **Alternating poll strategy** — even rounds: brand + subreddit; odd rounds: brand + industry/competitor
- **SQLite storage** — lightweight, zero-config database with WAL mode

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd reddit-monitor
npm install

# 2. Configure
cp config.example.json config.json
# Edit config.json with your proxy credentials and keywords

# 3. Run
npm start
```

## Configuration

Copy `config.example.json` to `config.json` and fill in:

| Field | Description |
|-------|-------------|
| `proxy` | Primary residential proxy (e.g., Evomi) |
| `kookeey` | Optional second proxy layer for parallel fetching |
| `projects[]` | Array of monitoring projects with keywords and subreddits |
| `pollIntervalMinutes` | Polling interval (default: 8 min) |

### Project Keywords

Each project supports three keyword categories with priority: **brand > competitor > industry**

- `brand` — your brand names (checked every round, with variant generation)
- `industry` — industry terms (checked on odd rounds)
- `competitor` — competitor names (checked on odd rounds, with automatic word-splitting variants)

## Architecture

```
Reddit (.json endpoints)
    ↓ (via proxy)
reddit-monitor (Node.js)
    ↓ (SQLite)
data/reddit-monitor.db
```

### Files

| File | Description |
|------|-------------|
| `index.js` | Entry point — poll scheduler and round logic |
| `fetcher.js` | Reddit HTTP client with proxy, rate limit, retry |
| `matcher.js` | Keyword matching with variant generation |
| `db.js` | SQLite schema and data access |
| `config.js` | Configuration loader |

## Database

SQLite database at `data/reddit-monitor.db` with tables:

- **mentions** — Reddit posts/comments with metadata, category, matched keywords
- **poll_log** — Execution logs per polling cycle
- **comment_rate** — Subreddit comment frequency stats

## Deploy as systemd Service

```ini
# ~/.config/systemd/user/reddit-monitor.service
[Unit]
Description=Reddit Keyword Monitor
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/path/to/reddit-monitor
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=60

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now reddit-monitor.service
```

## License

MIT
