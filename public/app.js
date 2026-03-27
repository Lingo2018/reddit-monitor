const $ = s => document.querySelector(s);
const app = $('#app');
const navbar = $('#navbar');

// --- i18n ---
const i18n = {
  zh: {
    title: 'Reddit 监控',
    stats: '概览', data: '数据', config: '配置', logout: '退出',
    password: '请输入密码', login: '登录', wrongPwd: '密码错误',
    loading: '加载中...',
    totalMentions: '总提及', unread: '未读', brand: '品牌', industry: '行业',
    competitor: '竞对', subreddit: 'Subreddit',
    last30d: '近30天提及趋势', topSubs: '热门 Subreddit', recentPolls: '轮询日志',
    time: '时间', type: '类型', newItems: '新增', duration: '耗时', errors: '错误',
    mentions: '提及',
    allCat: '全部分类', last24h: '近24小时', last7d: '近7天', last30dOpt: '近30天',
    allTime: '全部时间', all: '全部', unreadOnly: '未读', readOnly: '已读',
    search: '搜索...', filter: '筛选', markAllRead: '全部已读',
    totalResults: '共 {n} 条结果',
    title_col: '标题', author: '作者', score: '评分', markRead: '已读',
    prevPage: '上一页', nextPage: '下一页', page: '第 {p} / {t} 页',
    proxySetting: '代理设置', enabled: '启用', host: '主机', port: '端口',
    username: '用户名', passwordField: '密码', protocol: '协议',
    unchangedHint: '(留空不修改)',
    pollSetting: '轮询设置', interval: '间隔（分钟）', webPwd: '登录密码',
    projects: '监控项目', addProject: '+ 添加项目', deleteProject: '删除',
    projectId: '项目ID', projectName: '项目名称',
    brandKw: '品牌关键词（每行一个）', industryKw: '行业关键词（每行一个）',
    competitorKw: '竞对关键词（每行一个）', subreddits: '监控 Subreddit（每行一个）',
    saveConfig: '保存配置', configSaved: '配置已保存，下轮轮询生效',
    saveFailed: '保存失败：',
    allMarkedRead: '已全部标为已读',
    post: '帖子', comment: '评论',
    langSwitch: 'EN',
  },
  en: {
    title: 'Reddit Monitor',
    stats: 'Stats', data: 'Data', config: 'Config', logout: 'Logout',
    password: 'Password', login: 'Login', wrongPwd: 'Wrong password',
    loading: 'Loading...',
    totalMentions: 'Total Mentions', unread: 'Unread', brand: 'Brand', industry: 'Industry',
    competitor: 'Competitor', subreddit: 'Subreddit',
    last30d: 'Mentions (Last 30 Days)', topSubs: 'Top Subreddits', recentPolls: 'Recent Polls',
    time: 'Time', type: 'Type', newItems: 'New', duration: 'Duration', errors: 'Errors',
    mentions: 'Mentions',
    allCat: 'All Categories', last24h: 'Last 24h', last7d: 'Last 7d', last30dOpt: 'Last 30d',
    allTime: 'All Time', all: 'All', unreadOnly: 'Unread', readOnly: 'Read',
    search: 'Search...', filter: 'Filter', markAllRead: 'Mark All Read',
    totalResults: 'Total: {n} results',
    title_col: 'Title', author: 'Author', score: 'Score', markRead: 'Read',
    prevPage: 'Prev', nextPage: 'Next', page: 'Page {p} / {t}',
    proxySetting: 'Proxy Settings', enabled: 'Enabled', host: 'Host', port: 'Port',
    username: 'Username', passwordField: 'Password', protocol: 'Protocol',
    unchangedHint: '(unchanged if empty)',
    pollSetting: 'Poll Settings', interval: 'Interval (minutes)', webPwd: 'Web Password',
    projects: 'Projects', addProject: '+ Add Project', deleteProject: 'Delete',
    projectId: 'ID', projectName: 'Name',
    brandKw: 'Brand Keywords (one per line)', industryKw: 'Industry Keywords (one per line)',
    competitorKw: 'Competitor Keywords (one per line)', subreddits: 'Subreddits (one per line)',
    saveConfig: 'Save Config', configSaved: 'Config saved! Changes apply on next poll cycle.',
    saveFailed: 'Save failed: ',
    allMarkedRead: 'All marked as read',
    post: 'post', comment: 'comment',
    langSwitch: '中文',
  }
};

let lang = localStorage.getItem('rm-lang') || 'zh';
function t(key) { return i18n[lang]?.[key] || i18n.en[key] || key; }

function updateNav() {
  $('#nav-stats').textContent = t('stats');
  $('#nav-data').textContent = t('data');
  $('#nav-config').textContent = t('config');
  $('#nav-logout').textContent = t('logout');
  $('#lang-btn').textContent = t('langSwitch');
  $('.nav-brand').textContent = t('title');
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

// --- Toast ---
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
  else if (hash === 'config') renderConfig();
}

