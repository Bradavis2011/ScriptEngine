/**
 * Objective, computation-only script quality metrics.
 * No API calls — pure NLP heuristics.
 *
 * Implements syllable counting and Flesch-Kincaid Grade Level inline
 * to avoid ESM-only package compatibility issues (syllable v5+).
 */

export interface HookAnalysis {
  hookType: 'question' | 'stat' | 'controversy' | 'story' | 'generic';
  wordCount: number;
  estimatedSeconds: number;
}

export interface ScriptMetrics {
  readabilityGrade: number;       // Flesch-Kincaid grade level (target 6-8 for teleprompter)
  estimatedDurationSeconds: number; // word count × 0.45s
  geminiDurationSeconds: number;  // what Gemini claimed
  durationAccurate: boolean;      // within 15% of gemini's estimate
  hookType: HookAnalysis['hookType'];
  hookWordCount: number;
  hookEstimatedSeconds: number;
  readabilityFlag: boolean;       // true if grade > 10 (too complex for teleprompter)
}

// ---------------------------------------------------------------------------
// Syllable counting — vowel-group heuristic
// ---------------------------------------------------------------------------

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length === 0) return 0;
  if (word.length <= 3) return 1;

  // Remove trailing silent 'e'
  word = word.replace(/e$/, '');

  // Count vowel groups
  const matches = word.match(/[aeiouy]+/g);
  return matches ? matches.length : 1;
}

// ---------------------------------------------------------------------------
// Readability — Flesch-Kincaid Grade Level
// Formula: 0.39 × (words/sentences) + 11.8 × (syllables/words) − 15.59
// Target range for spoken teleprompter text: 6–8
// ---------------------------------------------------------------------------

export function computeReadability(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  // Split into sentences
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = Math.max(sentences.length, 1);

  // Split into words
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = Math.max(words.length, 1);

  // Count total syllables
  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const grade =
    0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59;

  return Math.max(0, Math.round(grade * 10) / 10);
}

// ---------------------------------------------------------------------------
// Duration estimate — average spoken pace for short-form video
// 0.45 seconds per word (slightly faster than casual speech for energetic delivery)
// ---------------------------------------------------------------------------

export function estimateDuration(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  return Math.round(words.length * 0.45);
}

// ---------------------------------------------------------------------------
// Hook analysis — pattern matching against proven hook formulas
// ---------------------------------------------------------------------------

export function analyzeHook(coldOpen: string): HookAnalysis {
  const text = coldOpen.trim();
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const estimatedSeconds = Math.round(wordCount * 0.45);

  // Question hook: starts with interrogative word
  const questionWords = /^(what|why|how|when|where|who|which|did you|have you|do you|are you|is it|can you)/i;
  if (questionWords.test(text) || text.includes('?')) {
    return { hookType: 'question', wordCount, estimatedSeconds };
  }

  // Stat hook: contains a number in the first 2 sentences
  const firstSentences = text.split(/[.!?]/)[0] ?? text;
  if (/\d+([%$,.]?\d*)?/.test(firstSentences)) {
    return { hookType: 'stat', wordCount, estimatedSeconds };
  }

  // Controversy hook: contains negation or myth-busting words
  const controversyWords = /\b(wrong|myth|stop|actually|nobody|everyone|always|never|mistake|lie|secret)\b/i;
  if (controversyWords.test(text)) {
    return { hookType: 'controversy', wordCount, estimatedSeconds };
  }

  // Story hook: first-person narrative
  if (/\b(i |my |i've|i'm|i was|i had|i did|i made)\b/i.test(text)) {
    return { hookType: 'story', wordCount, estimatedSeconds };
  }

  return { hookType: 'generic', wordCount, estimatedSeconds };
}

// ---------------------------------------------------------------------------
// Combined: compute all metrics for a generated script
// ---------------------------------------------------------------------------

export function computeScriptMetrics(
  teleprompterText: string,
  coldOpen: string,
  geminiDurationSeconds: number,
): ScriptMetrics {
  const readabilityGrade = computeReadability(teleprompterText);
  const estimatedDurationSeconds = estimateDuration(teleprompterText);
  const hook = analyzeHook(coldOpen);

  // Within 15% of Gemini's estimate
  const durationDelta =
    geminiDurationSeconds > 0
      ? Math.abs(estimatedDurationSeconds - geminiDurationSeconds) / geminiDurationSeconds
      : 0;

  return {
    readabilityGrade,
    estimatedDurationSeconds,
    geminiDurationSeconds,
    durationAccurate: durationDelta <= 0.15,
    hookType: hook.hookType,
    hookWordCount: hook.wordCount,
    hookEstimatedSeconds: hook.estimatedSeconds,
    readabilityFlag: readabilityGrade > 10,
  };
}
