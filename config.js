import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'config.json');

function readRaw() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('[config] config.json not found. Copy config.example.json and fill in your settings.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

export function loadConfig() {
  const cfg = readRaw();

  const projects = (cfg.projects || []).filter(pr => pr.enabled !== false);
  const facebookProjects = (cfg.facebookProjects || []).filter(pr => pr.enabled !== false);
  const p = cfg.proxy || {};

  // Evomi residential proxy (sticky session, 15min same IP)
  const sessionId = 'reddit' + Math.floor(Date.now() / 900000);
  const evomiUrl = p.enabled
    ? `${p.protocol || 'http'}://${p.username}:${p.password}_country-us_session-${sessionId}@${p.host}:${p.port}`
    : null;

  // Local proxy (clash/v2ray etc.) for Reddit fetching
  const lp = cfg.localProxy || {};
  const localProxyUrl = lp.enabled
    ? `http://${lp.host || '127.0.0.1'}:${lp.port || 10808}`
    : null;

  return {
    projects,
    facebookProjects,
    pollIntervalMinutes: cfg.pollIntervalMinutes || 8,
    webPort: cfg.webPort || 3000,
    webPassword: cfg.webPassword || 'admin',
    proxy: {
      evomi: evomiUrl,
      local: p.enabled
        ? (cfg.kookeey?.localProxy
            ? `http://${cfg.kookeey.localProxy.host}:${cfg.kookeey.localProxy.port}`
            : 'http://127.0.0.1:10809')
        : localProxyUrl,
    },
    kookeey: cfg.kookeey || null,
    ai: cfg.ai || null,
    facebook: cfg.facebook || null,
    fbPollIntervalHours: cfg.fbPollIntervalHours || 6,
  };
}

export function getConfigForUI() {
  const cfg = readRaw();
  // Mask passwords
  if (cfg.proxy?.password) cfg.proxy.password = '***';
  if (cfg.kookeey?.passwordPrefix) cfg.kookeey.passwordPrefix = '***';
  if (cfg.ai?.apiKey) cfg.ai.apiKey = '***';
  if (cfg.facebook?.accessToken) cfg.facebook.accessToken = '***';
  if (cfg.facebook?.appSecret) cfg.facebook.appSecret = '***';
  delete cfg.webPassword;
  return cfg;
}

export function saveConfig(updates) {
  const cfg = readRaw();
  const allowed = ['projects', 'facebookProjects', 'pollIntervalMinutes', 'fbPollIntervalHours', 'proxy', 'kookeey', 'webPassword', 'ai', 'localProxy', 'facebook'];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'proxy' && cfg.proxy) {
        // Don't overwrite password if not provided
        if (!updates.proxy.password || updates.proxy.password === '***') {
          updates.proxy.password = cfg.proxy.password;
        }
        cfg.proxy = { ...cfg.proxy, ...updates.proxy };
      } else if (key === 'kookeey' && cfg.kookeey && updates.kookeey) {
        if (!updates.kookeey.passwordPrefix || updates.kookeey.passwordPrefix === '***') {
          updates.kookeey.passwordPrefix = cfg.kookeey.passwordPrefix;
        }
        cfg.kookeey = { ...cfg.kookeey, ...updates.kookeey };
      } else if (key === 'ai' && cfg.ai && updates.ai) {
        if (!updates.ai.apiKey || updates.ai.apiKey === '***') {
          updates.ai.apiKey = cfg.ai.apiKey;
        }
        cfg.ai = { ...cfg.ai, ...updates.ai };
      } else if (key === 'facebook' && cfg.facebook && updates.facebook) {
        if (!updates.facebook.accessToken || updates.facebook.accessToken === '***') {
          updates.facebook.accessToken = cfg.facebook.accessToken;
        }
        if (!updates.facebook.appSecret || updates.facebook.appSecret === '***') {
          updates.facebook.appSecret = cfg.facebook.appSecret;
        }
        cfg.facebook = { ...cfg.facebook, ...updates.facebook };
      } else {
        cfg[key] = updates[key];
      }
    }
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}
