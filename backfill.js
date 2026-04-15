import db from './db.js';
import * as fbBrowser from './facebook-browser.js';

let fbBackfillRunning = false;

export function isBackfillRunning() {
  return fbBackfillRunning;
}

// Run backfill: revisit recent FB post permalinks to recover comment timestamps
// that were previously inherited from the parent post. Returns updated count.
export async function runBackfill({ limit = 3, daysBack = 30, logFn = console.log } = {}) {
  if (fbBackfillRunning) return { error: 'backfill already running', updated: 0 };
  if (fbBrowser.isScraping()) return { error: 'scrape in progress', updated: 0 };
  if (!fbBrowser.getPage()) return { error: 'browser not running', updated: 0 };

  const cutoff = Math.floor(Date.now() / 1000) - daysBack * 86400;
  const candidatePosts = db.prepare(`
    SELECT p.id AS post_id, p.permalink, p.project, p.created_utc, COUNT(c.id) AS est_comment_count
    FROM mentions p
    INNER JOIN mentions c
      ON c.platform = 'facebook'
      AND c.type = 'comment'
      AND c.permalink = p.permalink
      AND c.created_utc = p.created_utc
    WHERE p.platform = 'facebook' AND p.type = 'post' AND p.created_utc > ?
    GROUP BY p.id
    HAVING est_comment_count > 0
    ORDER BY est_comment_count DESC, p.created_utc DESC
    LIMIT ?
  `).all(cutoff, limit);

  if (!candidatePosts.length) return { ok: true, updated: 0, posts: 0 };

  fbBackfillRunning = true;
  const updateStmt = db.prepare('UPDATE mentions SET created_utc = ? WHERE id = ?');
  const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();

  let updated = 0;
  let visited = 0;
  try {
    for (const post of candidatePosts) {
      if (fbBrowser.isScraping()) { logFn('[backfill] scrape started, aborting'); break; }
      if (!fbBrowser.getPage()) { logFn('[backfill] browser lost, aborting'); break; }

      try {
        logFn(`[backfill] visiting ${post.permalink}`);
        const comments = await fbBrowser.scrapePostComments(post.permalink, 3);
        visited++;
        logFn(`[backfill] got ${comments.length} comments with time`);

        const dbComments = db.prepare(
          `SELECT id, body, author, created_utc FROM mentions WHERE permalink = ? AND platform = 'facebook' AND type = 'comment' AND created_utc = ?`
        ).all(post.permalink, post.created_utc);
        logFn(`[backfill] ${dbComments.length} DB comments estimated for this post`);

        let matched = 0;
        for (const c of comments) {
          if (!c.timeText || !c.body) continue;
          const newUtc = fbBrowser.parseTimeText(c.timeText);
          const scrapedBodyNorm = norm(c.body).slice(0, 40);
          const scrapedAuthorName = (c.author || '').split('|||')[0].trim();

          for (const dbc of dbComments) {
            if (dbc.__matched) continue;
            const dbBodyNorm = norm(dbc.body).slice(0, 40);
            const dbAuthorName = (dbc.author || '').split('|||')[0].trim();
            const bodyHit = scrapedBodyNorm.length >= 20 && dbBodyNorm.length >= 20 &&
                            (dbBodyNorm.startsWith(scrapedBodyNorm.slice(0, 20)) ||
                             scrapedBodyNorm.startsWith(dbBodyNorm.slice(0, 20)));
            const authorHit = scrapedAuthorName && dbAuthorName && scrapedAuthorName === dbAuthorName &&
                              norm(c.body).slice(0, 10) === norm(dbc.body).slice(0, 10);
            if (bodyHit || authorHit) {
              updateStmt.run(newUtc, dbc.id);
              dbc.__matched = true;
              matched++;
              updated++;
              break;
            }
          }
        }
        logFn(`[backfill] matched ${matched}/${comments.length} for this post`);

        // Long delay between posts to respect FB rate limit
        await new Promise(r => setTimeout(r, 90000 + Math.random() * 30000));
      } catch (e) {
        logFn(`[backfill] error on ${post.permalink}: ${e.message}`);
      }
    }
  } finally {
    fbBackfillRunning = false;
  }

  logFn(`[backfill] done: visited ${visited} posts, updated ${updated} comments`);
  return { ok: true, visited, updated, posts: candidatePosts.length };
}
