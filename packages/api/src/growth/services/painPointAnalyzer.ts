import { GoogleGenerativeAI } from '@google/generative-ai';

let _genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

export interface PainPointScores {
  painIntensity: number;
  relevance: number;
  actionability: number;
  overallScore: number;
  categories: string[];
  marketingAngle: string;
  productInsight: string;
}

export async function scorePainPoint(
  title: string,
  body: string,
): Promise<PainPointScores> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Analyze this Reddit post from a content creator for pain points relevant to AI video scripting and teleprompter tools.

Post:
Title: "${title}"
Body: "${(body ?? '').slice(0, 600)}"

Score on these dimensions (each 1-10):
1. painIntensity: How much frustration/pain is expressed? 10 = intense frustration, 1 = mild curiosity
2. relevance: How relevant is this pain to AI script generation + teleprompter tools? 10 = directly about scripting, camera presence, or content ideas
3. actionability: How actionable is this for product/marketing decisions? 10 = clear feature request or copy angle

Also provide:
- categories: array of 2-4 tags (e.g. "scripting", "camera_anxiety", "content_ideas", "time_management")
- marketingAngle: one sentence of marketing copy this pain point inspires (for ClipScript ads/copy)
- productInsight: one sentence feature idea or product angle this reveals

Return ONLY valid JSON:
{
  "painIntensity": <number 1-10>,
  "relevance": <number 1-10>,
  "actionability": <number 1-10>,
  "categories": ["<string>"],
  "marketingAngle": "<string>",
  "productInsight": "<string>"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response
    .text()
    .trim()
    .replace(/^```json\n?/, '')
    .replace(/\n?```$/, '');

  const parsed = JSON.parse(text) as Omit<PainPointScores, 'overallScore'>;

  const overallScore =
    parsed.painIntensity * 0.3 + parsed.relevance * 0.4 + parsed.actionability * 0.3;

  return { ...parsed, overallScore };
}
