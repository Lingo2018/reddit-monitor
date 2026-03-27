import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, saveConfig, getConfigForUI } from './config.js';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = crypto.randomBytes(32).toString('hex');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Cookie helpers ---
function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const pair = raw.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return pair ? pair.slice(name.length + 1) : null;
}

// --- Auth ---
function auth(req, res, next) {
  const token = getCookie(req, 'token');
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

app.post('/api/login', (req, res) => {
  const cfg = loadConfig();
  const pwd = cfg.webPassword || 'admin';
  if (req.body.password !== pwd) return res.status(401).json({ error: 'wrong password' });
  const token = jwt.sign({ ts: Date.now() }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 86400000, sameSite: 'lax' });
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => res.json({ ok: true }));

// --- Config ---
app.get('/api/config', auth, (req, res) => {
  res.json(getConfigForUI());
});

app.put('/api/config', auth, (req, res) => {
  try {
    saveConfig(req.body);
    res.json({ ok: true, config: getConfigForUI() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- Mentions ---
app.get('/api/mentions', auth, (req, res) => {
  const { project, category, search, timeRange, is_read, type, page = 1, limit = 50 } = req.query;
  const offset = (Math.max(1, +page) - 1) * +limit;
  const wheres = [];
  const params = [];

  if (project) { wheres.push('project = ?'); params.push(project); }
  if (category) { wheres.push('category = ?'); params.push(category); }
  if (type) { wheres.push('type = ?'); params.push(type); }
  if (is_read !== undefined && is_read !== '') { wheres.push('is_read = ?'); params.push(+is_read); }
  if (search) { wheres.push("(title LIKE ? OR body LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  if (timeRange) {
    const hours = { '24h': 24, '7d': 168, '30d': 720 }[timeRange];
    if (hours) {
      const since = new Date(Date.now() - hours * 3600000).toISOString();
      wheres.push('discovered_at >= ?');
      params.push(since);
    }
  }

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as c FROM mentions ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT * FROM mentions ${where} ORDER BY discovered_at DESC LIMIT ? OFFSET ?`).all(...params, +limit, offset);
  res.json({ rows, total, page: +page, pages: Math.ceil(total / +limit) });
});

app.post('/api/mentions/read', auth, (req, res) => {
  const { ids, all, project, category } = req.body;
  if (all) {
    const wheres = [];
    const params = [];
    if (project) { wheres.push('project = ?'); params.push(project); }
    if (category) { wheres.push('category = ?'); params.push(category); }
    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
    db.prepare(`UPDATE mentions SET is_read = 1 ${where}`).run(...params);
  } else if (ids?.length) {
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE mentions SET is_read = 1 WHERE id IN (${placeholders})`).run(...ids);
  }
  res.json({ ok: true });
});

// --- Stats ---
app.get('/api/stats', auth, (req, res) => {
  const { project } = req.query;
  const pw = project ? 'WHERE project = ?' : '';
  const pp = project ? [project] : [];

  const total = db.prepare(`SELECT COUNT(*) as c FROM mentions ${pw}`).get(...pp).c;
  const unread = db.prepare(`SELECT COUNT(*) as c FROM mentions ${pw ? pw + ' AND' : 'WHERE'} is_read = 0`).get(...pp).c;

  const byCategory = db.prepare(`SELECT category, COUNT(*) as count FROM mentions ${pw} GROUP BY category`).all(...pp);
  const topSubs = db.prepare(`SELECT subreddit, COUNT(*) as count FROM mentions ${pw} GROUP BY subreddit ORDER BY count DESC LIMIT 10`).all(...pp);
  const recentPolls = db.prepare('SELECT * FROM poll_log ORDER BY id DESC LIMIT 20').all();

  // 每日趋势（最近30天）
  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
  const byDay = db.prepare(`SELECT date(discovered_at) as day, COUNT(*) as count FROM mentions ${pw ? pw + ' AND' : 'WHERE'} discovered_at >= ? GROUP BY day ORDER BY day`).all(...pp, since30d);

  res.json({ total, unread, byCategory, topSubs, byDay, recentPolls });
});

// --- Export ---
app.get('/api/mentions/export', auth, (req, res) => {
  const { project, category, search, timeRange, format = 'csv' } = req.query;
  const wheres = [];
  const params = [];

  if (project) { wheres.push('project = ?'); params.push(project); }
  if (category) { wheres.push('category = ?'); params.push(category); }
  if (search) { wheres.push("(title LIKE ? OR body LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  if (timeRange) {
    const hours = { '24h': 24, '7d': 168, '30d': 720 }[timeRange];
    if (hours) {
      const since = new Date(Date.now() - hours * 3600000).toISOString();
      wheres.push('discovered_at >= ?');
      params.push(since);
    }
  }

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
  const rows = db.prepare(`SELECT * FROM mentions ${where} ORDER BY discovered_at DESC`).all(...params);
  const date = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=mentions-${date}.json`);
    return res.send(JSON.stringify(rows, null, 2));
  }

  // CSV
  const cols = ['id', 'project', 'type', 'title', 'body', 'author', 'subreddit', 'permalink', 'score', 'num_comments', 'created_utc', 'discovered_at', 'source', 'matched_keywords', 'category', 'is_read'];
  const escape = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  let csv = cols.join(',') + '\n';
  for (const r of rows) csv += cols.map(c => escape(r[c])).join(',') + '\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=mentions-${date}.csv`);
  res.send('\uFEFF' + csv); // BOM for Excel
});

// --- Poll Log ---
app.get('/api/poll-log', auth, (req, res) => {
  const limit = Math.min(+(req.query.limit || 20), 100);
  const rows = db.prepare('SELECT * FROM poll_log ORDER BY id DESC LIMIT ?').all(limit);
  res.json(rows);
});

// --- Analysis data (joined with mentions) ---
app.get('/api/mentions-analyzed', auth, (req, res) => {
  const { project, type, search, timeRange, page = 1, limit = 50 } = req.query;
  const offset = (Math.max(1, +page) - 1) * +limit;
  const wheres = [];
  const params = [];

  if (project) { wheres.push('m.project = ?'); params.push(project); }
  if (type) { wheres.push('m.type = ?'); params.push(type); }
  if (search) { wheres.push("(m.title LIKE ? OR m.body LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  if (timeRange) {
    const hours = { '24h': 24, '7d': 168, '30d': 720 }[timeRange];
    if (hours) {
      wheres.push('m.discovered_at >= ?');
      params.push(new Date(Date.now() - hours * 3600000).toISOString());
    }
  }

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as c FROM mentions m LEFT JOIN analysis a ON m.id = a.mention_id AND m.project = a.project ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT m.*, a.sentiment, a.relevance, a.pros as ai_pros, a.cons as ai_cons, a.actionable, a.summary as ai_summary FROM mentions m LEFT JOIN analysis a ON m.id = a.mention_id AND m.project = a.project ${where} ORDER BY m.created_utc DESC LIMIT ? OFFSET ?`).all(...params, +limit, offset);
  res.json({ rows, total, page: +page, pages: Math.ceil(total / +limit) });
});

// --- Daily Reports ---
app.get('/api/reports', auth, (req, res) => {
  const { project, limit = 30 } = req.query;
  const pw = project ? 'WHERE project = ?' : '';
  const pp = project ? [project] : [];
  const rows = db.prepare(`SELECT * FROM daily_reports ${pw} ORDER BY report_date DESC LIMIT ?`).all(...pp, +limit);
  res.json(rows);
});

app.get('/api/reports/:date', auth, (req, res) => {
  const { project } = req.query;
  const row = db.prepare('SELECT * FROM daily_reports WHERE report_date = ? AND project = ?').get(req.params.date, project || '');
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

// --- Analysis Stats ---
app.get('/api/analysis-stats', auth, (req, res) => {
  const { project } = req.query;
  const pw = project ? 'WHERE a.project = ?' : '';
  const pp = project ? [project] : [];

  const sentiments = db.prepare(`SELECT a.sentiment, COUNT(*) as count FROM analysis a ${pw} GROUP BY a.sentiment`).all(...pp);
  const analyzed = db.prepare(`SELECT COUNT(*) as c FROM analysis a ${pw}`).get(...pp).c;
  const totalMentions = db.prepare(`SELECT COUNT(*) as c FROM mentions ${project ? 'WHERE project = ?' : ''}`).get(...pp).c;
  const actionable = db.prepare(`SELECT COUNT(*) as c FROM analysis a ${pw ? pw + ' AND' : 'WHERE'} a.actionable = 1`).get(...pp).c;

  res.json({ sentiments, analyzed, totalMentions, actionable });
});

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

export default app;
