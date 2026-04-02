import https from 'https';
import http from 'http';

function log(msg) {
  console.log(`[${new Date().toISOString()}] [analyzer] ${msg}`);
}

/**
 * Auto-detect API format from endpoint:
 *   - /messages → Anthropic (Claude) format
 *   - otherwise → OpenAI compatible format (OpenRouter, etc.)
 */
function isClaudeFormat(endpoint) {
  return endpoint.includes('/messages');
}

function buildRequest(config, prompt, systemPrompt) {
  if (isClaudeFormat(config.endpoint)) {
    return {
      body: {
        model: config.model || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      },
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      parseResponse: (json) => {
        if (json.content?.[0]?.text) return json.content[0].text;
        throw new Error(json.error?.message || 'no content in response');
      },
    };
  }

  // OpenAI compatible (OpenRouter, etc.)
  return {
    body: {
      model: config.model || 'anthropic/claude-sonnet-4',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    },
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
    },
    parseResponse: (json) => {
      if (json.choices?.[0]?.message?.content) return json.choices[0].message.content;
      throw new Error(json.error?.message || 'no choices in response');
    },
  };
}

async function callLLM(config, prompt, systemPrompt) {
  let endpoint = config.endpoint.replace(/\/+$/, '');
  if (!isClaudeFormat(endpoint) && !endpoint.endsWith('/chat/completions')) {
    endpoint += '/chat/completions';
  }
  const url = new URL(endpoint);
  const isHttps = url.protocol === 'https:';
  const mod = isHttps ? https : http;
  const req_config = buildRequest(config, prompt, systemPrompt);

  const body = JSON.stringify(req_config.body);

  return new Promise((resolve, reject) => {
    const req = mod.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...req_config.headers,
      },
      timeout: 60000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(req_config.parseResponse(json));
        } catch (e) {
          reject(new Error(e.message + ' | raw: ' + data.slice(0, 300)));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

/**
 * Analyze a batch of comments/posts
 * @param {object} config - AI config (endpoint, apiKey, model)
 * @param {array} items - mentions to analyze
 * @param {string} reportRole - custom analyst role, e.g. "Unihertz公关策略师"
 */
export async function analyzeBatch(config, items, reportRole, productInfo) {
  if (!items.length) return [];

  const itemsText = items.map((item, i) =>
    `[${i + 1}] (${item.type}) r/${item.subreddit} | u/${item.author}\n${item.title ? 'Title: ' + item.title + '\n' : ''}${item.body || '(no body)'}`
  ).join('\n---\n');

  const role = reportRole
    ? `你是${reportRole}。从${reportRole}的角度分析以下 Reddit 帖子/评论，重点关注与自身品牌相关的舆情、竞对动态和用户需求。`
    : '你是品牌舆情分析师。分析以下 Reddit 帖子/评论的品牌情感和产品洞察。';

  const systemPrompt = `${role}

请只返回一个合法的 JSON 数组。每个元素必须包含以下字段：
- index: number（从1开始，对应输入编号）
- sentiment: "positive" | "negative" | "neutral"
- relevance: "high" | "medium" | "low"（与品牌/产品的相关度）
- pros: string[]（提到的产品优点，中文，没有则为空数组）
- cons: string[]（提到的产品缺点/投诉，中文，没有则为空数组）
- actionable: boolean（是否包含可执行的产品反馈）
- summary: string（一句话中文摘要）

摘要务必简洁。聚焦产品相关洞察。所有内容用中文。${productInfo ? '\n\n如果评论提到了具体产品型号，请在摘要中标注对应产品名称。' : ''}`;

  const productContext = productInfo ? `\n\n我方产品线信息：\n${productInfo}\n` : '';
  const prompt = `分析以下 ${items.length} 条 Reddit 帖子/评论：${productContext}\n${itemsText}`;

  try {
    const raw = await callLLM(config, prompt, systemPrompt);
    const jsonStr = raw.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const results = JSON.parse(jsonStr);

    return results.map(r => ({
      mention_id: items[r.index - 1]?.id,
      project: items[r.index - 1]?.project,
      sentiment: r.sentiment || 'neutral',
      relevance: r.relevance || 'low',
      pros: JSON.stringify(r.pros || []),
      cons: JSON.stringify(r.cons || []),
      actionable: r.actionable ? 1 : 0,
      summary: r.summary || '',
      analyzed_at: new Date().toISOString(),
    })).filter(r => r.mention_id);
  } catch (err) {
    log(`分析失败: ${err.message}`);
    return [];
  }
}

/**
 * Generate daily sentiment report
 * @param {object} config - AI config
 * @param {object} project - project config (id, name, reportRole)
 * @param {object} stats - daily analysis stats
 */
export async function generateDailyReport(config, project, stats, productInfo) {
  const role = project.reportRole
    ? `你是${project.reportRole}。从${project.reportRole}的专业视角撰写每日 Reddit 社媒舆情监控报告。`
    : '你是品牌舆情分析师，撰写每日 Reddit 社媒舆情监控报告。';

  const systemPrompt = `${role}
要求：全文中文，紧凑实用，Markdown 格式。用表格呈现数据，文字精炼。直接给结论和建议，不要空话套话。不要使用 emoji 符号。在负面反馈部分必须保留原始 Reddit 链接（格式：[查看原帖](URL)），方便直接跳转回复。`;

  const prompt = `为项目「${project.name || project.id}」生成 Reddit 舆情日报。

日期：${new Date().toISOString().slice(0, 10)}

今日数据：
- 总提及：${stats.total}
- 新帖子：${stats.posts}
- 新评论：${stats.comments}
- 情感分布：正面 ${stats.positive}、负面 ${stats.negative}、中性 ${stats.neutral}
- 可执行反馈：${stats.actionable} 条

主要负面问题（Top 5）：
${stats.topCons.slice(0, 5).map((c, i) => `${i + 1}. ${c.text}（${c.count} 次）`).join('\n') || '无'}

主要正面评价（Top 5）：
${stats.topPros.slice(0, 5).map((c, i) => `${i + 1}. ${c.text}（${c.count} 次）`).join('\n') || '无'}

高相关度评论（Top 5）：
${stats.samples.slice(0, 5).map((s, i) => `${i + 1}. [${s.sentiment}] ${s.summary}${s.permalink ? ' → https://reddit.com' + s.permalink : ''}`).join('\n') || '无'}

负面反馈（Top 5，附链接）：
${(stats.negativeItems || []).slice(0, 5).map((n, i) => `${i + 1}. ${n.summary} → https://reddit.com${n.permalink}`).join('\n') || '无'}

请按以下结构撰写报告（800字以内）：
1. 今日概况
2. 正面反馈亮点
3. 负面反馈与风险（保留 Reddit 链接）
4. 运营建议
5. 总结`;

  try {
    let report = await callLLM(config, prompt, systemPrompt);
    report = report.replace(/[\uFFFD]/g, ''); // clean broken chars
    return report;
  } catch (err) {
    log(`报告生成失败: ${err.message}`);
    return null;
  }
}

/**
 * Generate summary report for all accumulated data
 */
export async function generateSummaryReport(config, project, stats, productInfo) {
  const role = project.reportRole
    ? `你是${project.reportRole}。从${project.reportRole}的专业视角撰写 Reddit 社媒舆情汇总报告。`
    : '你是品牌舆情分析师，撰写 Reddit 社媒舆情汇总报告。';

  const systemPrompt = `${role}
要求：全文中文，系统性总结，Markdown 格式。用表格呈现数据，文字精炼有洞察。给出战略级建议，不要空话。不要使用 emoji 符号。在负面反馈部分必须保留原始 Reddit 链接（格式：[查看原帖](URL)），方便直接跳转回复。`;

  const prompt = `为项目「${project.name || project.id}」生成 Reddit 舆情汇总报告。

累计数据概览：
- 总提及：${stats.total}
- 帖子/评论：${stats.posts} / ${stats.comments}
- 情感分布：正面 ${stats.positive}、负面 ${stats.negative}、中性 ${stats.neutral}
- 可执行反馈：${stats.actionable} 条

高频负面问题（Top 8）：
${stats.topCons.slice(0, 8).map((c, i) => `${i + 1}. ${c.text}（${c.count} 次）`).join('\n') || '无'}

高频正面评价（Top 8）：
${stats.topPros.slice(0, 8).map((c, i) => `${i + 1}. ${c.text}（${c.count} 次）`).join('\n') || '无'}

高相关度评论（Top 8）：
${stats.samples.slice(0, 8).map((s, i) => `${i + 1}. [${s.sentiment}] ${s.summary}${s.permalink ? ' → https://reddit.com' + s.permalink : ''}`).join('\n') || '无'}

负面反馈（Top 8，附链接）：
${(stats.negativeItems || []).slice(0, 8).map((n, i) => `${i + 1}. ${n.summary} → https://reddit.com${n.permalink}`).join('\n') || '无'}

${productInfo ? `\n我方产品线信息：\n${productInfo}\n` : ''}
请按以下结构撰写汇总报告（在负面反馈部分请保留 Reddit 原始链接，方便直接跳转回复）：
1. 整体舆情画像（数据总览 + 情感趋势判断）
2. 品牌口碑核心优势${productInfo ? '（按产品型号分类）' : ''}
3. 核心风险与高频痛点（按严重程度排序）${productInfo ? '（标注涉及的具体产品型号）' : ''}
4. 竞对对比洞察（如数据中有竞品讨论）
5. 战略建议（产品、运营、公关、社区维护）
6. 高价值用户运营建议
7. 总结与下一步行动`;

  try {
    let report = await callLLM(config, prompt, systemPrompt);
    report = report.replace(/[\uFFFD]/g, '');
    return report;
  } catch (err) {
    log(`汇总报告生成失败: ${err.message}`);
    return null;
  }
}
