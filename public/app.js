const $ = s => document.querySelector(s);
const app = $('#app');
let currentPlatform = localStorage.getItem('rm-platform') || 'reddit';
let currentTab = 'stats';

// --- i18n ---
const i18n = {
  zh: {
    title: 'Social Monitor',
    stats: '概览', data: '数据', reports: '报告', config: '配置', logout: '退出', settings: '设置',
    fbGroups: 'Facebook Groups（groupId:名称，每行一个）', fbToken: 'Access Token', fbAppId: 'App ID', fbAppSecret: 'App Secret',
    fbSetting: 'Facebook 设置', testToken: '测试 Token', tokenValid: 'Token 有效', tokenInvalid: 'Token 无效',
    exchangeToken: '延长 Token', exchangeOk: 'Token 已延长',
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
    projectId: '项目ID', projectName: '项目名称', reportRole: '报告分析师角色', reportRoleHint: '例如：品牌公关策略师',
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
    genSummary: '生成汇总报告', reportGenerated: '报告已生成', generating: ' 生成中，约1分钟...',
    products: '产品', uploadXlsx: '上传产品表格', addProduct: '+ 手动添加',
    selectAll: '全选', batchDelete: '批量删除', batchDeleteConfirm: '确定删除选中的 {n} 个产品？',
    deleteOneConfirm: '确定删除「{name}」？', cancelBtn: '取消', confirmDelete: '删除',
    productName: '产品名称', productSpecs: '参数', specKey: '参数名', specVal: '参数值', addSpec: '+ 添加参数',
    editProduct: '编辑',
    uploadSuccess: '导入成功，共 {n} 个产品', newItems: '新增', updatedItems: '更新',
    noProducts: '暂无产品数据，请上传产品表格或手动添加',
    negativeActions: '负面反馈快速处理', goReply: '去回复',
    noReports: '暂无报告，数据累积后将自动生成每日舆情报告',
    genDailyFor: '补生成日报：', genDaily: '生成日报',
    reportDate: '日期', reportTitle: '报告名称', reportTitleHint: '点击编辑名称...', reportTotal: '总数', reportSentiment: '情感分布',
    viewReport: '查看',
    langSwitch: 'EN',
  },
  en: {
    title: 'Social Monitor',
    stats: 'Stats', data: 'Data', reports: 'Reports', config: 'Config', logout: 'Logout', settings: 'Settings',
    fbGroups: 'Facebook Groups (groupId:name, one per line)', fbToken: 'Access Token', fbAppId: 'App ID', fbAppSecret: 'App Secret',
    fbSetting: 'Facebook Settings', testToken: 'Test Token', tokenValid: 'Token valid', tokenInvalid: 'Token invalid',
    exchangeToken: 'Extend Token', exchangeOk: 'Token extended',
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
    projectId: 'ID', projectName: 'Name', reportRole: 'Report Analyst Role', reportRoleHint: 'e.g. Brand PR Strategist',
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
    genSummary: 'Generate Summary Report', reportGenerated: 'Report generated', generating: ' Generating (~1 min)...',
    products: 'Products', uploadXlsx: 'Upload Specs XLSX', addProduct: '+ Add Product',
    selectAll: 'Select All', batchDelete: 'Delete Selected', batchDeleteConfirm: 'Delete {n} selected products?',
    deleteOneConfirm: 'Delete "{name}"?', cancelBtn: 'Cancel', confirmDelete: 'Delete',
    productName: 'Product Name', productSpecs: 'Specifications', specKey: 'Spec Name', specVal: 'Value', addSpec: '+ Add Spec',
    editProduct: 'Edit',
    uploadSuccess: 'Imported {n} products', newItems: 'new', updatedItems: 'updated',
    noProducts: 'No products yet. Upload a specs XLSX or add manually.',
    negativeActions: 'Negative Feedback Actions', goReply: 'Reply',
    noReports: 'No reports yet. Daily reports will be auto-generated once data accumulates.',
    genDailyFor: 'Generate daily for:', genDaily: 'Generate',
    reportDate: 'Date', reportTitle: 'Title', reportTitleHint: 'Click to edit...', reportTotal: 'Total', reportSentiment: 'Sentiment',
    viewReport: 'View',
    langSwitch: '中文',
  }
};

let lang = localStorage.getItem('rm-lang') || 'zh';
let currentProject = localStorage.getItem('rm-project') || '';
let projectList = [];
function t(key) { return i18n[lang]?.[key] || i18n.en[key] || key; }

function updateNav() {
  const ss = $('#sidebar-settings');
  if (ss) ss.textContent = t('settings');
  updateProjectSelector();
  updateSidebar();
  updateTabs();
}

function updateSidebar() {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.toggle('active', item.dataset.platform === currentPlatform);
  });
}

function updateTabs() {
  const tabs = $('#tabs');
  let tabList;
  if (currentPlatform === 'settings') {
    tabList = [{ id: 'config', label: t('config') }];
  } else {
    tabList = [
      { id: 'stats', label: t('stats') },
      { id: 'data', label: t('data') },
      { id: 'reports', label: t('reports') },
      { id: 'users', label: t('users') },
      { id: 'products', label: t('products') },
      { id: 'config', label: t('config') },
    ];
  }
  tabs.innerHTML = tabList.map(t => `<div class="tab-item${currentTab === t.id ? ' active' : ''}" data-tab="${t.id}">${t.label}</div>`).join('');
  tabs.querySelectorAll('.tab-item').forEach(tab => {
    tab.onclick = () => { currentTab = tab.dataset.tab; if (location.hash) history.replaceState(null, '', location.pathname); updateTabs(); route(); };
  });
}

function updateProjectSelector() {
  const sel = $('#project-selector');
  if (!sel) return;
  sel.innerHTML = `<option value="">${t('allProjects')}</option>` +
    projectList.map(p => `<option value="${p.id}" ${currentProject === p.id ? 'selected' : ''}>${p.name || p.id}</option>`).join('');
}

async function loadProjects() {
  try {
    const cfg = await apiCached('/config');
    if (currentPlatform === 'facebook') {
      projectList = (cfg.facebookProjects || []).filter(p => p.id);
    } else {
      projectList = (cfg.projects || []).filter(p => p.id);
    }
    updateProjectSelector();
  } catch (e) { console.warn('loadProjects failed:', e); }
}

// --- Client-side cache ---
const clientCache = {};
const CACHE_TTLS = { stats: 30000, mentions: 60000, users: 120000, reports: 120000, products: 120000, config: 300000 };

function getCacheTTL(path) {
  for (const [key, ttl] of Object.entries(CACHE_TTLS)) {
    if (path.includes(key)) return ttl;
  }
  return 60000;
}

async function apiCached(path) {
  const now = Date.now();
  if (clientCache[path] && clientCache[path].exp > now) {
    return clientCache[path].data;
  }
  const res = await api(path);
  const data = await res.json();
  clientCache[path] = { data, exp: now + getCacheTTL(path) };
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
async function route() {
  // Handle report detail via hash
  const hash = location.hash.slice(1);
  if (hash.startsWith('report/')) { currentTab = 'reports'; updateTabs(); renderReportDetail(hash.slice(7)); return; }

  try {
    if (currentPlatform === 'settings') { await renderGlobalSettings(); return; }
    if (currentTab === 'stats') await renderStats();
    else if (currentTab === 'data') await renderData();
    else if (currentTab === 'reports') await renderReports();
    else if (currentTab === 'users') await renderUsers();
    else if (currentTab === 'products') await renderProducts();
    else if (currentTab === 'config') await renderPlatformConfig();
  } catch (e) {
    console.error('route error:', e);
    app.innerHTML = `<div class="section"><p style="color:var(--red)">页面加载失败: ${e.message}</p><p style="color:var(--text-muted);margin-top:8px">请尝试刷新页面或检查网络连接</p></div>`;
  }
}

async function init() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      $('#login-container').style.display = 'none';
      $('#layout').style.display = 'flex';
      bindSidebarActions();
      await loadProjects();
      updateNav();

      // Project selector
      $('#project-selector').onchange = (e) => {
        currentProject = e.target.value;
        localStorage.setItem('rm-project', currentProject);
        route();
      };

      // Sidebar clicks
      document.querySelectorAll('.sidebar-item').forEach(item => {
        item.onclick = async () => {
          currentPlatform = item.dataset.platform;
          localStorage.setItem('rm-platform', currentPlatform);
          if (currentPlatform === 'settings') currentTab = 'config';
          else if (currentTab === 'config' && currentPlatform !== 'settings') currentTab = 'stats';
          currentProject = ''; localStorage.setItem('rm-project', '');
          if (location.hash) history.replaceState(null, '', location.pathname);
          clearClientCache();
          updateSidebar();
          updateTabs();
          await loadProjects();
          route();
        };
      });

      route();
    }
    else showLogin();
  } catch { showLogin(); }
}

