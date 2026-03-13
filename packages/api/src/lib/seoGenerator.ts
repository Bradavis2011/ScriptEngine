import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

let _genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

const SEO_PAGE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    pageTitle: { type: SchemaType.STRING },
    metaDescription: { type: SchemaType.STRING },
    h1: { type: SchemaType.STRING },
    introHtml: { type: SchemaType.STRING },
    scripts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          hookLine: { type: SchemaType.STRING },
          teleprompterText: { type: SchemaType.STRING },
          caption: { type: SchemaType.STRING },
          hashtags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          durationSeconds: { type: SchemaType.NUMBER },
          bRollNotes: { type: SchemaType.STRING },
        },
        required: ['hookLine', 'teleprompterText', 'caption', 'hashtags', 'durationSeconds', 'bRollNotes'],
      },
    },
    tips: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    faqs: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          question: { type: SchemaType.STRING },
          answer: { type: SchemaType.STRING },
        },
        required: ['question', 'answer'],
      },
    },
  },
  required: ['pageTitle', 'metaDescription', 'h1', 'introHtml', 'scripts', 'tips', 'faqs'],
};

export interface SeoScriptItem {
  hookLine: string;
  teleprompterText: string;
  caption: string;
  hashtags: string[];
  durationSeconds: number;
  bRollNotes: string;
}

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface SeoPageContent {
  pageTitle: string;
  metaDescription: string;
  h1: string;
  introHtml: string;
  scripts: SeoScriptItem[];
  tips: string[];
  faqs: SeoFaqItem[];
}

export interface SeoPageInput {
  pageType: 'niche' | 'niche_city' | 'howto';
  niche: string;
  city?: string;
  targetKeyword: string;
  howtoTopic?: string;
}

const SEO_TIMEOUT_MS = 90_000; // 90s — SEO pages are longer-form

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

export async function generateSeoPageContent(input: SeoPageInput): Promise<SeoPageContent> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SEO_PAGE_SCHEMA as any,
    },
  });

  let contextLine: string;
  if (input.pageType === 'niche_city') {
    contextLine = `${input.niche} creators in ${input.city}`;
  } else if (input.pageType === 'howto') {
    contextLine = `creators who want to ${input.howtoTopic}`;
  } else {
    contextLine = `${input.niche} creators`;
  }

  const cityContext = input.city
    ? `The target audience is specifically in ${input.city}. Include local/regional references where naturally relevant.`
    : '';

  const scriptTypes =
    input.pageType === 'howto'
      ? 'educational tip, myth-busting take, and actionable how-to'
      : 'market tip, data drop, and quick hook';

  const prompt = `You are an expert SEO content writer and short-form video script creator. Generate content for a programmatic SEO landing page targeting the keyword "${input.targetKeyword}".

TARGET AUDIENCE: ${contextLine}
${cityContext}

PAGE REQUIREMENTS:

1. pageTitle: Compelling, keyword-rich title under 60 characters. Include "${input.targetKeyword}" naturally.

2. metaDescription: 140-155 character description. Include the keyword and a clear value proposition. No generic fluff.

3. h1: Keyword-rich H1 heading that matches the page intent. Different from pageTitle.

4. introHtml: 2-3 paragraph HTML intro (use only <p> tags). Keyword-rich, naturally written, addresses why ${contextLine} need scripts and how ClipScript helps. ~150 words total.

5. scripts: Exactly 3 complete, ready-to-film teleprompter scripts for ${contextLine}. Script types: ${scriptTypes}. Each script:
   - hookLine: A single strong opening line that hooks in 3 seconds (the cold open)
   - teleprompterText: Full script text exactly as spoken, 45-75 seconds. Use natural spoken language, short punchy sentences. Break at natural pauses with line breaks (\\n). No headings or labels — just the words to say.
   - caption: Feed caption under 150 chars, no hashtags, strong CTA or hook
   - hashtags: 6-8 relevant tags WITHOUT the # symbol
   - durationSeconds: Estimated delivery time (45-75)
   - bRollNotes: 1-2 sentences describing what to show on screen while speaking

6. tips: Exactly 5 specific, actionable tips for ${contextLine}. Each tip is a complete sentence starting with a verb (e.g. "Post at 6pm on weekdays when your audience is most active"). Make them practical and specific${input.city ? ` to ${input.city}` : ''}.

7. faqs: Exactly 5 FAQ question/answer pairs. Questions should match real search queries like "how do I write TikTok scripts for ${input.niche.toLowerCase()}" or "best time to post ${input.niche.toLowerCase()} videos". Answers: 2-3 sentences, helpful and specific.

Write everything as if you are a real expert helping a real creator. No filler, no generic advice. Make the scripts genuinely usable — someone should be able to read script 1 teleprompterText to camera right now.`.trim();

  const result = await withTimeout(
    model.generateContent(prompt),
    SEO_TIMEOUT_MS,
    `Gemini generateSeoPageContent (${input.targetKeyword})`
  );
  const text = result.response.text();
  return JSON.parse(text) as SeoPageContent;
}
