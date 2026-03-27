/**
 * 关键词匹配器
 * 对 Reddit 帖子/评论的 title + body 做大小写不敏感匹配
 * 支持自动拆词变体（如 twopagescurtains → two pages curtains, twopages curtains 等）
 */

// 尝试在驼峰/连写词中找到常见英文单词边界并拆开
const COMMON_WORDS = new Set([
  'two', 'three', 'four', 'five', 'one', 'big', 'top', 'best', 'new', 'old', 'red', 'blue', 'green', 'black', 'white',
  'page', 'pages', 'curtain', 'curtains', 'blind', 'blinds', 'shade', 'shades', 'drape', 'drapes', 'roman', 'linen', 'velvet', 'sheer',
  'home', 'house', 'room', 'window', 'door', 'wall', 'floor', 'light', 'dark',
  'custom', 'modern', 'smart', 'cheap', 'luxury', 'budget', 'premium', 'neutral', 'natural', 'classic', 'elegant',
  'shop', 'store', 'buy', 'order', 'sale', 'deal', 'price', 'half', 'select', 'direct', 'factory', 'online',
  'design', 'decor', 'style', 'art', 'craft', 'made', 'make',
]);

/**
 * 从一个连写词生成拆分变体
 * "twopagescurtains" → ["twopagescurtains", "two pages curtains", "twopages curtains", "two pagescurtains"]
 */
export function generateVariants(keyword) {
  const kw = keyword.toLowerCase().trim();
  const variants = new Set([kw]);

  // 如果包含空格或特殊字符，已经是多词，只生成去空格版
  if (kw.includes(' ') || kw.includes('-') || kw.includes('.')) {
    const joined = kw.replace(/[\s\-\.]+/g, '');
    variants.add(joined);
    // 也加原词的各部分
    const parts = kw.split(/[\s\-\.]+/);
    if (parts.length > 1) {
      variants.add(parts.join(' '));
      variants.add(parts.join('-'));
    }
    return [...variants];
  }

  // 连写词：尝试所有可能的拆分点
  function findSplits(str, pos, parts) {
    if (pos >= str.length) {
      if (parts.length > 1) variants.add(parts.join(' '));
      return;
    }
    for (let len = 2; len <= Math.min(12, str.length - pos); len++) {
      const word = str.slice(pos, pos + len);
      if (COMMON_WORDS.has(word)) {
        // 精确匹配到常见词，继续拆后面
        findSplits(str, pos + len, [...parts, word]);
      }
      // 到末尾时也允许：把剩余部分作为一个整体
      if (pos + len === str.length && !COMMON_WORDS.has(word) && parts.length > 0) {
        variants.add([...parts, word].join(' '));
      }
    }
  }
  findSplits(kw, 0, []);

  // 额外：尝试只拆第一个词
  for (let i = 2; i < kw.length - 2; i++) {
    const first = kw.slice(0, i), rest = kw.slice(i);
    if (COMMON_WORDS.has(first)) variants.add(first + ' ' + rest);
    if (COMMON_WORDS.has(rest)) variants.add(first + ' ' + rest);
  }

  // 额外：对已有的多词变体，尝试单复数变换
  const pluralMap = [['pages', 'page'], ['curtains', 'curtain'], ['blinds', 'blind'], ['shades', 'shade'], ['drapes', 'drape']];
  const currentVariants = [...variants];
  for (const v of currentVariants) {
    for (const [plural, singular] of pluralMap) {
      if (v.includes(plural)) variants.add(v.replace(plural, singular));
      if (v.includes(singular) && !v.includes(plural)) variants.add(v.replace(singular, plural));
    }
  }

  // 清理：多词变体里每个部分必须有意义（是常见词、或由常见词组成、或≤2字母）
  const cleaned = new Set([kw]);
  function isValidPart(p) {
    if (COMMON_WORDS.has(p)) return true;
    // 检查是否由常见词组合而成（如 twopages = two + pages）
    for (let i = 2; i < p.length - 1; i++) {
      if (COMMON_WORDS.has(p.slice(0, i)) && COMMON_WORDS.has(p.slice(i))) return true;
    }
    return false;
  }
  for (const v of variants) {
    if (!v.includes(' ')) { cleaned.add(v); continue; }
    if (v.split(' ').every(isValidPart)) cleaned.add(v);
  }

  return [...cleaned];
}

/**
 * 为一组关键词生成所有变体的搜索词列表
 * 返回 [{original, variant}]
 */
export function expandKeywords(keywords) {
  const expanded = [];
  const seen = new Set();
  for (const kw of keywords) {
    for (const v of generateVariants(kw)) {
      if (!seen.has(v)) {
        seen.add(v);
        expanded.push({ original: kw, variant: v });
      }
    }
  }
  return expanded;
}

export function matchItem(item, keywords) {
  const text = ((item.title || '') + ' ' + (item.body || '')).toLowerCase();
  const results = [];

  // 品牌关键词（含变体）
  for (const kw of keywords.brand || []) {
    for (const v of generateVariants(kw)) {
      if (text.includes(v)) {
        results.push({ category: 'brand', keyword: kw });
        break; // 同一个原始词只匹配一次
      }
    }
  }

  // 行业关键词
  for (const kw of keywords.industry || []) {
    if (text.includes(kw.toLowerCase())) {
      results.push({ category: 'industry', keyword: kw });
    }
  }

  // 竞对关键词（含变体）
  for (const kw of keywords.competitor || []) {
    for (const v of generateVariants(kw)) {
      if (text.includes(v)) {
        results.push({ category: 'competitor', keyword: kw });
        break;
      }
    }
  }

  return results;
}

/**
 * 确定最终分类优先级：brand > competitor > industry > subreddit
 */
export function classifyMatches(matches, defaultCategory = 'subreddit') {
  if (!matches.length) return { category: defaultCategory, matchedKeywords: [] };

  const categories = matches.map(m => m.category);
  let category;
  if (categories.includes('brand')) category = 'brand';
  else if (categories.includes('competitor')) category = 'competitor';
  else if (categories.includes('industry')) category = 'industry';
  else category = defaultCategory;

  const matchedKeywords = [...new Set(matches.map(m => m.keyword))];
  return { category, matchedKeywords };
}