// --- Login ---
function showLogin() {
  // hide layout
  if ($('#layout')) $('#layout').style.display = 'none';
  const loginContainer = $('#login-container');
  loginContainer.style.display = 'block';
  loginContainer.innerHTML = `
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
    if (res.ok) {
      $('#login-container').style.display = 'none';
      $('#layout').style.display = 'flex';
      bindSidebarActions();
      await loadProjects();
      updateNav();

      $('#project-selector').onchange = (e) => {
        currentProject = e.target.value;
        localStorage.setItem('rm-project', currentProject);
        route();
      };
      document.querySelectorAll('.sidebar-item').forEach(item => {
        item.onclick = async () => {
          currentPlatform = item.dataset.platform;
          localStorage.setItem('rm-platform', currentPlatform);
          if (currentPlatform === 'settings') currentTab = 'config';
          else if (currentTab === 'config' && currentPlatform !== 'settings') currentTab = 'stats';
          currentProject = ''; localStorage.setItem('rm-project', '');
          if (location.hash) history.replaceState(null, '', location.pathname);
          clearClientCache();
          updateSidebar();
          updateTabs();
          await loadProjects();
          route();
        };
      });

      currentTab = 'stats'; route();
    }
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

function bindSidebarActions() {
  const logout = $('#nav-logout');
  if (logout) logout.onclick = async (e) => { e.preventDefault(); await fetch('/api/logout', { method: 'POST' }); showLogin(); };
  const langBtn = $('#lang-btn');
  if (langBtn) langBtn.onclick = (e) => { e.preventDefault(); toggleLang(); route(); };
  const refreshBtn = $('#nav-refresh');
  if (refreshBtn) refreshBtn.onclick = async (e) => {
    e.preventDefault();
    clearClientCache();
    try { await api('/refresh', { method: 'POST' }); } catch {}
    route();
  };
}


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
  const sp = new URLSearchParams();
  if (currentProject) sp.set('project', currentProject);
  if (currentPlatform !== 'settings') sp.set('platform', currentPlatform);
  const d = await apiCached('/stats?' + sp.toString());

  const catMap = {};
  d.byCategory.forEach(c => catMap[c.category] = c.count);
  const sMap = {};
  (d.sentiments || []).forEach(s => sMap[s.sentiment] = s.count);

  const maxDay = Math.max(...d.byDay.map(r => r.count), 1);

  // Build line chart SVG
  const days = d.byDay || [];
  const chartW = 700, chartH = 160, padL = 40, padR = 30, padT = 10, padB = 28;
  const innerW = chartW - padL - padR, innerH = chartH - padT - padB;
  let svgChart = '';
  if (days.length > 1) {
    const maxVal = Math.max(...days.map(r => r.count), 1);
    const pts = days.map((r, i) => {
      const x = padL + (i / (days.length - 1)) * innerW;
      const y = padT + innerH - (r.count / maxVal) * innerH;
      return { x, y, count: r.count, label: r.day.slice(5) };
    });
    const line = pts.map(p => `${p.x},${p.y}`).join(' ');
    const area = `${padL},${padT + innerH} ${line} ${pts[pts.length-1].x},${padT + innerH}`;
    // Y-axis labels
    const yLabels = [0, Math.round(maxVal/2), maxVal].map((v, i) => {
      const y = padT + innerH - (v / maxVal) * innerH;
      return `<text x="${padL-6}" y="${y+4}" fill="var(--text-muted)" font-size="10" text-anchor="end">${v}</text><line x1="${padL}" y1="${y}" x2="${padL+innerW}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>`;
    }).join('');
    // X-axis labels (every few days)
    const step = Math.max(1, Math.floor(days.length / 8));
    const xLabels = pts.filter((_, i) => i % step === 0 || i === pts.length - 1)
      .map(p => `<text x="${p.x}" y="${padT + innerH + 18}" fill="var(--text-muted)" font-size="10" text-anchor="middle">${p.label}</text>`).join('');
    // Dots + tooltips
    const dots = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--primary)" opacity="0.8"><title>${p.label}: ${p.count}</title></circle>`).join('');
    svgChart = `<svg viewBox="0 0 ${chartW} ${chartH}" style="width:100%;max-width:${chartW}px;height:auto;overflow:visible">
      ${yLabels}${xLabels}
      <polygon points="${area}" fill="url(#lineGrad)" opacity="0.15"/>
      <polyline points="${line}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round"/>
      ${dots}
      <defs><linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--primary)"/><stop offset="100%" stop-color="transparent"/></linearGradient></defs>
    </svg>`;
  } else if (days.length === 1) {
    svgChart = `<div style="text-align:center;padding:20px;color:var(--text-muted)">${days[0].day.slice(5)}: ${days[0].count} ${t('mentions')}</div>`;
  }

  // Detail table (collapsible)
  const detailRows = (d.byDayDetail || []).slice(-14).reverse();
  const detailTable = detailRows.length ? `
    <details style="margin-top:12px">
      <summary style="cursor:pointer;font-size:12px;color:var(--text-muted)">每日明细（${detailRows.length}天）</summary>
      <table style="margin-top:8px;font-size:12px">
        <thead><tr><th>${t('reportDate')}</th><th>${t('post')}</th><th>${t('comment')}</th><th>${t('positive')}</th><th>${t('negative')}</th><th>${t('neutral')}</th><th>${t('hotPosts')}</th></tr></thead>
        <tbody>${detailRows.map(r => `<tr>
          <td>${r.day}</td><td>${r.posts}</td><td>${r.comments}</td>
          <td style="color:var(--green)">${r.positive}</td><td style="color:var(--red)">${r.negative}</td>
          <td style="color:var(--orange)">${r.neutral}</td><td style="color:var(--primary)">${r.hot_posts}</td>
        </tr>`).join('')}</tbody>
      </table>
    </details>` : '';

  // Top subs/groups (collapsible)
  const topLabel = currentPlatform === 'facebook' ? 'Group' : 'Subreddit';
  const topTitle = currentPlatform === 'facebook' ? '热门 Group' : t('topSubs');
  const topTable = d.topSubs.length ? `
    <details style="margin-top:12px">
      <summary style="cursor:pointer;font-size:12px;color:var(--text-muted)">${topTitle}（${d.topSubs.length}）</summary>
      <table style="margin-top:8px">
        <thead><tr><th>${topLabel}</th><th>${t('mentions')}</th></tr></thead>
        <tbody>${d.topSubs.map(s => `<tr><td>${currentPlatform === 'facebook' ? esc(s.subreddit) : 'r/' + s.subreddit}</td><td>${s.count}</td></tr>`).join('')}</tbody>
      </table>
    </details>` : '';

  // Poll log (collapsible, filtered by platform)
  const platformPolls = (d.recentPolls || []).filter(p =>
    currentPlatform === 'facebook' ? p.round_type === 'facebook' : p.round_type !== 'facebook'
  );
  const pollTable = platformPolls.length ? `
    <details style="margin-top:12px">
      <summary style="cursor:pointer;font-size:12px;color:var(--text-muted)">${t('recentPolls')}（${platformPolls.length}）</summary>
      <table style="margin-top:8px">
        <thead><tr><th>${t('time')}</th><th>${t('type')}</th><th>${t('newItems')}</th><th>${t('duration')}</th><th>${t('errors')}</th></tr></thead>
        <tbody>${platformPolls.map(p => `<tr>
          <td>${fmtTime(p.poll_time)}</td><td>${p.round_type}</td><td>${p.new_items}</td>
          <td>${p.duration_ms ? (p.duration_ms / 1000).toFixed(1) + 's' : '-'}</td>
          <td class="truncate">${p.errors || '-'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </details>` : '';

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
      ${svgChart}
      ${detailTable}
    </div>

    <div class="section">
      ${topTable}
      ${pollTable}
    </div>`;

}

