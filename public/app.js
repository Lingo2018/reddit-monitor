const $ = s => document.querySelector(s);
const app = $('#app');
const navbar = $('#navbar');

// --- i18n ---
const i18n = {
  zh: {
    title: 'Reddit 监控',
    stats: '概览', data: '数据', reports: '报告', config: '配置', logout: '退出',
    password: '请输入密码', login: '登录', wrongPwd: '密码错误',
    loading: '加载中...',
    totalMentions: '总提及', unread: '未读', brand: '品牌', industry: '行业',
    competitor: '竞对', subreddit: 'Subreddit',
    analyzed: '已分析', actionable: '可执行',
    positive: '正面', negative: '负面', neutral: '中性',
    hotPosts: '爆款帖',
    last30d: '近30天提及趋势', topSubs: '热门 Subreddit', recentPolls: '轮询日志',
    sentimentDist: '情感分布',
    time: '时间', type: '类型', newItems: '新增', duration: '耗时', errors: '错误',
    mentions: '提及',
    last24h: '近24小时', last7d: '近7天', last30dOpt: '近30天',
    allTime: '全部时间', all: '全部',
    allProjects: '全部项目',
    allSentiment: '全部情感', refresh: '刷新',
    search: '搜索...', filter: '筛选', markAllRead: '全部已读',
    totalResults: '共 {n} 条结果',
    title_col: '标题', author: '作者', score: '评分', sentiment: '情感',
    aiSummary: 'AI 摘要', markRead: '已读',
    prevPage: '上一页', nextPage: '下一页', page: '第 {p} / {t} 页',
    localProxySetting: '本地代理（Clash/V2Ray）',
    proxySetting: '住宅代理', enabled: '启用', host: '主机', port: '端口',
    username: '用户名', passwordField: '密码', protocol: '协议',
    unchangedHint: '(留空不修改)',
    pollSetting: '轮询设置', interval: '间隔（分钟）', webPwd: '登录密码',
    aiSetting: 'AI 分析设置', aiEndpoint: 'API 地址', aiKey: 'API Key', aiModel: '模型',
    projects: '监控项目', addProject: '+ 添加项目', deleteProject: '删除',
    projectId: '项目ID', projectName: '项目名称',
    brandKw: '品牌关键词（每行一个）', industryKw: '行业关键词（每行一个）',
    competitorKw: '竞对关键词（每行一个）', subreddits: '监控 Subreddit（每行一个）',
    saveConfig: '保存配置', configSaved: '配置已保存，下轮轮询生效',
    saveFailed: '保存失败：',
    allMarkedRead: '已全部标为已读',
    post: '帖子', comment: '评论',
    testAi: '测试连接', testAiOk: '连接成功', testAiFail: '连接失败：', testAiTesting: '测试中...',
    comingSoon: '暂不可用',
    noReports: '暂无报告，数据累积后将自动生成每日舆情报告',
    reportDate: '日期', reportTotal: '总数', reportSentiment: '情感分布',
    viewReport: '查看',
    langSwitch: 'EN',
  },
  en: {
    title: 'Reddit Monitor',
    stats: 'Stats', data: 'Data', reports: 'Reports', config: 'Config', logout: 'Logout',
    password: 'Password', login: 'Login', wrongPwd: 'Wrong password',
    loading: 'Loading...',
    totalMentions: 'Total Mentions', unread: 'Unread', brand: 'Brand', industry: 'Industry',
    competitor: 'Competitor', subreddit: 'Subreddit',
    analyzed: 'Analyzed', actionable: 'Actionable',
    positive: 'Positive', negative: 'Negative', neutral: 'Neutral',
    hotPosts: 'Hot Posts',
    last30d: 'Mentions (Last 30 Days)', topSubs: 'Top Subreddits', recentPolls: 'Recent Polls',
    sentimentDist: 'Sentiment Distribution',
    time: 'Time', type: 'Type', newItems: 'New', duration: 'Duration', errors: 'Errors',
    mentions: 'Mentions',
    last24h: 'Last 24h', last7d: 'Last 7d', last30dOpt: 'Last 30d',
    allTime: 'All Time', all: 'All',
    allProjects: 'All Projects',
    allSentiment: 'All Sentiment', refresh: 'Refresh',
    search: 'Search...', filter: 'Filter', markAllRead: 'Mark All Read',
    totalResults: 'Total: {n} results',
    title_col: 'Title', author: 'Author', score: 'Score', sentiment: 'Sentiment',
    aiSummary: 'AI Summary', markRead: 'Read',
    prevPage: 'Prev', nextPage: 'Next', page: 'Page {p} / {t}',
    localProxySetting: 'Local Proxy (Clash/V2Ray)',
    proxySetting: 'Residential Proxy', enabled: 'Enabled', host: 'Host', port: 'Port',
    username: 'Username', passwordField: 'Password', protocol: 'Protocol',
    unchangedHint: '(unchanged if empty)',
    pollSetting: 'Poll Settings', interval: 'Interval (minutes)', webPwd: 'Web Password',
    aiSetting: 'AI Analysis Settings', aiEndpoint: 'API Endpoint', aiKey: 'API Key', aiModel: 'Model',
    projects: 'Projects', addProject: '+ Add Project', deleteProject: 'Delete',
    projectId: 'ID', projectName: 'Name',
    brandKw: 'Brand Keywords (one per line)', industryKw: 'Industry Keywords (one per line)',
    competitorKw: 'Competitor Keywords (one per line)', subreddits: 'Subreddits (one per line)',
    saveConfig: 'Save Config', configSaved: 'Config saved! Changes apply on next poll cycle.',
    saveFailed: 'Save failed: ',
    allMarkedRead: 'All marked as read',
    post: 'post', comment: 'comment',
    testAi: 'Test Connection', testAiOk: 'Connected!', testAiFail: 'Failed: ', testAiTesting: 'Testing...',
    comingSoon: 'Coming soon',
    noReports: 'No reports yet. Daily reports will be auto-generated once data accumulates.',
    reportDate: 'Date', reportTotal: 'Total', reportSentiment: 'Sentiment',
    viewReport: 'View',
    langSwitch: '中文',
  }
};

