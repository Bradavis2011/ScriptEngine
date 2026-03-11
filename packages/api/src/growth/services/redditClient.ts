import { getRedditToken, USER_AGENT } from '../lib/redditAuth';
import { redditRateLimiter } from '../lib/rateLimiter';

async function redditFetch(path: string, opts?: RequestInit): Promise<unknown> {
  await redditRateLimiter.consume();
  const token = await getRedditToken();

  const resp = await fetch(`https://oauth.reddit.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
      ...(opts?.headers ?? {}),
    },
  });

  if (!resp.ok) {
    throw new Error(`Reddit API error: ${resp.status} ${path}`);
  }

  return resp.json();
}

export interface RedditPost {
  id: string;
  subreddit: string;
  title: string;
  selftext: string;
  author: string;
  url: string;
  score: number;
  num_comments: number;
  created_utc: number;
}

export async function searchSubreddit(
  subreddit: string,
  query: string,
  after?: string,
): Promise<{ posts: RedditPost[]; after: string | null }> {
  const params = new URLSearchParams({
    q: query,
    sort: 'new',
    limit: '25',
    t: 'week',
    ...(after ? { after } : {}),
  });

  const data = (await redditFetch(`/r/${subreddit}/search.json?${params}`)) as {
    data?: { children?: Array<{ data: RedditPost }>; after?: string | null };
  };

  const posts = (data?.data?.children ?? []).map((c) => c.data);
  return { posts, after: data?.data?.after ?? null };
}

export async function getComment(
  commentId: string,
): Promise<{ score: number; repliesCount: number }> {
  const data = (await redditFetch(`/api/info.json?id=t1_${commentId}`)) as {
    data?: { children?: Array<{ data: { score?: number; replies?: unknown } }> };
  };

  const comment = data?.data?.children?.[0]?.data;
  const replies = comment?.replies;
  const repliesCount =
    typeof replies === 'object' && replies !== null
      ? ((replies as { data?: { children?: unknown[] } })?.data?.children?.length ?? 0)
      : 0;

  return {
    score: comment?.score ?? 0,
    repliesCount,
  };
}

export async function postComment(thingId: string, text: string): Promise<string> {
  await redditRateLimiter.consume();
  const token = await getRedditToken();

  const resp = await fetch('https://oauth.reddit.com/api/comment', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      api_type: 'json',
      thing_id: `t3_${thingId}`,
      text,
    }).toString(),
  });

  if (!resp.ok) {
    throw new Error(`Reddit post comment failed: ${resp.status}`);
  }

  const data = (await resp.json()) as {
    json?: { data?: { things?: Array<{ data?: { id?: string } }> } };
  };

  const commentId = data?.json?.data?.things?.[0]?.data?.id;
  if (!commentId) throw new Error('Reddit returned no comment ID');

  return commentId;
}
