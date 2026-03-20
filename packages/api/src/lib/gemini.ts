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
  // Pack-optimised types — short, punchy, broad, standalone
  quick_hook:
    'Write an ultra-punchy short-form video script. Open with a single bold, surprising, or controversial statement that forces a reaction. One clear idea, no fluff. Every word earns its place.',
  story_hook:
    'Write a short-form video script that opens with a relatable 2-sentence micro-story or personal moment, then pivots immediately to a universal insight the viewer can act on. Make them feel seen.',
  rapid_tip:
    'Write a short-form video script laser-focused on ONE single ultra-specific actionable tip. State it in the cold open, prove it works in one sentence, then tell them exactly how to do it right now.',
  // Walkthrough / showcase types
  showcase:
    'Write a walkthrough/showcase script. The creator is walking viewers through something — a property, a product, a space, a setup. Structure it as a guided tour: strong opening hook about what they\'re about to see, 3 sections with smooth transitions between features/areas, and a closing CTA. Use short teleprompter lines with natural pausing points for filming while moving. Format teleprompterText with short lines (6-10 words each) separated by line breaks — the creator reads while walking and filming, not standing still. Add brief transition cues in brackets like [move to next area] or [turn to show this feature] between sections.',
  listing_tour:
    'Write a property walkthrough narration. Open with curb appeal or the most compelling feature. Walk room-by-room with smooth transitions. Highlight 3-4 standout features. Close with urgency + agent\'s CTA. Teleprompter text must use short broken lines — the agent reads while physically walking through the home. Format teleprompterText with short lines (6-10 words each) separated by line breaks. Add brief transition cues in brackets like [move to kitchen] or [step outside to backyard] between sections.',
  just_listed:
    'Write a \'just listed\' announcement. Create urgency. Lead with the single most compelling detail, hit 3-4 selling points fast, close with a direct-response CTA.',
  market_update:
    'Write a local market update. Reference the creator\'s market for context. Include 2-3 data-backed insights (inventory, pricing, buyer/seller dynamics). End with actionable advice + CTA.',
};

export interface GenerateScriptInput {
  niche: string;
  scriptType: keyof typeof SCRIPT_TYPE_PROMPTS;
  seriesName?: string;
  episodeNumber?: number;
  additionalContext?: string;
  targetDuration?: '30-45' | '45-75';  // defaults to 45-75
  city?: string;         // creator's primary market — used for local hooks
  callToAction?: string; // creator's standard CTA injected into every script
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

const SCRIPT_TIMEOUT_MS = 55_000; // 55 s — stay inside Railway's 60 s request window

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
        ms
      )
    ),
  ]);
}

const PHOTO_SCRIPT_TIMEOUT_MS = 90_000; // 90 s — multimodal processing is slower

export async function generateScriptFromPhotos(
  images: Array<{ buffer: Buffer; mimeType: string }>,
  input: GenerateScriptInput,
): Promise<ScriptData> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCRIPT_RESPONSE_SCHEMA as any,
    },
  });

  const typePrompt =
    SCRIPT_TYPE_PROMPTS[input.scriptType] ?? SCRIPT_TYPE_PROMPTS.showcase;
  const locationContext = input.city
    ? `The creator's primary market is ${input.city}. Weave in local/regional references naturally.`
    : '';
  const ctaContext = input.callToAction
    ? `Creator's CTA: Use exactly "${input.callToAction}" as the callToAction field text. Write the callToActionCamera direction to match.`
    : '';

  const textPrompt = `You are an expert short-form video script writer for ${input.niche} content creators on TikTok, Instagram Reels, and YouTube Shorts.

Analyze these ${images.length} photo${images.length !== 1 ? 's' : ''}. ${locationContext}

${typePrompt}

Based on what you see in the images, identify key features, areas, and anything visually compelling. Create a narration script grounded in what is actually visible.
${input.additionalContext ? `\nAdditional context from creator: ${input.additionalContext}` : ''}
${ctaContext}

Requirements:
- Total video length: 45-75 seconds when read at a natural pace
- Cold open must hook the viewer in the first 3 seconds
- Each section should take 10-15 seconds to deliver
- teleprompterText is the full script for use in a teleprompter (no headings, just words to say)
- caption is optimized for the feed (under 150 chars, no hashtags)
- hashtags: 5-8 niche-relevant tags without the # symbol
- totalDurationSeconds: estimated delivery time in seconds

Write in a natural, conversational tone. Avoid corporate-speak.`.trim();

  const imageParts = images.map((img) => ({
    inlineData: {
      data: img.buffer.toString('base64'),
      mimeType: img.mimeType,
    },
  }));

  const result = await withTimeout(
    model.generateContent([...imageParts, { text: textPrompt }]),
    PHOTO_SCRIPT_TIMEOUT_MS,
    'Gemini generateScriptFromPhotos',
  );
  const text = result.response.text();
  return JSON.parse(text) as ScriptData;
}

export async function generateScript(
  input: GenerateScriptInput,
  promptOverride?: string,
): Promise<ScriptData> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCRIPT_RESPONSE_SCHEMA as any,
    },
  });

  const typePrompt =
    promptOverride ?? SCRIPT_TYPE_PROMPTS[input.scriptType] ?? SCRIPT_TYPE_PROMPTS.niche_tip;
  const seriesContext =
    input.seriesName && input.episodeNumber
      ? `This is episode ${input.episodeNumber} of the series "${input.seriesName}".`
      : '';

  const locationContext = input.city
    ? `Location: This creator's primary market is ${input.city}. Weave in local/regional references naturally where they strengthen the hook or credibility.`
    : '';
  const ctaContext = input.callToAction
    ? `Creator's CTA: Use exactly "${input.callToAction}" as the callToAction field text. Write the callToActionCamera direction to match.`
    : '';

  const prompt = `
You are an expert short-form video script writer for ${input.niche} content creators on TikTok, Instagram Reels, and YouTube Shorts.

${typePrompt}

Niche: ${input.niche}
${seriesContext}
${input.additionalContext ?? ''}
${locationContext}
${ctaContext}

Requirements:
- Total video length: ${input.targetDuration === '30-45' ? '30-45 seconds — keep it tight, punchy, and instantly rewatchable' : '45-75 seconds when read at a natural pace'}
- Cold open must hook the viewer in the first 3 seconds
- Each section should take ${input.targetDuration === '30-45' ? '7-10' : '10-15'} seconds to deliver
- teleprompterText is the full script concatenated for use in a teleprompter (no headings, just words to say)
- caption is optimized for the feed (under 150 chars, no hashtags)
- hashtags: 5-8 niche-relevant tags without the # symbol
- totalDurationSeconds: estimated delivery time in seconds

Write in a natural, conversational tone. Avoid corporate-speak.
`.trim();

  const result = await withTimeout(
    model.generateContent(prompt),
    SCRIPT_TIMEOUT_MS,
    'Gemini generateScript'
  );
  const text = result.response.text();
  return JSON.parse(text) as ScriptData;
}