let lang = localStorage.getItem('rm-lang') || 'zh';
let currentProject = localStorage.getItem('rm-project') || '';
let projectList = [];
function t(key) { return i18n[lang]?.[key] || i18n.en[key] || key; }

function updateNav() {
  $('#nav-stats').textContent = t('stats');
  $('#nav-data').textContent = t('data');
  $('#nav-reports').textContent = t('reports');
  $('#nav-config').textContent = t('config');
  $('#nav-logout').textContent = t('logout');
  $('#lang-btn').textContent = t('langSwitch');
  $('.nav-brand').textContent = t('title');
  updateProjectSelector();
}

function updateProjectSelector() {
  const sel = $('#project-selector');
  if (!sel) return;
  sel.innerHTML = `<option value="">${t('allProjects')}</option>` +
    projectList.map(p => `<option value="${p.id}" ${currentProject === p.id ? 'selected' : ''}>${p.name || p.id}</option>`).join('');
}

async function loadProjects() {
  try {
    const res = await api('/config');
    const cfg = await res.json();
    projectList = cfg.projects || [];
    updateProjectSelector();
  } catch {}
}

// --- API helper ---
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) { showLogin(); throw new Error('unauthorized'); }
  return res;
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// --- Router ---
function route() {
  const hash = location.hash.slice(1) || 'stats';
  document.querySelectorAll('.nav-link[data-page]').forEach(a => {
    a.classList.toggle('active', a.dataset.page === hash);
  });
  if (hash === 'stats') renderStats();
  else if (hash === 'data') renderData();
  else if (hash === 'reports') renderReports();
  else if (hash === 'config') renderConfig();
  else if (hash.startsWith('report/')) renderReportDetail(hash.slice(7));
}

async function init() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      navbar.style.display = 'flex';
      await loadProjects();
      updateNav();
      // Project selector change
      $('#project-selector').onchange = (e) => {
        currentProject = e.target.value;
        localStorage.setItem('rm-project', currentProject);
        route();
      };
      route();
    }
    else showLogin();
  } catch { showLogin(); }
}

