import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../../lib/prisma';

let _genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

const SEARCH_KEYWORDS = [
  'teleprompter tips',
  'content creation tips',
  'video scripting',
  'tiktok content ideas',
  'short form video tips',
];

interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  topVideoTitles: string[];
}

async function searchChannels(keyword: string): Promise<YouTubeChannel[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  // Search for channels
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keyword)}&type=channel&maxResults=10&key=${apiKey}`,
  );
  if (!searchRes.ok) return [];

  const searchData = (await searchRes.json()) as {
    items?: Array<{ id?: { channelId?: string } }>;
  };
  const channelIds = (searchData.items ?? [])
    .map((item) => item.id?.channelId)
    .filter(Boolean)
    .join(',');

  if (!channelIds) return [];

  // Fetch channel stats
  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds}&key=${apiKey}`,
  );
  if (!statsRes.ok) return [];

  const statsData = (await statsRes.json()) as {
    items?: Array<{
      id: string;
      snippet?: { title?: string; description?: string };
      statistics?: { subscriberCount?: string; videoCount?: string };
    }>;
  };

  const channels: YouTubeChannel[] = [];

  for (const item of statsData.items ?? []) {
    const subs = parseInt(item.statistics?.subscriberCount ?? '0');
    // Filter: 1K–100K subscribers
    if (subs < 1_000 || subs > 100_000) continue;

    // Fetch top 5 videos by view count
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${item.id}&order=viewCount&type=video&maxResults=5&key=${apiKey}`,
    );
    let topVideoTitles: string[] = [];
    if (videosRes.ok) {
      const videosData = (await videosRes.json()) as {
        items?: Array<{ snippet?: { title?: string } }>;
      };
      topVideoTitles = (videosData.items ?? [])
        .map((v) => v.snippet?.title ?? '')
        .filter(Boolean);
    }

    channels.push({
      id: item.id,
      title: item.snippet?.title ?? '',
      description: item.snippet?.description ?? '',
      subscriberCount: subs,
      videoCount: parseInt(item.statistics?.videoCount ?? '0'),
      topVideoTitles,
    });
  }

  return channels;
}

async function scoreCreator(channel: YouTubeChannel): Promise<{
  relevance: number;
  personalizedDm: string;
  warmingComment: string;
}> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Evaluate this YouTube creator as a potential ClipScript user/promoter.

ClipScript is an AI video script generator with a built-in teleprompter camera for content creators.

Channel:
Name: "${channel.title}"
Description: "${channel.description.slice(0, 300)}"
Subscribers: ${channel.subscriberCount.toLocaleString()}
Top Videos: ${channel.topVideoTitles.slice(0, 5).join(' | ')}

Provide:
1. relevance: Score 1-10 — how likely are they to need/use ClipScript?
2. personalizedDm: A personalized outreach message (under 100 words, reference their specific content, mention AI scripting tools, ask a genuine question — NO product pitch)
3. warmingComment: A genuine YouTube comment for one of their videos (under 50 words, specific, not promotional)

Return ONLY valid JSON:
{
  "relevance": <number 1-10>,
  "personalizedDm": "<string>",
  "warmingComment": "<string>"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response
    .text()
    .trim()
    .replace(/^```json\n?/, '')
    .replace(/\n?```$/, '');

  return JSON.parse(text) as { relevance: number; personalizedDm: string; warmingComment: string };
}

function extractEmail(description: string): string | null {
  const match = description.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

export async function discoverCreators(): Promise<{ discovered: number; briefed: number }> {
  let discovered = 0;
  let briefed = 0;

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const channels = await searchChannels(keyword);

      for (const channel of channels) {
        const existing = await prisma.creatorProspect.findUnique({
          where: { youtubeChannelId: channel.id },
        });
        if (existing) continue;

        discovered++;

        const { relevance, personalizedDm, warmingComment } = await scoreCreator(channel);
        const contactInfo = extractEmail(channel.description);
        const status = relevance >= 7 ? 'briefed' : 'discovered';
        if (relevance >= 7) briefed++;

        await prisma.creatorProspect.create({
          data: {
            youtubeChannelId: channel.id,
            channelTitle: channel.title,
            subscriberCount: channel.subscriberCount,
            videoCount: channel.videoCount,
            description: channel.description.slice(0, 1000) || null,
            topVideoTitles: channel.topVideoTitles,
            relevanceScore: relevance,
            personalizedDm,
            warmingComment,
            status,
            contactInfo,
          },
        });
      }
    } catch (err) {
      console.error(`[creatorFinder] Error for keyword "${keyword}":`, err);
    }
  }

  return { discovered, briefed };
}
