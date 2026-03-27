import { loadConfig } from './config.js';
import { createFetcher, createKookeeyFetcher } from './fetcher.js';
import { matchItem, classifyMatches, expandKeywords } from './matcher.js';
import { saveMentions, logPoll, logCommentRate } from './db.js';
import app from './server.js';

let roundCount = 0;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function runProject(project, fetcher, isEven) {
  const pid = project.id;
  const allMentions = [];
  const tasks = [];
  const errors = [];

  log(`  [${pid}] 开始`);

  // 品牌搜索 — 每轮都跑
  for (const kw of project.keywords?.brand || []) {
    try {
      log(`  [${pid}] 搜索品牌: "${kw}"`);
      const posts = await fetcher.searchPosts(kw);
      tasks.push(`brand:${kw}`);
      for (const item of posts) {
        // 二次验证
        const text = ((item.title || '') + ' ' + (item.body || '')).toLowerCase();
        if (!text.includes(kw.toLowerCase())) continue;

        const matches = matchItem(item, project.keywords);
        const { category, matchedKeywords } = classifyMatches(matches, 'brand');
        allMentions.push({ ...item, project: pid, discovered_at: new Date().toISOString(), source: 'search_brand', matched_keywords: JSON.stringify(matchedKeywords.length ? matchedKeywords : [kw]), category });
      }
    } catch (err) { errors.push(`brand:${kw}: ${err.message}`); }
  }

  if (isEven) {
    // 偶数轮：Subreddit 新帖 + 评论流
    for (const sub of project.subreddits || []) {
      try {
        log(`  [${pid}] r/${sub} 新帖`);
        const posts = await fetcher.subredditNew(sub);
        tasks.push(`sub_post:${sub}`);
        for (const item of posts) {
          const matches = matchItem(item, project.keywords);
          const { category, matchedKeywords } = classifyMatches(matches, 'subreddit');
          allMentions.push({ ...item, project: pid, discovered_at: new Date().toISOString(), source: 'subreddit', matched_keywords: JSON.stringify(matchedKeywords), category });
        }

        log(`  [${pid}] r/${sub} 评论流`);
        const comments = await fetcher.subredditComments(sub);
        tasks.push(`sub_comments:${sub}`);

        // 频率统计
        if (comments.length > 1) {
          const utcs = comments.map(c => c.created_utc).filter(Boolean).sort((a, b) => a - b);
          const spanMin = (utcs[utcs.length - 1] - utcs[0]) / 60;
          const rate = spanMin > 0 ? comments.length / spanMin : 0;
          logCommentRate({ project: pid, subreddit: sub, poll_time: new Date().toISOString(), total_comments: comments.length, oldest_utc: utcs[0], newest_utc: utcs[utcs.length - 1], rate_per_min: Math.round(rate * 100) / 100 });
          log(`    ${rate.toFixed(2)}/min (${comments.length}条/${spanMin.toFixed(0)}min)`);
        }

        let matched = 0;
        for (const item of comments) {
          const matches = matchItem(item, project.keywords);
          if (matches.length > 0) {
            const { category, matchedKeywords } = classifyMatches(matches, 'subreddit');
            allMentions.push({ ...item, project: pid, discovered_at: new Date().toISOString(), source: 'subreddit_comment', matched_keywords: JSON.stringify(matchedKeywords), category });
            matched++;
          }
        }
        if (matched) log(`    评论命中 ${matched} 条`);
      } catch (err) { errors.push(`sub:${sub}: ${err.message}`); }
    }
  } else {
    // 奇数轮：行业 + 竞对（竞对自动拆词）
    const kwList = [
      ...(project.keywords?.industry || []).map(kw => ({ kw, term: kw, cat: 'industry', src: 'search_industry' })),
      ...(project.keywords?.competitor || []).flatMap(kw => expandKeywords([kw]).map(v => ({ kw, term: v.variant, cat: 'competitor', src: 'search_competitor' }))),
    ];
    const searched = new Set();
    for (const { kw, term, cat, src } of kwList) {
      if (searched.has(term)) continue;
      searched.add(term);
      try {
        log(`  [${pid}] 搜索${cat}: "${term}"${term !== kw ? ` (←${kw})` : ''}`);
        const posts = await fetcher.searchPosts(term);
        tasks.push(`${cat}:${term}`);
        for (const item of posts) {
          // 二次验证：title+body 里必须真的包含关键词变体，防止 Reddit 搜索模糊匹配
          const text = ((item.title || '') + ' ' + (item.body || '')).toLowerCase();
          const variants = expandKeywords([kw]).map(v => v.variant);
          const found = variants.some(v => text.includes(v));
          if (!found) continue;

          const matches = matchItem(item, project.keywords);
          const { category, matchedKeywords } = classifyMatches(matches, cat);
          allMentions.push({ ...item, project: pid, discovered_at: new Date().toISOString(), source: src, matched_keywords: JSON.stringify(matchedKeywords.length ? matchedKeywords : [kw]), category });
        }
      } catch (err) { errors.push(`${cat}:${term}: ${err.message}`); }
    }
  }

  const newCount = saveMentions(allMentions);
  log(`  [${pid}] 完成: ${newCount} 新 / ${allMentions.length} 总`);
  return { tasks, errors, newCount, totalItems: allMentions.length };
}

