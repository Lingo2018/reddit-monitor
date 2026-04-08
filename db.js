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

// 迁移：添加 platform 列
try {
  db.exec(`ALTER TABLE mentions ADD COLUMN platform TEXT NOT NULL DEFAULT 'reddit'`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_mentions_platform ON mentions(platform)`);
  console.log('[db] 迁移完成: 添加 platform 列');
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
  INSERT OR IGNORE INTO mentions (id, project, type, title, body, author, subreddit, permalink, score, num_comments, created_utc, discovered_at, source, matched_keywords, category, is_read, platform)
  VALUES (@id, @project, @type, @title, @body, @author, @subreddit, @permalink, @score, @num_comments, @created_utc, @discovered_at, @source, @matched_keywords, @category, 0, @platform)
`);

const insertPollLog = db.prepare(`
  INSERT INTO poll_log (poll_time, round_type, tasks_run, new_items, errors, duration_ms)
  VALUES (@poll_time, @round_type, @tasks_run, @new_items, @errors, @duration_ms)
`);

export function saveMention(mention) {
  return insertMention.run(mention);
}

const updateAuthor = db.prepare(`UPDATE mentions SET author = @author WHERE id = @id AND (author = 'Unknown' OR author NOT LIKE '%|||%')`);

export function saveMentions(mentions) {
  const tx = db.transaction((items) => {
    let newCount = 0;
    for (const m of items) {
      const result = insertMention.run(m);
      if (result.changes > 0) newCount++;
      else if (m.author && m.author !== 'Unknown' && m.author.includes('|||')) {
        updateAuthor.run({ id: m.id, author: m.author });
      }
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

// --- Users table (karma cache) ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    total_karma INTEGER DEFAULT 0,
    link_karma INTEGER DEFAULT 0,
    comment_karma INTEGER DEFAULT 0,
    account_created_utc INTEGER,
    last_fetched TEXT
  );
`);

const upsertUser = db.prepare(`
  INSERT OR REPLACE INTO users (username, total_karma, link_karma, comment_karma, account_created_utc, last_fetched)
  VALUES (@username, @total_karma, @link_karma, @comment_karma, @account_created_utc, @last_fetched)
`);

export function saveUsers(users) {
  const tx = db.transaction((items) => {
    for (const u of items) upsertUser.run(u);
  });
  tx(users);
}

export function getStaleUsers(usernames, maxAgeHours = 24) {
  if (!usernames.length) return [];
  const cutoff = new Date(Date.now() - maxAgeHours * 3600000).toISOString();
  const existing = new Map();
  for (const u of db.prepare('SELECT username, last_fetched FROM users').all()) {
    existing.set(u.username, u.last_fetched);
  }
  return usernames.filter(u => !existing.has(u) || existing.get(u) < cutoff);
}

// --- Analysis tables ---
db.exec(`
  CREATE TABLE IF NOT EXISTS analysis (
    mention_id TEXT NOT NULL,
    project TEXT NOT NULL,
    sentiment TEXT DEFAULT 'neutral',
    relevance TEXT DEFAULT 'low',
    pros TEXT DEFAULT '[]',
    cons TEXT DEFAULT '[]',
    actionable INTEGER DEFAULT 0,
    summary TEXT DEFAULT '',
    analyzed_at TEXT,
    PRIMARY KEY (mention_id, project)
  );
  CREATE INDEX IF NOT EXISTS idx_analysis_sentiment ON analysis(sentiment);
  CREATE INDEX IF NOT EXISTS idx_analysis_project ON analysis(project);

  CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project TEXT NOT NULL,
    report_date TEXT NOT NULL,
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    actionable_count INTEGER DEFAULT 0,
    top_pros TEXT DEFAULT '[]',
    top_cons TEXT DEFAULT '[]',
    full_report TEXT DEFAULT '',
    created_at TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_report_date ON daily_reports(project, report_date);
`);

const insertAnalysis = db.prepare(`
  INSERT OR REPLACE INTO analysis (mention_id, project, sentiment, relevance, pros, cons, actionable, summary, analyzed_at)
  VALUES (@mention_id, @project, @sentiment, @relevance, @pros, @cons, @actionable, @summary, @analyzed_at)
`);

export function saveAnalysisBatch(results) {
  const tx = db.transaction((items) => {
    for (const r of items) insertAnalysis.run(r);
  });
  tx(results);
}

export function getUnanalyzedMentions(project, limit = 20) {
  return db.prepare(`
    SELECT m.* FROM mentions m
    LEFT JOIN analysis a ON m.id = a.mention_id AND m.project = a.project
    WHERE m.project = ? AND a.mention_id IS NULL AND ((m.body IS NOT NULL AND m.body != '') OR (m.title IS NOT NULL AND m.title != ''))
    ORDER BY m.discovered_at DESC LIMIT ?
  `).all(project, limit);
}

export function getDailyAnalysisStats(project, date) {
  const dayStart = date + 'T00:00:00.000Z';
  const dayEnd = date + 'T23:59:59.999Z';

  const total = db.prepare(`SELECT COUNT(*) as c FROM mentions m JOIN analysis a ON m.id = a.mention_id AND m.project = a.project WHERE m.project = ? AND m.discovered_at BETWEEN ? AND ?`).get(project, dayStart, dayEnd)?.c || 0;
  const posts = db.prepare(`SELECT COUNT(*) as c FROM mentions WHERE project = ? AND type = 'post' AND discovered_at BETWEEN ? AND ?`).get(project, dayStart, dayEnd)?.c || 0;
  const comments = db.prepare(`SELECT COUNT(*) as c FROM mentions WHERE project = ? AND type = 'comment' AND discovered_at BETWEEN ? AND ?`).get(project, dayStart, dayEnd)?.c || 0;

  const sentiments = db.prepare(`SELECT a.sentiment, COUNT(*) as c FROM mentions m JOIN analysis a ON m.id = a.mention_id AND m.project = a.project WHERE m.project = ? AND m.discovered_at BETWEEN ? AND ? GROUP BY a.sentiment`).all(project, dayStart, dayEnd);
  const sMap = {};
  sentiments.forEach(s => sMap[s.sentiment] = s.c);

  const actionable = db.prepare(`SELECT COUNT(*) as c FROM mentions m JOIN analysis a ON m.id = a.mention_id AND m.project = a.project WHERE m.project = ? AND a.actionable = 1 AND m.discovered_at BETWEEN ? AND ?`).get(project, dayStart, dayEnd)?.c || 0;

  // Aggregate pros and cons
  const allAnalysis = db.prepare(`SELECT a.pros, a.cons, a.sentiment, a.summary, a.relevance, m.permalink, m.author, m.type FROM mentions m JOIN analysis a ON m.id = a.mention_id AND m.project = a.project WHERE m.project = ? AND m.discovered_at BETWEEN ? AND ?`).all(project, dayStart, dayEnd);

  const prosCount = {};
  const consCount = {};
  const samples = [];

  for (const a of allAnalysis) {
    try { JSON.parse(a.pros).forEach(p => { prosCount[p] = (prosCount[p] || 0) + 1; }); } catch {}
    try { JSON.parse(a.cons).forEach(c => { consCount[c] = (consCount[c] || 0) + 1; }); } catch {}
    if (a.relevance === 'high' && samples.length < 10) {
      samples.push({ sentiment: a.sentiment, summary: a.summary, permalink: a.permalink, author: a.author, type: a.type });
    }
  }

  // Collect negative items with links for actionable follow-up
  const negativeItems = allAnalysis
    .filter(a => a.sentiment === 'negative' && a.permalink)
    .map(a => ({ summary: a.summary, permalink: a.permalink, author: a.author, type: a.type, cons: a.cons }))
    .slice(0, 20);

  const topPros = Object.entries(prosCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([text, count]) => ({ text, count }));
  const topCons = Object.entries(consCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([text, count]) => ({ text, count }));

  return {
    total, posts, comments,
    positive: sMap.positive || 0,
    negative: sMap.negative || 0,
    neutral: sMap.neutral || 0,
    actionable, topPros, topCons, samples, negativeItems: negativeItems || [],
  };
}

const insertReport = db.prepare(`
  INSERT OR REPLACE INTO daily_reports (project, report_date, positive_count, negative_count, neutral_count, total_count, actionable_count, top_pros, top_cons, full_report, created_at)
  VALUES (@project, @report_date, @positive_count, @negative_count, @neutral_count, @total_count, @actionable_count, @top_pros, @top_cons, @full_report, @created_at)
`);

export function saveDailyReport(report) {
  return insertReport.run(report);
}

// 迁移：报告标题
try {
  db.exec(`ALTER TABLE daily_reports ADD COLUMN title TEXT DEFAULT ''`);
  console.log('[db] 迁移完成: 添加报告 title 列');
} catch {}

// --- Products table ---
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project TEXT NOT NULL,
    name TEXT NOT NULL,
    specs TEXT DEFAULT '{}',
    created_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_products_project ON products(project);
`);

export function getProducts(project) {
  return project
    ? db.prepare('SELECT * FROM products WHERE project = ? ORDER BY name').all(project)
    : db.prepare('SELECT * FROM products ORDER BY project, name').all();
}

export function addProduct(product) {
  return db.prepare('INSERT INTO products (project, name, specs, created_at) VALUES (@project, @name, @specs, @created_at)').run(product);
}

export function updateProduct(id, data) {
  return db.prepare('UPDATE products SET name = @name, specs = @specs WHERE id = @id').run({ id, ...data });
}

export function deleteProduct(id) {
  return db.prepare('DELETE FROM products WHERE id = ?').run(id);
}

export function getProductsForPrompt(project) {
  const products = db.prepare('SELECT name, specs FROM products WHERE project = ?').all(project);
  if (!products.length) return '';
  return products.map(p => {
    const specs = JSON.parse(p.specs || '{}');
    const specLines = Object.entries(specs).map(([k, v]) => `  ${k}: ${v}`).join('\n');
    return `【${p.name}】\n${specLines}`;
  }).join('\n\n');
}

export function getAllAnalysisStats(project, startDate, endDate) {
  const w = []; const pp = [];
  if (project) { w.push('m.project = ?'); pp.push(project); }
  if (startDate) { w.push('m.discovered_at >= ?'); pp.push(startDate + 'T00:00:00.000Z'); }
  if (endDate) { w.push('m.discovered_at <= ?'); pp.push(endDate + 'T23:59:59.999Z'); }
  const pw = w.length ? 'WHERE ' + w.join(' AND ') : '';
  const pwAnd = w.length ? pw + ' AND' : 'WHERE';

  const total = db.prepare(`SELECT COUNT(*) as c FROM mentions m ${pw}`).get(...pp).c;
  const posts = db.prepare(`SELECT COUNT(*) as c FROM mentions m ${pwAnd} m.type = 'post'`).get(...pp).c;
  const comments = db.prepare(`SELECT COUNT(*) as c FROM mentions m ${pwAnd} m.type = 'comment'`).get(...pp).c;

  const sentiments = db.prepare(`SELECT a.sentiment, COUNT(*) as c FROM mentions m JOIN analysis a ON m.id = a.mention_id AND m.project = a.project ${pw} GROUP BY a.sentiment`).all(...pp);
  const sMap = {};
  sentiments.forEach(s => sMap[s.sentiment] = s.c);

  const actionable = db.prepare(`SELECT COUNT(*) as c FROM mentions m JOIN analysis a ON m.id = a.mention_id AND m.project = a.project ${pwAnd} a.actionable = 1`).get(...pp).c;

  const allAnalysis = db.prepare(`SELECT a.pros, a.cons, a.sentiment, a.summary, a.relevance, m.permalink, m.author, m.type FROM mentions m JOIN analysis a ON m.id = a.mention_id AND m.project = a.project ${pw}`).all(...pp);

  const prosCount = {};
  const consCount = {};
  const samples = [];

  for (const a of allAnalysis) {
    try { JSON.parse(a.pros).forEach(p => { prosCount[p] = (prosCount[p] || 0) + 1; }); } catch {}
    try { JSON.parse(a.cons).forEach(c => { consCount[c] = (consCount[c] || 0) + 1; }); } catch {}
    if (a.relevance === 'high' && samples.length < 15) {
      samples.push({ sentiment: a.sentiment, summary: a.summary, permalink: a.permalink, author: a.author, type: a.type });
    }
  }

  const negativeItems = allAnalysis
    .filter(a => a.sentiment === 'negative' && a.permalink)
    .map(a => ({ summary: a.summary, permalink: a.permalink, author: a.author, type: a.type, cons: a.cons }))
    .slice(0, 30);

  const topPros = Object.entries(prosCount).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([text, count]) => ({ text, count }));
  const topCons = Object.entries(consCount).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([text, count]) => ({ text, count }));

  return {
    total, posts, comments,
    positive: sMap.positive || 0,
    negative: sMap.negative || 0,
    neutral: sMap.neutral || 0,
    actionable, topPros, topCons, samples, negativeItems,
  };
}

export default db;
