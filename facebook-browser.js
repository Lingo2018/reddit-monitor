/**
 * Facebook Group Stealth Browser Scraper
 * Uses playwright-extra + stealth plugin + Xvfb to bypass Facebook detection.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COOKIE_PATH = path.join(__dirname, 'data', 'fb-cookies.json');

function log(msg) {
  console.log(`[${new Date().toISOString()}] [fb-browser] ${msg}`);
}

// --- Human-like behavior helpers ---
function randomDelay(min, max) {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

async function humanScroll(page, distance) {
  const delta = distance || 400 + Math.random() * 800;
  await page.mouse.wheel(0, delta);
  await randomDelay(300, 800);
}

async function humanType(page, selector, text) {
  await page.click(selector);
  await randomDelay(200, 400);
  for (const char of text) {
    await page.keyboard.type(char, { delay: 80 + Math.random() * 120 });
  }
}

// --- Browser state ---
let browser = null;
let context = null;
let page = null;
let screenshotInterval = null;
let lastScreenshot = null; // base64 JPEG

export function getBrowserStatus() {
  return {
    running: !!browser,
    hasPage: !!page,
    lastScreenshot: lastScreenshot ? Date.now() : null,
  };
}

export function getLastScreenshot() {
  return lastScreenshot;
}

export function getPage() {
  return page;
}

export function getContext() {
  return context;
}

// --- Cookie management ---
function loadCookiesFromFile() {
  try {
    if (fs.existsSync(COOKIE_PATH)) {
      return JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf-8'));
    }
  } catch (e) { log(`Load cookies error: ${e.message}`); }
  return [];
}

function saveCookiesToFile(cookies) {
  try {
    const dir = path.dirname(COOKIE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
    log(`Saved ${cookies.length} cookies`);
  } catch (e) { log(`Save cookies error: ${e.message}`); }
}

export function getCookieStatus() {
  const cookies = loadCookiesFromFile();
  const hasCUser = cookies.some(c => c.name === 'c_user');
  const hasXs = cookies.some(c => c.name === 'xs');
  return { count: cookies.length, loggedIn: hasCUser && hasXs };
}

// --- Start browser ---
export async function startBrowser() {
  if (browser) {
    log('Browser already running');
    return { ok: true, alreadyRunning: true };
  }

  log('Starting stealth browser...');

  // Ensure Xvfb is running
  try {
    execSync('pgrep -x Xvfb || nohup Xvfb :99 -screen 0 1440x900x24 > /dev/null 2>&1 &', { stdio: 'ignore' });
  } catch {}

  // Dynamic imports for CJS packages
  const { addExtra } = await import('playwright-extra');
  const stealthPkg = await import('puppeteer-extra-plugin-stealth');
  const stealth = stealthPkg.default();

  // Use playwright from local node_modules (installed via playwright-extra)
  let pw;
  try { pw = await import('playwright'); } catch {
    pw = await import('playwright-core');
  }
  const chromium = addExtra(pw.chromium);
  chromium.use(stealth);

  // Read proxy config
  let proxyUrl = null;
  try {
    const cfg = loadConfig();
    if (cfg.proxy?.local) proxyUrl = cfg.proxy.local;
  } catch {}

  const launchArgs = [
    '--no-sandbox', '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--disable-features=WebAuthentication',
    '--window-size=1440,900',
  ];
  if (proxyUrl) launchArgs.push('--proxy-server=' + proxyUrl);

  browser = await chromium.launch({
    headless: false,
    args: launchArgs,
    env: { ...process.env, DISPLAY: ':99' },
  });

  const contextOpts = {
    viewport: { width: 800, height: 500 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  };
  if (proxyUrl) contextOpts.proxy = { server: proxyUrl };

  context = await browser.newContext(contextOpts);

  // Inject saved cookies
  const savedCookies = loadCookiesFromFile();
  if (savedCookies.length) {
    const mapped = savedCookies.map(c => ({
      name: c.name, value: c.value,
      domain: c.domain || '.facebook.com',
      path: c.path || '/',
      secure: c.secure !== false,
      httpOnly: !!c.httpOnly,
      sameSite: c.sameSite === 'no_restriction' ? 'None' : c.sameSite === 'lax' ? 'Lax' : 'None',
    }));
    await context.addCookies(mapped);
    log(`Injected ${mapped.length} saved cookies`);
  }

  page = await context.newPage();

  // Auto-dismiss browser dialogs (WebAuthn, alerts, etc.)
  page.on('dialog', async dialog => {
    log(`Auto-dismissing dialog: ${dialog.type()} - ${dialog.message()}`);
    await dialog.dismiss().catch(() => {});
  });

  // Navigate to Facebook login by default
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

  // Start screenshot capture loop
  screenshotInterval = setInterval(async () => {
    try {
      const buf = await page.screenshot({ type: 'jpeg', quality: 50 });
      lastScreenshot = buf.toString('base64');
    } catch {}
  }, 1500);

  log('Browser started, navigated to facebook.com');
  return { ok: true };
}

// --- Stop browser ---
export async function stopBrowser() {
  if (!browser) return { ok: true, wasRunning: false };

  // Save cookies before closing
  try {
    if (context) {
      const allCookies = await context.cookies('https://www.facebook.com');
      const fbCookies = allCookies.filter(c => c.domain?.includes('facebook.com'));
      if (fbCookies.length) saveCookiesToFile(fbCookies);
    }
  } catch (e) { log(`Cookie save error: ${e.message}`); }

  if (screenshotInterval) { clearInterval(screenshotInterval); screenshotInterval = null; }
  try { await browser.close(); } catch {}
  browser = null; context = null; page = null; lastScreenshot = null;
  log('Browser stopped');
  return { ok: true };
}

// --- Navigate to Facebook login ---
export async function navigateToLogin() {
  if (!page) throw new Error('Browser not started');
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await randomDelay(1000, 2000);
  return { ok: true };
}

// --- Save cookies from current browser session ---
export async function saveCurrentCookies() {
  if (!context) throw new Error('Browser not started');
  const allCookies = await context.cookies('https://www.facebook.com');
  const fbCookies = allCookies.filter(c => c.domain?.includes('facebook.com'));
  const hasCUser = fbCookies.some(c => c.name === 'c_user');
  const hasXs = fbCookies.some(c => c.name === 'xs');
  saveCookiesToFile(fbCookies);
  return { ok: true, count: fbCookies.length, loggedIn: hasCUser && hasXs };
}

// --- Navigate to a URL ---
export async function navigateTo(url) {
  if (!page) throw new Error('Browser not started');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await randomDelay(1000, 2000);
  return { ok: true };
}

// --- Scrape Facebook Group posts ---
export async function scrapeGroupPosts(groupUrl, maxScrolls = 8) {
  if (!page) throw new Error('Browser not started');

  log(`Scraping group: ${groupUrl}`);
  await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await randomDelay(2000, 4000);

  // Dismiss any popups/login prompts
  try {
    const closeBtn = await page.$('[aria-label="Close"]');
    if (closeBtn) { await closeBtn.click(); await randomDelay(500, 1000); }
  } catch {}

  // Scroll to load more posts
  for (let i = 0; i < maxScrolls; i++) {
    await humanScroll(page, 600 + Math.random() * 600);
    await randomDelay(1500, 3000);
    log(`  Scroll ${i + 1}/${maxScrolls}`);

    // Click "See more" buttons to expand post text
    try {
      const seeMoreBtns = await page.$$('div[role="button"]:has-text("See more")');
      for (const btn of seeMoreBtns.slice(0, 3)) {
        try { await btn.click(); await randomDelay(300, 600); } catch {}
      }
    } catch {}
  }

  // Extract posts from DOM — use feed > div as post containers
  const posts = await page.evaluate(() => {
    const results = [];
    const feedItems = document.querySelectorAll('div[role="feed"] > div');

    for (const item of feedItems) {
      try {
        // Get post body: all dir="auto" text blocks
        const textBlocks = [...item.querySelectorAll('div[dir="auto"]')]
          .map(d => d.innerText.trim())
          .filter(t => t.length > 5);
        if (!textBlocks.length) continue;
        const body = textBlocks.join('\n').slice(0, 5000);
        if (body.length < 10) continue;

        // Get author: find link with /user/ that contains a name-like text
        let author = 'Unknown';
        let authorUrl = '';
        const userLinks = [...item.querySelectorAll('a[href*="/user/"], a[href*="profile.php"]')];
        for (const a of userLinks) {
          const name = a.innerText.trim();
          if (name && name.length > 1 && name.length < 60 && !/^\d+[hmdw]/.test(name) && !/http/.test(name)) {
            author = name;
            const href = a.getAttribute('href') || '';
            const uidMatch = href.match(/\/user\/(\d+)/);
            if (uidMatch) authorUrl = 'https://www.facebook.com/profile.php?id=' + uidMatch[1];
            break;
          }
        }
        // Fallback: first <strong> with short text that's not the post body
        if (author === 'Unknown') {
          const strongs = [...item.querySelectorAll('strong')];
          for (const s of strongs) {
            const t = s.innerText.trim();
            if (t && t.length > 1 && t.length < 50 && t !== body.slice(0, t.length)) {
              author = t;
              break;
            }
          }
        }

        // Get post link/ID
        let permalink = '', postId = '';
        const allLinks = [...item.querySelectorAll('a')];
        for (const a of allLinks) {
          const href = a.getAttribute('href') || '';
          // Direct post link: /groups/xxx/posts/xxx or /permalink/xxx
          const directMatch = href.match(/\/groups\/([^/]+)\/(?:posts|permalink)\/(\d+)/);
          if (directMatch) {
            postId = directMatch[2];
            permalink = 'https://www.facebook.com/groups/' + directMatch[1] + '/posts/' + postId;
            break;
          }
          // Photo/media link with gm.xxx = post ID
          const gmMatch = href.match(/set=gm\.(\d+)/);
          if (gmMatch && !postId) {
            postId = gmMatch[1];
            // Extract group ID from any /groups/xxx/ link
            const gidMatch = href.match(/\/groups\/(\d+)/);
            const gid = gidMatch ? gidMatch[1] : '';
            if (gid) permalink = 'https://www.facebook.com/groups/' + gid + '/posts/' + postId;
          }
        }
        // Fallback: look for group ID in URL and use content hash
        if (!postId) {
          let hash = 0;
          for (let i = 0; i < body.length && i < 100; i++) hash = ((hash << 5) - hash + body.charCodeAt(i)) | 0;
          postId = 'fbg_' + Math.abs(hash).toString(36);
        }
        if (!permalink && postId.match(/^\d+$/)) {
          // Try to get groupId from page URL
          const gidFromUrl = location.pathname.match(/\/groups\/(\d+)/);
          if (gidFromUrl) permalink = 'https://www.facebook.com/groups/' + gidFromUrl[1] + '/posts/' + postId;
        }

        // Get timestamp from aria-label or short link text
        let timeText = '';
        for (const a of allLinks) {
          const label = a.getAttribute('aria-label') || '';
          if (/\d{4}/.test(label) || /ago/i.test(label) || /yesterday/i.test(label) || /hours?|minutes?|days?/i.test(label)) {
            timeText = label; break;
          }
          const t = a.innerText.trim();
          if (/^\d+[hmdw]$/.test(t) || /^\d+\s*(hr|min|hour|day|week)/i.test(t) || /^(yesterday|just now)/i.test(t)) {
            timeText = t; break;
          }
        }
        // Fallback: check all spans for time-like text
        if (!timeText) {
          const spans = [...item.querySelectorAll('span')];
          for (const s of spans) {
            const t = s.innerText.trim();
            if (/^\d+[hmdw]$/.test(t) || /^\d+\s*(hr|min|hour|day)/i.test(t) || /^just now$/i.test(t)) {
              timeText = t; break;
            }
          }
        }

        // Reactions & comments count from aria-labels or text
        let reactions = 0, commentCount = 0;
        const ariaEls = item.querySelectorAll('[aria-label]');
        for (const el of ariaEls) {
          const label = el.getAttribute('aria-label') || '';
          const rm = label.match(/(\d+)\s*(reaction|like)/i);
          const cm = label.match(/(\d+)\s*comment/i);
          if (rm) reactions = parseInt(rm[1]);
          if (cm) commentCount = parseInt(cm[1]);
        }

        results.push({ postId, body, author, authorUrl, permalink, timeText, reactions, commentCount });
      } catch {}
    }

    // Deduplicate by postId
    const seen = new Set();
    return results.filter(r => {
      if (seen.has(r.postId)) return false;
      seen.add(r.postId);
      return true;
    });
  });

  log(`  Extracted ${posts.length} posts`);
  return posts;
}

// --- Scrape comments from a specific post ---
export async function scrapePostComments(postUrl, maxScrolls = 5) {
  if (!page) throw new Error('Browser not started');

  log(`Scraping comments: ${postUrl}`);
  await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await randomDelay(2000, 4000);

  // Expand comment section
  try {
    const allCommentsBtn = await page.$('span:has-text("Most relevant")');
    if (allCommentsBtn) {
      await allCommentsBtn.click();
      await randomDelay(500, 1000);
      const allOption = await page.$('div[role="menuitem"]:has-text("All comments")');
      if (allOption) { await allOption.click(); await randomDelay(1500, 2500); }
    }
  } catch {}

  // Scroll to load more comments
  for (let i = 0; i < maxScrolls; i++) {
    await humanScroll(page, 400 + Math.random() * 400);
    await randomDelay(1000, 2000);

    // Click "View more comments"
    try {
      const moreBtn = await page.$('span:has-text("View more comments")');
      if (moreBtn) { await moreBtn.click(); await randomDelay(1000, 2000); }
    } catch {}
  }

  // Extract comments from post detail page
  const comments = await page.evaluate(() => {
    const results = [];
    // On a post detail page, the main post is the first feed item,
    // comments appear as subsequent items or inside comment containers
    const feedItems = document.querySelectorAll('div[role="article"]');

    // Skip first article (main post), rest are comments
    for (let i = 1; i < feedItems.length; i++) {
      const item = feedItems[i];
      const textBlocks = [...item.querySelectorAll('div[dir="auto"]')]
        .map(d => d.innerText.trim())
        .filter(t => t.length > 2);
      if (!textBlocks.length) continue;
      const body = textBlocks.join('\n').slice(0, 3000);

      // Author from user link
      let author = 'Unknown';
      let cAuthorUrl = '';
      const userLink = item.querySelector('a[href*="/user/"], a[href*="profile.php"]');
      if (userLink) {
        const name = userLink.innerText.trim();
        if (name && name.length > 1 && name.length < 60) {
          author = name;
          const href = userLink.getAttribute('href') || '';
          const uidMatch = href.match(/\/user\/(\d+)/);
          if (uidMatch) cAuthorUrl = 'https://www.facebook.com/profile.php?id=' + uidMatch[1];
        }
      }
      if (author === 'Unknown') {
        const strong = item.querySelector('strong');
        if (strong) {
          const t = strong.innerText.trim();
          if (t && t.length > 1 && t.length < 50) author = t;
        }
      }

      results.push({ body, author: cAuthorUrl ? author + '|||' + cAuthorUrl : author });
    }

    // If role="article" didn't work, try comment-specific selectors
    if (results.length === 0) {
      const commentDivs = document.querySelectorAll('ul[role="list"] > li');
      for (const li of commentDivs) {
        const textEl = li.querySelector('div[dir="auto"]');
        const body = textEl?.innerText?.trim() || '';
        if (body.length < 3) continue;
        const authorEl = li.querySelector('a[href*="/user/"] strong') || li.querySelector('strong');
        const author = authorEl?.innerText?.trim() || 'Unknown';
        results.push({ body: body.slice(0, 3000), author });
      }
    }

    // Deduplicate
    const seen = new Set();
    return results.filter(r => {
      const key = r.author + ':' + r.body.slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  log(`  Extracted ${comments.length} comments`);
  return comments;
}

// --- Full group scrape: posts + comments → mentions format ---
export async function scrapeGroup(groupId, groupName, maxScrolls = 8) {
  if (!page) throw new Error('Browser not started');

  // Support both numeric ID and text alias (e.g. "adbuyers")
  const groupUrl = groupId.startsWith('http') ? groupId : `https://www.facebook.com/groups/${groupId}`;
  const posts = await scrapeGroupPosts(groupUrl, maxScrolls);
  const allMentions = [];
  const now = new Date().toISOString();

  for (const post of posts) {
    // Convert timeText to approximate UTC timestamp
    const createdUtc = parseTimeText(post.timeText);

    allMentions.push({
      id: 'fb_post_' + post.postId,
      type: 'post',
      title: post.body.slice(0, 100),
      body: post.body,
      author: post.authorUrl ? post.author + '|||' + post.authorUrl : post.author,
      subreddit: groupName || groupId,
      permalink: post.permalink || groupUrl,
      score: post.reactions || 0,
      num_comments: post.commentCount || 0,
      created_utc: createdUtc,
      discovered_at: now,
      source: 'facebook_group',
      matched_keywords: '[]',
      category: 'facebook',
      platform: 'facebook',
    });

    // Scrape comments for posts with permalink (limit to first 5 posts to avoid slowness)
    if (post.permalink && allMentions.filter(m => m.type === 'comment').length < 50) {
      await randomDelay(3000, 6000);
      try {
        const comments = await scrapePostComments(post.permalink, 3);
        for (let ci = 0; ci < comments.length; ci++) {
          const c = comments[ci];
          allMentions.push({
            id: 'fb_comment_' + post.postId + '_' + ci,
            type: 'comment',
            title: '',
            body: c.body,
            author: c.author,
            subreddit: groupName || groupId,
            permalink: post.permalink,
            score: 0,
            num_comments: 0,
            created_utc: createdUtc,
            discovered_at: now,
            source: 'facebook_comment',
            matched_keywords: '[]',
            category: 'facebook',
            platform: 'facebook',
          });
        }
      } catch (e) { log(`  Comment scrape error: ${e.message}`); }
    }
  }

  log(`Group ${groupName}: ${allMentions.length} total mentions (${posts.length} posts)`);
  return allMentions;
}

// --- Parse relative time text to UTC timestamp ---
function parseTimeText(text) {
  if (!text) return Math.floor(Date.now() / 1000);
  const now = Date.now();

  // "Xm" / "Xh" / "Xd" / "Xw" patterns
  const m = text.match(/(\d+)\s*m(?:in)?/i);
  if (m) return Math.floor((now - parseInt(m[1]) * 60000) / 1000);
  const h = text.match(/(\d+)\s*h(?:our|r)?/i);
  if (h) return Math.floor((now - parseInt(h[1]) * 3600000) / 1000);
  const d = text.match(/(\d+)\s*d(?:ay)?/i);
  if (d) return Math.floor((now - parseInt(d[1]) * 86400000) / 1000);
  const w = text.match(/(\d+)\s*w(?:eek)?/i);
  if (w) return Math.floor((now - parseInt(w[1]) * 7 * 86400000) / 1000);

  // "Yesterday at XX:XX"
  if (/yesterday/i.test(text)) return Math.floor((now - 86400000) / 1000);

  // Date format: "March 30" or "March 30, 2025"
  try {
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) return Math.floor(parsed.getTime() / 1000);
  } catch {}

  // "Just now"
  if (/just now/i.test(text)) return Math.floor(now / 1000);

  return Math.floor(now / 1000);
}