// --- Data ---
let dataState = { page: 1, type: '', timeRange: '7d', search: '', sentiment: '' };

async function renderData() {
  app.innerHTML = skeleton(6);
  const qObj = { ...dataState, limit: 50 };
  if (currentProject) qObj.project = currentProject;
  if (currentPlatform !== 'settings') qObj.platform = currentPlatform;
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
        <thead><tr><th>${t('time')}</th><th style="min-width:50px">${t('type')}</th><th style="min-width:60px">${t('sentiment')}</th><th>${t('author')}</th>${currentPlatform !== 'facebook' ? '<th>Karma</th>' : ''}<th>${t('title_col')}</th><th>${t('aiSummary')}</th><th>${t('score')}</th></tr></thead>
        <tbody>${d.rows.map((r, i) => {
          const isFb = r.id?.startsWith('fb_') || currentPlatform === 'facebook';
          const [authorName, authorUrl] = (r.author || '').split('|||');
          const authorHtml = isFb
            ? (authorUrl ? `<a class="reddit-link" href="${esc(authorUrl)}" target="_blank">${esc(authorName)}</a>` : esc(authorName))
            : `<a class="reddit-link" href="https://reddit.com/u/${r.author}" target="_blank">u/${r.author}</a>`;
          const linkHref = isFb ? (r.permalink || '#') : ('https://reddit.com' + r.permalink);
          const titleText = esc(r.type === 'comment' ? (r.body?.slice(0, 100) || r.title || '-') : (r.title || r.body?.slice(0, 100) || '-'));
          return `<tr data-id="${r.id}" data-idx="${i}" class="data-row">
          <td style="white-space:nowrap">${fmtUtc(r.created_utc)}</td>
          <td style="white-space:nowrap">${r.type === 'post' ? t('post') : t('comment')}</td>
          <td style="white-space:nowrap">${sentimentBadge(r.sentiment)}</td>
          <td style="white-space:nowrap">${authorHtml}</td>
          ${!isFb ? `<td style="color:var(--text-muted);font-size:12px;white-space:nowrap">${r.total_karma != null ? fmtKarma(r.total_karma) : '-'}</td>` : ''}
          <td class="truncate"><a class="reddit-link" href="${linkHref}" target="_blank">${titleText}</a></td>
          <td class="ai-cell" data-idx="${i}"><span class="ai-text">${esc(r.ai_summary || '-')}</span></td>
          <td>${r.score}</td>
        </tr>`}).join('')}</tbody>
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
  const sp = new URLSearchParams();
  if (currentProject) sp.set('project', currentProject);
  if (currentPlatform !== 'settings') sp.set('platform', currentPlatform);
  const reports = await apiCached('/reports?' + sp.toString());

  if (!reports.length) {
    const today2 = new Date().toISOString().slice(0, 10);
    const weekAgo2 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    app.innerHTML = `<div class="section">
      <p style="color:var(--text-muted);margin-bottom:12px">${t('noReports')}</p>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <div class="btn-group" id="summary-quick-btns">
          <button class="btn btn-sm btn-outline sq-btn active" data-days="7">7天</button>
          <button class="btn btn-sm btn-outline sq-btn" data-days="30">30天</button>
          <button class="btn btn-sm btn-outline sq-btn" data-days="90">90天</button>
          <button class="btn btn-sm btn-outline sq-btn" data-days="all">全部</button>
          <button class="btn btn-sm btn-outline sq-btn" data-days="custom">自定义</button>
        </div>
        <input type="date" id="summary-start" value="${weekAgo2}" style="padding:4px 8px;font-size:12px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:6px;color:var(--text)">
        <span style="color:var(--text-muted)">~</span>
        <input type="date" id="summary-end" value="${today2}" style="padding:4px 8px;font-size:12px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:6px;color:var(--text)">
        <button class="btn btn-primary btn-sm" id="gen-summary">${t('genSummary')}</button>
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:10px">
        <span style="font-size:12px;color:var(--text-muted)">${t('genDailyFor')}</span>
        <input type="date" id="daily-date" value="${new Date(Date.now() - 86400000).toISOString().slice(0, 10)}" style="padding:4px 8px;font-size:12px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:6px;color:var(--text)">
        <button class="btn btn-outline btn-sm" id="gen-daily">${t('genDaily')}</button>
      </div>
    </div>`;
    let summaryRange = '7';
    document.querySelectorAll('.sq-btn').forEach(b => { b.onclick = () => {
      document.querySelectorAll('.sq-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); summaryRange = b.dataset.days;
      if (summaryRange !== 'all' && summaryRange !== 'custom') { $('#summary-start').value = new Date(Date.now() - (+summaryRange - 1) * 86400000).toISOString().slice(0, 10); $('#summary-end').value = new Date().toISOString().slice(0, 10); }
    }; });
    const activateCustom = () => { document.querySelectorAll('.sq-btn').forEach(x => x.classList.toggle('active', x.dataset.days === 'custom')); summaryRange = 'custom'; };
    $('#summary-start').onchange = activateCustom;
    $('#summary-end').onchange = activateCustom;
    $('#gen-summary').onclick = async () => {
      if (!projectList.length) await loadProjects();
      const proj = getProjectId();
      if (!proj || proj === 'default') { toast('请先选择项目'); return; }
      const btn = $('#gen-summary'); btn.disabled = true; btn.innerHTML = '<span class="btn-spinner"></span>' + t('generating');
      const body = { project: proj };
      if (summaryRange !== 'all') { body.startDate = $('#summary-start').value; body.endDate = $('#summary-end').value; }
      try { const res = await api('/reports/summary', { method: 'POST', body }); const d = await res.json(); if (d.ok) { clearClientCache(); toast(t('reportGenerated')); renderReports(); } else toast(d.error || 'failed'); } catch (e) { toast(e.message); }
      btn.textContent = t('genSummary'); btn.disabled = false;
    };
    $('#gen-daily').onclick = async () => {
      if (!projectList.length) await loadProjects();
      const proj = getProjectId();
      if (!proj || proj === 'default') { toast('请先选择项目'); return; }
      const date = $('#daily-date').value;
      if (!date) return;
      const btn = $('#gen-daily'); btn.disabled = true; btn.innerHTML = '<span class="btn-spinner"></span>' + t('generating');
      try {
        const res = await api('/reports/regenerate', { method: 'POST', body: { date, project: proj } });
        const d = await res.json();
        if (d.ok) { clearClientCache(); toast(t('reportGenerated')); renderReports(); }
        else toast(d.error || 'failed');
      } catch (e) { toast(e.message); }
      btn.textContent = t('genDaily'); btn.disabled = false;
    };
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  app.innerHTML = `
    <div class="section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <h3 style="margin:0">${t('reports')}</h3>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <div class="btn-group" id="summary-quick-btns">
            <button class="btn btn-sm btn-outline sq-btn active" data-days="7">7天</button>
            <button class="btn btn-sm btn-outline sq-btn" data-days="30">30天</button>
            <button class="btn btn-sm btn-outline sq-btn" data-days="90">90天</button>
            <button class="btn btn-sm btn-outline sq-btn" data-days="all">全部</button>
            <button class="btn btn-sm btn-outline sq-btn" data-days="custom">自定义</button>
          </div>
          <input type="date" id="summary-start" value="${weekAgo}" style="padding:4px 8px;font-size:12px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:6px;color:var(--text)">
          <span style="color:var(--text-muted)">~</span>
          <input type="date" id="summary-end" value="${today}" style="padding:4px 8px;font-size:12px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:6px;color:var(--text)">
          <button class="btn btn-primary btn-sm" id="gen-summary">${t('genSummary')}</button>
        </div>
      </div>
      <table>
        <thead><tr><th>${t('reportTitle')}</th><th>${t('reportDate')}</th><th>${t('reportTotal')}</th><th>${t('positive')}</th><th>${t('negative')}</th><th>${t('neutral')}</th><th></th></tr></thead>
        <tbody>${reports.map(r => `<tr>
          <td><input class="report-title-input" data-rid="${r.id}" value="${esc(r.title || defaultReportTitle(r))}" style="background:transparent;border:1px solid transparent;border-radius:4px;padding:4px 6px;color:${r.title ? 'var(--text)' : 'var(--text-muted)'};font-size:13px;width:160px;transition:.2s" onfocus="this.style.borderColor='var(--primary)';this.style.color='var(--text)'" onblur="this.style.borderColor='transparent'"></td>
          <td style="white-space:nowrap">${r.report_date.replace('summary-', '')}${r.created_at ? '<br><span style="font-size:11px;color:var(--text-muted)">' + fmtTime(r.created_at) + '</span>' : ''}</td>
          <td>${r.total_count}</td>
          <td style="color:var(--green)">${r.positive_count}</td>
          <td style="color:var(--red)">${r.negative_count}</td>
          <td style="color:var(--orange)">${r.neutral_count}</td>
          <td style="white-space:nowrap">
            <a href="#report/${r.report_date}?p=${r.project}" class="btn btn-sm btn-outline" onclick="currentTab='reports'">${t('viewReport')}</a>
            <button class="btn btn-sm btn-outline regen-btn" data-date="${r.report_date}" data-project="${r.project}" style="margin-left:4px">${t('regenerateReport')}</button>
            <button class="btn btn-sm btn-outline del-report-btn" data-id="${r.id}" style="margin-left:4px;color:var(--red)">${t('deleteProject')}</button>
          </td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;

  // Auto-save report title on Enter or blur
  document.querySelectorAll('.report-title-input').forEach(input => {
    const origVal = input.value;
    const save = async () => {
      const val = input.value.trim();
      if (val === origVal) { input.style.color = input.dataset.custom ? 'var(--text)' : 'var(--text-muted)'; return; }
      input.dataset.custom = '1';
      input.style.color = 'var(--text)';
      await api(`/reports/${input.dataset.rid}/title`, { method: 'PUT', body: { title: val } }).catch(()=>{});
      clearClientCache();
    };
    input.onblur = save;
    input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } };
    if (input.closest('tr')) {
      const r = reports.find(x => x.id === +input.dataset.rid);
      if (r?.title) input.dataset.custom = '1';
    }
  });

  document.querySelectorAll('.regen-btn').forEach(btn => {
    btn.onclick = async () => {
      btn.disabled = true;
      btn.innerHTML = '<span class="btn-spinner"></span>' + t('generating');
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

  // Quick date range buttons
  let summaryRange = '7';
  document.querySelectorAll('.sq-btn').forEach(b => { b.onclick = () => {
    document.querySelectorAll('.sq-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); summaryRange = b.dataset.days;
    if (summaryRange !== 'all') { $('#summary-start').value = new Date(Date.now() - (+summaryRange - 1) * 86400000).toISOString().slice(0, 10); $('#summary-end').value = new Date().toISOString().slice(0, 10); }
  }; });
  const activateCustom = () => { document.querySelectorAll('.sq-btn').forEach(x => x.classList.toggle('active', x.dataset.days === 'custom')); summaryRange = 'custom'; };
  $('#summary-start').onchange = activateCustom;
  $('#summary-end').onchange = activateCustom;

  $('#gen-summary').onclick = async () => {
    if (!projectList.length) await loadProjects();
    const proj = getProjectId();
    if (!proj || proj === 'default') { toast('无可用项目'); return; }
    const btn = $('#gen-summary');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>' + t('generating');
    const body = { project: proj };
    if (summaryRange !== 'all') { body.startDate = $('#summary-start').value; body.endDate = $('#summary-end').value; }
    try {
      const res = await api('/reports/summary', { method: 'POST', body });
      const d = await res.json();
      if (d.ok) { clearClientCache(); toast(t('reportGenerated')); renderReports(); }
      else toast(d.error || 'failed');
    } catch (e) { toast(e.message); }
    btn.textContent = t('genSummary');
    btn.disabled = false;
  };

  // Delete report
  document.querySelectorAll('.del-report-btn').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('确定删除此报告？')) return;
      try {
        await api('/reports/' + btn.dataset.id, { method: 'DELETE' });
        clearClientCache(); renderReports();
      } catch (e) { toast(e.message); }
    };
  });
}

