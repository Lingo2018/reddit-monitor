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
  const p = cfg.proxy || {};

  // Evomi residential proxy (sticky session, 15min same IP)
  const sessionId = 'reddit' + Math.floor(Date.now() / 900000);
  const evomiUrl = p.enabled
    ? `${p.protocol || 'http'}://${p.username}:${p.password}_country-us_session-${sessionId}@${p.host}:${p.port}`
    : null;

  return {
    projects,
    pollIntervalMinutes: cfg.pollIntervalMinutes || 8,
    webPort: cfg.webPort || 3000,
    webPassword: cfg.webPassword || 'admin',
    proxy: {
      evomi: evomiUrl,
      local: p.enabled
        ? (cfg.kookeey?.localProxy
            ? `http://${cfg.kookeey.localProxy.host}:${cfg.kookeey.localProxy.port}`
            : 'http://127.0.0.1:10809')
        : null,
    },
    kookeey: cfg.kookeey || null,
  };
}

export function getConfigForUI() {
  const cfg = readRaw();
  // Mask passwords
  if (cfg.proxy?.password) cfg.proxy.password = '***';
  if (cfg.kookeey?.passwordPrefix) cfg.kookeey.passwordPrefix = '***';
  delete cfg.webPassword;
  return cfg;
}

export function saveConfig(updates) {
  const cfg = readRaw();
  const allowed = ['projects', 'pollIntervalMinutes', 'proxy', 'kookeey', 'webPassword'];

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
      } else {
        cfg[key] = updates[key];
      }
    }
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}
