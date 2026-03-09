import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

let _genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

const SCRIPT_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    coldOpen: { type: SchemaType.STRING },
    coldOpenCamera: { type: SchemaType.STRING },
    sections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          heading: { type: SchemaType.STRING },
          script: { type: SchemaType.STRING },
          bRollSuggestion: { type: SchemaType.STRING },
          cameraDirection: { type: SchemaType.STRING },
          textOverlay: { type: SchemaType.STRING },
        },
        required: ['heading', 'script', 'bRollSuggestion', 'cameraDirection', 'textOverlay'],
      },
    },
    callToAction: { type: SchemaType.STRING },
    callToActionCamera: { type: SchemaType.STRING },
    teleprompterText: { type: SchemaType.STRING },
    caption: { type: SchemaType.STRING },
    hashtags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    totalDurationSeconds: { type: SchemaType.NUMBER },
  },
  required: [
    'coldOpen',
    'coldOpenCamera',
    'sections',
    'callToAction',
    'callToActionCamera',
    'teleprompterText',
    'caption',
    'hashtags',
    'totalDurationSeconds',
  ],
};

const SCRIPT_TYPE_PROMPTS: Record<string, string> = {
  data_drop:
    'Write a data-driven short-form video script that leads with a surprising statistic or fact, then explains why it matters for the viewer.',
  trend_take:
    'Write a hot-take short-form video script about a current trend in this niche. Start with a bold opinion or contrarian take.',
  niche_tip:
    'Write a practical tips short-form video script with 3 actionable tips the viewer can use immediately. Make each tip specific and concrete.',
  niche_tip_basic:
    'Give a single practical, broadly useful tip about the given topic. Keep it accessible, beginner-friendly, and general. No deep research, no niche-specific jargon, no data citations.',
  series_episode:
    'Write a short-form video script for an episode in an ongoing series. Reference that it is part of a series and tease the next episode.',
};

export interface GenerateScriptInput {
  niche: string;
  scriptType: keyof typeof SCRIPT_TYPE_PROMPTS;
  seriesName?: string;
  episodeNumber?: number;
  additionalContext?: string;
}

export interface ScriptData {
  coldOpen: string;
  coldOpenCamera: string;
  sections: Array<{
    heading: string;
    script: string;
    bRollSuggestion: string;
    cameraDirection: string;
    textOverlay: string;
  }>;
  callToAction: string;
  callToActionCamera: string;
  teleprompterText: string;
  caption: string;
  hashtags: string[];
  totalDurationSeconds: number;
}

export interface ResearchBriefInput {
  niche: string;
  topic: string;
  brief?: string;
  audience?: string;
  platform?: string;
  stage?: string;
  goals?: string;
  youtubeInsights: string;
}

export async function generateResearchBrief(input: ResearchBriefInput): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a senior content strategist for short-form video creators. Your client has paid $50 for a professional content strategy brief.

Generate a COMPLETE HTML document (<!DOCTYPE html> to </html>) that is a polished, professional strategy report. Output ONLY the HTML — no markdown, no code fences.

STYLE REQUIREMENTS (use inline styles throughout):
- body: font-family:system-ui,-apple-system,sans-serif; background:#0B0B0D; color:#e5e5e7; margin:0; padding:0
- Container: max-width:860px; margin:0 auto; padding:32px 24px
- Section cards: background:#141417; border:1px solid #2A2A2F; border-radius:16px; padding:24px; margin-bottom:24px
- Section labels: font-size:11px; font-weight:700; color:#00E5FF; text-transform:uppercase; letter-spacing:0.8px
- h2 headings: color:#e5e5e7; font-size:18px; margin:0 0 16px
- Script callout boxes: background:#0B0B0D; border-left:3px solid #7C3AED; padding:16px; border-radius:0 8px 8px 0
- Hashtag pills: display:inline-block; background:#141417; border:1px solid #2A2A2F; border-radius:20px; padding:4px 12px; font-size:12px; margin:3px
- Mobile friendly

