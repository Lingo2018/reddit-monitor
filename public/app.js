const $ = s => document.querySelector(s);
const app = $('#app');
const navbar = $('#navbar');

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
    if (res.ok) { navbar.style.display = 'flex'; route(); }
    else showLogin();
  } catch { showLogin(); }
}

// --- Login ---
function showLogin() {
  navbar.style.display = 'none';
  app.innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <h2>Reddit Monitor</h2>
        <div class="login-error" id="login-err"></div>
        <input type="password" id="login-pwd" placeholder="Password" autofocus>
        <button id="login-btn">Login</button>
      </div>
    </div>`;
  const submit = async () => {
    const pwd = $('#login-pwd').value;
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
    if (res.ok) { navbar.style.display = 'flex'; location.hash = '#stats'; route(); }
    else $('#login-err').textContent = 'Wrong password';
  };
  $('#login-btn').onclick = submit;
  $('#login-pwd').onkeydown = e => { if (e.key === 'Enter') submit(); };
}

// --- Logout ---
$('#logout-btn').onclick = async (e) => {
  e.preventDefault();
  await fetch('/api/logout', { method: 'POST' });
  showLogin();
};

// --- Stats ---
async function renderStats() {
  app.innerHTML = '<p>Loading...</p>';
  const res = await api('/stats');
  const d = await res.json();

  const catMap = {};
  d.byCategory.forEach(c => catMap[c.category] = c.count);

  const maxDay = Math.max(...d.byDay.map(r => r.count), 1);

  app.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">Total Mentions</div><div class="value">${d.total}</div></div>
      <div class="stat-card"><div class="label">Unread</div><div class="value unread">${d.unread}</div></div>
      <div class="stat-card"><div class="label">Brand</div><div class="value brand">${catMap.brand || 0}</div></div>
      <div class="stat-card"><div class="label">Industry</div><div class="value">${catMap.industry || 0}</div></div>
    </div>

    <div class="section">
      <h3>Mentions (Last 30 Days)</h3>
      <div class="bar-chart" id="chart"></div>
    </div>

    <div class="section">
      <h3>Top Subreddits</h3>
      <table>
        <thead><tr><th>Subreddit</th><th>Mentions</th></tr></thead>
        <tbody>${d.topSubs.map(s => `<tr><td>r/${s.subreddit}</td><td>${s.count}</td></tr>`).join('')}</tbody>
      </table>
    </div>

    <div class="section">
      <h3>Recent Polls</h3>
      <table>
        <thead><tr><th>Time</th><th>Type</th><th>New</th><th>Duration</th><th>Errors</th></tr></thead>
        <tbody>${d.recentPolls.map(p => `<tr>
          <td>${fmtTime(p.poll_time)}</td>
          <td>${p.round_type}</td>
          <td>${p.new_items}</td>
          <td>${p.duration_ms ? (p.duration_ms / 1000).toFixed(1) + 's' : '-'}</td>
          <td class="truncate">${p.errors || '-'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;

  // Render bars
  const chart = $('#chart');
  d.byDay.forEach(r => {
    const pct = (r.count / maxDay * 100).toFixed(1);
    const dayLabel = r.day.slice(5); // MM-DD
    chart.innerHTML += `<div class="bar" style="height:${pct}%"><span class="bar-tip">${r.count}</span><span class="bar-label">${dayLabel}</span></div>`;
  });
}

// --- Data ---
let dataState = { page: 1, category: '', timeRange: '7d', search: '', is_read: '' };

async function renderData() {
  app.innerHTML = '<p>Loading...</p>';
  const q = new URLSearchParams({ ...dataState, limit: 50 }).toString();
  const res = await api('/mentions?' + q);
  const d = await res.json();

  app.innerHTML = `
    <div class="section">
      <div class="filters">
        <select id="f-cat">
          <option value="">All Categories</option>
          <option value="brand" ${dataState.category === 'brand' ? 'selected' : ''}>Brand</option>
          <option value="industry" ${dataState.category === 'industry' ? 'selected' : ''}>Industry</option>
          <option value="competitor" ${dataState.category === 'competitor' ? 'selected' : ''}>Competitor</option>
          <option value="subreddit" ${dataState.category === 'subreddit' ? 'selected' : ''}>Subreddit</option>
        </select>
        <select id="f-time">
          <option value="24h" ${dataState.timeRange === '24h' ? 'selected' : ''}>Last 24h</option>
          <option value="7d" ${dataState.timeRange === '7d' ? 'selected' : ''}>Last 7d</option>
          <option value="30d" ${dataState.timeRange === '30d' ? 'selected' : ''}>Last 30d</option>
          <option value="" ${dataState.timeRange === '' ? 'selected' : ''}>All Time</option>
        </select>
        <select id="f-read">
          <option value="" ${dataState.is_read === '' ? 'selected' : ''}>All</option>
          <option value="0" ${dataState.is_read === '0' ? 'selected' : ''}>Unread</option>
          <option value="1" ${dataState.is_read === '1' ? 'selected' : ''}>Read</option>
        </select>
        <input type="text" id="f-search" placeholder="Search..." value="${dataState.search}">
        <button class="btn btn-outline btn-sm" id="f-apply">Filter</button>
        <div style="flex:1"></div>
        <div class="btn-group">
          <button class="btn btn-outline btn-sm" id="mark-all-read">Mark All Read</button>
          <button class="btn btn-outline btn-sm" id="export-csv">CSV</button>
          <button class="btn btn-outline btn-sm" id="export-json">JSON</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Total: ${d.total} results</div>
      <table>
        <thead><tr><th>Time</th><th>Type</th><th>Category</th><th>Subreddit</th><th>Title</th><th>Author</th><th>Score</th><th></th></tr></thead>
        <tbody>${d.rows.map(r => `<tr class="${r.is_read ? '' : 'unread'}" data-id="${r.id}">
          <td style="white-space:nowrap">${fmtTime(r.discovered_at)}</td>
          <td>${r.type}</td>
          <td><span class="badge ${r.category}">${r.category}</span></td>
          <td>r/${r.subreddit}</td>
          <td class="truncate"><a class="reddit-link" href="https://reddit.com${r.permalink}" target="_blank">${esc(r.title || r.body?.slice(0, 80) || '-')}</a></td>
          <td>u/${r.author}</td>
          <td>${r.score}</td>
          <td>${r.is_read ? '' : '<button class="btn btn-sm btn-outline mark-read-btn">Read</button>'}</td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="pagination">
        <button class="btn btn-outline btn-sm" id="prev-page" ${d.page <= 1 ? 'disabled' : ''}>Prev</button>
        <span>Page ${d.page} / ${d.pages || 1}</span>
        <button class="btn btn-outline btn-sm" id="next-page" ${d.page >= d.pages ? 'disabled' : ''}>Next</button>
      </div>
    </div>`;

  // Event listeners
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
    toast('All marked as read');
    renderData();
  };

  const exportParams = new URLSearchParams({ category: dataState.category, timeRange: dataState.timeRange, search: dataState.search }).toString();
  $('#export-csv').onclick = () => { window.open('/api/mentions/export?' + exportParams + '&format=csv'); };
  $('#export-json').onclick = () => { window.open('/api/mentions/export?' + exportParams + '&format=json'); };
}

// --- Config ---
async function renderConfig() {
  app.innerHTML = '<p>Loading...</p>';
  const res = await api('/config');
  const cfg = await res.json();

  app.innerHTML = `
    <div class="section">
      <h3>Proxy Settings</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Enabled</label>
          <select id="c-proxy-enabled">
            <option value="true" ${cfg.proxy?.enabled ? 'selected' : ''}>Yes</option>
            <option value="false" ${!cfg.proxy?.enabled ? 'selected' : ''}>No</option>
          </select>
        </div>
        <div class="form-group">
          <label>Host</label>
          <input id="c-proxy-host" value="${cfg.proxy?.host || ''}">
        </div>
        <div class="form-group">
          <label>Port</label>
          <input id="c-proxy-port" type="number" value="${cfg.proxy?.port || ''}">
        </div>
        <div class="form-group">
          <label>Username</label>
          <input id="c-proxy-user" value="${cfg.proxy?.username || ''}">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input id="c-proxy-pass" type="password" value="" placeholder="(unchanged if empty)">
        </div>
        <div class="form-group">
          <label>Protocol</label>
          <input id="c-proxy-proto" value="${cfg.proxy?.protocol || 'http'}">
        </div>
      </div>
    </div>

    <div class="section">
      <h3>Poll Settings</h3>
      <div class="form-group">
        <label>Interval (minutes)</label>
        <input id="c-interval" type="number" value="${cfg.pollIntervalMinutes || 8}" style="width:120px">
      </div>
      <div class="form-group">
        <label>Web Password</label>
        <input id="c-webpwd" type="password" value="" placeholder="(unchanged if empty)">
      </div>
    </div>

    <div class="section">
      <h3>Projects</h3>
      <div id="projects-list"></div>
      <button class="btn btn-outline" id="add-project" style="margin-top:10px">+ Add Project</button>
    </div>

    <div style="margin-top:16px">
      <button class="btn btn-primary" id="save-config">Save Config</button>
    </div>`;

  const projectsList = $('#projects-list');

  function renderProjects(projects) {
    projectsList.innerHTML = projects.map((p, i) => `
      <div class="project-card" data-idx="${i}">
        <div class="project-header">
          <h4>${esc(p.name || p.id || 'Project ' + (i + 1))}</h4>
          <div class="btn-group">
            <label style="font-size:12px"><input type="checkbox" class="p-enabled" ${p.enabled !== false ? 'checked' : ''}> Enabled</label>
            <button class="btn btn-outline btn-sm del-project">Delete</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>ID</label><input class="p-id" value="${esc(p.id || '')}"></div>
          <div class="form-group"><label>Name</label><input class="p-name" value="${esc(p.name || '')}"></div>
        </div>
        <div class="form-group"><label>Brand Keywords (one per line)</label><textarea class="p-brand">${(p.keywords?.brand || []).join('\n')}</textarea></div>
        <div class="form-group"><label>Industry Keywords (one per line)</label><textarea class="p-industry">${(p.keywords?.industry || []).join('\n')}</textarea></div>
        <div class="form-group"><label>Competitor Keywords (one per line)</label><textarea class="p-competitor">${(p.keywords?.competitor || []).join('\n')}</textarea></div>
        <div class="form-group"><label>Subreddits (one per line)</label><textarea class="p-subs">${(p.subreddits || []).join('\n')}</textarea></div>
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
      toast('Config saved! Changes apply on next poll cycle.');
    } catch (e) {
      toast('Save failed: ' + e.message);
    }
  };
}

// --- Helpers ---
function fmtTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
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
