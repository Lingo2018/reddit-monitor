import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';

// 真实浏览器 User-Agent 池
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

function getBrowserHeaders() {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  return {
    'User-Agent': ua,
    'Accept': 'application/json, text/html;q=0.9, */*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };
}

let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const minWait = 2000 + Math.random() * 3000; // 2-5秒随机
  const elapsed = now - lastRequestTime;
  if (elapsed < minWait) {
    await new Promise(r => setTimeout(r, minWait - elapsed));
  }
  lastRequestTime = Date.now();
}

export function createFetcher(proxyConfig) {
  const evomiAgent = proxyConfig?.evomi ? new HttpsProxyAgent(proxyConfig.evomi) : null;
  const localAgent = proxyConfig?.local ? new HttpsProxyAgent(proxyConfig.local) : undefined;
  let evomiFails = 0;

  function getAgent() {
    if (evomiAgent && evomiFails === 0) return evomiAgent;
    if (evomiAgent && evomiFails === 1) {
      console.warn('[fetcher] Evomi 失败，切换到本地代理');
    }
    return localAgent;
  }

  async function doRequest(url, agent) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { agent, headers: getBrowserHeaders(), timeout: 15000 }, (res) => {
        if (res.statusCode !== 200) { resolve({ status: res.statusCode }); return; }
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve({ status: 200, data: JSON.parse(data) }); }
          catch { resolve({ status: 200, data: null }); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
  }

  async function fetchJson(url) {
    await rateLimit();

    // 1. 先尝试 evomi（如果可用且没失败过）
    if (evomiAgent && evomiFails === 0) {
      try {
        const result = await doRequest(url, evomiAgent);
        if (result.status === 200) return result.data;
        if (result.status === 403) { console.warn(`[fetcher] 403: ${url}`); return null; }
        if (result.status === 429) {
          console.warn('[fetcher] 429 限流 [evomi]');
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (err) {
        evomiFails++;
        console.warn(`[fetcher] Evomi 失败(${err.message})，切换到本地代理`);
      }
    }

    // 2. 本地代理（主力或 fallback）
    for (let i = 0; i < 2; i++) {
      if (i > 0) await rateLimit();
      try {
        const result = await doRequest(url, localAgent);
        if (result.status === 200) return result.data;
        if (result.status === 403) { console.warn(`[fetcher] 403: ${url}`); return null; }
        if (result.status === 429) {
          const wait = Math.pow(2, i + 1) * 1000;
          console.warn(`[fetcher] 429 限流, 等 ${wait}ms`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        console.warn(`[fetcher] HTTP ${result.status}: ${url}`);
        return null;
      } catch (err) {
        console.warn(`[fetcher] ${err.message}: ${url} (${i + 1}/2)`);
      }
    }
    return null;
  }

  return {
    async searchPosts(keyword) {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&type=link&sort=new&limit=25`;
      const data = await fetchJson(url);
      if (!data?.data?.children) return [];
      return data.data.children.map(c => ({
        id: 't3_' + c.data.id, type: 'post',
        title: c.data.title || '', body: c.data.selftext || '',
        author: c.data.author, subreddit: c.data.subreddit,
        permalink: c.data.permalink, score: c.data.score || 0,
        num_comments: c.data.num_comments || 0, created_utc: c.data.created_utc,
      }));
    },

    async subredditNew(subreddit) {
      const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=25`;
      const data = await fetchJson(url);
      if (!data?.data?.children) return [];
      return data.data.children.map(c => ({
        id: 't3_' + c.data.id, type: 'post',
        title: c.data.title || '', body: c.data.selftext || '',
        author: c.data.author, subreddit: c.data.subreddit,
        permalink: c.data.permalink, score: c.data.score || 0,
        num_comments: c.data.num_comments || 0, created_utc: c.data.created_utc,
      }));
    },

    async subredditComments(subreddit) {
      const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/comments.json?limit=25`;
      const data = await fetchJson(url);
      if (!data?.data?.children) return [];
      return data.data.children.filter(c => c.kind === 't1').map(c => ({
        id: 't1_' + c.data.id, type: 'comment',
        title: c.data.link_title || '', body: c.data.body || '',
        author: c.data.author, subreddit: c.data.subreddit,
        permalink: c.data.permalink, score: c.data.score || 0,
        num_comments: 0, created_utc: c.data.created_utc,
      }));
    },
  };
}

// ============================================
// 双层代理 Fetcher（本地代理 → kookeey 美国住宅 IP → Reddit）
// 与现有 fetcher 并行，数据最终汇总去重
// ============================================
import http from 'http';
import tls from 'tls';

let _kookeeyConfig = null;

function randomSession() {
  return Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
}

function doubleProxyRequest(targetHost, targetPath, sessionId) {
  const cfg = _kookeeyConfig;
  const kookeeyAuth = 'Basic ' + Buffer.from(`${cfg.username}:${cfg.passwordPrefix}-${sessionId}-5m`).toString('base64');
  const localProxy = cfg.localProxy || { host: '127.0.0.1', port: 10809 };

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { reject(new Error('double-proxy timeout')); }, 20000);

    // 步骤1: 本地代理 CONNECT 到 kookeey gate
    const connectReq = http.request({
      host: localProxy.host, port: localProxy.port,
      method: 'CONNECT', path: `${cfg.host}:${cfg.port}`,
    });

    connectReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) { clearTimeout(timer); reject(new Error('local CONNECT ' + res.statusCode)); return; }

      // 步骤2: 通过隧道让 kookeey CONNECT 到目标
      socket.write(`CONNECT ${targetHost}:443 HTTP/1.1\r\nHost: ${targetHost}:443\r\nProxy-Authorization: ${kookeeyAuth}\r\n\r\n`);

      socket.once('data', (chunk) => {
        if (!chunk.toString().includes('200')) { clearTimeout(timer); reject(new Error('kookeey CONNECT fail')); return; }

        // 步骤3: TLS 握手
        const tlsSocket = tls.connect({ socket, servername: targetHost }, () => {
          const headers = getBrowserHeaders();
          let reqStr = `GET ${targetPath} HTTP/1.1\r\nHost: ${targetHost}\r\n`;
          for (const [k, v] of Object.entries(headers)) reqStr += `${k}: ${v}\r\n`;
          reqStr += 'Connection: close\r\n\r\n';
          tlsSocket.write(reqStr);
        });

        let data = '';
        tlsSocket.on('data', c => data += c);
        tlsSocket.on('end', () => {
          clearTimeout(timer);
          const bodyStart = data.indexOf('\r\n\r\n');
          const body = bodyStart > -1 ? data.slice(bodyStart + 4) : data;
          try { resolve(JSON.parse(body)); } catch { resolve(null); }
        });
        tlsSocket.on('error', e => { clearTimeout(timer); reject(e); });
      });

      socket.on('error', e => { clearTimeout(timer); reject(e); });
    });

    connectReq.on('error', e => { clearTimeout(timer); reject(e); });
    connectReq.end();
  });
}

async function kookeeyFetchJson(path) {
  await rateLimit();
  const sessionId = randomSession();
  try {
    return await doubleProxyRequest('www.reddit.com', path, sessionId);
  } catch (err) {
    console.warn(`[kookeey] ${err.message}: ${path}`);
    return null;
  }
}

function parseChildren(data, type) {
  if (!data?.data?.children) return [];
  return data.data.children
    .filter(c => type === 'comment' ? c.kind === 't1' : true)
    .map(c => ({
      id: (c.kind === 't1' ? 't1_' : 't3_') + c.data.id,
      type: c.kind === 't1' ? 'comment' : 'post',
      title: c.data.title || c.data.link_title || '',
      body: c.data.selftext || c.data.body || '',
      author: c.data.author,
      subreddit: c.data.subreddit,
      permalink: c.data.permalink,
      score: c.data.score || 0,
      num_comments: c.data.num_comments || 0,
      created_utc: c.data.created_utc,
    }));
}

export function createKookeeyFetcher(kookeeyConfig) {
  if (!kookeeyConfig?.enabled) throw new Error('kookeey not configured');
  _kookeeyConfig = kookeeyConfig;
  return {
    async searchPosts(keyword) {
      const data = await kookeeyFetchJson(`/search.json?q=${encodeURIComponent(keyword)}&type=link&sort=new&limit=25`);
      return parseChildren(data, 'post');
    },
    async subredditNew(subreddit) {
      const data = await kookeeyFetchJson(`/r/${encodeURIComponent(subreddit)}/new.json?limit=25`);
      return parseChildren(data, 'post');
    },
    async subredditComments(subreddit) {
      const data = await kookeeyFetchJson(`/r/${encodeURIComponent(subreddit)}/comments.json?limit=25`);
      return parseChildren(data, 'comment');
    },
  };
}
