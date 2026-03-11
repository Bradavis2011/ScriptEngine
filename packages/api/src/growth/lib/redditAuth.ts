interface RedditToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: RedditToken | null = null;

const USER_AGENT = 'ClipScript/1.0 (by /u/ClipScriptBot)';

export { USER_AGENT };

export async function getRedditToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error('Reddit credentials not configured (REDDIT_CLIENT_ID/SECRET/USERNAME/PASSWORD)');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const resp = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username,
      password,
    }).toString(),
  });

  if (!resp.ok) {
    throw new Error(`Reddit OAuth failed: ${resp.status} ${resp.statusText}`);
  }

  const data = (await resp.json()) as { access_token: string; expires_in: number };

  if (!data.access_token) {
    throw new Error('Reddit OAuth returned no access_token');
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}
