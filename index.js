import { loadConfig } from './config.js';
import { createFetcher, createKookeeyFetcher } from './fetcher.js';
import db from './db.js';
import { saveMentions, logPoll, logCommentRate, getUnanalyzedMentions, saveAnalysisBatch, getDailyAnalysisStats, saveDailyReport, getStaleUsers, saveUsers } from './db.js';
import { analyzeBatch, generateDailyReport } from './analyzer.js';
import app from './server.js';

let roundCount = 0;
let lastReportDate = '';

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
      if (!posts.length) errors.push(`sub_post:${sub}: no data returned`);
      for (const item of posts) {
        allMentions.push({ ...item, project: pid, discovered_at: new Date().toISOString(), source: 'subreddit', matched_keywords: '[]', category: 'subreddit' });
      }

      log(`  [${pid}] r/${sub} 评论流`);
      const comments = await fetcher.subredditComments(sub);
      tasks.push(`sub_comments:${sub}`);
      if (!comments.length) errors.push(`sub_comments:${sub}: no data returned`);

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

async function runAnalysis(config) {
  if (!config.ai?.apiKey || !config.ai?.endpoint) return;

  for (const project of config.projects) {
    // Loop through all unanalyzed in batches of 15
    let totalAnalyzed = 0;
    while (true) {
      const unanalyzed = getUnanalyzedMentions(project.id, 15);
      if (!unanalyzed.length) break;

      log(`  [${project.id}] AI 分析 ${unanalyzed.length} 条...`);
      const results = await analyzeBatch(config.ai, unanalyzed, project.reportRole);
      if (results.length) {
        saveAnalysisBatch(results);
        totalAnalyzed += results.length;
        const sentiments = results.map(r => r.sentiment);
        log(`  [${project.id}] 批次完成: ${results.length} 条 (正${sentiments.filter(s => s === 'positive').length}/负${sentiments.filter(s => s === 'negative').length}/中${sentiments.filter(s => s === 'neutral').length})`);
      } else {
        log(`  [${project.id}] 分析返回空，跳过`);
        break;
      }
    }
    if (totalAnalyzed) log(`  [${project.id}] 本轮共分析 ${totalAnalyzed} 条`);
    else log(`  [${project.id}] 无待分析内容`);
  }
}

async function checkDailyReport(config) {
  if (!config.ai?.apiKey || !config.ai?.endpoint) return;

  const today = new Date().toISOString().slice(0, 10);
  // Generate report for yesterday (full day data)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (lastReportDate === yesterday) return;

  for (const project of config.projects) {
    const stats = getDailyAnalysisStats(project.id, yesterday);
    if (stats.total === 0) { log(`  [${project.id}] ${yesterday} 无数据，跳过报告`); continue; }

    log(`  [${project.id}] 生成 ${yesterday} 舆情日报...`);
    const report = await generateDailyReport(config.ai, project, stats);
    if (report) {
      saveDailyReport({
        project: project.id,
        report_date: yesterday,
        positive_count: stats.positive,
        negative_count: stats.negative,
        neutral_count: stats.neutral,
        total_count: stats.total,
        actionable_count: stats.actionable,
        top_pros: JSON.stringify(stats.topPros),
        top_cons: JSON.stringify(stats.topCons),
        full_report: report,
        created_at: new Date().toISOString(),
      });
      log(`  [${project.id}] ${yesterday} 日报已生成`);
    }
  }

  lastReportDate = yesterday;
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

  // Fetch user karma for new authors
  try {
    const fetcher = createFetcher(config.proxy);
    // Collect all unique authors from this round
    const allAuthors = [...new Set(
      config.projects.flatMap(p => {
        const rows = db.prepare('SELECT DISTINCT author FROM mentions WHERE project = ? AND author IS NOT NULL').all(p.id);
        return rows.map(r => r.author);
      })
    )].filter(u => u && u !== '[deleted]' && u !== 'AutoModerator');

    const stale = getStaleUsers(allAuthors, 24);
    if (stale.length > 0) {
      const batch = stale.slice(0, 10); // max 10 per round to respect rate limits
      log(`  用户 karma 更新: ${batch.length}/${stale.length} 待更新`);
      const results = [];
      for (const username of batch) {
        const info = await fetcher.userAbout(username);
        if (info) results.push(info);
      }
      if (results.length) {
        saveUsers(results);
        log(`  用户 karma 完成: ${results.length} 条`);
      }
    }
  } catch (err) { log(`用户 karma 异常: ${err.message}`); }

  // AI analysis
  try { await runAnalysis(config); } catch (err) { log(`AI 分析异常: ${err.message}`); }

  // Daily report check
  try { await checkDailyReport(config); } catch (err) { log(`日报异常: ${err.message}`); }
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
log(`AI 分析: ${initConfig.ai?.apiKey ? '已配置' : '未配置'}`);
loop();
