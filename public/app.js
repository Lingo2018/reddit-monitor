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
    analyzed: '已分析', pending: '待分析', allDone: '全部完成', actionable: '可执行',
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
    projectId: '项目ID', projectName: '项目名称', reportRole: '报告分析师角色', reportRoleHint: '例如：Unihertz公关策略师',
    regenerateReport: '重新生成',
    brandKw: '品牌关键词（每行一个）', industryKw: '行业关键词（每行一个）',
    competitorKw: '竞对关键词（每行一个）', subreddits: '监控 Subreddit（每行一个）',
    saveConfig: '保存配置', configSaved: '配置已保存，下轮轮询生效',
    saveFailed: '保存失败：',
    allMarkedRead: '已全部标为已读',
    post: '帖子', comment: '评论',
    testAi: '测试连接', reanalyze: '重新分析全部数据', reanalyzeOk: '已清除旧分析，下轮自动重新分析',
    testAiOk: '连接成功', testAiFail: '连接失败：', testAiTesting: '测试中...',
    comingSoon: '暂不可用',
    users: '用户', sortKarma: 'Karma最高', sortPosts: '帖子最多', sortComments: '评论最多',
    sortActivity: '最活跃', sortRecent: '最近活跃',
    totalActivity: '总互动', posts: '帖子', comments: '评论', avgScore: '平均分',
    firstSeen: '首次出现', lastSeen: '最近活跃', accountAge: '账龄',
    genSummary: '生成汇总报告', reportGenerated: '报告已生成',
    products: '产品', uploadXlsx: '上传产品表格', addProduct: '+ 手动添加', deleteConfirm: '确定删除？',
    productName: '产品名称', productSpecs: '参数', specKey: '参数名', specVal: '参数值', addSpec: '+ 添加参数',
    uploadSuccess: '导入成功，共 {n} 个产品', noProducts: '暂无产品数据，请上传产品表格或手动添加',
    negativeActions: '负面反馈快速处理', goReply: '去回复',
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
    analyzed: 'Analyzed', pending: 'Pending', allDone: 'All done', actionable: 'Actionable',
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
    projectId: 'ID', projectName: 'Name', reportRole: 'Report Analyst Role', reportRoleHint: 'e.g. Unihertz PR Strategist',
    regenerateReport: 'Regenerate',
    brandKw: 'Brand Keywords (one per line)', industryKw: 'Industry Keywords (one per line)',
    competitorKw: 'Competitor Keywords (one per line)', subreddits: 'Subreddits (one per line)',
    saveConfig: 'Save Config', configSaved: 'Config saved! Changes apply on next poll cycle.',
    saveFailed: 'Save failed: ',
    allMarkedRead: 'All marked as read',
    post: 'post', comment: 'comment',
    testAi: 'Test Connection', reanalyze: 'Re-analyze All Data', reanalyzeOk: 'Old analysis cleared. Will re-analyze on next poll.',
    testAiOk: 'Connected!', testAiFail: 'Failed: ', testAiTesting: 'Testing...',
    comingSoon: 'Coming soon',
    users: 'Users', sortKarma: 'Top Karma', sortPosts: 'Most Posts', sortComments: 'Most Comments',
    sortActivity: 'Most Active', sortRecent: 'Recently Active',
    totalActivity: 'Total', posts: 'Posts', comments: 'Comments', avgScore: 'Avg Score',
    firstSeen: 'First Seen', lastSeen: 'Last Active', accountAge: 'Account Age',
    genSummary: 'Generate Summary Report', reportGenerated: 'Report generated',
    products: 'Products', uploadXlsx: 'Upload Specs XLSX', addProduct: '+ Add Product', deleteConfirm: 'Delete?',
    productName: 'Product Name', productSpecs: 'Specifications', specKey: 'Spec Name', specVal: 'Value', addSpec: '+ Add Spec',
    uploadSuccess: 'Imported {n} products', noProducts: 'No products yet. Upload a specs XLSX or add manually.',
    negativeActions: 'Negative Feedback Actions', goReply: 'Reply',
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
  $('#nav-users').textContent = t('users');
  $('#nav-products').textContent = t('products');
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

// --- Client-side cache ---
const clientCache = {};
const CLIENT_CACHE_TTL = 60000;

