import { loadConfig } from './config.js';
import { createFetcher, createKookeeyFetcher } from './fetcher.js';
import { saveMentions, logPoll, logCommentRate } from './db.js';
import app from './server.js';

let roundCount = 0;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function runProject(project, fetcher) {
  const pid = project.id;
  const allMentions = [];
  const tasks = [];
  const errors = [];

  log(`  [${pid}] 开始`);

  // 抓取所有监控的 subreddit 的新帖 + 评论（每轮都跑，全量存储）
  for (const sub of project.subreddits || []) {
    try {
      log(`  [${pid}] r/${sub} 新帖`);
      const posts = await fetcher.subredditNew(sub);
      tasks.push(`sub_post:${sub}`);
      for (const item of posts) {
        allMentions.push({ ...item, project: pid, discovered_at: new Date().toISOString(), source: 'subreddit', matched_keywords: '[]', category: 'subreddit' });
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

      // 评论全量存储
      for (const item of comments) {
        allMentions.push({ ...item, project: pid, discovered_at: new Date().toISOString(), source: 'subreddit_comment', matched_keywords: '[]', category: 'subreddit' });
      }
      log(`    评论 ${comments.length} 条`);
    } catch (err) { errors.push(`sub:${sub}: ${err.message}`); }
  }

  const newCount = saveMentions(allMentions);
  log(`  [${pid}] 完成: ${newCount} 新 / ${allMentions.length} 总`);
  return { tasks, errors, newCount, totalItems: allMentions.length };
}

async function runPoll() {
  const config = loadConfig();
  if (!config.projects.length) { log('无启用的项目，跳过'); return; }

  roundCount++;
  const startTime = Date.now();
  const fetcher = createFetcher(config.proxy);

  log(`=== 第 ${roundCount} 轮 | ${config.projects.length} 个项目 ===`);

  let totalNew = 0;
  const allTasks = [];
  const allErrors = [];

  for (const project of config.projects) {
    const result = await runProject(project, fetcher);
    totalNew += result.newCount;
    allTasks.push(...result.tasks);
    allErrors.push(...result.errors);
  }

  const durationMs = Date.now() - startTime;
  logPoll({ poll_time: new Date().toISOString(), round_type: 'all', tasks_run: JSON.stringify(allTasks), new_items: totalNew, errors: allErrors.length ? JSON.stringify(allErrors) : null, duration_ms: durationMs });

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