async function runPoll() {
  const config = loadConfig();
  if (!config.projects.length) { log('无启用的项目，跳过'); return; }

  const isEven = roundCount % 2 === 0;
  const roundType = isEven ? 'even' : 'odd';
  roundCount++;
  const startTime = Date.now();
  const fetcher = createFetcher(config.proxy);

  // 双层代理 fetcher（并行运行，独立 IP）
  let kookeeyFetcher = null;
  try { kookeeyFetcher = createKookeeyFetcher(config.kookeey); } catch (e) { log(`kookeey fetcher 初始化失败: ${e.message}`); }

  log(`=== 第 ${roundCount} 轮 (${roundType}) | ${config.projects.length} 个项目${kookeeyFetcher ? ' | kookeey 并行' : ''} ===`);

  let totalNew = 0;
  const allTasks = [];
  const allErrors = [];

  for (const project of config.projects) {
    // 本地代理 fetcher
    const result = await runProject(project, fetcher, isEven);
    totalNew += result.newCount;
    allTasks.push(...result.tasks);
    allErrors.push(...result.errors);

    // kookeey fetcher 并行（同样的逻辑，不同 IP，结果汇总去重）
    if (kookeeyFetcher) {
      try {
        log(`  [${project.id}] kookeey 补充抓取...`);
        const kResult = await runProject(project, kookeeyFetcher, isEven);
        totalNew += kResult.newCount;
        if (kResult.newCount > 0) log(`  [${project.id}] kookeey 新增 ${kResult.newCount} 条`);
      } catch (e) {
        log(`  [${project.id}] kookeey 出错: ${e.message}`);
      }
    }
  }

  const durationMs = Date.now() - startTime;
  logPoll({ poll_time: new Date().toISOString(), round_type: roundType, tasks_run: JSON.stringify(allTasks), new_items: totalNew, errors: allErrors.length ? JSON.stringify(allErrors) : null, duration_ms: durationMs });

  log(`=== 第 ${roundCount} 轮完成: ${totalNew} 新数据 / ${(durationMs / 1000).toFixed(1)}s ===`);
}

async function loop() {
  const config = loadConfig();
  const interval = (config.pollIntervalMinutes || 8) * 60 * 1000;
  try { await runPoll(); } catch (err) { log(`轮询异常: ${err.message}`); }
  setTimeout(loop, interval);
}

// 防止未捕获异常导致进程崩溃
process.on('uncaughtException', (err) => {
  log(`未捕获异常: ${err.message}`);
});
process.on('unhandledRejection', (err) => {
  log(`未处理拒绝: ${err?.message || err}`);
});

log('Reddit Monitor 启动');
const initConfig = loadConfig();
const webPort = initConfig.webPort || 3000;
app.listen(webPort, () => log(`Web UI: http://localhost:${webPort}`));
log(`项目: ${initConfig.projects.map(p => p.id).join(', ') || '无'}`);
loop();