// --- Login ---
function showLogin() {
  navbar.style.display = 'none';
  app.innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <h2>${t('title')}</h2>
        <div class="login-error" id="login-err"></div>
        <input type="password" id="login-pwd" placeholder="${t('password')}" autocomplete="off" autofocus>
        <button id="login-btn">${t('login')}</button>
        <div style="margin-top:12px"><a href="#" id="login-lang" style="color:var(--text-muted);font-size:12px">${t('langSwitch')}</a></div>
      </div>
    </div>`;
  const submit = async () => {
    const pwd = $('#login-pwd').value;
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) });
    if (res.ok) { navbar.style.display = 'flex'; updateNav(); location.hash = '#stats'; route(); }
    else $('#login-err').textContent = t('wrongPwd');
  };
  $('#login-btn').onclick = submit;
  $('#login-pwd').onkeydown = e => { if (e.key === 'Enter') submit(); };
  $('#login-lang').onclick = (e) => { e.preventDefault(); toggleLang(); showLogin(); };
}

function toggleLang() {
  lang = lang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('rm-lang', lang);
  updateNav();
}

$('#nav-logout').onclick = async (e) => { e.preventDefault(); await fetch('/api/logout', { method: 'POST' }); showLogin(); };
$('#lang-btn').onclick = (e) => { e.preventDefault(); toggleLang(); route(); };

// --- Sentiment helpers ---
function sentimentBadge(s) {
  if (!s) return '<span class="badge" style="background:rgba(255,255,255,0.08);color:#555e73">-</span>';
  const colors = {
    positive: 'linear-gradient(135deg, #00e676, #00b85c)',
    negative: 'linear-gradient(135deg, #ff3d71, #cc2255)',
    neutral: 'linear-gradient(135deg, #ffaa00, #cc8800)',
  };
  const labels = { positive: t('positive'), negative: t('negative'), neutral: t('neutral') };
  return `<span class="badge" style="background:${colors[s] || 'rgba(255,255,255,0.08)'}">${labels[s] || s}</span>`;
}

// --- Stats ---
async function renderStats() {
  app.innerHTML = `<p>${t('loading')}</p>`;
  const pq = currentProject ? `?project=${currentProject}` : '';
  const res = await api('/stats' + pq);
  const d = await res.json();

  const catMap = {};
  d.byCategory.forEach(c => catMap[c.category] = c.count);
  const sMap = {};
  (d.sentiments || []).forEach(s => sMap[s.sentiment] = s.count);

  const maxDay = Math.max(...d.byDay.map(r => r.count), 1);

  app.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">${t('totalMentions')}</div><div class="value brand">${d.total}</div></div>
      <div class="stat-card"><div class="label">${t('analyzed')}</div><div class="value unread">${d.analyzed || 0}</div></div>
      <div class="stat-card"><div class="label">${t('positive')}</div><div class="value" style="color:var(--green);text-shadow:0 0 20px rgba(0,230,118,0.3)">${sMap.positive || 0}</div></div>
      <div class="stat-card"><div class="label">${t('negative')}</div><div class="value" style="color:var(--red);text-shadow:0 0 20px rgba(255,61,113,0.3)">${sMap.negative || 0}</div></div>
    </div>

    <div class="section">
      <h3>${t('last30d')}</h3>
      <div class="bar-chart" id="chart"></div>
      ${(d.byDayDetail || []).length ? `
      <table style="margin-top:16px;font-size:12px">
        <thead><tr><th>${t('reportDate')}</th><th>${t('post')}</th><th>${t('comment')}</th><th>${t('positive')}</th><th>${t('negative')}</th><th>${t('neutral')}</th><th>${t('hotPosts')}</th></tr></thead>
        <tbody>${(d.byDayDetail || []).slice(-14).reverse().map(r => `<tr>
          <td>${r.day}</td>
          <td>${r.posts}</td>
          <td>${r.comments}</td>
          <td style="color:var(--green)">${r.positive}</td>
          <td style="color:var(--red)">${r.negative}</td>
          <td style="color:var(--orange)">${r.neutral}</td>
          <td style="color:var(--primary)">${r.hot_posts}</td>
        </tr>`).join('')}</tbody>
      </table>` : ''}
    </div>

    <div class="section">
      <h3>${t('topSubs')}</h3>
      <table>
        <thead><tr><th>Subreddit</th><th>${t('mentions')}</th></tr></thead>
        <tbody>${d.topSubs.map(s => `<tr><td>r/${s.subreddit}</td><td>${s.count}</td></tr>`).join('')}</tbody>
      </table>
    </div>

    <div class="section">
      <h3>${t('recentPolls')}</h3>
      <table>
        <thead><tr><th>${t('time')}</th><th>${t('type')}</th><th>${t('newItems')}</th><th>${t('duration')}</th><th>${t('errors')}</th></tr></thead>
        <tbody>${d.recentPolls.map(p => `<tr>
          <td>${fmtTime(p.poll_time)}</td>
          <td>${p.round_type}</td>
          <td>${p.new_items}</td>
          <td>${p.duration_ms ? (p.duration_ms / 1000).toFixed(1) + 's' : '-'}</td>
          <td class="truncate">${p.errors || '-'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;

  const chart = $('#chart');
  d.byDay.forEach(r => {
    const pct = (r.count / maxDay * 100).toFixed(1);
    chart.innerHTML += `<div class="bar" style="height:${pct}%"><span class="bar-tip">${r.count}</span><span class="bar-label">${r.day.slice(5)}</span></div>`;
  });
}

// --- Data ---
let dataState = { page: 1, type: '', timeRange: '7d', search: '', sentiment: '' };

async function renderData() {
  app.innerHTML = `<p>${t('loading')}</p>`;
  const qObj = { ...dataState, limit: 50 };
  if (currentProject) qObj.project = currentProject;
  const q = new URLSearchParams(qObj).toString();
  const res = await api('/mentions-analyzed?' + q);
  const d = await res.json();

  app.innerHTML = `
    <div class="section">
      <div class="filters">
        <select id="f-type">
          <option value="" ${dataState.type === '' ? 'selected' : ''}>${t('all')}</option>
          <option value="post" ${dataState.type === 'post' ? 'selected' : ''}>${t('post')}</option>
          <option value="comment" ${dataState.type === 'comment' ? 'selected' : ''}>${t('comment')}</option>
        </select>
        <select id="f-sentiment">
          <option value="" ${dataState.sentiment === '' ? 'selected' : ''}>${t('allSentiment')}</option>
          <option value="positive" ${dataState.sentiment === 'positive' ? 'selected' : ''}>${t('positive')}</option>
          <option value="negative" ${dataState.sentiment === 'negative' ? 'selected' : ''}>${t('negative')}</option>
          <option value="neutral" ${dataState.sentiment === 'neutral' ? 'selected' : ''}>${t('neutral')}</option>
        </select>
        <select id="f-time">
          <option value="24h" ${dataState.timeRange === '24h' ? 'selected' : ''}>${t('last24h')}</option>
          <option value="7d" ${dataState.timeRange === '7d' ? 'selected' : ''}>${t('last7d')}</option>
          <option value="30d" ${dataState.timeRange === '30d' ? 'selected' : ''}>${t('last30dOpt')}</option>
          <option value="" ${dataState.timeRange === '' ? 'selected' : ''}>${t('allTime')}</option>
        </select>
        <input type="text" id="f-search" placeholder="${t('search')}" value="${dataState.search}" autocomplete="off">
        <button class="btn btn-outline btn-sm" id="f-apply">${t('filter')}</button>
        <button class="btn btn-outline btn-sm" id="f-refresh" title="${t('refresh')}">&#8635;</button>
        <div style="flex:1"></div>
        <div class="btn-group">
          <button class="btn btn-outline btn-sm" id="export-csv">CSV</button>
          <button class="btn btn-outline btn-sm" id="export-json">JSON</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${t('totalResults').replace('{n}', d.total)}</div>
      <table>
        <thead><tr><th>${t('time')}</th><th>${t('type')}</th><th>${t('sentiment')}</th><th>${t('author')}</th><th>${t('title_col')}</th><th>${t('aiSummary')}</th><th>${t('score')}</th></tr></thead>
        <tbody>${d.rows.map((r, i) => `<tr data-id="${r.id}" data-idx="${i}">
          <td style="white-space:nowrap">${fmtUtc(r.created_utc)}</td>
          <td>${r.type === 'post' ? t('post') : t('comment')}</td>
          <td>${sentimentBadge(r.sentiment)}</td>
          <td><a class="reddit-link" href="https://reddit.com/u/${r.author}" target="_blank">u/${r.author}</a></td>
          <td class="truncate"><a class="reddit-link" href="https://reddit.com${r.permalink}" target="_blank">${esc(r.type === 'comment' ? (r.body?.slice(0, 100) || r.title || '-') : (r.title || '-'))}</a></td>
          <td class="ai-cell" data-idx="${i}" style="cursor:pointer;color:var(--text-light)">${esc(r.ai_summary || '-')}</td>
          <td>${r.score}</td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="pagination">
        <button class="btn btn-outline btn-sm" id="prev-page" ${d.page <= 1 ? 'disabled' : ''}>${t('prevPage')}</button>
        <span>${t('page').replace('{p}', d.page).replace('{t}', d.pages || 1)}</span>
        <button class="btn btn-outline btn-sm" id="next-page" ${d.page >= d.pages ? 'disabled' : ''}>${t('nextPage')}</button>
      </div>
    </div>
    <div id="detail-modal" class="modal" style="display:none">
      <div class="modal-content">
        <div class="modal-close" id="modal-close">&times;</div>
        <div id="modal-body"></div>
      </div>
    </div>`;

  $('#f-apply').onclick = () => {
    dataState.type = $('#f-type').value;
    dataState.sentiment = $('#f-sentiment').value;
    dataState.timeRange = $('#f-time').value;
    dataState.search = $('#f-search').value;
    dataState.page = 1;
    renderData();
  };
  $('#f-refresh').onclick = () => renderData();
  $('#f-search').onkeydown = e => { if (e.key === 'Enter') $('#f-apply').click(); };
  $('#prev-page').onclick = () => { dataState.page--; renderData(); };
  $('#next-page').onclick = () => { dataState.page++; renderData(); };

  // AI summary expand modal
  document.querySelectorAll('.ai-cell').forEach(cell => {
    cell.onclick = () => {
      const idx = +cell.dataset.idx;
      const r = d.rows[idx];
      if (!r) return;
      const modal = $('#detail-modal');
      const body = $('#modal-body');
      body.innerHTML = `
        <h3 style="margin-bottom:12px">${esc(r.type === 'comment' ? (r.body?.slice(0, 60) || '') : (r.title || ''))}</h3>
        <div style="margin-bottom:12px">
          ${sentimentBadge(r.sentiment)}
          <span style="color:var(--text-muted);margin-left:8px">u/${r.author} · r/${r.subreddit} · ${fmtUtc(r.created_utc)}</span>
        </div>
        ${r.body ? `<div class="modal-section"><strong>${t('title_col')}</strong><p>${esc(r.body)}</p></div>` : ''}
        ${r.ai_summary ? `<div class="modal-section"><strong>${t('aiSummary')}</strong><p>${esc(r.ai_summary)}</p></div>` : ''}
        <div style="margin-top:12px"><a class="reddit-link" href="https://reddit.com${r.permalink}" target="_blank">Reddit &rarr;</a></div>
      `;
      modal.style.display = 'flex';
    };
  });
  $('#modal-close').onclick = () => { $('#detail-modal').style.display = 'none'; };
  $('#detail-modal').onclick = (e) => { if (e.target.id === 'detail-modal') $('#detail-modal').style.display = 'none'; };

  const exportObj = { type: dataState.type, timeRange: dataState.timeRange, search: dataState.search };
  if (currentProject) exportObj.project = currentProject;
  const exportParams = new URLSearchParams(exportObj).toString();
  $('#export-csv').onclick = () => { window.open('/api/mentions/export?' + exportParams + '&format=csv'); };
  $('#export-json').onclick = () => { window.open('/api/mentions/export?' + exportParams + '&format=json'); };
}

// --- Reports ---
async function renderReports() {
  app.innerHTML = `<p>${t('loading')}</p>`;
  const pq = currentProject ? `?project=${currentProject}` : '';
  const res = await api('/reports' + pq);
  const reports = await res.json();

  if (!reports.length) {
    app.innerHTML = `<div class="section"><p style="color:var(--text-muted)">${t('noReports')}</p></div>`;
    return;
  }

  app.innerHTML = `
    <div class="section">
      <h3>${t('reports')}</h3>
      <table>
        <thead><tr><th>${t('reportDate')}</th><th>${t('reportTotal')}</th><th>${t('positive')}</th><th>${t('negative')}</th><th>${t('neutral')}</th><th>${t('actionable')}</th><th></th></tr></thead>
        <tbody>${reports.map(r => `<tr>
          <td>${r.report_date}</td>
          <td>${r.total_count}</td>
          <td style="color:var(--green)">${r.positive_count}</td>
          <td style="color:var(--red)">${r.negative_count}</td>
          <td style="color:var(--orange)">${r.neutral_count}</td>
          <td>${r.actionable_count}</td>
          <td><a href="#report/${r.report_date}?p=${r.project}" class="btn btn-sm btn-outline">${t('viewReport')}</a></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

async function renderReportDetail(dateAndParams) {
  app.innerHTML = `<p>${t('loading')}</p>`;
  const [date] = dateAndParams.split('?');
  const params = new URLSearchParams(dateAndParams.split('?')[1] || '');
  const project = params.get('p') || '';

  const res = await api(`/reports/${date}?project=${project}`);
  if (!res.ok) { app.innerHTML = `<div class="section"><p>Report not found</p></div>`; return; }
  const r = await res.json();

  let topPros = [], topCons = [];
  try { topPros = JSON.parse(r.top_pros || '[]'); } catch {}
  try { topCons = JSON.parse(r.top_cons || '[]'); } catch {}

  app.innerHTML = `
    <div style="margin-bottom:16px">
      <a href="#reports" class="btn btn-outline btn-sm">&larr; ${t('reports')}</a>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="label">${t('reportTotal')}</div><div class="value brand">${r.total_count}</div></div>
      <div class="stat-card"><div class="label">${t('positive')}</div><div class="value" style="color:var(--green);text-shadow:0 0 20px rgba(0,230,118,0.3)">${r.positive_count}</div></div>
      <div class="stat-card"><div class="label">${t('negative')}</div><div class="value" style="color:var(--red);text-shadow:0 0 20px rgba(255,61,113,0.3)">${r.negative_count}</div></div>
      <div class="stat-card"><div class="label">${t('actionable')}</div><div class="value unread">${r.actionable_count}</div></div>
    </div>
    ${topPros.length ? `<div class="section"><h3>${t('positive')}</h3><ul>${topPros.map(p => `<li>${esc(p.text)} <span style="color:var(--text-muted)">(${p.count})</span></li>`).join('')}</ul></div>` : ''}
    ${topCons.length ? `<div class="section"><h3>${t('negative')}</h3><ul>${topCons.map(c => `<li>${esc(c.text)} <span style="color:var(--text-muted)">(${c.count})</span></li>`).join('')}</ul></div>` : ''}
    <div class="section">
      <div class="report-content">${markdownToHtml(r.full_report || '')}</div>
    </div>`;
}

// Simple markdown renderer
function markdownToHtml(md) {
  return md
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

// --- Config ---
async function renderConfig() {
  app.innerHTML = `<p>${t('loading')}</p>`;
  const res = await api('/config');
  const cfg = await res.json();

  app.innerHTML = `
    <div class="section">
      <h3>${t('aiSetting')}</h3>
      <div class="form-row">
        <div class="form-group">
          <label>${t('aiEndpoint')}</label>
          <input id="c-ai-endpoint" value="${cfg.ai?.endpoint || ''}" autocomplete="off" placeholder="https://api.example.com/v1/messages">
        </div>
        <div class="form-group">
          <label>${t('aiKey')}</label>
          <input id="c-ai-key" type="password" value="" autocomplete="new-password" placeholder="${t('unchangedHint')}">
        </div>
        <div class="form-group">
          <label>${t('aiModel')}</label>
          <input id="c-ai-model" value="${cfg.ai?.model || 'claude-sonnet-4-20250514'}" autocomplete="off">
        </div>
      </div>
      <div style="margin-top:8px">
        <button class="btn btn-outline btn-sm" id="test-ai">${t('testAi')}</button>
        <span id="test-ai-result" style="margin-left:10px;font-size:13px"></span>
      </div>
    </div>

    <div class="section">
      <h3>${t('localProxySetting')}</h3>
      <div class="form-row">
        <div class="form-group">
          <label>${t('enabled')}</label>
          <select id="c-lp-enabled">
            <option value="true" ${cfg.localProxy?.enabled ? 'selected' : ''}>Yes</option>
            <option value="false" ${!cfg.localProxy?.enabled ? 'selected' : ''}>No</option>
          </select>
        </div>
        <div class="form-group">
          <label>${t('host')}</label>
          <input id="c-lp-host" value="${cfg.localProxy?.host || '127.0.0.1'}" autocomplete="off">
        </div>
        <div class="form-group">
          <label>${t('port')}</label>
          <input id="c-lp-port" type="number" value="${cfg.localProxy?.port || 10808}" autocomplete="off">
        </div>
      </div>
    </div>

    <div class="section">
      <h3>${t('proxySetting')}</h3>
      <div class="form-row">
        <div class="form-group">
          <label>${t('enabled')}</label>
          <select id="c-proxy-enabled">
            <option value="true" ${cfg.proxy?.enabled ? 'selected' : ''}>Yes</option>
            <option value="false" ${!cfg.proxy?.enabled ? 'selected' : ''}>No</option>
          </select>
        </div>
        <div class="form-group">
          <label>${t('host')}</label>
          <input id="c-proxy-host" value="${cfg.proxy?.host || ''}" autocomplete="off">
        </div>
        <div class="form-group">
          <label>${t('port')}</label>
          <input id="c-proxy-port" type="number" value="${cfg.proxy?.port || ''}" autocomplete="off">
        </div>
        <div class="form-group">
          <label>${t('username')}</label>
          <input id="c-proxy-user" value="${cfg.proxy?.username || ''}" autocomplete="off">
        </div>
        <div class="form-group">
          <label>${t('passwordField')}</label>
          <input id="c-proxy-pass" type="password" value="" autocomplete="new-password" placeholder="${t('unchangedHint')}">
        </div>
        <div class="form-group">
          <label>${t('protocol')}</label>
          <input id="c-proxy-proto" value="${cfg.proxy?.protocol || 'http'}" autocomplete="off">
        </div>
      </div>
    </div>

    <div class="section">
      <h3>${t('pollSetting')}</h3>
      <div class="form-group">
        <label>${t('interval')}</label>
        <input id="c-interval" type="number" value="${cfg.pollIntervalMinutes || 8}" style="width:120px" autocomplete="off">
      </div>
      <div class="form-group">
        <label>${t('webPwd')}</label>
        <input id="c-webpwd" type="password" value="" autocomplete="new-password" placeholder="${t('unchangedHint')}">
      </div>
    </div>

    <div class="section">
      <h3>${t('projects')}</h3>
      <div id="projects-list"></div>
      <button class="btn btn-outline" id="add-project" style="margin-top:10px">${t('addProject')}</button>
    </div>

    <div style="margin-top:16px">
      <button class="btn btn-primary" id="save-config">${t('saveConfig')}</button>
    </div>`;

  const projectsList = $('#projects-list');

  function renderProjects(projects) {
    projectsList.innerHTML = projects.map((p, i) => `
      <div class="project-card" data-idx="${i}">
        <div class="project-header">
          <h4>${esc(p.name || p.id || 'Project ' + (i + 1))}</h4>
          <div class="btn-group">
            <label style="font-size:12px"><input type="checkbox" class="p-enabled" ${p.enabled !== false ? 'checked' : ''}> ${t('enabled')}</label>
            <button class="btn btn-outline btn-sm del-project">${t('deleteProject')}</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>${t('projectId')}</label><input class="p-id" value="${esc(p.id || '')}" autocomplete="off"></div>
          <div class="form-group"><label>${t('projectName')}</label><input class="p-name" value="${esc(p.name || '')}" autocomplete="off"></div>
        </div>
        <div class="form-group"><label>${t('subreddits')}</label><textarea class="p-subs">${(p.subreddits || []).join('\n')}</textarea></div>
        <div class="form-group"><label>${t('brandKw')} <span style="color:var(--text-muted);font-size:11px">— ${t('comingSoon')}</span></label><textarea class="p-brand" disabled style="opacity:.5;cursor:not-allowed">${(p.keywords?.brand || []).join('\n')}</textarea></div>
        <div class="form-group"><label>${t('industryKw')} <span style="color:var(--text-muted);font-size:11px">— ${t('comingSoon')}</span></label><textarea class="p-industry" disabled style="opacity:.5;cursor:not-allowed">${(p.keywords?.industry || []).join('\n')}</textarea></div>
        <div class="form-group"><label>${t('competitorKw')} <span style="color:var(--text-muted);font-size:11px">— ${t('comingSoon')}</span></label><textarea class="p-competitor" disabled style="opacity:.5;cursor:not-allowed">${(p.keywords?.competitor || []).join('\n')}</textarea></div>
      </div>`).join('');

    document.querySelectorAll('.del-project').forEach(btn => {
      btn.onclick = () => { projects.splice(+btn.closest('.project-card').dataset.idx, 1); renderProjects(projects); };
    });
  }

  const projects = cfg.projects || [];
  renderProjects(projects);

  $('#add-project').onclick = () => {
    projects.push({ id: '', name: '', enabled: true, keywords: { brand: [], industry: [], competitor: [] }, subreddits: [] });
    renderProjects(projects);
  };

  $('#save-config').onclick = async () => {
    const lines = v => v.split('\n').map(s => s.trim()).filter(Boolean);
    const cards = document.querySelectorAll('.project-card');
    const updatedProjects = [...cards].map(c => ({
      id: c.querySelector('.p-id').value.trim(),
      name: c.querySelector('.p-name').value.trim(),
      enabled: c.querySelector('.p-enabled').checked,
      keywords: {
        brand: lines(c.querySelector('.p-brand').value),
        industry: lines(c.querySelector('.p-industry').value),
        competitor: lines(c.querySelector('.p-competitor').value),
      },
      subreddits: lines(c.querySelector('.p-subs').value),
    }));

    const update = {
      projects: updatedProjects,
      pollIntervalMinutes: +$('#c-interval').value || 8,
      localProxy: {
        enabled: $('#c-lp-enabled').value === 'true',
        host: $('#c-lp-host').value.trim() || '127.0.0.1',
        port: +$('#c-lp-port').value || 10808,
      },
      proxy: {
        enabled: $('#c-proxy-enabled').value === 'true',
        host: $('#c-proxy-host').value,
        port: +$('#c-proxy-port').value || 1000,
        username: $('#c-proxy-user').value,
        protocol: $('#c-proxy-proto').value || 'http',
      },
      ai: {
        endpoint: $('#c-ai-endpoint').value.trim(),
        model: $('#c-ai-model').value.trim(),
      },
    };

    const proxyPwd = $('#c-proxy-pass').value;
    if (proxyPwd) update.proxy.password = proxyPwd;

    const aiKey = $('#c-ai-key').value;
    if (aiKey) update.ai.apiKey = aiKey;

    const webpwd = $('#c-webpwd').value;
    if (webpwd) update.webPassword = webpwd;

    try {
      await api('/config', { method: 'PUT', body: update });
      toast(t('configSaved'));
    } catch (e) {
      toast(t('saveFailed') + e.message);
    }
  };

  $('#test-ai').onclick = async () => {
    const result = $('#test-ai-result');
    result.textContent = t('testAiTesting');
    result.style.color = 'var(--text-muted)';
    try {
      const res = await api('/ai-test');
      const d = await res.json();
      if (d.ok) {
        result.textContent = t('testAiOk') + (d.model ? ` (${d.model})` : '');
        result.style.color = '#4caf50';
      } else {
        result.textContent = t('testAiFail') + (d.error || 'unknown');
        result.style.color = '#e53935';
      }
    } catch (e) {
      result.textContent = t('testAiFail') + e.message;
      result.style.color = '#e53935';
    }
  };
}

// --- Helpers ---
function fmtTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtUtc(ts) {
  if (!ts) return '-';
  const d = new Date(ts * 1000);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function esc(s) {
  const el = document.createElement('span');
  el.textContent = s;
  return el.innerHTML;
}

// --- Boot ---
window.addEventListener('hashchange', route);
init();
