import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { ScriptData } from './gemini';
import { computeReadability, estimateDuration } from './scriptMetrics';

let _genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

export interface ScriptQualityScore {
  hookStrength: number;   // 1-10: Does the cold open stop the scroll?
  specificity: number;    // 1-10: Are tips/data concrete and actionable?
  naturalLanguage: number; // 1-10: Does it sound like a real person talking?
  pacing: number;         // 1-10: Does it fit 45-75s and flow well?
  ctaClarity: number;     // 1-10: Is the call to action compelling?
  overall: number;        // 1-10: Overall quality for short-form video
  reasoning: string;      // Brief explanation of scores
}

const EVALUATOR_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    hookStrength: { type: SchemaType.NUMBER },
    specificity: { type: SchemaType.NUMBER },
    naturalLanguage: { type: SchemaType.NUMBER },
    pacing: { type: SchemaType.NUMBER },
    ctaClarity: { type: SchemaType.NUMBER },
    overall: { type: SchemaType.NUMBER },
    reasoning: { type: SchemaType.STRING },
  },
  required: [
    'hookStrength',
    'specificity',
    'naturalLanguage',
    'pacing',
    'ctaClarity',
    'overall',
    'reasoning',
  ],
};

// This prompt is FIXED — it's our "prepare.py". Never let the experiment loop modify it.
const EVALUATOR_PROMPT = `You are a senior short-form video content evaluator. You watch thousands of TikToks, Reels, and Shorts daily.

Score the following script on these dimensions (1-10 each):

1. **Hook Strength** (1-10): Does the cold open stop the scroll in the first 3 seconds? A 10 is irresistible — you HAVE to keep watching. A 1 is generic and forgettable.

2. **Specificity** (1-10): Are the claims, tips, and data concrete? A 10 has exact numbers, names, and actionable steps. A 1 is vague platitudes like "be consistent" or "work hard."

3. **Natural Language** (1-10): Does it sound like a real person talking to camera? A 10 reads naturally when spoken aloud — conversational, rhythmic, with personality. A 1 sounds robotic, corporate, or like a blog post.

4. **Pacing** (1-10): Does the structure fit a 45-75 second video with good flow? A 10 has a tight cold open, well-timed sections, and a natural ending. A 1 is bloated, rushed, or structurally awkward.

5. **CTA Clarity** (1-10): Is the call to action compelling and clear? A 10 gives the viewer a specific reason to follow, comment, or share. A 1 is "like and subscribe" with no specificity.

6. **Overall** (1-10): How likely is this script to perform well on TikTok/Reels/Shorts? Consider all dimensions holistically.

Be a tough grader. Most scripts should score 5-7. Only truly exceptional scripts get 9-10. Truly bad scripts get 1-3.

Provide brief reasoning (2-3 sentences) explaining what's strong and what's weak.`;

export async function evaluateScript(
  script: ScriptData,
  niche: string,
  scriptType: string,
): Promise<ScriptQualityScore> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: EVALUATOR_SCHEMA as any,
    },
  });

  const scriptSummary = `
NICHE: ${niche}
SCRIPT TYPE: ${scriptType}
COLD OPEN: "${script.coldOpen}"
CAMERA: ${script.coldOpenCamera}
SECTIONS:
${script.sections.map((s, i) => `  ${i + 1}. [${s.heading}] "${s.script}" (B-roll: ${s.bRollSuggestion})`).join('\n')}
CTA: "${script.callToAction}"
CAPTION: "${script.caption}"
HASHTAGS: ${script.hashtags.join(', ')}
DURATION: ${script.totalDurationSeconds}s
TELEPROMPTER TEXT: "${script.teleprompterText}"`.trim();

  const result = await model.generateContent(
    `${EVALUATOR_PROMPT}\n\nSCRIPT TO EVALUATE:\n${scriptSummary}`,
  );

  const aiScore = JSON.parse(result.response.text()) as ScriptQualityScore;

  // Apply objective corrections — prevents Gemini from inflating its own scores
  const readabilityGrade = computeReadability(script.teleprompterText);
  const estimatedSecs = estimateDuration(script.teleprompterText);
  const claimedSecs = script.totalDurationSeconds;
  const durationDelta = claimedSecs > 0
    ? Math.abs(estimatedSecs - claimedSecs) / claimedSecs
    : 0;

  // Cap naturalLanguage if readability is too high (> 10 = too complex for spoken delivery)
  if (readabilityGrade > 10) {
    aiScore.naturalLanguage = Math.min(aiScore.naturalLanguage, 6);
  }

  // Penalize pacing if duration estimate deviates > 15% from Gemini's claim
  if (durationDelta > 0.15) {
    aiScore.pacing = Math.max(aiScore.pacing - 1, 1);
  }

  return aiScore;
}

export function computeOverallScore(score: ScriptQualityScore): number {
  // Weighted average — hook and specificity matter most for short-form
  return (
    score.hookStrength * 0.25 +
    score.specificity * 0.25 +
    score.naturalLanguage * 0.2 +
    score.pacing * 0.15 +
    score.ctaClarity * 0.15
  );
}