// --- Auth check ---
async function init() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) { navbar.style.display = 'flex'; updateNav(); route(); }
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
        <input type="password" id="login-pwd" placeholder="${t('password')}" autofocus>
        <button id="login-btn">${t('login')}</button>
        <div style="margin-top:12px"><a href="#" id="login-lang" style="color:var(--text-muted);font-size:12px">${t('langSwitch')}</a></div>
      </div>
    </div>`;
  const submit = async () => {
    const pwd = $('#login-pwd').value;
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
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

// --- Logout ---
$('#nav-logout').onclick = async (e) => {
  e.preventDefault();
  await fetch('/api/logout', { method: 'POST' });
  showLogin();
};

// --- Lang switch ---
$('#lang-btn').onclick = (e) => {
  e.preventDefault();
  toggleLang();
  route();
};

// --- Stats ---
async function renderStats() {
  app.innerHTML = `<p>${t('loading')}</p>`;
  const res = await api('/stats');
  const d = await res.json();

  const catMap = {};
  d.byCategory.forEach(c => catMap[c.category] = c.count);

  const maxDay = Math.max(...d.byDay.map(r => r.count), 1);

  app.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">${t('totalMentions')}</div><div class="value">${d.total}</div></div>
      <div class="stat-card"><div class="label">${t('unread')}</div><div class="value unread">${d.unread}</div></div>
      <div class="stat-card"><div class="label">${t('brand')}</div><div class="value brand">${catMap.brand || 0}</div></div>
      <div class="stat-card"><div class="label">${t('industry')}</div><div class="value">${catMap.industry || 0}</div></div>
    </div>

    <div class="section">
      <h3>${t('last30d')}</h3>
      <div class="bar-chart" id="chart"></div>
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
    const dayLabel = r.day.slice(5);
    chart.innerHTML += `<div class="bar" style="height:${pct}%"><span class="bar-tip">${r.count}</span><span class="bar-label">${dayLabel}</span></div>`;
  });
}

// --- Data ---
let dataState = { page: 1, category: '', timeRange: '7d', search: '', is_read: '' };

async function renderData() {
  app.innerHTML = `<p>${t('loading')}</p>`;
  const q = new URLSearchParams({ ...dataState, limit: 50 }).toString();
  const res = await api('/mentions?' + q);
  const d = await res.json();

  const catLabel = (c) => t(c) || c;

  app.innerHTML = `
    <div class="section">
      <div class="filters">
        <select id="f-cat">
          <option value="">${t('allCat')}</option>
          <option value="brand" ${dataState.category === 'brand' ? 'selected' : ''}>${t('brand')}</option>
          <option value="industry" ${dataState.category === 'industry' ? 'selected' : ''}>${t('industry')}</option>
          <option value="competitor" ${dataState.category === 'competitor' ? 'selected' : ''}>${t('competitor')}</option>
          <option value="subreddit" ${dataState.category === 'subreddit' ? 'selected' : ''}>${t('subreddit')}</option>
        </select>
        <select id="f-time">
          <option value="24h" ${dataState.timeRange === '24h' ? 'selected' : ''}>${t('last24h')}</option>
          <option value="7d" ${dataState.timeRange === '7d' ? 'selected' : ''}>${t('last7d')}</option>
          <option value="30d" ${dataState.timeRange === '30d' ? 'selected' : ''}>${t('last30dOpt')}</option>
          <option value="" ${dataState.timeRange === '' ? 'selected' : ''}>${t('allTime')}</option>
        </select>
        <select id="f-read">
          <option value="" ${dataState.is_read === '' ? 'selected' : ''}>${t('all')}</option>
          <option value="0" ${dataState.is_read === '0' ? 'selected' : ''}>${t('unreadOnly')}</option>
          <option value="1" ${dataState.is_read === '1' ? 'selected' : ''}>${t('readOnly')}</option>
        </select>
        <input type="text" id="f-search" placeholder="${t('search')}" value="${dataState.search}">
        <button class="btn btn-outline btn-sm" id="f-apply">${t('filter')}</button>
        <div style="flex:1"></div>
        <div class="btn-group">
          <button class="btn btn-outline btn-sm" id="mark-all-read">${t('markAllRead')}</button>
          <button class="btn btn-outline btn-sm" id="export-csv">CSV</button>
          <button class="btn btn-outline btn-sm" id="export-json">JSON</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${t('totalResults').replace('{n}', d.total)}</div>
      <table>
        <thead><tr><th>${t('time')}</th><th>${t('type')}</th><th>${t('allCat').replace('全部', '')}</th><th>Subreddit</th><th>${t('title_col')}</th><th>${t('author')}</th><th>${t('score')}</th><th></th></tr></thead>
        <tbody>${d.rows.map(r => `<tr class="${r.is_read ? '' : 'unread'}" data-id="${r.id}">
          <td style="white-space:nowrap">${fmtUtc(r.created_utc)}</td>
          <td>${r.type === 'post' ? t('post') : t('comment')}</td>
          <td><span class="badge ${r.category}">${catLabel(r.category)}</span></td>
          <td>r/${r.subreddit}</td>
          <td class="truncate"><a class="reddit-link" href="https://reddit.com${r.permalink}" target="_blank">${esc(r.title || r.body?.slice(0, 80) || '-')}</a></td>
          <td>u/${r.author}</td>
          <td>${r.score}</td>
          <td>${r.is_read ? '' : `<button class="btn btn-sm btn-outline mark-read-btn">${t('markRead')}</button>`}</td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="pagination">
        <button class="btn btn-outline btn-sm" id="prev-page" ${d.page <= 1 ? 'disabled' : ''}>${t('prevPage')}</button>
        <span>${t('page').replace('{p}', d.page).replace('{t}', d.pages || 1)}</span>
        <button class="btn btn-outline btn-sm" id="next-page" ${d.page >= d.pages ? 'disabled' : ''}>${t('nextPage')}</button>
      </div>
    </div>`;

  $('#f-apply').onclick = () => {
    dataState.category = $('#f-cat').value;
    dataState.timeRange = $('#f-time').value;
    dataState.is_read = $('#f-read').value;
    dataState.search = $('#f-search').value;
    dataState.page = 1;
    renderData();
  };
  $('#f-search').onkeydown = e => { if (e.key === 'Enter') $('#f-apply').click(); };
  $('#prev-page').onclick = () => { dataState.page--; renderData(); };
  $('#next-page').onclick = () => { dataState.page++; renderData(); };

  document.querySelectorAll('.mark-read-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.closest('tr').dataset.id;
      await api('/mentions/read', { method: 'POST', body: { ids: [id] } });
      renderData();
    };
  });

  $('#mark-all-read').onclick = async () => {
    await api('/mentions/read', { method: 'POST', body: { all: true, category: dataState.category || undefined } });
    toast(t('allMarkedRead'));
    renderData();
  };

  const exportParams = new URLSearchParams({ category: dataState.category, timeRange: dataState.timeRange, search: dataState.search }).toString();
  $('#export-csv').onclick = () => { window.open('/api/mentions/export?' + exportParams + '&format=csv'); };
  $('#export-json').onclick = () => { window.open('/api/mentions/export?' + exportParams + '&format=json'); };
}