CLIENT BRIEF:
- Niche: ${input.niche}
- Topic/Premise: ${input.topic}
- Platform: ${input.platform ?? 'TikTok, Instagram Reels, YouTube Shorts'}
- Current Stage: ${input.stage ?? 'Not specified'}
- Target Audience: ${input.audience ?? 'Not specified'}
- Goals: ${input.goals ?? 'Grow following, build authority'}
- Additional Context: ${input.brief ?? 'None'}

REAL YOUTUBE PERFORMANCE DATA (ground your analysis in this):
${input.youtubeInsights}

REPORT SECTIONS (include all, in this order):

1. HEADER — "ClipScript Content Strategy Brief" + client niche/topic + today's date + "Confidential"

2. PREMISE REFINEMENT — Sharpened angle, positioning statement (2 sentences), why this angle wins right now, what differentiates it from the YouTube content shown above

3. AUDIENCE PROFILE — Name your ideal viewer (e.g. "Alex, 26"), their day-to-day, top 3 pain points, what they search on YouTube/TikTok/Google (give 6-8 specific search queries), why they follow creators in this space, what makes them stop scrolling vs skip

4. TREND & KEYWORD LAYER —
   - 8 keywords for titles/descriptions with search tier label (high/medium/niche)
   - 15+ hashtags as styled pills, categorized: mega (100M+) / macro (10M-100M) / mid (1M-10M) / micro (<1M)
   - 4-5 trending angles in this niche right now (with brief explanation of why they're working)
   - Platform-specific timing tips

5. COMPETITIVE LANDSCAPE — Based on the YouTube data: what's already winning (reference specific video titles/channels), the content gap to exploit, positioning advantage for this client

6. CONTENT PILLARS — 3-4 recurring themes that build authority: pillar name, 2-sentence description, example video title

7. SERIES ARCHITECTURE — 8-episode series: series name, each episode with number + title + one-sentence premise, season arc summary

8. HOOK LIBRARY — 12 hooks written specifically for THIS topic (not generic), labeled by type: curiosity gap | stat drop | contrarian | personal story | warning | how-to | before/after | identity

9. 2 FULL SCRIPTS — Each includes: script type, cold open, 3 sections (heading + script + B-roll), CTA, full teleprompter text, caption, 8 hashtags

10. GROWTH NOTES — Realistic view range for months 1-3 based on YouTube data, posting cadence, cross-platform tips, monetization angle once established

Be SPECIFIC. Use the YouTube data. Write hooks that would actually make someone stop scrolling. This is a $50 paid deliverable.`.trim();

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateScript(input: GenerateScriptInput): Promise<ScriptData> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCRIPT_RESPONSE_SCHEMA as any,
    },
  });

  const typePrompt = SCRIPT_TYPE_PROMPTS[input.scriptType] ?? SCRIPT_TYPE_PROMPTS.niche_tip;
  const seriesContext =
    input.seriesName && input.episodeNumber
      ? `This is episode ${input.episodeNumber} of the series "${input.seriesName}".`
      : '';

  const prompt = `
You are an expert short-form video script writer for ${input.niche} content creators on TikTok, Instagram Reels, and YouTube Shorts.

${typePrompt}

Niche: ${input.niche}
${seriesContext}
${input.additionalContext ?? ''}

Requirements:
- Total video length: 45-75 seconds when read at a natural pace
- Cold open must hook the viewer in the first 3 seconds
- Each section should take 10-15 seconds to deliver
- teleprompterText is the full script concatenated for use in a teleprompter (no headings, just words to say)
- caption is optimized for the feed (under 150 chars, no hashtags)
- hashtags: 5-8 niche-relevant tags without the # symbol
- totalDurationSeconds: estimated delivery time in seconds

Write in a natural, conversational tone. Avoid corporate-speak.
`.trim();

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as ScriptData;
}
