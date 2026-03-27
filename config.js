import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'config.json');

export function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('[config] config.json 不存在，请复制 config.example.json 并填入配置');
    process.exit(1);
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const cfg = JSON.parse(raw);

  const projects = (cfg.projects || []).filter(pr => pr.enabled !== false);
  const p = cfg.proxy || {};

  // Evomi 住宅代理（sticky session，15分钟保持同一 IP）
  const sessionId = 'reddit' + Math.floor(Date.now() / 900000);
  const evomiUrl = p.enabled
    ? `${p.protocol || 'http'}://${p.username}:${p.password}_country-us_session-${sessionId}@${p.host}:${p.port}`
    : null;

  return {
    projects,
    pollIntervalMinutes: cfg.pollIntervalMinutes || 8,
    proxy: {
      evomi: evomiUrl,
      local: cfg.kookeey?.localProxy
        ? `http://${cfg.kookeey.localProxy.host}:${cfg.kookeey.localProxy.port}`
        : 'http://127.0.0.1:10809',
    },
    kookeey: cfg.kookeey || null,
  };
}
