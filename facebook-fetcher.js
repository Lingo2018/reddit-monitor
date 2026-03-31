import https from 'https';

function log(msg) {
  console.log(`[${new Date().toISOString()}] [facebook] ${msg}`);
}

// Rate limiter: max calls per hour
const callLog = [];
async function rateLimit(maxPerHour = 190) {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  // Remove old entries
  while (callLog.length && callLog[0] < oneHourAgo) callLog.shift();
  if (callLog.length >= maxPerHour) {
    const waitMs = callLog[0] - oneHourAgo + 1000;
    log(`限流等待 ${Math.ceil(waitMs / 1000)}s (${callLog.length}/${maxPerHour} calls/hour)`);
    await new Promise(r => setTimeout(r, waitMs));
  }
  callLog.push(Date.now());
}

async function graphGet(path, accessToken) {
  await rateLimit();
  const url = `https://graph.facebook.com/v19.0${path}${path.includes('?') ? '&' : '?'}access_token=${accessToken}`;

  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 20000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            log(`API error: ${json.error.message} (code ${json.error.code})`);
            resolve({ error: json.error });
          } else {
            resolve(json);
          }
        } catch { resolve(null); }
      });
    });
    req.on('error', (e) => { log(`Request error: ${e.message}`); resolve(null); });
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/**
 * Create a Facebook Group fetcher
 * @param {object} config - { accessToken, appId?, appSecret? }
 */
export function createFacebookFetcher(config) {
  if (!config?.accessToken) throw new Error('Facebook access token not configured');

  const token = config.accessToken;

  return {
    /**
     * Verify token validity
     */
    async verifyToken() {
      const res = await graphGet('/me?fields=id,name', token);
      if (res?.error) return { valid: false, error: res.error.message };
      if (res?.id) return { valid: true, userId: res.id, name: res.name };
      return { valid: false, error: 'unknown' };
    },

    /**
     * Exchange short-lived token for long-lived token
     */
    async exchangeToken(appId, appSecret) {
      const res = await graphGet(`/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${token}`, '');
      if (res?.access_token) return { token: res.access_token, expiresIn: res.expires_in };
      return { error: res?.error?.message || 'exchange failed' };
    },

    /**
     * Get group feed (posts)
     */
    async groupFeed(groupId, limit = 25) {
      const fields = 'id,message,from,created_time,updated_time,permalink_url,comments.summary(true)';
      const res = await graphGet(`/${groupId}/feed?fields=${fields}&limit=${limit}`, token);
      if (!res?.data) return [];

      return res.data.filter(p => p.message).map(p => ({
        id: 'fb_post_' + p.id,
        type: 'post',
        title: (p.message || '').slice(0, 100),
        body: p.message || '',
        author: p.from?.name || 'Unknown',
        subreddit: groupId, // will be replaced with group name
        permalink: p.permalink_url || '',
        score: 0,
        num_comments: p.comments?.summary?.total_count || 0,
        created_utc: Math.floor(new Date(p.created_time).getTime() / 1000),
      }));
    },

    /**
     * Get comments on a post
     */
    async postComments(postId, limit = 50) {
      const fields = 'id,message,from,created_time,permalink_url';
      const res = await graphGet(`/${postId}/comments?fields=${fields}&limit=${limit}`, token);
      if (!res?.data) return [];

      return res.data.filter(c => c.message).map(c => ({
        id: 'fb_comment_' + c.id,
        type: 'comment',
        title: '',
        body: c.message || '',
        author: c.from?.name || 'Unknown',
        subreddit: '', // will be filled by caller
        permalink: c.permalink_url || '',
        score: 0,
        num_comments: 0,
        created_utc: Math.floor(new Date(c.created_time).getTime() / 1000),
      }));
    },

    /**
     * Get group name
     */
    async groupName(groupId) {
      const res = await graphGet(`/${groupId}?fields=name`, token);
      return res?.name || groupId;
    },
  };
}
