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

function assertPage(p) {
  if (!p) throw new Error('browser page is null (not started or was stopped)');
  if (p.isClosed?.()) throw new Error('browser page is closed');
}

async function humanScroll(page, distance) {
  assertPage(page);
  const delta = distance || 400 + Math.random() * 800;
  try { await page.mouse.wheel(0, delta); } catch (e) { throw new Error(`scroll failed: ${e.message}`); }
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
let scrapeInProgress = false;

export function isScraping() {
  return scrapeInProgress;
}

export function getBrowserStatus() {
  return {
    running: !!browser,
    hasPage: !!page,
    scraping: scrapeInProgress,
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
export async function stopBrowser(force = false) {
  if (!browser) return { ok: true, wasRunning: false };
  if (scrapeInProgress && !force) {
    log('Skip stop: scrape in progress');
    return { ok: false, reason: 'scrape in progress' };
  }

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
export async function scrapeGroupPosts(groupUrl, maxScrolls = 20) {
  assertPage(page);

  log(`Scraping group: ${groupUrl}`);
  await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await randomDelay(2000, 4000);

  // Wait until real post content is rendered (not just skeleton shells).
  // FB renders empty role=article placeholders first, then fills them.
  try {
    await page.waitForFunction(() => {
      const arts = document.querySelectorAll('div[role="feed"] [role="article"]');
      for (const a of arts) {
        if (a.innerText && a.innerText.trim().length > 20) return true;
      }
      return false;
    }, { timeout: 20000 });
    log('  Feed content loaded');
  } catch {
    log('  Feed content wait timed out — proceeding anyway');
  }

  // Dismiss any popups/login prompts
  try {
    const closeBtn = await page.$('[aria-label="Close"]');
    if (closeBtn) { await closeBtn.click(); await randomDelay(500, 1000); }
  } catch {}

  // Select "New posts" sort — "Recent activity" shows comment cards, not post cards
  try {
    const sortBtn = await page.$('span:has-text("Most relevant"), span:has-text("Recent activity")');
    if (sortBtn) {
      await sortBtn.click();
      await randomDelay(800, 1200);
      const newPostsOption = await page.$('div[role="menuitem"]:has-text("New posts")');
      if (newPostsOption) {
        await newPostsOption.click();
        await randomDelay(2000, 3000);
        log('  Switched to New posts sort');
      } else {
        // Close menu if no match
        try { await page.keyboard.press('Escape'); } catch {}
      }
    }
  } catch {}

  // Scroll + extract in batches (FB uses virtual scroll, old posts get recycled)
  const postsMap = new Map(); // postId -> post data
  const processedForModal = new Set(); // postIds whose modal we already opened
  const extractBatch = async () => {
    const batch = await page.evaluate(_EXTRACT_POSTS_FN);
    let newCount = 0;
    for (const p of batch) {
      if (!postsMap.has(p.postId)) { postsMap.set(p.postId, p); newCount++; }
    }
    return { total: batch.length, newCount };
  };

  // Open a post's comment modal by clicking "View more comments" inside its container,
  // scroll the dialog to load comments, extract them, then close with Escape.
  const processPostModal = async (postId) => {
    try {
      // Click the "View more comments" button in the post container
      const clicked = await page.evaluate((pid) => {
        const feed = document.querySelector('div[role="feed"]');
        if (!feed) return 'no-feed';
        // Find container by matching a link with /posts/PID/
        let container = null;
        for (const child of feed.children) {
          const links = child.querySelectorAll('a[href*="/posts/' + pid + '"]');
          if (links.length) { container = child; break; }
        }
        if (!container) return 'no-container';
        const btn = [...container.querySelectorAll('div[role="button"], span')]
          .find(b => /View\s+more\s+comments/i.test(b.innerText));
        if (!btn) return 'no-button';
        btn.scrollIntoView({ block: 'center', behavior: 'instant' });
        // Click (may bubble to parent anchor — use dispatchEvent to force)
        btn.click();
        return 'clicked';
      }, postId);

      if (clicked !== 'clicked') return 0;

      // Wait for dialog to appear
      try {
        await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
      } catch { return 0; }
      await randomDelay(1500, 2500);

      // Scroll inside dialog and expand sub-replies
      for (let s = 0; s < 6; s++) {
        await page.evaluate(() => {
          const modal = document.querySelector('div[role="dialog"]');
          if (!modal) return;
          const scrollable = modal.querySelector('[style*="overflow-y"]') ||
                             modal.querySelector('[style*="overflow"]') || modal;
          scrollable.scrollTop += 800;
          // Click "View more comments" / "View more replies" buttons inside modal
          const btns = [...modal.querySelectorAll('div[role="button"], span')]
            .filter(b => /View\s+more\s+(comments|replies)|View\s+previous\s+comments/i.test(b.innerText));
          for (const b of btns.slice(0, 3)) { try { b.click(); } catch {} }
        });
        await randomDelay(800, 1400);
      }

      // Extract comments from dialog — nested [role="article"] excluding the main post
      // The first article in the dialog is the post itself; comments follow.
      const modalComments = await page.evaluate(() => {
        const modal = document.querySelector('div[role="dialog"]');
        if (!modal) return [];
        const articles = [...modal.querySelectorAll('[role="article"]')];
        const out = [];
        // Identify which article is the "main post" (has Share button); rest are comments
        const isPost = (el) => {
          const btns = [...el.querySelectorAll('div[role="button"]')].map(b => b.innerText.trim());
          return btns.includes('Share') || btns.includes('Comment');
        };
        for (const el of articles) {
          if (isPost(el)) continue;
          const texts = [...el.querySelectorAll('div[dir="auto"]')]
            .map(d => d.innerText.trim()).filter(t => t.length > 1);
          if (!texts.length) continue;
          const body = texts.join('\n').slice(0, 3000);
          let author = 'Unknown', authorUrl = '';
          const link = el.querySelector('a[href*="/user/"], a[href*="profile.php"]');
          if (link) {
            const name = link.innerText.trim();
            if (name && name.length > 1 && name.length < 60) {
              author = name;
              authorUrl = 'https://www.facebook.com' + (link.getAttribute('href') || '').split('?')[0];
            }
          }
          out.push({ body, author, authorUrl });
        }
        return out;
      });

      // Close dialog
      try { await page.keyboard.press('Escape'); } catch {}
      await randomDelay(600, 1200);

      // Merge into the post's comments (dedup by first 50 chars of body)
      const post = postsMap.get(postId);
      if (post && modalComments.length) {
        const existing = new Set((post.comments || []).map(c => c.body.slice(0, 50)));
        for (const mc of modalComments) {
          if (existing.has(mc.body.slice(0, 50))) continue;
          post.comments.push(mc);
          existing.add(mc.body.slice(0, 50));
        }
      }
      return modalComments.length;
    } catch (e) {
      // Ensure dialog is closed on error
      try { await page.keyboard.press('Escape'); } catch {}
      return 0;
    }
  };

  const EXTRACT_EVERY = 5; // extract every 5 scrolls
  for (let i = 0; i < maxScrolls; i++) {
    await humanScroll(page, 600 + Math.random() * 600);
    await randomDelay(1500, 3000);

    // Click "See more" buttons to expand post text
    try {
      const seeMoreBtns = await page.$$('div[role="button"]:has-text("See more")');
      for (const btn of seeMoreBtns.slice(0, 3)) {
        try { await btn.click(); await randomDelay(300, 600); } catch {}
      }
    } catch {}

    // Extract posts periodically + open comment modal for new posts with >2 comments
    if ((i + 1) % EXTRACT_EVERY === 0 || i === maxScrolls - 1) {
      try {
        const { total, newCount } = await extractBatch();
        log(`  Scroll ${i + 1}/${maxScrolls} | batch:${total} new:${newCount} total:${postsMap.size}`);

        // Process modal comments for new posts with "View more comments" button
        const toProcess = [...postsMap.values()]
          .filter(p => !processedForModal.has(p.postId) && p.hasMoreCommentsBtn);
        for (const post of toProcess) {
          processedForModal.add(post.postId);
          const added = await processPostModal(post.postId);
          if (added) log(`    post ${post.postId.slice(-6)}: +${added} comments from modal`);
          await randomDelay(800, 1500);
        }
      } catch (e) {
        log(`  Scroll ${i + 1}/${maxScrolls} | extract error: ${e.message}`);
      }
    } else {
      log(`  Scroll ${i + 1}/${maxScrolls}`);
    }
  }

  const posts = [...postsMap.values()];
  log(`  Extracted ${posts.length} unique posts, ${posts.reduce((s, p) => s + (p.comments?.length || 0), 0)} inline comments`);
  return posts;
}

// Extract posts: each post is a direct child div of role=feed, containing:
// - post header/body/buttons at top level
// - 0-2 nested role=article elements as inline visible comments
const _EXTRACT_POSTS_FN = () => {
  const results = [];
  const feed = document.querySelector('div[role="feed"]');
  if (!feed) return results;

  const containers = [...feed.children];
  for (const item of containers) {
    try {
      // Skip empty virtualized slots and non-post items (sort control, etc.)
      if (!item.innerText || item.innerText.length < 20) continue;
      if (/^sort group feed/i.test(item.innerText.trim())) continue;

      // Find permalink: an /posts/NNN/ link WITHOUT comment_id (post-level link)
      const allLinks = [...item.querySelectorAll('a')];
      let postId = '', permalink = '';
      for (const a of allLinks) {
        const href = a.getAttribute('href') || '';
        if (href.includes('comment_id=')) continue;
        const m = href.match(/\/groups\/([^/?]+)\/(?:posts|permalink)\/(\d+)/);
        if (m) {
          postId = m[2];
          permalink = 'https://www.facebook.com/groups/' + m[1] + '/posts/' + postId;
          break;
        }
      }
      if (!postId) continue; // not a post (or post link missing)

      // Clone container and strip nested articles (comments) to isolate post content
      const postOnly = item.cloneNode(true);
      [...postOnly.querySelectorAll('[role="article"]')].forEach(el => el.remove());

      // Body: dir=auto text blocks in post (minus nested comments)
      const textBlocks = [...postOnly.querySelectorAll('div[dir="auto"]')]
        .map(d => d.innerText.trim()).filter(t => t.length > 2);
      const body = textBlocks.join('\n').slice(0, 5000);
      if (body.length < 3) continue;

      // Author: first /user/ or profile.php link from post-only clone
      let author = 'Unknown', authorUrl = '';
      const userLinks = [...postOnly.querySelectorAll('a[href*="/user/"], a[href*="profile.php"]')];
      for (const a of userLinks) {
        const name = a.innerText.trim();
        if (name && name.length > 1 && name.length < 60 && !/^\d+[hmdw]/.test(name)) {
          author = name;
          const href = a.getAttribute('href') || '';
          authorUrl = 'https://www.facebook.com' + href.split('?')[0];
          break;
        }
      }

      // Timestamp from spans/links text (post-only)
      let timeText = '';
      const postSpans = [...postOnly.querySelectorAll('span, a')];
      for (const s of postSpans) {
        const t = s.innerText.trim();
        if (/^\d+[hmdw]$/.test(t) || /^\d+\s*(hr|min|hour|day|week)/i.test(t) ||
            /^(yesterday|just now)$/i.test(t) || /^(January|February|March|April|May|June|July|August|September|October|November|December)/i.test(t)) {
          timeText = t;
          break;
        }
      }

      // Reactions & comment count: look for all-number buttons in item (not clone — live buttons)
      // Pattern: a post shows reaction count button + comment count button near bottom
      let reactions = 0, commentCount = 0;
      const numBtns = [...item.querySelectorAll('div[role="button"], span')]
        .map(b => b.innerText.trim())
        .filter(t => /^\d+$/.test(t))
        .map(t => parseInt(t));
      // Heuristic: first small number = reactions, second = comments (best-effort)
      if (numBtns.length >= 1) reactions = numBtns[0];
      if (numBtns.length >= 2) commentCount = numBtns[1];
      // Also check aria-labels for explicit counts
      const ariaEls = item.querySelectorAll('[aria-label]');
      for (const el of ariaEls) {
        const label = el.getAttribute('aria-label') || '';
        const rm = label.match(/(\d+)\s*(reaction|like)/i);
        const cm = label.match(/(\d+)\s*comment/i);
        if (rm) reactions = parseInt(rm[1]);
        if (cm) commentCount = parseInt(cm[1]);
      }

      // Inline visible comments: each nested [role="article"] inside item = 1 comment
      const comments = [];
      const commentArticles = [...item.querySelectorAll('[role="article"]')];
      for (const cel of commentArticles) {
        const ctexts = [...cel.querySelectorAll('div[dir="auto"]')]
          .map(d => d.innerText.trim()).filter(t => t.length > 2);
        const cbody = ctexts.join('\n').slice(0, 3000);
        if (cbody.length < 2) continue;
        let cAuthor = 'Unknown', cAuthorUrl = '';
        const cLink = cel.querySelector('a[href*="/user/"], a[href*="profile.php"]');
        if (cLink) {
          const cn = cLink.innerText.trim();
          if (cn && cn.length > 1 && cn.length < 60) {
            cAuthor = cn;
            cAuthorUrl = 'https://www.facebook.com' + (cLink.getAttribute('href') || '').split('?')[0];
          }
        }
        comments.push({ body: cbody, author: cAuthor, authorUrl: cAuthorUrl });
      }

      // Detect "View more comments" button — post has more comments beyond the 2 inline
      const hasMoreCommentsBtn = [...item.querySelectorAll('div[role="button"], span')]
        .some(b => /View\s+more\s+comments/i.test(b.innerText));

      results.push({
        postId, body, author, authorUrl, permalink, timeText,
        reactions, commentCount, comments, hasMoreCommentsBtn,
      });
    } catch {}
  }

  // Dedup by postId
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.postId)) return false;
    seen.add(r.postId);
    return true;
  });
};

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
export async function scrapeGroup(groupId, groupName, maxScrolls = 20) {
  if (scrapeInProgress) throw new Error('another scrape already in progress');
  assertPage(page);
  scrapeInProgress = true;
  try {
    return await _scrapeGroupInner(groupId, groupName, maxScrolls);
  } finally {
    scrapeInProgress = false;
  }
}

async function _scrapeGroupInner(groupId, groupName, maxScrolls) {
  assertPage(page);

  // Support both numeric ID and text alias (e.g. "adbuyers")
  const groupUrl = groupId.startsWith('http') ? groupId : `https://www.facebook.com/groups/${groupId}`;
  const posts = await scrapeGroupPosts(groupUrl, maxScrolls);
  const allMentions = [];
  const now = new Date().toISOString();

  for (const post of posts) {
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

    // Add inline comments (from feed page)
    for (let ci = 0; ci < (post.comments || []).length; ci++) {
      const c = post.comments[ci];
      allMentions.push({
        id: 'fb_comment_' + post.postId + '_' + ci,
        type: 'comment',
        title: '',
        body: c.body,
        author: c.authorUrl ? c.author + '|||' + c.authorUrl : c.author,
        subreddit: groupName || groupId,
        permalink: post.permalink || groupUrl,
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
  }

  // Phase 2 runs inline during Phase 1 scroll (see scrapeGroupPosts: processPostModal).
  // Modal-expanded comments are already merged into post.comments by the time we get here.
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