async function renderReportDetail(dateAndParams) {
  app.innerHTML = skeleton(2);
  const [date] = dateAndParams.split('?');
  const params = new URLSearchParams(dateAndParams.split('?')[1] || '');
  const project = params.get('p') || '';

  let r;
  try { r = await apiCached(`/reports/${date}?project=${project}`); }
  catch { app.innerHTML = `<div class="section"><p>Report not found</p></div>`; return; }
  if (r.error) { app.innerHTML = `<div class="section"><p>Report not found</p></div>`; return; }

  let topPros = [], topCons = [];
  try { topPros = JSON.parse(r.top_pros || '[]'); } catch {}
  try { topCons = JSON.parse(r.top_cons || '[]'); } catch {}

  app.innerHTML = `
    <div style="margin-bottom:16px">
      <a href="#" id="back-to-reports" class="btn btn-outline btn-sm">&larr; ${t('reports')}</a>
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
        <thead><tr><th style="width:50px">${t('type')}</th><th style="width:100px">${t('author')}</th><th>${t('aiSummary')}</th><th style="width:70px"></th></tr></thead>
        <tbody>${r.negativeItems.map(n => {
          const nFb = n.permalink?.startsWith('http');
          const [nAuthorName, nAuthorUrl] = (n.author||'').split('|||');
          const authorHtml = nFb
            ? (nAuthorUrl ? `<a class="reddit-link" href="${esc(nAuthorUrl)}" target="_blank">${esc(nAuthorName)}</a>` : esc(nAuthorName))
            : `<a class="reddit-link" href="https://reddit.com/u/${n.author}" target="_blank">u/${n.author}</a>`;
          const linkHref = nFb ? n.permalink : ('https://reddit.com' + n.permalink);
          return `<tr>
          <td style="white-space:nowrap">${n.type === 'post' ? t('post') : t('comment')}</td>
          <td style="white-space:nowrap">${authorHtml}</td>
          <td style="color:var(--text-light)">${esc(n.summary || '-')}</td>
          <td style="white-space:nowrap"><a class="btn btn-sm btn-outline" href="${linkHref}" target="_blank" style="white-space:nowrap">${t('goReply')}</a></td>
        </tr>`}).join('')}</tbody>
      </table>
    </div>` : ''}
    <div class="section">
      <div class="report-content">${markdownToHtml(r.full_report || '')}</div>
    </div>`;

  $('#back-to-reports').onclick = (e) => {
    e.preventDefault();
    history.replaceState(null, '', location.pathname);
    currentTab = 'reports';
    updateTabs();
    route();
  };
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
  if (currentPlatform === 'facebook' && userState.sort === 'karma') userState.sort = 'activity';
  const qObj = { ...userState, limit: 50 };
  if (currentProject) qObj.project = currentProject;
  if (currentPlatform !== 'settings') qObj.platform = currentPlatform;
  const q = new URLSearchParams(qObj).toString();
  const d = await apiCached('/users?' + q);

  app.innerHTML = `
    <div class="section">
      <div class="filters">
        <select id="u-sort">
          ${currentPlatform !== 'facebook' ? `<option value="karma" ${userState.sort === 'karma' ? 'selected' : ''}>${t('sortKarma')}</option>` : ''}
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
          ${currentPlatform !== 'facebook' ? '<th>Karma</th>' : ''}
          <th>${t('totalActivity')}</th>
          <th>${t('posts')}</th>
          <th>${t('comments')}</th>
          <th>${t('positive')}/${t('negative')}</th>
          <th>${t('lastSeen')}</th>
          ${currentPlatform !== 'facebook' ? `<th>${t('accountAge')}</th>` : ''}
        </tr></thead>
        <tbody>${d.rows.map((r, i) => {
          const rank = (d.page - 1) * 50 + i + 1;
          const isFb = currentPlatform === 'facebook';
          return `<tr>
            <td style="color:var(--text-muted)">${rank}</td>
            <td>${isFb ? (() => { const [n,u] = (r.author||'').split('|||'); return u ? `<a class="reddit-link" href="${esc(u)}" target="_blank">${esc(n)}</a>` : esc(n); })() : `<a class="reddit-link" href="https://reddit.com/u/${r.author}" target="_blank">u/${r.author}</a>`}</td>
            ${!isFb ? `<td style="font-weight:700;color:var(--primary)">${r.total_karma != null ? fmtKarma(r.total_karma) : '-'}</td>` : ''}
            <td style="font-weight:600">${r.total_count}</td>
            <td>${r.post_count}</td>
            <td>${r.comment_count}</td>
            <td><span style="color:var(--green)">${r.positive_count || 0}</span> / <span style="color:var(--red)">${r.negative_count || 0}</span></td>
            <td>${fmtUtc(r.last_seen)}</td>
            ${!isFb ? `<td style="color:var(--text-muted);font-size:12px">${r.account_created_utc ? fmtAge(r.account_created_utc) : '-'}</td>` : ''}
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
function getProjectId() {
  return currentProject || projectList.find(p => p.enabled !== false)?.id || 'default';
}

async function renderProducts() {
  app.innerHTML = skeleton(4);
  if (!projectList.length) await loadProjects();
  const proj = getProjectId();
  const products = await apiCached('/products?project=' + proj);

  app.innerHTML = `
    <div class="section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <h3 style="margin:0">${t('products')}
          <select id="product-project-select" style="margin-left:8px;font-size:12px;padding:4px 8px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:6px;color:var(--text)">
            ${projectList.map(p => `<option value="${p.id}" ${proj === p.id ? 'selected' : ''}>${p.name || p.id}</option>`).join('')}
          </select>
          <span style="font-size:13px;color:var(--text-muted);margin-left:8px">${t('totalResults').replace('{n}', products.length)}</span>
        </h3>
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
          <button class="btn btn-outline btn-sm" id="cancel-product-btn">${t('cancelBtn')}</button>
        </div>
      </div>
      <div id="batch-bar" style="display:none;margin-bottom:12px;padding:10px 14px;background:rgba(255,61,113,0.08);border:1px solid rgba(255,61,113,0.2);border-radius:8px;display:flex;align-items:center;gap:10px">
        <label style="font-size:13px;cursor:pointer"><input type="checkbox" id="select-all"> ${t('selectAll')}</label>
        <span id="selected-count" style="font-size:12px;color:var(--text-muted)"></span>
        <div style="flex:1"></div>
        <button class="btn btn-sm" id="batch-delete-btn" style="background:var(--red);color:#fff">${t('batchDelete')}</button>
      </div>
      ${!products.length ? `<p style="color:var(--text-muted)">${t('noProducts')}</p>` : ''}
      <div id="products-container">
        ${products.map(p => {
          const specs = JSON.parse(p.specs || '{}');
          const specEntries = Object.entries(specs);
          return `
          <div class="project-card" data-pid="${p.id}">
            <div class="project-header" style="cursor:pointer">
              <div style="display:flex;align-items:center;gap:8px;flex:1">
                <input type="checkbox" class="product-check" data-pid="${p.id}" onclick="event.stopPropagation()">
                <h4 class="toggle-specs" data-pid="${p.id}" style="margin:0">${esc(p.name)} <span style="font-size:12px;color:var(--text-muted)">(${specEntries.length} ${t('productSpecs')})</span></h4>
              </div>
              <div class="btn-group">
                <button class="btn btn-outline btn-sm edit-product-btn" data-pid="${p.id}">${t('editProduct')}</button>
                <button class="btn btn-outline btn-sm del-product-btn" data-pid="${p.id}">${t('deleteProject')}</button>
              </div>
            </div>
            <div class="specs-body" id="specs-${p.id}" style="display:none">
              <table style="font-size:12px">
                <tbody>${specEntries.map(([k, v]) => `<tr><td style="color:var(--text-muted);width:140px;white-space:nowrap">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody>
              </table>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div id="confirm-modal" class="modal" style="display:none">
      <div class="modal-content" style="max-width:380px;text-align:center">
        <p id="confirm-msg" style="font-size:15px;margin-bottom:20px"></p>
        <div class="btn-group" style="justify-content:center">
          <button class="btn btn-outline btn-sm" id="confirm-cancel">${t('cancelBtn')}</button>
          <button class="btn btn-sm" id="confirm-ok" style="background:var(--red);color:#fff">${t('confirmDelete')}</button>
        </div>
      </div>
    </div>`;

  // Project selector on products page
  $('#product-project-select').onchange = (e) => {
    currentProject = e.target.value;
    localStorage.setItem('rm-project', currentProject);
    updateProjectSelector();
    renderProducts();
  };

  // Upload handler
  $('#xlsx-upload-btn').onclick = () => {
    $('#xlsx-upload').value = '';
    $('#xlsx-upload').click();
  };
  $('#xlsx-upload').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const uploadProj = getProjectId();
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
        const res = await api('/products/upload', { method: 'POST', body: { project: uploadProj, data: base64 } });
        const d = await res.json();
        if (d.error) { toast('Error: ' + d.error); return; }
        if (d.ok) {
          clearClientCache();
          const msg = `${t('uploadSuccess').replace('{n}', d.total || d.count)}${d.updated ? ` (${d.added} ${t('newItems')}, ${d.updated} ${t('updatedItems')})` : ''}`;
          toast(msg);
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

  // Custom confirm modal helper
  function showConfirm(msg) {
    return new Promise((resolve) => {
      const modal = $('#confirm-modal');
      $('#confirm-msg').textContent = msg;
      modal.style.display = 'flex';
      $('#confirm-ok').onclick = () => { modal.style.display = 'none'; resolve(true); };
      $('#confirm-cancel').onclick = () => { modal.style.display = 'none'; resolve(false); };
      modal.onclick = (e) => { if (e.target === modal) { modal.style.display = 'none'; resolve(false); } };
    });
  }

  // Checkbox state tracking
  function updateBatchBar() {
    const checks = document.querySelectorAll('.product-check');
    const checked = document.querySelectorAll('.product-check:checked');
    const bar = $('#batch-bar');
    bar.style.display = checks.length ? 'flex' : 'none';
    $('#selected-count').textContent = checked.length ? `${checked.length} / ${checks.length}` : '';
    $('#batch-delete-btn').style.display = checked.length ? '' : 'none';
    $('#select-all').checked = checks.length > 0 && checked.length === checks.length;
  }

  document.querySelectorAll('.product-check').forEach(cb => { cb.onchange = updateBatchBar; });
  $('#select-all').onchange = (e) => {
    document.querySelectorAll('.product-check').forEach(cb => { cb.checked = e.target.checked; });
    updateBatchBar();
  };
  updateBatchBar();

  // Batch delete
  $('#batch-delete-btn').onclick = async () => {
    const ids = [...document.querySelectorAll('.product-check:checked')].map(cb => cb.dataset.pid);
    if (!ids.length) return;
    const ok = await showConfirm(t('batchDeleteConfirm').replace('{n}', ids.length));
    if (!ok) return;
    for (const id of ids) { await api(`/products/${id}`, { method: 'DELETE' }); }
    clearClientCache();
    renderProducts();
  };

  // Single delete
  document.querySelectorAll('.del-product-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const p = products.find(x => x.id === +btn.dataset.pid);
      const ok = await showConfirm(t('deleteOneConfirm').replace('{name}', p?.name || ''));
      if (!ok) return;
      await api(`/products/${btn.dataset.pid}`, { method: 'DELETE' });
      clearClientCache();
      renderProducts();
    };
  });

  // Toggle specs (click product name)
  document.querySelectorAll('.toggle-specs').forEach(h => {
    h.onclick = () => {
      const pid = h.dataset.pid;
      const body = $(`#specs-${pid}`);
      if (!body) return;
      const isOpen = body.style.display !== 'none';
      // Close all
      document.querySelectorAll('.specs-body').forEach(b => b.style.display = 'none');
      if (!isOpen) body.style.display = 'block';
    };
  });

  // Edit product
  document.querySelectorAll('.edit-product-btn').forEach(btn => {
    btn.onclick = () => {
      const pid = +btn.dataset.pid;
      const p = products.find(x => x.id === pid);
      if (!p) return;
      const body = $(`#specs-${pid}`);
      const isEditing = body.dataset.editing === '1';

      if (isEditing) {
        // Cancel edit — restore read-only view
        body.dataset.editing = '0';
        btn.textContent = t('editProduct');
        const specs = JSON.parse(p.specs || '{}');
        body.innerHTML = `<table style="font-size:12px"><tbody>${Object.entries(specs).map(([k, v]) => `<tr><td style="color:var(--text-muted);width:140px;white-space:nowrap">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;
        return;
      }

      // Enter edit mode
      body.dataset.editing = '1';
      body.style.display = 'block';
      btn.textContent = t('all'); // "取消" uses existing i18n
      const specs = JSON.parse(p.specs || '{}');
      body.innerHTML = `
        <div class="form-group"><label>${t('productName')}</label><input id="edit-name-${pid}" value="${esc(p.name)}" autocomplete="off"></div>
        <div id="edit-specs-${pid}">
          ${Object.entries(specs).map(([k, v]) => `<div class="form-row" style="margin-bottom:4px"><div class="form-group" style="margin:0"><input class="spec-key" value="${esc(k)}" autocomplete="off"></div><div class="form-group" style="margin:0"><input class="spec-val" value="${esc(v)}" autocomplete="off"></div></div>`).join('')}
        </div>
        <div class="btn-group" style="margin-top:8px">
          <button class="btn btn-outline btn-sm add-edit-spec">${t('addSpec')}</button>
          <button class="btn btn-primary btn-sm save-edit-btn">${t('saveConfig')}</button>
        </div>`;

      body.querySelector('.add-edit-spec').onclick = (e) => {
        e.stopPropagation();
        const container = $(`#edit-specs-${pid}`);
        const row = document.createElement('div');
        row.className = 'form-row';
        row.style.marginBottom = '4px';
        row.innerHTML = `<div class="form-group" style="margin:0"><input class="spec-key" placeholder="${t('specKey')}" autocomplete="off"></div><div class="form-group" style="margin:0"><input class="spec-val" placeholder="${t('specVal')}" autocomplete="off"></div>`;
        container.appendChild(row);
      };

      body.querySelector('.save-edit-btn').onclick = async (e) => {
        e.stopPropagation();
        const name = $(`#edit-name-${pid}`).value.trim();
        if (!name) return;
        const newSpecs = {};
        $(`#edit-specs-${pid}`).querySelectorAll('.form-row').forEach(row => {
          const k = row.querySelector('.spec-key').value.trim();
          const v = row.querySelector('.spec-val').value.trim();
          if (k) newSpecs[k] = v;
        });
        await api(`/products/${pid}`, { method: 'PUT', body: { name, specs: newSpecs } });
        clearClientCache();
        toast(t('configSaved'));
        renderProducts();
      };
    };
  });
}

// --- Platform Config (Reddit or Facebook specific) ---
async function renderPlatformConfig() {
  if (currentPlatform === 'reddit') return renderConfig();
  if (currentPlatform === 'facebook') return renderFacebookConfig();
}

// --- Facebook Config ---
let fbScreenshotTimer = null;

async function renderFacebookConfig() {
  app.innerHTML = skeleton(3);
  let cfg;
  try { cfg = await apiCached('/config'); } catch { cfg = {}; }
  const fb = cfg.facebook || {};

  let browserStatus = {};
  try { browserStatus = await api('/fb-browser/status').then(r => r.json()); } catch {}

  const browserRunning = browserStatus.running;
  const cookieLoggedIn = browserStatus.cookies?.loggedIn;

  app.innerHTML = `
    <div class="section">
      <h3>Facebook 浏览器自动化</h3>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Stealth 浏览器抓取 Facebook Group 数据（反检测模式）</p>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
        <button class="btn ${browserRunning ? 'btn-outline' : 'btn-primary'} btn-sm" id="fb-browser-start" ${browserRunning ? 'disabled' : ''}>
          ${browserRunning ? '浏览器运行中' : '启动浏览器'}
        </button>
        <button class="btn btn-outline btn-sm" id="fb-browser-save-cookies" ${!browserRunning ? 'disabled' : ''}>保存 Cookies 并关闭</button>
        <span id="fb-browser-status" style="font-size:12px;color:var(--text-muted)">
          Cookie: ${cookieLoggedIn ? '<span style="color:var(--green)">已登录</span>' : '<span style="color:var(--orange)">未登录</span>'}
          (${browserStatus.cookies?.count || 0} cookies)
        </span>
      </div>
      <details style="margin-bottom:12px">
        <summary style="cursor:pointer;font-size:13px;color:var(--text-muted)">手动导入 Cookies（从其他已登录的环境复制）</summary>
        <div style="margin-top:8px">
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">粘贴 JSON 格式的 Facebook Cookies 数组，至少需要 c_user 和 xs</p>
          <textarea id="fb-cookies-input" rows="4" placeholder='[{"name":"c_user","value":"...","domain":".facebook.com"},{"name":"xs","value":"...","domain":".facebook.com"}]' style="width:100%;padding:8px;font-size:12px;font-family:monospace;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text);resize:vertical"></textarea>
          <div style="margin-top:6px;display:flex;gap:8px;align-items:center">
            <button class="btn btn-primary btn-sm" id="fb-import-cookies">导入 Cookies</button>
            <button class="btn btn-outline btn-sm" id="fb-export-cookies" ${!cookieLoggedIn ? 'disabled' : ''}>导出当前 Cookies</button>
            <button class="btn btn-outline btn-sm" id="fb-clear-cookies" style="color:var(--red)">清空 Cookies</button>
            <span id="fb-cookies-result" style="font-size:12px"></span>
          </div>
        </div>
      </details>
      <div id="fb-browser-view" style="display:${browserRunning ? 'block' : 'none'};margin-bottom:16px">
        <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;background:#000;cursor:crosshair;max-width:600px" id="fb-screen-container">
          <img id="fb-screenshot" style="width:100%;display:block" alt="Browser view">
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input type="text" id="fb-type-input" placeholder="先点击截图中的输入框，再在这里输入文字回车发送" style="flex:1;min-width:250px;padding:8px 12px;font-size:14px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:6px;color:var(--text)" autocomplete="off">
          <button class="btn btn-outline btn-sm" id="fb-send-enter" title="发送回车键">Enter</button>
          <button class="btn btn-outline btn-sm" id="fb-send-tab" title="发送Tab键">Tab</button>
          <button class="btn btn-outline btn-sm" id="fb-scroll-up" title="向上滚动">&#9650;</button>
          <button class="btn btn-outline btn-sm" id="fb-scroll-down" title="向下滚动">&#9660;</button>
        </div>
        <div style="margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input type="text" id="fb-nav-url" placeholder="输入 URL 导航..." style="flex:1;min-width:200px;padding:6px 10px;font-size:13px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--text)" autocomplete="off">
          <button class="btn btn-outline btn-sm" id="fb-nav-go">导航</button>
        </div>
      </div>
    </div>

    <div class="section">
      <h3>${t('projects')} — Facebook</h3>
      <div id="fb-projects-list"></div>
      <div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-outline" id="fb-add-project">${t('addProject')}</button>
        <button class="btn btn-primary btn-sm" id="fb-scrape-all">立即抓取全部 Group</button>
        <button class="btn btn-outline btn-sm" id="fb-fix-authors">修复 Unknown 作者</button>
        <span id="fb-scrape-status" style="font-size:12px;color:var(--text-muted)"></span>
      </div>
      <pre id="fb-scrape-log" style="font-size:11px;color:var(--text-muted);background:rgba(0,0,0,0.2);padding:10px;border-radius:6px;max-height:200px;overflow-y:auto;white-space:pre-wrap;display:none;margin-top:10px"></pre>
    </div>

    <div style="margin-top:16px">
      <button class="btn btn-primary" id="save-fb-config">${t('saveConfig')}</button>
    </div>
    <div class="floating-save">
      <button class="btn btn-primary" id="save-fb-config-float">${t('saveConfig')}</button>
    </div>`;

  // Render Facebook projects (same structure as Reddit)
  const fbProjectsList = $('#fb-projects-list');
  const fbProjects = JSON.parse(JSON.stringify(cfg.facebookProjects || []));

  function renderFbProjects() {
    fbProjectsList.innerHTML = fbProjects.map((p, i) => `
      <div class="project-card" data-idx="${i}">
        <div class="project-header">
          <h4>${esc(p.name || p.id || 'Project ' + (i + 1))}</h4>
          <div class="btn-group">
            <label style="font-size:12px"><input type="checkbox" class="fp-enabled" ${p.enabled !== false ? 'checked' : ''}> ${t('enabled')}</label>
            <button class="btn btn-outline btn-sm fp-del">${t('deleteProject')}</button>
          </div>
        </div>
        <input type="hidden" class="fp-id" value="${esc(p.id || '')}">
        <div class="form-group"><label>${t('projectName')}</label><input class="fp-name" value="${esc(p.name || '')}" autocomplete="off"></div>
        <div class="form-group"><label>${t('reportRole')}</label><textarea class="fp-role" rows="2" placeholder="${t('reportRoleHint')}">${esc(p.reportRole || '')}</textarea></div>
        <div class="form-group"><label>${t('fbGroups')}</label><textarea class="fp-groups" rows="3" placeholder="groupId:名称，每行一个">${(p.facebookGroups || []).map(g => typeof g === 'string' ? g : g.groupId + ':' + (g.name || '')).join('\n')}</textarea></div>
      </div>`).join('');

    document.querySelectorAll('.fp-del').forEach(btn => {
      btn.onclick = () => {
        fbProjects.splice(+btn.closest('.project-card').dataset.idx, 1);
        renderFbProjects();
      };
    });
  }
  renderFbProjects();

  $('#fb-add-project').onclick = () => {
    fbProjects.push({ id: 'fb_' + Date.now().toString(36), name: '', enabled: true, facebookGroups: [] });
    renderFbProjects();
  };

  const doSaveFb = async () => {
    const lines = v => v.split('\n').map(s => s.trim()).filter(Boolean);
    const cards = document.querySelectorAll('.project-card');
    const updatedProjects = [...cards].map((c, i) => {
      const groups = lines(c.querySelector('.fp-groups').value).map(l => {
        const [gid, ...rest] = l.split(':');
        return { groupId: gid.trim(), name: rest.join(':').trim() || gid.trim() };
      });
      const name = c.querySelector('.fp-name').value.trim();
      const existingId = c.querySelector('.fp-id').value.trim();
      return {
        ...(fbProjects[i] || {}),
        id: existingId || name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'fb_' + Date.now().toString(36),
        name,
        reportRole: c.querySelector('.fp-role').value.trim(),
        enabled: c.querySelector('.fp-enabled').checked,
        facebookGroups: groups,
      };
    });
    try {
      await api('/config', { method: 'PUT', body: { facebookProjects: updatedProjects } });
      clearClientCache();
      toast(t('configSaved'));
    } catch (e) { toast(t('saveFailed') + e.message); }
  };
  $('#save-fb-config').onclick = doSaveFb;
  $('#save-fb-config-float').onclick = doSaveFb;

  // --- Browser automation handlers ---
  if (fbScreenshotTimer) { clearInterval(fbScreenshotTimer); fbScreenshotTimer = null; }

  $('#fb-browser-start').onclick = async () => {
    const btn = $('#fb-browser-start');
    btn.disabled = true; btn.textContent = '启动中...';
    try {
      const res = await api('/fb-browser/start', { method: 'POST' });
      const d = await res.json();
      if (d.ok || d.error) { clearClientCache(); renderFacebookConfig(); }
    } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = '启动浏览器'; }
  };

  $('#fb-browser-save-cookies').onclick = async () => {
    try {
      const res = await api('/fb-browser/save-cookies', { method: 'POST' });
      const d = await res.json();
      toast(d.loggedIn ? `Cookies 已保存，已登录` : `Cookies 已保存，未检测到登录状态`);
      // Auto stop browser after saving
      await api('/fb-browser/stop', { method: 'POST' }).catch(() => {});
      if (fbScreenshotTimer) { clearInterval(fbScreenshotTimer); fbScreenshotTimer = null; }
      clearClientCache(); renderFacebookConfig();
    } catch (e) { toast(e.message); }
  };

  // Screenshot streaming
  if (browserRunning) {
    const img = $('#fb-screenshot');
    const refreshShot = () => { img.src = '/api/fb-browser/screenshot?t=' + Date.now(); };
    refreshShot();
    fbScreenshotTimer = setInterval(refreshShot, 1500);

    const container = $('#fb-screen-container');
    container.onclick = async (e) => {
      if (e.target.id === 'fb-type-input' || e.target.tagName === 'BUTTON') return;
      const rect = img.getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left) * 800 / rect.width);
      const y = Math.round((e.clientY - rect.top) * 500 / rect.height);
      await api('/fb-browser/action', { method: 'POST', body: { action: 'click', x, y } }).catch(() => {});
    };

    const fbAction = (body) => api('/fb-browser/action', { method: 'POST', body }).catch(() => {});
    const typeInput = $('#fb-type-input');
    typeInput.onkeydown = async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (typeInput.value) {
          await fbAction({ action: 'type', text: typeInput.value });
          typeInput.value = '';
        } else {
          await fbAction({ action: 'press', key: 'Enter' });
        }
      } else if (e.key === 'Escape') {
        await fbAction({ action: 'press', key: 'Escape' });
      }
    };

    $('#fb-send-enter').onclick = () => fbAction({ action: 'press', key: 'Enter' });
    $('#fb-send-tab').onclick = () => fbAction({ action: 'press', key: 'Tab' });
    $('#fb-scroll-up').onclick = (e) => { e.stopPropagation(); fbAction({ action: 'scroll', deltaY: -500 }); };
    $('#fb-scroll-down').onclick = (e) => { e.stopPropagation(); fbAction({ action: 'scroll', deltaY: 500 }); };
  }

  $('#fb-nav-go').onclick = async () => { const url = $('#fb-nav-url').value.trim(); if (url) await api('/fb-browser/navigate', { method: 'POST', body: { url } }).catch(e => toast(e.message)); };
  $('#fb-nav-url').onkeydown = (e) => { if (e.key === 'Enter') $('#fb-nav-go').click(); };

  // Scrape handlers
  const updateScrapeLog = async () => {
    try {
      const res = await api('/fb-browser/scrape-status'); const d = await res.json();
      const logEl = $('#fb-scrape-log'); const statusEl = $('#fb-scrape-status');
      if (d.log?.length) { logEl.style.display = 'block'; logEl.textContent = d.log.join('\n'); logEl.scrollTop = logEl.scrollHeight; }
      if (d.running) { statusEl.innerHTML = '<span style="color:var(--orange)">抓取中...</span>'; return true; }
      else { statusEl.textContent = d.log?.length ? '抓取完成' : ''; return false; }
    } catch { return false; }
  };
  const pollScrapeStatus = () => { const timer = setInterval(async () => { if (!(await updateScrapeLog())) clearInterval(timer); }, 2000); };

  $('#fb-scrape-all').onclick = async () => {
    try { const res = await api('/fb-browser/scrape-all', { method: 'POST' }); const d = await res.json(); if (d.ok) { toast(d.message); pollScrapeStatus(); } else toast(d.error || 'failed'); } catch (e) { toast(e.message); }
  };
  $('#fb-fix-authors').onclick = async () => {
    try { const res = await api('/fb-browser/fix-authors', { method: 'POST' }); const d = await res.json(); if (d.ok) { toast(d.message); pollScrapeStatus(); } else toast(d.error || 'failed'); } catch (e) { toast(e.message); }
  };
  // Cookie import/export/clear
  $('#fb-import-cookies').onclick = async () => {
    const resultEl = $('#fb-cookies-result');
    try {
      const raw = $('#fb-cookies-input').value.trim();
      if (!raw) { resultEl.textContent = '请粘贴 Cookies JSON'; resultEl.style.color = 'var(--red)'; return; }
      const cookies = JSON.parse(raw);
      const res = await api('/fb-browser/import-cookies', { method: 'POST', body: { cookies } });
      const d = await res.json();
      if (d.ok) { resultEl.textContent = `导入成功 (${d.count} cookies)`; resultEl.style.color = 'var(--green)'; clearClientCache(); setTimeout(() => renderFacebookConfig(), 1000); }
      else { resultEl.textContent = d.error; resultEl.style.color = 'var(--red)'; }
    } catch (e) { resultEl.textContent = 'JSON 格式错误: ' + e.message; resultEl.style.color = 'var(--red)'; }
  };

  $('#fb-export-cookies').onclick = async () => {
    try {
      const res = await api('/fb-browser/export-cookies');
      const d = await res.json();
      if (d.cookies?.length) {
        $('#fb-cookies-input').value = JSON.stringify(d.cookies, null, 2);
        toast('Cookies 已导出到文本框，可复制');
      } else { toast('没有已保存的 Cookies'); }
    } catch (e) { toast(e.message); }
  };

  $('#fb-clear-cookies').onclick = async () => {
    if (!confirm('确定清空所有 Facebook Cookies？')) return;
    try {
      await api('/fb-browser/clear-cookies', { method: 'POST' });
      clearClientCache(); toast('Cookies 已清空');
      renderFacebookConfig();
    } catch (e) { toast(e.message); }
  };

  updateScrapeLog();
}

