import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, saveConfig, getConfigForUI } from './config.js';
import db, { getProducts, addProduct, updateProduct, deleteProduct } from './db.js';
import * as fbBrowser from './facebook-browser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = crypto.randomBytes(32).toString('hex');
const app = express();

app.use(express.json({ limit: '10mb' }));

// --- Gzip compression ---
app.use((req, res, next) => {
  if (!req.headers['accept-encoding']?.includes('gzip')) return next();
  const origJson = res.json.bind(res);
  res.json = (data) => {
    const body = JSON.stringify(data);
    if (body.length < 1024) return origJson(data); // skip small responses
    zlib.gzip(body, (err, buf) => {
      if (err) return origJson(data);
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', 'application/json');
      res.end(buf);
    });
  };
  next();
});

// Static files - no cache for development, etag for revalidation
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 0,
  etag: true,
}));

// --- Ensure DB indexes for JOIN performance ---
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_mentions_created_utc ON mentions(created_utc);
    CREATE INDEX IF NOT EXISTS idx_mentions_type ON mentions(type);
    CREATE INDEX IF NOT EXISTS idx_analysis_mention_project ON analysis(mention_id, project);
  `);
} catch {}

// --- Pre-compiled SQL statements ---
const SQL = {
  // Stats
  mentionCount: db.prepare('SELECT COUNT(*) as c FROM mentions'),
  mentionCountByProject: db.prepare('SELECT COUNT(*) as c FROM mentions WHERE project = ?'),
  unreadCount: db.prepare('SELECT COUNT(*) as c FROM mentions WHERE is_read = 0'),
  unreadCountByProject: db.prepare('SELECT COUNT(*) as c FROM mentions WHERE project = ? AND is_read = 0'),
  byCategory: db.prepare('SELECT category, COUNT(*) as count FROM mentions GROUP BY category'),
  byCategoryByProject: db.prepare('SELECT category, COUNT(*) as count FROM mentions WHERE project = ? GROUP BY category'),
  topSubs: db.prepare('SELECT subreddit, COUNT(*) as count FROM mentions GROUP BY subreddit ORDER BY count DESC LIMIT 10'),
  topSubsByProject: db.prepare('SELECT subreddit, COUNT(*) as count FROM mentions WHERE project = ? GROUP BY subreddit ORDER BY count DESC LIMIT 10'),
  recentPolls: db.prepare('SELECT * FROM poll_log ORDER BY id DESC LIMIT 20'),
  byDay: db.prepare('SELECT date(discovered_at) as day, COUNT(*) as count FROM mentions WHERE discovered_at >= ? GROUP BY day ORDER BY day'),
  byDayByProject: db.prepare('SELECT date(discovered_at) as day, COUNT(*) as count FROM mentions WHERE project = ? AND discovered_at >= ? GROUP BY day ORDER BY day'),

  // Analysis stats
  sentiments: db.prepare('SELECT sentiment, COUNT(*) as count FROM analysis GROUP BY sentiment'),
  sentimentsByProject: db.prepare('SELECT sentiment, COUNT(*) as count FROM analysis WHERE project = ? GROUP BY sentiment'),
  analyzedCount: db.prepare('SELECT COUNT(*) as c FROM analysis'),
  analyzedCountByProject: db.prepare('SELECT COUNT(*) as c FROM analysis WHERE project = ?'),
  actionableCount: db.prepare('SELECT COUNT(*) as c FROM analysis WHERE actionable = 1'),
  actionableCountByProject: db.prepare('SELECT COUNT(*) as c FROM analysis WHERE project = ? AND actionable = 1'),

  // Reports
  reports: db.prepare('SELECT * FROM daily_reports ORDER BY report_date DESC LIMIT ?'),
  reportsByProject: db.prepare('SELECT * FROM daily_reports WHERE project = ? ORDER BY report_date DESC LIMIT ?'),
  reportByDate: db.prepare('SELECT * FROM daily_reports WHERE report_date = ? AND project = ?'),

  // Mark read
  markReadByIds: (ids) => db.prepare(`UPDATE mentions SET is_read = 1 WHERE id IN (${ids.map(() => '?').join(',')})`),

  // Poll log
  pollLog: db.prepare('SELECT * FROM poll_log ORDER BY id DESC LIMIT ?'),
};

// --- In-memory cache ---
const cache = { data: {}, ttl: {} };
const CACHE_TTL = 60000; // 60s default
function cached(key, ttlMs, fn) {
  const now = Date.now();
  if (cache.data[key] && cache.ttl[key] > now) return cache.data[key];
  const result = fn();
  cache.data[key] = result;
  cache.ttl[key] = now + ttlMs;
  return result;
}
function invalidateAll() {
  for (const key of Object.keys(cache.data)) { delete cache.data[key]; delete cache.ttl[key]; }
}
function invalidateCache(prefix) {
  for (const key of Object.keys(cache.data)) {
    if (key.startsWith(prefix)) { delete cache.data[key]; delete cache.ttl[key]; }
  }
}

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
  try { jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'unauthorized' }); }
}

app.post('/api/login', (req, res) => {
  const cfg = loadConfig();
  if (req.body.password !== (cfg.webPassword || 'admin')) return res.status(401).json({ error: 'wrong password' });
  const token = jwt.sign({ ts: Date.now() }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 86400000, sameSite: 'lax' });
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });
app.get('/api/me', auth, (req, res) => res.json({ ok: true }));

// --- Cache refresh ---
app.post('/api/refresh', auth, (req, res) => {
  invalidateAll();
  res.json({ ok: true, cleared: Date.now() });
});

// --- Config ---
app.get('/api/config', auth, (req, res) => res.json(getConfigForUI()));
app.put('/api/config', auth, (req, res) => {
  try { saveConfig(req.body); res.json({ ok: true, config: getConfigForUI() }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// --- AI Test ---
app.get('/api/ai-test', auth, async (req, res) => {
  const cfg = loadConfig();
  if (!cfg.ai?.apiKey || !cfg.ai?.endpoint) {
    return res.json({ ok: false, error: 'AI not configured (missing endpoint or apiKey)' });
  }
  try {
    const { analyzeBatch } = await import('./analyzer.js');
    const testItem = [{ id: 'test', project: 'test', type: 'comment', title: 'Test', body: 'This is a test comment for connection check.', author: 'test', subreddit: 'test' }];
    const results = await analyzeBatch(cfg.ai, testItem);
    if (results.length > 0) {
      res.json({ ok: true, model: cfg.ai.model || 'default' });
    } else {
      res.json({ ok: false, error: 'No analysis result returned' });
    }
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// --- Combined Stats (one request instead of two) ---
app.get('/api/stats', auth, (req, res) => {
  const { project, platform } = req.query;
  const cacheKey = `stats:${project || 'all'}:${platform || 'all'}`;

  const result = cached(cacheKey, 30000, () => { try {
    const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
    const w = []; const p = [];
    if (project) { w.push('m.project = ?'); p.push(project); }
    if (platform) { w.push('m.platform = ?'); p.push(platform); }
    const where = w.length ? 'WHERE ' + w.join(' AND ') : '';
    const whereAnd = w.length ? 'WHERE ' + w.join(' AND ') + ' AND' : 'WHERE';

    const total = db.prepare(`SELECT COUNT(*) as c FROM mentions m ${where}`).get(...p).c;
    const unread = db.prepare(`SELECT COUNT(*) as c FROM mentions m ${whereAnd} m.is_read = 0`).get(...p).c;
    const byCategory = db.prepare(`SELECT category, COUNT(*) as count FROM mentions m ${where} GROUP BY category`).all(...p);
    const topSubs = db.prepare(`SELECT subreddit, COUNT(*) as count FROM mentions m ${where} GROUP BY subreddit ORDER BY count DESC LIMIT 10`).all(...p);
    const recentPolls = SQL.recentPolls.all();
    const byDay = db.prepare(`SELECT date(discovered_at) as day, COUNT(*) as count FROM mentions m ${whereAnd} m.discovered_at >= ? GROUP BY day ORDER BY day`).all(...p, since30d);

    const byDayDetail = db.prepare(`
      SELECT date(m.discovered_at) as day,
        SUM(CASE WHEN m.type='post' THEN 1 ELSE 0 END) as posts,
        SUM(CASE WHEN m.type='comment' THEN 1 ELSE 0 END) as comments,
        SUM(CASE WHEN a.sentiment='positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN a.sentiment='negative' THEN 1 ELSE 0 END) as negative,
        SUM(CASE WHEN a.sentiment='neutral' THEN 1 ELSE 0 END) as neutral,
        SUM(CASE WHEN m.type='post' AND m.score >= 10 THEN 1 ELSE 0 END) as hot_posts
      FROM mentions m
      LEFT JOIN analysis a ON m.id = a.mention_id AND m.project = a.project
      ${whereAnd} m.discovered_at >= ?
      GROUP BY day ORDER BY day
    `).all(...p, since30d);

    // Analysis stats (join mentions for platform filter)
    const aw2 = []; const ap2 = [];
    if (project) { aw2.push('m.project = ?'); ap2.push(project); }
    if (platform) { aw2.push('m.platform = ?'); ap2.push(platform); }
    const awhere2 = aw2.length ? 'WHERE ' + aw2.join(' AND ') : '';
    const awhere2And = aw2.length ? 'WHERE ' + aw2.join(' AND ') + ' AND' : 'WHERE';
    const aJoin = 'FROM analysis a JOIN mentions m ON a.mention_id = m.id AND a.project = m.project';

    const sentiments = db.prepare(`SELECT a.sentiment, COUNT(*) as count ${aJoin} ${awhere2} GROUP BY a.sentiment`).all(...ap2);
    const analyzed = db.prepare(`SELECT COUNT(*) as c ${aJoin} ${awhere2}`).get(...ap2).c;
    const actionable = db.prepare(`SELECT COUNT(*) as c ${aJoin} ${awhere2And} a.actionable = 1`).get(...ap2).c;

    return { total, unread, byCategory, topSubs, byDay, byDayDetail, recentPolls, sentiments, analyzed, actionable };
  } catch(e) { console.error('[stats]', e.message); return { total:0, unread:0, byCategory:[], topSubs:[], byDay:[], byDayDetail:[], recentPolls:[], sentiments:[], analyzed:0, actionable:0 }; } });

  res.json(result);
});

// --- Mentions with analysis (optimized + cached) ---
app.get('/api/mentions-analyzed', auth, (req, res) => {
  const { project, type, search, timeRange, sentiment, platform, page = 1, limit = 50 } = req.query;
  const cacheKey = `mentions:${project||''}:${type||''}:${search||''}:${timeRange||''}:${sentiment||''}:${platform||''}:${page}:${limit}`;

  const result = cached(cacheKey, CACHE_TTL, () => {
    const lim = Math.min(+limit || 50, 100);
    const offset = (Math.max(1, +page) - 1) * lim;
    const wheres = [];
    const params = [];
    let needJoinForWhere = false;

    if (project) { wheres.push('m.project = ?'); params.push(project); }
    if (type) { wheres.push('m.type = ?'); params.push(type); }
    if (sentiment) { wheres.push('a.sentiment = ?'); params.push(sentiment); needJoinForWhere = true; }
    if (platform) { wheres.push('m.platform = ?'); params.push(platform); }
    if (search) { wheres.push("(m.title LIKE ? OR m.body LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
    if (timeRange) {
      const hours = { '24h': 24, '7d': 168, '30d': 720 }[timeRange];
      if (hours) {
        const sinceUtc = Math.floor((Date.now() - hours * 3600000) / 1000);
        wheres.push('m.created_utc >= ?');
        params.push(sinceUtc);
      }
    }

    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
    const joinForCount = needJoinForWhere ? 'LEFT JOIN analysis a ON m.id = a.mention_id AND m.project = a.project' : '';
    const total = db.prepare(`SELECT COUNT(*) as c FROM mentions m ${joinForCount} ${where}`).get(...params).c;

    const rows = db.prepare(`
      SELECT m.id, m.project, m.type, m.title, m.body, m.author, m.subreddit, m.permalink, m.score, m.num_comments, m.created_utc,
             a.sentiment, a.summary as ai_summary,
             u.total_karma, u.comment_karma, u.link_karma
      FROM mentions m
      LEFT JOIN analysis a ON m.id = a.mention_id AND m.project = a.project
      LEFT JOIN users u ON m.author = u.username
      ${where}
      ORDER BY m.created_utc DESC LIMIT ? OFFSET ?
    `).all(...params, lim, offset);

    return { rows, total, page: +page, pages: Math.ceil(total / lim) };
  });
  res.json(result);
});

// --- Mark read ---
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
    SQL.markReadByIds(ids).run(...ids);
  }
  invalidateCache('stats');
  res.json({ ok: true });
});

// --- Export ---
app.get('/api/mentions/export', auth, (req, res) => {
  const { project, category, search, timeRange, format = 'csv' } = req.query;
  const wheres = [];
  const params = [];

  if (project) { wheres.push('m.project = ?'); params.push(project); }
  if (category) { wheres.push('m.category = ?'); params.push(category); }
  if (search) { wheres.push("(m.title LIKE ? OR m.body LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  if (timeRange) {
    const hours = { '24h': 24, '7d': 168, '30d': 720 }[timeRange];
    if (hours) {
      const sinceUtc = Math.floor((Date.now() - hours * 3600000) / 1000);
      wheres.push('m.created_utc >= ?');
      params.push(sinceUtc);
    }
  }

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
  const rows = db.prepare(`
    SELECT m.*, a.sentiment, a.relevance, a.pros as ai_pros, a.cons as ai_cons, a.actionable, a.summary as ai_summary
    FROM mentions m
    LEFT JOIN analysis a ON m.id = a.mention_id AND m.project = a.project
    ${where}
    ORDER BY m.created_utc DESC LIMIT 10000
  `).all(...params);
  const date = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=mentions-${date}.json`);
    return res.send(JSON.stringify(rows, null, 2));
  }

  const cols = ['id', 'project', 'type', 'title', 'body', 'author', 'subreddit', 'permalink', 'score', 'num_comments', 'created_utc', 'discovered_at', 'source', 'category', 'sentiment', 'relevance', 'ai_pros', 'ai_cons', 'actionable', 'ai_summary'];
  const escape = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  let csv = cols.join(',') + '\n';
  for (const r of rows) csv += cols.map(c => escape(r[c])).join(',') + '\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=mentions-${date}.csv`);
  res.send('\uFEFF' + csv);
});