// --- Config ---
async function renderConfig() {
  app.innerHTML = `<p>${t('loading')}</p>`;
  const res = await api('/config');
  const cfg = await res.json();

  app.innerHTML = `
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
          <input id="c-proxy-host" value="${cfg.proxy?.host || ''}">
        </div>
        <div class="form-group">
          <label>${t('port')}</label>
          <input id="c-proxy-port" type="number" value="${cfg.proxy?.port || ''}">
        </div>
        <div class="form-group">
          <label>${t('username')}</label>
          <input id="c-proxy-user" value="${cfg.proxy?.username || ''}">
        </div>
        <div class="form-group">
          <label>${t('passwordField')}</label>
          <input id="c-proxy-pass" type="password" value="" placeholder="${t('unchangedHint')}">
        </div>
        <div class="form-group">
          <label>${t('protocol')}</label>
          <input id="c-proxy-proto" value="${cfg.proxy?.protocol || 'http'}">
        </div>
      </div>
    </div>

    <div class="section">
      <h3>${t('pollSetting')}</h3>
      <div class="form-group">
        <label>${t('interval')}</label>
        <input id="c-interval" type="number" value="${cfg.pollIntervalMinutes || 8}" style="width:120px">
      </div>
      <div class="form-group">
        <label>${t('webPwd')}</label>
        <input id="c-webpwd" type="password" value="" placeholder="${t('unchangedHint')}">
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
          <div class="form-group"><label>${t('projectId')}</label><input class="p-id" value="${esc(p.id || '')}"></div>
          <div class="form-group"><label>${t('projectName')}</label><input class="p-name" value="${esc(p.name || '')}"></div>
        </div>
        <div class="form-group"><label>${t('brandKw')}</label><textarea class="p-brand">${(p.keywords?.brand || []).join('\n')}</textarea></div>
        <div class="form-group"><label>${t('industryKw')}</label><textarea class="p-industry">${(p.keywords?.industry || []).join('\n')}</textarea></div>
        <div class="form-group"><label>${t('competitorKw')}</label><textarea class="p-competitor">${(p.keywords?.competitor || []).join('\n')}</textarea></div>
        <div class="form-group"><label>${t('subreddits')}</label><textarea class="p-subs">${(p.subreddits || []).join('\n')}</textarea></div>
      </div>`).join('');

    document.querySelectorAll('.del-project').forEach(btn => {
      btn.onclick = () => {
        projects.splice(+btn.closest('.project-card').dataset.idx, 1);
        renderProjects(projects);
      };
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
      proxy: {
        enabled: $('#c-proxy-enabled').value === 'true',
        host: $('#c-proxy-host').value,
        port: +$('#c-proxy-port').value || 1000,
        username: $('#c-proxy-user').value,
        protocol: $('#c-proxy-proto').value || 'http',
      },
    };

    const pwd = $('#c-proxy-pass').value;
    if (pwd) update.proxy.password = pwd;

    const webpwd = $('#c-webpwd').value;
    if (webpwd) update.webPassword = webpwd;

    try {
      await api('/config', { method: 'PUT', body: update });
      toast(t('configSaved'));
    } catch (e) {
      toast(t('saveFailed') + e.message);
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