// --- Global Settings (AI, proxy, password) ---
async function renderGlobalSettings() {
  app.innerHTML = skeleton(3);
  let cfg;
  try { cfg = await apiCached('/config'); } catch { cfg = {}; }

  app.innerHTML = `
    <div class="section">
      <h3>${t('aiSetting')}</h3>
      <div class="form-row">
        <div class="form-group"><label>${t('aiEndpoint')}</label><input id="c-ai-endpoint" value="${cfg.ai?.endpoint || ''}" autocomplete="off"></div>
        <div class="form-group"><label>${t('aiKey')}</label><input id="c-ai-key" type="password" value="" autocomplete="new-password" placeholder="${t('unchangedHint')}"></div>
        <div class="form-group"><label>${t('aiModel')}</label><input id="c-ai-model" value="${cfg.ai?.model || 'claude-sonnet-4-20250514'}" autocomplete="off"></div>
      </div>
      <div style="margin-top:8px;display:flex;gap:10px;align-items:center">
        <button class="btn btn-outline btn-sm" id="test-ai">${t('testAi')}</button>
        <span id="test-ai-result" style="font-size:13px"></span>
      </div>
    </div>

    <div class="section">
      <h3>${t('localProxySetting')}</h3>
      <div class="form-row">
        <div class="form-group"><label>${t('enabled')}</label><select id="c-lp-enabled"><option value="true" ${cfg.localProxy?.enabled ? 'selected' : ''}>Yes</option><option value="false" ${!cfg.localProxy?.enabled ? 'selected' : ''}>No</option></select></div>
        <div class="form-group"><label>${t('host')}</label><input id="c-lp-host" value="${cfg.localProxy?.host || '127.0.0.1'}" autocomplete="off"></div>
        <div class="form-group"><label>${t('port')}</label><input id="c-lp-port" type="number" value="${cfg.localProxy?.port || 10808}" autocomplete="off"></div>
      </div>
    </div>

    <div class="section">
      <h3>${t('pollSetting')}</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
        <div class="form-group"><label>Reddit 轮询间隔（分钟）</label><input id="c-interval" type="number" value="${cfg.pollIntervalMinutes || 8}" style="width:120px" autocomplete="off"></div>
        <div class="form-group"><label>Facebook 抓取间隔（小时）</label><input id="c-fb-interval" type="number" value="${cfg.fbPollIntervalHours || 6}" style="width:120px" autocomplete="off"></div>
        <div class="form-group"><label>Facebook 滚动次数</label><input id="c-fb-scrolls" type="number" value="${cfg.fbScrollCount || 20}" style="width:120px" autocomplete="off"></div>
      </div>
      <div class="form-group"><label>${t('webPwd')}</label><input id="c-webpwd" type="password" value="" autocomplete="new-password" placeholder="${t('unchangedHint')}"></div>
    </div>

    <div style="margin-top:16px">
      <button class="btn btn-primary" id="save-global">${t('saveConfig')}</button>
    </div>
    <div class="floating-save">
      <button class="btn btn-primary" id="save-global-float">${t('saveConfig')}</button>
    </div>`;

  const doSaveGlobal = async () => {
    const update = {
      pollIntervalMinutes: +$('#c-interval').value || 8,
      fbPollIntervalHours: +$('#c-fb-interval').value || 6,
      fbScrollCount: +$('#c-fb-scrolls').value || 20,
      localProxy: { enabled: $('#c-lp-enabled').value === 'true', host: $('#c-lp-host').value.trim() || '127.0.0.1', port: +$('#c-lp-port').value || 10808 },
      ai: { endpoint: $('#c-ai-endpoint').value.trim(), model: $('#c-ai-model').value.trim() },
    };
    const aiKey = $('#c-ai-key').value;
    if (aiKey) update.ai.apiKey = aiKey;
    const webpwd = $('#c-webpwd').value;
    if (webpwd) update.webPassword = webpwd;
    try {
      await api('/config', { method: 'PUT', body: update });
      clearClientCache();
      toast(t('configSaved'));
    } catch (e) { toast(t('saveFailed') + e.message); }
  };
  $('#save-global').onclick = doSaveGlobal;
  $('#save-global-float').onclick = doSaveGlobal;

  $('#test-ai').onclick = async () => {
    const result = $('#test-ai-result');
    result.textContent = t('testAiTesting');
    result.style.color = 'var(--text-muted)';
    try {
      const res = await api('/ai-test');
      const d = await res.json();
      if (d.ok) { result.textContent = t('testAiOk') + (d.model ? ` (${d.model})` : ''); result.style.color = 'var(--green)'; }
      else { result.textContent = t('testAiFail') + (d.error || ''); result.style.color = 'var(--red)'; }
    } catch (e) { result.textContent = t('testAiFail') + e.message; result.style.color = 'var(--red)'; }
  };
}

