import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateScript, ScriptData } from './gemini';
import { evaluateScript, computeOverallScore, ScriptQualityScore } from './scriptEvaluator';
import { appendExperiment, ExperimentEntry } from './experimentLog';

let _genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

// Niches to test against — broad spread to avoid overfitting to one domain
const TEST_NICHES = [
  'fitness & wellness',
  'personal finance',
  'fashion & style',
  'tech & apps',
  'food & cooking',
  'business & entrepreneurship',
];

interface ScoredScript {
  script: ScriptData;
  score: ScriptQualityScore;
  overall: number;
  niche: string;
}

/**
 * Generate and score a batch of scripts using a given prompt.
 */
async function generateAndScore(
  prompt: string,
  scriptType: string,
  batchSize: number = 6,
): Promise<ScoredScript[]> {
  const niches = TEST_NICHES.slice(0, batchSize);
  const results: ScoredScript[] = [];

  for (const niche of niches) {
    try {
      const script = await generateScript({
        niche,
        scriptType: scriptType as any,
        additionalContext: undefined,
      }, prompt);

      const score = await evaluateScript(script, niche, scriptType);
      results.push({
        script,
        score,
        overall: computeOverallScore(score),
        niche,
      });
    } catch (err) {
      console.error(`  [promptLab] Failed for niche="${niche}":`, err instanceof Error ? err.message : err);
    }
  }

  return results;
}

/**
 * Ask Gemini to propose a challenger prompt based on current results.
 */
async function proposeChallenger(
  currentPrompt: string,
  scriptType: string,
  topScripts: ScoredScript[],
  bottomScripts: ScoredScript[],
): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });

  const topExamples = topScripts
    .map(
      (s) =>
        `[Score: ${s.overall.toFixed(1)}/10, Niche: ${s.niche}]\n` +
        `Cold Open: "${s.script.coldOpen}"\n` +
        `Reasoning: ${s.score.reasoning}`,
    )
    .join('\n\n');

  const bottomExamples = bottomScripts
    .map(
      (s) =>
        `[Score: ${s.overall.toFixed(1)}/10, Niche: ${s.niche}]\n` +
        `Cold Open: "${s.script.coldOpen}"\n` +
        `Reasoning: ${s.score.reasoning}`,
    )
    .join('\n\n');

  const metaPrompt = `You are optimizing a prompt that generates ${scriptType} short-form video scripts.

CURRENT PROMPT:
"${currentPrompt}"

TOP PERFORMING SCRIPTS (highest quality scores):
${topExamples}

BOTTOM PERFORMING SCRIPTS (lowest quality scores):
${bottomExamples}

Based on what worked and what didn't, write an IMPROVED version of the prompt.

Rules:
- Keep the same general intent (${scriptType} scripts)
- Focus on what made the top scripts score well — amplify those patterns
- Fix what made the bottom scripts score poorly — add explicit guidance against those patterns
- The prompt will be inserted into a larger system prompt, so write ONLY the type-specific instruction (1-3 sentences)
- Do NOT include meta-commentary, just output the improved prompt text

IMPROVED PROMPT:`;

  const result = await model.generateContent(metaPrompt);
  return result.response.text().trim();
}

export interface LabRunResult {
  scriptType: string;
  currentPrompt: string;
  challengerPrompt: string;
  currentAvgScore: number;
  challengerAvgScore: number;
  result: 'promoted' | 'rejected' | 'inconclusive';
  improvement: number; // percentage
}

/**
 * Run a single experiment cycle for a script type.
 * This is the core autoresearch loop:
 *   1. Score current prompt
 *   2. Generate challenger
 *   3. Score challenger
 *   4. Compare and decide
 */
export async function runExperimentCycle(
  currentPrompt: string,
  scriptType: string,
  batchSize: number = 6,
  promotionThreshold: number = 0.05, // 5% improvement required
): Promise<LabRunResult> {
  console.log(`\n[promptLab] === Experiment: ${scriptType} ===`);
  console.log(`[promptLab] Scoring current prompt (${batchSize} scripts)...`);

  // Step 1: Score current prompt
  const currentResults = await generateAndScore(currentPrompt, scriptType, batchSize);

  // Guard against empty results (e.g., Gemini is down)
  if (currentResults.length === 0) {
    console.log(`[promptLab] No scripts generated — Gemini may be down. Skipping.`);
    return {
      scriptType,
      currentPrompt,
      challengerPrompt: '',
      currentAvgScore: 0,
      challengerAvgScore: 0,
      result: 'inconclusive',
      improvement: 0,
    };
  }

  const currentAvg =
    currentResults.reduce((sum, r) => sum + r.overall, 0) / currentResults.length;
  console.log(`[promptLab] Current avg score: ${currentAvg.toFixed(2)}/10`);

  // Step 2: Generate challenger
  const sorted = [...currentResults].sort((a, b) => b.overall - a.overall);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3);

  console.log(`[promptLab] Generating challenger prompt...`);
  const challengerPrompt = await proposeChallenger(currentPrompt, scriptType, top3, bottom3);
  console.log(`[promptLab] Challenger: "${challengerPrompt.slice(0, 100)}..."`);

  // Step 3: Score challenger
  console.log(`[promptLab] Scoring challenger prompt (${batchSize} scripts)...`);
  const challengerResults = await generateAndScore(challengerPrompt, scriptType, batchSize);

  // Guard against empty challenger results
  if (challengerResults.length === 0) {
    console.log(`[promptLab] No challenger scripts generated. Skipping.`);
    return {
      scriptType,
      currentPrompt,
      challengerPrompt,
      currentAvgScore: currentAvg,
      challengerAvgScore: 0,
      result: 'inconclusive',
      improvement: 0,
    };
  }

  const challengerAvg =
    challengerResults.reduce((sum, r) => sum + r.overall, 0) / challengerResults.length;
  console.log(`[promptLab] Challenger avg score: ${challengerAvg.toFixed(2)}/10`);

  // Step 4: Compare
  const improvement = currentAvg > 0 ? (challengerAvg - currentAvg) / currentAvg : 0;
  let result: 'promoted' | 'rejected' | 'inconclusive';

  if (currentResults.length < 3 || challengerResults.length < 3) {
    result = 'inconclusive';
  } else if (improvement >= promotionThreshold) {
    result = 'promoted';
  } else {
    result = 'rejected';
  }

  console.log(
    `[promptLab] Result: ${result} (${improvement >= 0 ? '+' : ''}${(improvement * 100).toFixed(1)}%)`,
  );

  // Log the experiment
  const allChallengerSorted = [...challengerResults].sort((a, b) => b.overall - a.overall);
  const entry: ExperimentEntry = {
    runId: `exp_${Date.now()}`,
    scriptType,
    timestamp: new Date().toISOString(),
    currentPrompt,
    challengerPrompt,
    currentAvgScore: currentAvg,
    challengerAvgScore: challengerAvg,
    result,
    sampleSize: currentResults.length + challengerResults.length,
    topScript: allChallengerSorted[0]
      ? { coldOpen: allChallengerSorted[0].script.coldOpen, score: allChallengerSorted[0].overall }
      : undefined,
    bottomScript: allChallengerSorted.at(-1)
      ? {
          coldOpen: allChallengerSorted.at(-1)!.script.coldOpen,
          score: allChallengerSorted.at(-1)!.overall,
        }
      : undefined,
  };
  appendExperiment(entry);

  return {
    scriptType,
    currentPrompt,
    challengerPrompt,
    currentAvgScore: currentAvg,
    challengerAvgScore: challengerAvg,
    result,
    improvement,
  };
}
