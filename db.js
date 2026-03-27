import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'reddit-monitor.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// 迁移：如果旧表没有 project 列，加上
try {
  db.exec(`ALTER TABLE mentions ADD COLUMN project TEXT NOT NULL DEFAULT 'default'`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_id_project ON mentions(id, project)`);
  console.log('[db] 迁移完成: 添加 project 列');
} catch {}

// 建表（新安装时）
db.exec(`
  CREATE TABLE IF NOT EXISTS mentions (
    id TEXT NOT NULL,
    project TEXT NOT NULL DEFAULT 'default',
    type TEXT NOT NULL,
    title TEXT,
    body TEXT,
    author TEXT,
    subreddit TEXT,
    permalink TEXT,
    score INTEGER DEFAULT 0,
    num_comments INTEGER DEFAULT 0,
    created_utc INTEGER,
    discovered_at TEXT NOT NULL,
    source TEXT NOT NULL,
    matched_keywords TEXT,
    category TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    PRIMARY KEY (id, project)
  );

  CREATE INDEX IF NOT EXISTS idx_project ON mentions(project);
  CREATE INDEX IF NOT EXISTS idx_discovered_at ON mentions(discovered_at);
  CREATE INDEX IF NOT EXISTS idx_category ON mentions(category);
  CREATE INDEX IF NOT EXISTS idx_subreddit ON mentions(subreddit);
  CREATE INDEX IF NOT EXISTS idx_is_read ON mentions(is_read);

  CREATE TABLE IF NOT EXISTS comment_rate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project TEXT NOT NULL DEFAULT 'default',
    subreddit TEXT NOT NULL,
    poll_time TEXT NOT NULL,
    total_comments INTEGER DEFAULT 0,
    oldest_utc INTEGER,
    newest_utc INTEGER,
    rate_per_min REAL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_comment_rate_sub ON comment_rate(subreddit);
  CREATE INDEX IF NOT EXISTS idx_comment_rate_project ON comment_rate(project);

  CREATE TABLE IF NOT EXISTS poll_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_time TEXT NOT NULL,
    round_type TEXT,
    tasks_run TEXT,
    new_items INTEGER DEFAULT 0,
    errors TEXT,
    duration_ms INTEGER
  );
`);

const insertMention = db.prepare(`
  INSERT OR IGNORE INTO mentions (id, project, type, title, body, author, subreddit, permalink, score, num_comments, created_utc, discovered_at, source, matched_keywords, category, is_read)
  VALUES (@id, @project, @type, @title, @body, @author, @subreddit, @permalink, @score, @num_comments, @created_utc, @discovered_at, @source, @matched_keywords, @category, 0)
`);

const insertPollLog = db.prepare(`
  INSERT INTO poll_log (poll_time, round_type, tasks_run, new_items, errors, duration_ms)
  VALUES (@poll_time, @round_type, @tasks_run, @new_items, @errors, @duration_ms)
`);

export function saveMention(mention) {
  return insertMention.run(mention);
}

export function saveMentions(mentions) {
  const tx = db.transaction((items) => {
    let newCount = 0;
    for (const m of items) {
      const result = insertMention.run(m);
      if (result.changes > 0) newCount++;
    }
    return newCount;
  });
  return tx(mentions);
}

export function logPoll(entry) {
  return insertPollLog.run(entry);
}

const insertCommentRate = db.prepare(`
  INSERT INTO comment_rate (project, subreddit, poll_time, total_comments, oldest_utc, newest_utc, rate_per_min)
  VALUES (@project, @subreddit, @poll_time, @total_comments, @oldest_utc, @newest_utc, @rate_per_min)
`);

export function logCommentRate(entry) {
  return insertCommentRate.run(entry);
}

export function existsId(id) {
  return !!db.prepare('SELECT 1 FROM mentions WHERE id = ?').get(id);
}

export default db;
