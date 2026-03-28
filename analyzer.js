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
  let endpoint = config.endpoint.replace(/\/+$/, ''); // trim trailing slash
  // Auto-append path if user only gave base URL
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
 */
export async function analyzeBatch(config, items) {
  if (!items.length) return [];

  const itemsText = items.map((item, i) =>
    `[${i + 1}] (${item.type}) r/${item.subreddit} | u/${item.author}\n${item.title ? 'Title: ' + item.title + '\n' : ''}${item.body || '(no body)'}`
  ).join('\n---\n');

  const systemPrompt = `You are a brand reputation analyst. Analyze Reddit posts/comments for brand sentiment and product insights.

Respond ONLY with a valid JSON array. Each element must have these fields:
- index: number (1-based, matching input)
- sentiment: "positive" | "negative" | "neutral"
- relevance: "high" | "medium" | "low" (how relevant to the brand/product)
- pros: string[] (product strengths mentioned, empty array if none)
- cons: string[] (product weaknesses/complaints, empty array if none)
- actionable: boolean (true if contains actionable product feedback)
- summary: string (one sentence summary in Chinese)

Keep summaries concise. Focus on product-related insights.`;

  const prompt = `Analyze these ${items.length} Reddit posts/comments:\n\n${itemsText}`;

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
 */
export async function generateDailyReport(config, project, stats) {
  const systemPrompt = `You are a brand reputation analyst writing a daily social media monitoring report in Chinese.
Write a COMPACT, actionable report in Markdown format. Use tables for data, keep text minimal. No excessive spacing or decoration. Be direct and data-driven.`;

  const prompt = `Generate a daily Reddit monitoring report for project "${project.name || project.id}".

Date: ${new Date().toISOString().slice(0, 10)}

Today's data:
- Total mentions: ${stats.total}
- New posts: ${stats.posts}
- New comments: ${stats.comments}
- Sentiment breakdown: ${stats.positive} positive, ${stats.negative} negative, ${stats.neutral} neutral
- Actionable feedback: ${stats.actionable} items

Top issues (negative/cons):
${stats.topCons.map((c, i) => `${i + 1}. ${c.text} (${c.count} mentions)`).join('\n') || 'None'}

Top praises (positive/pros):
${stats.topPros.map((c, i) => `${i + 1}. ${c.text} (${c.count} mentions)`).join('\n') || 'None'}

Sample comments with high relevance:
${stats.samples.map((s, i) => `${i + 1}. [${s.sentiment}] ${s.summary}`).join('\n') || 'None'}

Please write a report with these sections:
1. 今日概况 (overview with key metrics)
2. 正面反馈 (positive feedback highlights)
3. 负面反馈与风险 (negative feedback and risks)
4. 产品改进建议 (actionable product improvement suggestions)
5. 总结 (brief conclusion)`;

  try {
    const report = await callLLM(config, prompt, systemPrompt);
    return report;
  } catch (err) {
    log(`报告生成失败: ${err.message}`);
    return null;
  }
}
