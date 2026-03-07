import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SCRIPT_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    coldOpen: { type: SchemaType.STRING },
    sections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          heading: { type: SchemaType.STRING },
          script: { type: SchemaType.STRING },
          bRollSuggestion: { type: SchemaType.STRING },
        },
        required: ['heading', 'script', 'bRollSuggestion'],
      },
    },
    callToAction: { type: SchemaType.STRING },
    teleprompterText: { type: SchemaType.STRING },
    caption: { type: SchemaType.STRING },
    hashtags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    totalDurationSeconds: { type: SchemaType.NUMBER },
  },
  required: [
    'coldOpen',
    'sections',
    'callToAction',
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
  sections: Array<{ heading: string; script: string; bRollSuggestion: string }>;
  callToAction: string;
  teleprompterText: string;
  caption: string;
  hashtags: string[];
  totalDurationSeconds: number;
}

export async function generateScript(input: GenerateScriptInput): Promise<ScriptData> {
  const model = genAI.getGenerativeModel({
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