// --- Reports ---
app.get('/api/reports', auth, (req, res) => {
  const { project, limit = 30 } = req.query;
  const cacheKey = `reports:${project||''}:${limit}`;
  const result = cached(cacheKey, CACHE_TTL * 5, () => {
    return project ? SQL.reportsByProject.all(project, +limit) : SQL.reports.all(+limit);
  });
  res.json(result);
});

app.get('/api/reports/:date', auth, (req, res) => {
  const { project } = req.query;
  let row;
  if (project) {
    row = SQL.reportByDate.get(req.params.date, project);
  } else {
    row = db.prepare('SELECT * FROM daily_reports WHERE report_date = ? LIMIT 1').get(req.params.date);
  }
  if (!row) return res.status(404).json({ error: 'not found' });

  // Attach negative items with links for this report's project
  const negatives = db.prepare(`
    SELECT a.summary, a.sentiment, m.permalink, m.author, m.type
    FROM analysis a JOIN mentions m ON a.mention_id = m.id AND a.project = m.project
    WHERE a.project = ? AND a.sentiment = 'negative' AND m.permalink IS NOT NULL
    ORDER BY a.analyzed_at DESC LIMIT 30
  `).all(row.project);
  row.negativeItems = negatives;

  res.json(row);
});

// --- Regenerate Report ---
app.post('/api/reports/regenerate', auth, async (req, res) => {
  const { date, project } = req.body;
  if (!date || !project) return res.status(400).json({ error: 'date and project required' });

  try {
    const cfg = loadConfig();
    if (!cfg.ai?.apiKey) return res.status(400).json({ error: 'AI not configured' });

    const proj = cfg.projects.find(p => p.id === project);
    if (!proj) return res.status(404).json({ error: 'project not found' });

    const isSummary = date.startsWith('summary');

    const { getProductsForPrompt } = await import('./db.js');
    const productInfo = getProductsForPrompt(project);

    let stats, report;
    if (isSummary) {
      const { getAllAnalysisStats } = await import('./db.js');
      const { generateSummaryReport } = await import('./analyzer.js');
      stats = getAllAnalysisStats(project);
      if (stats.total === 0) return res.status(400).json({ error: 'no data' });
      report = await generateSummaryReport(cfg.ai, proj, stats, productInfo);
    } else {
      const { getDailyAnalysisStats } = await import('./db.js');
      const { generateDailyReport } = await import('./analyzer.js');
      stats = getDailyAnalysisStats(project, date);
      if (stats.total === 0) return res.status(400).json({ error: 'no data for this date' });
      report = await generateDailyReport(cfg.ai, proj, stats, productInfo);
    }

    if (!report) return res.status(500).json({ error: '报告生成失败，可能是 AI 模型无法处理当前数据量。建议：1) 在设置中更换更大的模型 2) 检查 AI API 连接' });

    const { saveDailyReport } = await import('./db.js');
    db.prepare('DELETE FROM daily_reports WHERE report_date = ? AND project = ?').run(date, project);
    saveDailyReport({
      project, report_date: date,
      positive_count: stats.positive, negative_count: stats.negative,
      neutral_count: stats.neutral, total_count: stats.total,
      actionable_count: stats.actionable,
      top_pros: JSON.stringify(stats.topPros), top_cons: JSON.stringify(stats.topCons),
      full_report: report, created_at: new Date().toISOString(),
    });
    invalidateAll();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Products ---
app.get('/api/products', auth, (req, res) => {
  const { project } = req.query;
  res.json(getProducts(project));
});

app.post('/api/products', auth, (req, res) => {
  const { project, name, specs } = req.body;
  if (!project || !name) return res.status(400).json({ error: 'project and name required' });
  addProduct({ project, name, specs: JSON.stringify(specs || {}), created_at: new Date().toISOString() });
  invalidateAll();
  res.json({ ok: true });
});

app.put('/api/products/:id', auth, (req, res) => {
  const { name, specs } = req.body;
  updateProduct(+req.params.id, { name, specs: JSON.stringify(specs || {}) });
  invalidateAll();
  res.json({ ok: true });
});

app.delete('/api/products/:id', auth, (req, res) => {
  deleteProduct(+req.params.id);
  invalidateAll();
  res.json({ ok: true });
});

app.post('/api/products/upload', auth, async (req, res) => {
  try {
    const { default: XLSX } = await import('xlsx');
    const { addProduct } = await import('./db.js');
    const { project, data } = req.body; // data is base64 encoded xlsx
    if (!project || !data) return res.status(400).json({ error: 'project and data required' });

    const buf = Buffer.from(data, 'base64');
    const wb = XLSX.read(buf);
    // Try Specifications sheet first, fallback to first sheet
    const sheetName = wb.SheetNames.includes('Specifications') ? 'Specifications' : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Find product names row (row with most non-null values starting from col 1)
    let productRow = 1;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      if (rows[i] && rows[i].filter((v, j) => j > 0 && v).length > 3) { productRow = i; break; }
    }

    if (!rows[productRow]) return res.status(400).json({ error: 'cannot find product row in file' });
    const productNames = rows[productRow].slice(1).map(n => String(n || '').trim()).filter(Boolean);
    if (!productNames.length) return res.status(400).json({ error: 'no products found in file' });

    // Parse specs: each row after productRow where col 0 has a spec name
    let added = 0;
    const productsSpecs = {};
    productNames.forEach(n => { productsSpecs[n] = {}; });

    for (let i = productRow + 1; i < rows.length; i++) {
      const row = rows[i];
      const specName = String(row?.[0] || '').trim();
      if (!specName || specName === 'Basic Information' || specName === 'Display' || specName === 'Camera' || specName === 'Connectivity' || specName === 'Sensors' || specName === 'Others' || specName === 'Accessories') continue;

      for (let j = 0; j < productNames.length; j++) {
        const val = row?.[j + 1];
        if (val !== undefined && val !== null && String(val).trim()) {
          productsSpecs[productNames[j]][specName] = String(val).trim();
        }
      }
    }

    // Check existing products for dedup
    const existing = getProducts(project);
    const existingNames = new Set(existing.map(p => p.name));
    let updated = 0, skipped = 0;

    for (const [name, specs] of Object.entries(productsSpecs)) {
      if (Object.keys(specs).length === 0) continue;
      if (existingNames.has(name)) {
        // Update existing
        const old = existing.find(p => p.name === name);
        if (old) { updateProduct(old.id, { name, specs: JSON.stringify(specs) }); updated++; }
      } else {
        addProduct({ project, name, specs: JSON.stringify(specs), created_at: new Date().toISOString() });
        added++;
      }
    }

    invalidateAll();
    res.json({ ok: true, added, updated, total: added + updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Facebook ---
app.get('/api/facebook/status', auth, async (req, res) => {
  try {
    const cfg = loadConfig();
    if (!cfg.facebook?.accessToken) return res.json({ configured: false });
    const { createFacebookFetcher } = await import('./facebook-fetcher.js');
    const fb = createFacebookFetcher(cfg.facebook);
    const status = await fb.verifyToken();
    res.json({ configured: true, ...status });
  } catch (e) { res.json({ configured: false, error: e.message }); }
});

app.post('/api/facebook/exchange-token', auth, async (req, res) => {
  try {
    const cfg = loadConfig();
    if (!cfg.facebook?.accessToken || !cfg.facebook?.appId || !cfg.facebook?.appSecret) {
      return res.status(400).json({ error: 'Need accessToken, appId, and appSecret' });
    }
    const { createFacebookFetcher } = await import('./facebook-fetcher.js');
    const fb = createFacebookFetcher(cfg.facebook);
    const result = await fb.exchangeToken(cfg.facebook.appId, cfg.facebook.appSecret);
    if (result.token) {
      // Save new long-lived token
      saveConfig({ facebook: { ...cfg.facebook, accessToken: result.token } });
      res.json({ ok: true, expiresIn: result.expiresIn });
    } else {
      res.json({ ok: false, error: result.error });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Re-analyze all (clear old analysis, redo with current prompts) ---
app.post('/api/reanalyze', auth, async (req, res) => {
  const { project } = req.body;
  if (!project) return res.status(400).json({ error: 'project required' });
  try {
    db.prepare('DELETE FROM analysis WHERE project = ?').run(project);
    invalidateAll();
    res.json({ ok: true, message: 'Analysis cleared. Will re-analyze on next poll cycle.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Summary Report ---
app.post('/api/reports/summary', auth, async (req, res) => {
  const { project } = req.body;
  if (!project) return res.status(400).json({ error: 'project required' });

  try {
    const cfg = loadConfig();
    if (!cfg.ai?.apiKey) return res.status(400).json({ error: 'AI not configured' });

    const proj = cfg.projects.find(p => p.id === project);
    if (!proj) return res.status(404).json({ error: 'project not found' });

    const { getAllAnalysisStats, saveDailyReport, getProductsForPrompt } = await import('./db.js');
    const { generateSummaryReport } = await import('./analyzer.js');

    const stats = getAllAnalysisStats(project);
    if (stats.total === 0) return res.status(400).json({ error: 'no data' });

    const productInfo = getProductsForPrompt(project);
    const report = await generateSummaryReport(cfg.ai, proj, stats, productInfo);
    if (!report) return res.status(500).json({ error: '报告生成失败，可能是 AI 模型无法处理当前数据量。建议：1) 在设置中更换更大的模型 2) 检查 AI API 连接' });

    const today = new Date().toISOString().slice(0, 10);
    const reportDate = `summary-${today}`;
    db.prepare('DELETE FROM daily_reports WHERE report_date = ? AND project = ?').run(reportDate, project);
    saveDailyReport({
      project, report_date: reportDate,
      positive_count: stats.positive, negative_count: stats.negative,
      neutral_count: stats.neutral, total_count: stats.total,
      actionable_count: stats.actionable,
      top_pros: JSON.stringify(stats.topPros), top_cons: JSON.stringify(stats.topCons),
      full_report: report, created_at: new Date().toISOString(),
    });
    invalidateAll();
    res.json({ ok: true, reportDate });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Poll Log ---
app.get('/api/poll-log', auth, (req, res) => {
  const limit = Math.min(+(req.query.limit || 20), 100);
  res.json(SQL.pollLog.all(limit));
});

// --- User Rankings ---
app.get('/api/users', auth, (req, res) => {
  const { project, platform, sort = 'karma', page = 1, limit = 50 } = req.query;
  const cacheKey = `users:${project||''}:${platform||''}:${sort}:${page}:${limit}`;

  const result = cached(cacheKey, CACHE_TTL * 2, () => {
  const lim = Math.min(+limit || 50, 100);
  const offset = (Math.max(1, +page) - 1) * lim;

  const w = []; const pp = [];
  if (project) { w.push('m.project = ?'); pp.push(project); }
  if (platform) { w.push('m.platform = ?'); pp.push(platform); }
  const pw = w.length ? 'WHERE ' + w.join(' AND ') : '';

  const orderMap = {
    karma: 'u.total_karma DESC',
    posts: 'post_count DESC',
    comments: 'comment_count DESC',
    activity: 'total_count DESC',
    recent: 'last_seen DESC',
  };
  const order = orderMap[sort] || orderMap.karma;

  const total = db.prepare(`
    SELECT COUNT(DISTINCT m.author) as c FROM mentions m ${pw}
  `).get(...pp).c;

  const rows = db.prepare(`
    SELECT
      m.author,
      u.total_karma, u.link_karma, u.comment_karma, u.account_created_utc,
      COUNT(*) as total_count,
      SUM(CASE WHEN m.type='post' THEN 1 ELSE 0 END) as post_count,
      SUM(CASE WHEN m.type='comment' THEN 1 ELSE 0 END) as comment_count,
      MAX(m.created_utc) as last_seen,
      MIN(m.created_utc) as first_seen,
      ROUND(AVG(m.score), 1) as avg_score,
      SUM(CASE WHEN a.sentiment='positive' THEN 1 ELSE 0 END) as positive_count,
      SUM(CASE WHEN a.sentiment='negative' THEN 1 ELSE 0 END) as negative_count
    FROM mentions m
    LEFT JOIN users u ON m.author = u.username
    LEFT JOIN analysis a ON m.id = a.mention_id AND m.project = a.project
    ${pw}
    GROUP BY m.author
    HAVING m.author IS NOT NULL AND m.author != '[deleted]'
    ORDER BY ${order}
    LIMIT ? OFFSET ?
  `).all(...pp, lim, offset);

  return { rows, total, page: +page, pages: Math.ceil(total / lim) };
  });
  res.json(result);
});

// --- Facebook Browser Automation ---
app.get('/api/fb-browser/status', auth, (req, res) => {
  res.json({ ...fbBrowser.getBrowserStatus(), cookies: fbBrowser.getCookieStatus() });
});

app.post('/api/fb-browser/start', auth, async (req, res) => {
  try {
    const result = await fbBrowser.startBrowser();
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/fb-browser/stop', auth, async (req, res) => {
  try {
    const result = await fbBrowser.stopBrowser();
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/fb-browser/login', auth, async (req, res) => {
  try {
    const result = await fbBrowser.navigateToLogin();
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/fb-browser/navigate', auth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const result = await fbBrowser.navigateTo(url);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/fb-browser/save-cookies', auth, async (req, res) => {
  try {
    const result = await fbBrowser.saveCurrentCookies();
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fb-browser/screenshot', auth, (req, res) => {
  const shot = fbBrowser.getLastScreenshot();
  if (!shot) return res.status(404).end();
  const buf = Buffer.from(shot, 'base64');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.end(buf);
});

app.post('/api/fb-browser/action', auth, async (req, res) => {
  const pg = fbBrowser.getPage();
  if (!pg) return res.status(400).json({ error: 'browser not running' });
  const { action, x, y, text, key, deltaY } = req.body;
  try {
    if (action === 'click') await pg.mouse.click(x, y);
    else if (action === 'dblclick') await pg.mouse.dblclick(x, y);
    else if (action === 'type') await pg.keyboard.type(text, { delay: 80 + Math.random() * 80 });
    else if (action === 'press') await pg.keyboard.press(key);
    else if (action === 'scroll') await pg.mouse.wheel(0, deltaY || 300);
    else return res.status(400).json({ error: 'unknown action' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

let fbScrapeRunning = false;
let fbScrapeLog = [];

// Auto start browser if cookies exist, return true if ready
async function ensureBrowser() {
  if (fbBrowser.getBrowserStatus().running) return true;
  const cookies = fbBrowser.getCookieStatus();
  if (!cookies.loggedIn) return false;
  await fbBrowser.startBrowser();
  await new Promise(r => setTimeout(r, 2000));
  return true;
}

app.post('/api/fb-browser/scrape-group', auth, async (req, res) => {
  const { groupId, groupName, maxScrolls = 8 } = req.body;
  if (!groupId) return res.status(400).json({ error: 'groupId required' });
  if (fbScrapeRunning) return res.status(409).json({ error: 'scrape already running' });

  fbScrapeRunning = true;
  fbScrapeLog = [`[${new Date().toISOString()}] Starting scrape: ${groupName || groupId}`];
  res.json({ ok: true, message: 'scrape started' });

  let autoStarted = false;
  try {
    if (!fbBrowser.getBrowserStatus().running) {
      fbScrapeLog.push('Auto-starting browser...');
      autoStarted = true;
      if (!(await ensureBrowser())) { fbScrapeLog.push('Error: not logged in, please login first'); fbScrapeRunning = false; return; }
      fbScrapeLog.push('Browser ready');
    }
    const mentions = await fbBrowser.scrapeGroup(groupId, groupName || groupId, maxScrolls);
    fbScrapeLog.push(`Extracted ${mentions.length} mentions`);
    if (mentions.length) {
      const { saveMentions } = await import('./db.js');
      const cfg = loadConfig();
      const project = cfg.projects.find(p => p.enabled !== false)?.id || 'default';
      const withProject = mentions.map(m => ({ ...m, project }));
      const newCount = saveMentions(withProject);
      fbScrapeLog.push(`Saved: ${newCount} new / ${mentions.length} total`);
    }
  } catch (e) { fbScrapeLog.push(`Error: ${e.message}`); }
  if (autoStarted) { await fbBrowser.stopBrowser().catch(() => {}); fbScrapeLog.push('Browser auto-closed'); }
  fbScrapeRunning = false;
});

// Debug: inspect DOM structure
app.get('/api/fb-browser/debug-dom', auth, async (req, res) => {
  const pg = fbBrowser.getPage();
  if (!pg) return res.status(400).json({ error: 'no page' });
  try {
    const stats = await pg.evaluate(() => {
      // Dump first 3 feed items' full link hrefs and all text nodes
      const feedItems = document.querySelectorAll('div[role="feed"] > div');
      const results = [];
      for (let i = 0; i < Math.min(3, feedItems.length); i++) {
        const item = feedItems[i];
        const allLinks = [...item.querySelectorAll('a')].map(a => ({
          href: (a.getAttribute('href') || '').slice(0, 150),
          text: a.innerText.trim().slice(0, 60),
          hasStrong: !!a.querySelector('strong'),
        })).filter(l => l.href && l.href !== '#');
        const allStrongs = [...item.querySelectorAll('strong')].map(s => s.innerText.trim()).filter(Boolean);
        const allDirAuto = [...item.querySelectorAll('div[dir="auto"]')].map(d => d.innerText.trim().slice(0, 100)).filter(t => t.length > 5);
        const allSpans = [...item.querySelectorAll('span')].map(s => s.innerText.trim()).filter(t => /^\d+[hmdw]?$/.test(t) || /ago|hr|min|just now/i.test(t)).slice(0, 3);
        results.push({ links: allLinks.slice(0, 10), strongs: allStrongs, dirAuto: allDirAuto.slice(0, 3), timeSpans: allSpans });
      }
      return { feedItems: feedItems.length, items: results };
    });
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fb-browser/scrape-status', auth, (req, res) => {
  res.json({ running: fbScrapeRunning, log: fbScrapeLog });
});

app.post('/api/fb-browser/scrape-all', auth, async (req, res) => {
  if (fbScrapeRunning) return res.status(409).json({ error: 'scrape already running' });

  const cfg = loadConfig();
  const groups = [];
  for (const project of cfg.projects) {
    for (const g of project.facebookGroups || []) {
      const gid = g.groupId || g;
      const gname = g.name || gid;
      groups.push({ groupId: gid, groupName: gname, project: project.id });
    }
  }
  if (!groups.length) return res.status(400).json({ error: 'no Facebook groups configured' });

  fbScrapeRunning = true;
  fbScrapeLog = [`[${new Date().toISOString()}] Batch scrape: ${groups.length} groups`];
  res.json({ ok: true, message: `scraping ${groups.length} groups` });

  let autoStarted = false;
  try {
    if (!fbBrowser.getBrowserStatus().running) {
      fbScrapeLog.push('Auto-starting browser...');
      autoStarted = true;
      if (!(await ensureBrowser())) { fbScrapeLog.push('Error: not logged in, please login first'); fbScrapeRunning = false; return; }
      fbScrapeLog.push('Browser ready');
    }

    for (const g of groups) {
      try {
        fbScrapeLog.push(`Scraping: ${g.groupName}...`);
        const mentions = await fbBrowser.scrapeGroup(g.groupId, g.groupName, 8);
        fbScrapeLog.push(`  ${mentions.length} mentions from ${g.groupName}`);
        if (mentions.length) {
          const { saveMentions } = await import('./db.js');
          const withProject = mentions.map(m => ({ ...m, project: g.project }));
          const newCount = saveMentions(withProject);
          fbScrapeLog.push(`  Saved: ${newCount} new`);
        }
        if (groups.indexOf(g) < groups.length - 1) {
          const wait = 30000 + Math.random() * 30000;
          fbScrapeLog.push(`  Waiting ${Math.round(wait / 1000)}s before next group...`);
          await new Promise(r => setTimeout(r, wait));
        }
      } catch (e) { fbScrapeLog.push(`  Error on ${g.groupName}: ${e.message}`); }
    }
  } catch (e) { fbScrapeLog.push(`Error: ${e.message}`); }

  if (autoStarted) { await fbBrowser.stopBrowser().catch(() => {}); fbScrapeLog.push('Browser auto-closed'); }
  fbScrapeLog.push(`[${new Date().toISOString()}] Batch scrape complete`);
  fbScrapeRunning = false;
});

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

export default app;