async function apiCached(path) {
  const now = Date.now();
  if (clientCache[path] && clientCache[path].exp > now) {
    return clientCache[path].data;
  }
  const res = await api(path);
  const data = await res.json();
  clientCache[path] = { data, exp: now + CLIENT_CACHE_TTL };
  return data;
}

function clearClientCache() {
  for (const k of Object.keys(clientCache)) delete clientCache[k];
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

function skeleton(rows = 4) {
  const bar = '<div class="skel-bar"></div>';
  return `<div class="skel-grid">${Array(4).fill('<div class="skel-card"></div>').join('')}</div>` +
    Array(rows).fill(`<div class="skel-row">${bar}${bar}${bar}</div>`).join('');
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
  else if (hash === 'users') renderUsers();
  else if (hash === 'products') renderProducts();
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
$('#nav-refresh').onclick = async (e) => {
  e.preventDefault();
  const btn = $('#nav-refresh');
  btn.classList.add('spinning');
  clearClientCache();
  try { await api('/refresh', { method: 'POST' }); } catch {}
  setTimeout(() => btn.classList.remove('spinning'), 600);
  route();
};


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
  app.innerHTML = skeleton(4);
  const pq = currentProject ? `?project=${currentProject}` : '';
  const d = await apiCached('/stats' + pq);

  const catMap = {};
  d.byCategory.forEach(c => catMap[c.category] = c.count);
  const sMap = {};
  (d.sentiments || []).forEach(s => sMap[s.sentiment] = s.count);

  const maxDay = Math.max(...d.byDay.map(r => r.count), 1);

  app.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">${t('totalMentions')}</div><div class="value brand">${d.total}</div></div>
      <div class="stat-card">
        <div class="label">${t('analyzed')}</div>
        <div class="value unread">${d.analyzed || 0}</div>
        ${d.total > 0 ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">${d.total - (d.analyzed || 0) > 0 ? t('pending') + ': ' + (d.total - (d.analyzed || 0)) : t('allDone')}</div>` : ''}
      </div>
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
  app.innerHTML = skeleton(6);
  const qObj = { ...dataState, limit: 50 };
  if (currentProject) qObj.project = currentProject;
  const q = new URLSearchParams(qObj).toString();
  const d = await apiCached('/mentions-analyzed?' + q);

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
        <thead><tr><th>${t('time')}</th><th style="min-width:50px">${t('type')}</th><th style="min-width:60px">${t('sentiment')}</th><th>${t('author')}</th><th>Karma</th><th>${t('title_col')}</th><th>${t('aiSummary')}</th><th>${t('score')}</th></tr></thead>
        <tbody>${d.rows.map((r, i) => `<tr data-id="${r.id}" data-idx="${i}" class="data-row">
          <td style="white-space:nowrap">${fmtUtc(r.created_utc)}</td>
          <td style="white-space:nowrap">${r.type === 'post' ? t('post') : t('comment')}</td>
          <td style="white-space:nowrap">${sentimentBadge(r.sentiment)}</td>
          <td style="white-space:nowrap"><a class="reddit-link" href="https://reddit.com/u/${r.author}" target="_blank">u/${r.author}</a></td>
          <td style="color:var(--text-muted);font-size:12px;white-space:nowrap">${r.total_karma != null ? fmtKarma(r.total_karma) : '-'}</td>
          <td class="truncate"><a class="reddit-link" href="https://reddit.com${r.permalink}" target="_blank">${esc(r.type === 'comment' ? (r.body?.slice(0, 100) || r.title || '-') : (r.title || '-'))}</a></td>
          <td class="ai-cell" data-idx="${i}"><span class="ai-text">${esc(r.ai_summary || '-')}</span></td>
          <td>${r.score}</td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="pagination">
        <button class="btn btn-outline btn-sm" id="prev-page" ${d.page <= 1 ? 'disabled' : ''}>${t('prevPage')}</button>
        <span>${t('page').replace('{p}', d.page).replace('{t}', d.pages || 1)}</span>
        <button class="btn btn-outline btn-sm" id="next-page" ${d.page >= d.pages ? 'disabled' : ''}>${t('nextPage')}</button>
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
  $('#f-refresh').onclick = async () => { clearClientCache(); await api('/refresh', { method: 'POST' }).catch(()=>{}); renderData(); };
  $('#f-search').onkeydown = e => { if (e.key === 'Enter') $('#f-apply').click(); };
  $('#prev-page').onclick = () => { dataState.page--; renderData(); };
  $('#next-page').onclick = () => { dataState.page++; renderData(); };

  // AI summary cell expand/collapse
  document.querySelectorAll('.ai-cell').forEach(cell => {
    cell.onclick = (e) => {
      e.stopPropagation();
      cell.classList.toggle('ai-expanded');
    };
  });

  const exportObj = { type: dataState.type, timeRange: dataState.timeRange, search: dataState.search };
  if (currentProject) exportObj.project = currentProject;
  const exportParams = new URLSearchParams(exportObj).toString();
  $('#export-csv').onclick = () => { window.open('/api/mentions/export?' + exportParams + '&format=csv'); };
  $('#export-json').onclick = () => { window.open('/api/mentions/export?' + exportParams + '&format=json'); };
}

// --- Reports ---
async function renderReports() {
  app.innerHTML = skeleton(3);
  const pq = currentProject ? `?project=${currentProject}` : '';
  const reports = await apiCached('/reports' + pq);

  if (!reports.length) {
    app.innerHTML = `<div class="section"><p style="color:var(--text-muted)">${t('noReports')}</p></div>`;
    return;
  }

  app.innerHTML = `
    <div class="section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0">${t('reports')}</h3>
        <button class="btn btn-primary btn-sm" id="gen-summary">${t('genSummary')}</button>
      </div>
      <table>
        <thead><tr><th>${t('reportDate')}</th><th>${t('reportTotal')}</th><th>${t('positive')}</th><th>${t('negative')}</th><th>${t('neutral')}</th><th>${t('actionable')}</th><th></th></tr></thead>
        <tbody>${reports.map(r => `<tr>
          <td style="white-space:nowrap">${r.report_date.startsWith('summary') ? r.report_date : r.report_date}${r.created_at ? '<br><span style="font-size:11px;color:var(--text-muted)">' + fmtTime(r.created_at) + '</span>' : ''}</td>
          <td>${r.total_count}</td>
          <td style="color:var(--green)">${r.positive_count}</td>
          <td style="color:var(--red)">${r.negative_count}</td>
          <td style="color:var(--orange)">${r.neutral_count}</td>
          <td>${r.actionable_count}</td>
          <td>
            <a href="#report/${r.report_date}?p=${r.project}" class="btn btn-sm btn-outline">${t('viewReport')}</a>
            <button class="btn btn-sm btn-outline regen-btn" data-date="${r.report_date}" data-project="${r.project}" style="margin-left:4px">${t('regenerateReport')}</button>
          </td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;

  document.querySelectorAll('.regen-btn').forEach(btn => {
    btn.onclick = async () => {
      btn.textContent = '...';
      btn.disabled = true;
      try {
        await api(`/reports/regenerate`, { method: 'POST', body: { date: btn.dataset.date, project: btn.dataset.project } });
        clearClientCache();
        toast(t('reportGenerated'));
        renderReports();
      } catch (e) {
        toast(t('saveFailed') + e.message);
        btn.textContent = t('regenerateReport');
        btn.disabled = false;
      }
    };
  });

  $('#gen-summary').onclick = async () => {
    const proj = currentProject || projectList.find(p => p.enabled !== false)?.id;
    if (!proj) { toast('无可用项目'); return; }
    const btn = $('#gen-summary');
    btn.textContent = '...';
    btn.disabled = true;
    try {
      const res = await api('/reports/summary', { method: 'POST', body: { project: proj } });
      const d = await res.json();
      if (d.ok) {
        clearClientCache();
        toast(t('reportGenerated'));
        renderReports();
      } else {
        toast(d.error || 'failed');
      }
    } catch (e) {
      toast(e.message);
    }
    btn.textContent = t('genSummary');
    btn.disabled = false;
  };
}

async function renderReportDetail(dateAndParams) {
  app.innerHTML = skeleton(2);
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
    ${(r.negativeItems || []).length ? `<div class="section"><h3>${t('negativeActions')}</h3>
      <table>
        <thead><tr><th>${t('type')}</th><th>${t('author')}</th><th>${t('aiSummary')}</th><th></th></tr></thead>
        <tbody>${r.negativeItems.map(n => `<tr>
          <td style="white-space:nowrap">${n.type === 'post' ? t('post') : t('comment')}</td>
          <td style="white-space:nowrap"><a class="reddit-link" href="https://reddit.com/u/${n.author}" target="_blank">u/${n.author}</a></td>
          <td style="color:var(--text-light)">${esc(n.summary || '-')}</td>
          <td><a class="btn btn-sm btn-outline" href="https://reddit.com${n.permalink}" target="_blank">${t('goReply')}</a></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>` : ''}
    <div class="section">
      <div class="report-content">${markdownToHtml(r.full_report || '')}</div>
    </div>`;
}

// Simple markdown renderer
function markdownToHtml(md) {
  // Tables
  md = md.replace(/^(\|.+\|)\n(\|[\s\-:|]+\|)\n((?:\|.+\|\n?)+)/gm, (match, header, sep, body) => {
    const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const tds = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Blockquotes
  md = md.replace(/^>\s?(.+)$/gm, '<blockquote>$1</blockquote>');
  md = md.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

  // Horizontal rules
  md = md.replace(/^---+$/gm, '<hr>');

  // Headers
  md = md.replace(/^#### (.+)$/gm, '<h5>$1</h5>');
  md = md.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  md = md.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  md = md.replace(/^# (.+)$/gm, '<h2>$1</h2>');

  // Links: [text](url) and bare URLs
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="reddit-link" href="$2" target="_blank">$1</a>');
  md = md.replace(/(^|[^"=])(https?:\/\/[^\s<)\]]+)/g, '$1<a class="reddit-link" href="$2" target="_blank">$2</a>');

  // Bold
  md = md.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Lists
  md = md.replace(/^\- (.+)$/gm, '<li>$1</li>');
  md = md.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
  md = md.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Line breaks
  md = md.replace(/\n\n/g, '</p><p>');
  md = md.replace(/\n/g, '<br>');

  return `<p>${md}</p>`;
}

// --- Users ---
let userState = { page: 1, sort: 'karma' };

async function renderUsers() {
  app.innerHTML = skeleton(5);
  const qObj = { ...userState, limit: 50 };
  if (currentProject) qObj.project = currentProject;
  const q = new URLSearchParams(qObj).toString();
  const d = await apiCached('/users?' + q);

  app.innerHTML = `
    <div class="section">
      <div class="filters">
        <select id="u-sort">
          <option value="karma" ${userState.sort === 'karma' ? 'selected' : ''}>${t('sortKarma')}</option>
          <option value="activity" ${userState.sort === 'activity' ? 'selected' : ''}>${t('sortActivity')}</option>
          <option value="posts" ${userState.sort === 'posts' ? 'selected' : ''}>${t('sortPosts')}</option>
          <option value="comments" ${userState.sort === 'comments' ? 'selected' : ''}>${t('sortComments')}</option>
          <option value="recent" ${userState.sort === 'recent' ? 'selected' : ''}>${t('sortRecent')}</option>
        </select>
        <button class="btn btn-outline btn-sm" id="u-apply">${t('filter')}</button>
        <button class="btn btn-outline btn-sm" id="u-refresh">&#8635;</button>
        <div style="flex:1"></div>
        <span style="font-size:12px;color:var(--text-muted)">${t('totalResults').replace('{n}', d.total)}</span>
      </div>
      <table>
        <thead><tr>
          <th>#</th>
          <th>${t('author')}</th>
          <th>Karma</th>
          <th>${t('totalActivity')}</th>
          <th>${t('posts')}</th>
          <th>${t('comments')}</th>
          <th>${t('avgScore')}</th>
          <th>${t('positive')}/${t('negative')}</th>
          <th>${t('lastSeen')}</th>
          <th>${t('accountAge')}</th>
        </tr></thead>
        <tbody>${d.rows.map((r, i) => {
          const rank = (d.page - 1) * 50 + i + 1;
          const age = r.account_created_utc ? fmtAge(r.account_created_utc) : '-';
          return `<tr>
            <td style="color:var(--text-muted)">${rank}</td>
            <td><a class="reddit-link" href="https://reddit.com/u/${r.author}" target="_blank">u/${r.author}</a></td>
            <td style="font-weight:700;color:var(--primary)">${r.total_karma != null ? fmtKarma(r.total_karma) : '-'}</td>
            <td style="font-weight:600">${r.total_count}</td>
            <td>${r.post_count}</td>
            <td>${r.comment_count}</td>
            <td>${r.avg_score ?? '-'}</td>
            <td><span style="color:var(--green)">${r.positive_count || 0}</span> / <span style="color:var(--red)">${r.negative_count || 0}</span></td>
            <td>${fmtUtc(r.last_seen)}</td>
            <td style="color:var(--text-muted);font-size:12px">${age}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      <div class="pagination">
        <button class="btn btn-outline btn-sm" id="u-prev" ${d.page <= 1 ? 'disabled' : ''}>${t('prevPage')}</button>
        <span>${t('page').replace('{p}', d.page).replace('{t}', d.pages || 1)}</span>
        <button class="btn btn-outline btn-sm" id="u-next" ${d.page >= d.pages ? 'disabled' : ''}>${t('nextPage')}</button>
      </div>
    </div>`;

  $('#u-apply').onclick = () => { userState.sort = $('#u-sort').value; userState.page = 1; renderUsers(); };
  $('#u-refresh').onclick = async () => { clearClientCache(); await api('/refresh', { method: 'POST' }).catch(()=>{}); renderUsers(); };
  $('#u-prev').onclick = () => { userState.page--; renderUsers(); };
  $('#u-next').onclick = () => { userState.page++; renderUsers(); };
}

// --- Products ---
async function renderProducts() {
  app.innerHTML = skeleton(4);
  const proj = currentProject || projectList.find(p => p.enabled !== false)?.id || '';
  const res = await api('/products?project=' + proj);
  const products = await res.json();

  app.innerHTML = `
    <div class="section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <h3 style="margin:0">${t('products')} ${proj ? `(${proj})` : ''}</h3>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" id="xlsx-upload-btn">${t('uploadXlsx')}</button>
          <input type="file" id="xlsx-upload" accept=".xlsx,.xls" style="display:none">
          <button class="btn btn-outline btn-sm" id="add-product-btn">${t('addProduct')}</button>
        </div>
      </div>
      <div id="add-product-form" style="display:none;margin-bottom:16px" class="project-card">
        <div class="form-row">
          <div class="form-group"><label>${t('productName')}</label><input id="new-product-name" autocomplete="off"></div>
        </div>
        <div id="new-product-specs"></div>
        <div class="btn-group" style="margin-top:8px">
          <button class="btn btn-outline btn-sm" id="new-spec-btn">${t('addSpec')}</button>
          <button class="btn btn-primary btn-sm" id="save-product-btn">${t('saveConfig')}</button>
          <button class="btn btn-outline btn-sm" id="cancel-product-btn">${t('all')}</button>
        </div>
      </div>
      ${!products.length ? `<p style="color:var(--text-muted)">${t('noProducts')}</p>` : ''}
      <div id="products-container">
        ${products.map(p => {
          const specs = JSON.parse(p.specs || '{}');
          const specEntries = Object.entries(specs);
          return `
          <div class="project-card" data-pid="${p.id}">
            <div class="project-header">
              <h4>${esc(p.name)}</h4>
              <button class="btn btn-outline btn-sm del-product-btn" data-pid="${p.id}">${t('deleteProject')}</button>
            </div>
            <table style="font-size:12px">
              <tbody>${specEntries.slice(0, 8).map(([k, v]) => `<tr><td style="color:var(--text-muted);width:140px;white-space:nowrap">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
              ${specEntries.length > 8 ? `<tr><td colspan="2" style="color:var(--text-muted);cursor:pointer" class="show-all-specs" data-pid="${p.id}">... ${t('all')} ${specEntries.length} ${t('productSpecs')} (${t('filter')})</td></tr>` : ''}
              </tbody>
            </table>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  // Upload handler
  $('#xlsx-upload-btn').onclick = () => { $('#xlsx-upload').value = ''; $('#xlsx-upload').click(); };
  $('#xlsx-upload').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast('上传中...');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      // chunk base64 encoding for large files
      const bytes = new Uint8Array(ev.target.result);
      let binary = '';
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      const base64 = btoa(binary);
      try {
        const res = await api('/products/upload', { method: 'POST', body: { project: proj, data: base64 } });
        const d = await res.json();
        if (d.ok) {
          clearClientCache();
          toast(t('uploadSuccess').replace('{n}', d.count));
          renderProducts();
        } else { toast(d.error || 'upload failed'); }
      } catch (err) { toast(err.message); }
    };
    reader.readAsArrayBuffer(file);
  };

  // Add product manually - show form
  $('#add-product-btn').onclick = () => {
    const form = $('#add-product-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    $('#new-product-name').value = '';
    $('#new-product-specs').innerHTML = '';
  };
  $('#cancel-product-btn').onclick = () => { $('#add-product-form').style.display = 'none'; };
  $('#new-spec-btn').onclick = () => {
    const container = $('#new-product-specs');
    const row = document.createElement('div');
    row.className = 'form-row';
    row.style.marginBottom = '6px';
    row.innerHTML = `<div class="form-group" style="margin:0"><input class="spec-key" placeholder="${t('specKey')}" autocomplete="off"></div><div class="form-group" style="margin:0"><input class="spec-val" placeholder="${t('specVal')}" autocomplete="off"></div>`;
    container.appendChild(row);
  };
  $('#save-product-btn').onclick = async () => {
    const name = $('#new-product-name').value.trim();
    if (!name) return;
    const specs = {};
    document.querySelectorAll('#new-product-specs .form-row').forEach(row => {
      const k = row.querySelector('.spec-key').value.trim();
      const v = row.querySelector('.spec-val').value.trim();
      if (k && v) specs[k] = v;
    });
    await api('/products', { method: 'POST', body: { project: proj, name, specs } });
    clearClientCache();
    renderProducts();
  };

  // Delete product
  document.querySelectorAll('.del-product-btn').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm(t('deleteConfirm'))) return;
      await api(`/products/${btn.dataset.pid}`, { method: 'DELETE' });
      clearClientCache();
      renderProducts();
    };
  });

  // Show all specs
  document.querySelectorAll('.show-all-specs').forEach(td => {
    td.onclick = () => {
      const pid = td.dataset.pid;
      const p = products.find(x => x.id === +pid);
      if (!p) return;
      const specs = JSON.parse(p.specs || '{}');
      const card = td.closest('.project-card');
      const tbody = card.querySelector('tbody');
      tbody.innerHTML = Object.entries(specs).map(([k, v]) =>
        `<tr><td style="color:var(--text-muted);width:140px;white-space:nowrap">${esc(k)}</td><td>${esc(v)}</td></tr>`
      ).join('');
    };
  });
}

// --- Config ---
async function renderConfig() {
  app.innerHTML = skeleton(3);
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
      <div style="margin-top:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" id="test-ai">${t('testAi')}</button>
        <button class="btn btn-outline btn-sm" id="reanalyze-btn">${t('reanalyze')}</button>
        <span id="test-ai-result" style="font-size:13px"></span>
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
    </div>
    <div class="floating-save">
      <button class="btn btn-primary" id="save-config-float">${t('saveConfig')}</button>
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
        <div class="form-group"><label>${t('reportRole')}</label><textarea class="p-role" rows="2" placeholder="${t('reportRoleHint')}">${esc(p.reportRole || '')}</textarea></div>
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

  const doSave = async () => {
    const lines = v => v.split('\n').map(s => s.trim()).filter(Boolean);
    const cards = document.querySelectorAll('.project-card');
    const updatedProjects = [...cards].map(c => ({
      id: c.querySelector('.p-id').value.trim(),
      name: c.querySelector('.p-name').value.trim(),
      reportRole: c.querySelector('.p-role').value.trim(),
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
  $('#save-config').onclick = doSave;
  $('#save-config-float').onclick = doSave;

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

  $('#reanalyze-btn').onclick = async () => {
    const cards = document.querySelectorAll('.project-card');
    const projects = currentProject ? [currentProject] : [...cards].map(c => c.querySelector('.p-id').value.trim()).filter(Boolean);
    if (!projects.length) { toast('无可用项目'); return; }
    const btn = $('#reanalyze-btn');
    btn.textContent = '...';
    btn.disabled = true;
    try {
      for (const proj of projects) {
        await api('/reanalyze', { method: 'POST', body: { project: proj } });
      }
      clearClientCache();
      toast(t('reanalyzeOk'));
    } catch (e) { toast(e.message); }
    btn.textContent = t('reanalyze');
    btn.disabled = false;
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

function fmtAge(utc) {
  if (!utc) return '-';
  const days = Math.floor((Date.now() / 1000 - utc) / 86400);
  if (days < 30) return days + 'd';
  if (days < 365) return Math.floor(days / 30) + 'mo';
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return m ? y + 'y' + m + 'mo' : y + 'y';
}

function fmtKarma(n) {
  if (n == null) return '-';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function esc(s) {
  const el = document.createElement('span');
  el.textContent = s;
  return el.innerHTML;
}

// --- Boot ---
window.addEventListener('hashchange', route);
init();
