export interface YouTubeInsights {
  topVideos: Array<{ title: string; channelTitle: string; viewCount: string }>;
  summary: string;
}

export async function fetchYouTubeInsights(
  topic: string,
  niche: string,
): Promise<YouTubeInsights> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return {
      topVideos: [],
      summary: 'YouTube research unavailable (YOUTUBE_API_KEY not configured).',
    };
  }

  try {
    const q = encodeURIComponent(`${topic} ${niche}`);
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&maxResults=10&order=relevance&type=video&videoDuration=short&key=${apiKey}`,
    );
    if (!searchRes.ok) {
      return { topVideos: [], summary: 'YouTube search failed.' };
    }
    const searchData = (await searchRes.json()) as any;
    const items: any[] = searchData.items ?? [];
    const videoIds = items
      .map((i: any) => i.id?.videoId)
      .filter(Boolean)
      .join(',');

    if (!videoIds) {
      return { topVideos: [], summary: 'No videos found for this topic.' };
    }

    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`,
    );
    if (!statsRes.ok) {
      return { topVideos: [], summary: 'YouTube stats unavailable.' };
    }
    const statsData = (await statsRes.json()) as any;

    const topVideos: Array<{ title: string; channelTitle: string; viewCount: string }> = (
      statsData.items ?? []
    ).map((item: any) => ({
      title: item.snippet?.title ?? '',
      channelTitle: item.snippet?.channelTitle ?? '',
      viewCount: item.statistics?.viewCount ?? '0',
    }));

    topVideos.sort((a, b) => parseInt(b.viewCount) - parseInt(a.viewCount));

    const summary =
      topVideos.length > 0
        ? `Top YouTube Shorts/videos matching "${topic}" in the ${niche} niche:\n` +
          topVideos
            .slice(0, 8)
            .map(
              (v, i) =>
                `${i + 1}. "${v.title}" — ${v.channelTitle} — ${parseInt(v.viewCount).toLocaleString()} views`,
            )
            .join('\n')
        : `No significant YouTube content found for "${topic}" in the ${niche} niche.`;

    return { topVideos, summary };
  } catch (err) {
    console.error('YouTube research failed:', err);
    return { topVideos: [], summary: 'YouTube research unavailable.' };
  }
}