// --- Reddit Config (project subreddits, proxy, keywords) ---
async function renderConfig() {
  app.innerHTML = skeleton(3);
  const cfg = await apiCached('/config');

  app.innerHTML = `
    <div class="section">
      <h3>${t('projects')} — Reddit</h3>
      <div id="projects-list"></div>
      <button class="btn btn-outline" id="add-project" style="margin-top:10px">${t('addProject')}</button>
    </div>
    <div style="margin-top:16px"><button class="btn btn-primary" id="save-config">${t('saveConfig')}</button></div>
    <div class="floating-save"><button class="btn btn-primary" id="save-config-float">${t('saveConfig')}</button></div>`;

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
        <input type="hidden" class="p-id" value="${esc(p.id || '')}">
        <div class="form-group"><label>${t('projectName')}</label><input class="p-name" value="${esc(p.name || '')}" autocomplete="off"></div>
        <div class="form-group"><label>${t('reportRole')}</label><textarea class="p-role" rows="2" placeholder="${t('reportRoleHint')}">${esc(p.reportRole || '')}</textarea></div>
        <div class="form-group"><label>${t('subreddits')}</label><textarea class="p-subs">${(p.subreddits || []).join('\n')}</textarea></div>
      </div>`).join('');
    document.querySelectorAll('.del-project').forEach(btn => {
      btn.onclick = () => { projects.splice(+btn.closest('.project-card').dataset.idx, 1); renderProjects(projects); };
    });
  }

  const projects = cfg.projects || [];
  renderProjects(projects);

  $('#add-project').onclick = () => {
    projects.push({ id: 'rd_' + Date.now().toString(36), name: '', enabled: true, subreddits: [] });
    renderProjects(projects);
  };

  const doSave = async () => {
    const lines = v => v.split('\n').map(s => s.trim()).filter(Boolean);
    const cards = document.querySelectorAll('.project-card');
    const updatedProjects = [...cards].map(c => {
      const name = c.querySelector('.p-name').value.trim();
      const existingId = c.querySelector('.p-id').value.trim();
      return {
        ...((cfg.projects || [])[+c.dataset.idx] || {}),
        id: existingId || name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'rd_' + Date.now().toString(36),
        name,
        reportRole: c.querySelector('.p-role').value.trim(),
        enabled: c.querySelector('.p-enabled').checked,
        subreddits: lines(c.querySelector('.p-subs').value),
      };
    });
    try {
      await api('/config', { method: 'PUT', body: { projects: updatedProjects } });
      clearClientCache();
      toast(t('configSaved'));
    } catch (e) { toast(t('saveFailed') + e.message); }
  };
  $('#save-config').onclick = doSave;
  $('#save-config-float').onclick = doSave;
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

function defaultReportTitle(r) {
  if (r.report_date.startsWith('summary')) return `${r.project} 汇总报告`;
  return `${r.project} ${r.report_date} 日报`;
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
window.addEventListener('hashchange', () => {
  const hash = location.hash.slice(1);
  if (hash.startsWith('report/')) {
    currentTab = 'reports';
    updateTabs();
    route();
  } else if (!hash || hash === '') {
    // Back from report detail
    updateTabs();
    route();
  }
});
init();
