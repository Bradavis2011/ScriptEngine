/**
 * Prompt Evolution Worker — weekly Sunday 4 AM UTC
 *
 * Connects the offline AI prompt lab with the online DB:
 *   1. For each of the 12 script types, run an AI-vs-AI experiment cycle
 *   2. If the AI eval says challenger is 5%+ better, persist to DB:
 *      - Creates PromptVersion (challenger) in DB
 *      - Creates ExperimentRun with status: 'running'
 *   3. The calibration system handles real-world promotion (checkExperimentCompletion)
 *
 * This bridges promptLab.ts (offline) ↔ calibration.ts (online user data).
 */

import { Job } from 'bullmq';
import { runExperimentCycle } from '../../lib/promptLab';
import { getCurrentPrompt, createChallenger, SEED_PROMPTS } from '../../lib/promptVersions';

// All 12 script types supported by gemini.ts
const ALL_SCRIPT_TYPES = [
  'data_drop',
  'trend_take',
  'niche_tip',
  'niche_tip_basic',
  'series_episode',
  'quick_hook',
  'story_hook',
  'rapid_tip',
  'showcase',
  'listing_tour',
  'just_listed',
  'market_update',
];

export async function runPromptEvolution(_job: Job): Promise<void> {
  console.log('[promptEvolution] Starting weekly prompt evolution cycle...');

  let challenged = 0;
  let skipped = 0;
  let errors = 0;

  for (const scriptType of ALL_SCRIPT_TYPES) {
    try {
      console.log(`[promptEvolution] Processing: ${scriptType}`);

      // Get the current best prompt (deterministic — no 80/20 split)
      const { prompt: currentPrompt } = await getCurrentPrompt(scriptType);

      // Run AI-vs-AI experiment (6 scripts per side, 5% improvement threshold)
      const result = await runExperimentCycle(currentPrompt, scriptType, 6, 0.05);

      if (result.result === 'promoted') {
        // AI says challenger is meaningfully better — persist to DB
        // createChallenger() automatically creates ExperimentRun with status: 'running'
        await createChallenger(scriptType, result.challengerPrompt, 'ai_lab');
        console.log(
          `[promptEvolution] ${scriptType}: Challenger created ` +
          `(+${(result.improvement * 100).toFixed(1)}% AI improvement, awaiting real-world validation)`,
        );
        challenged++;
      } else {
        console.log(
          `[promptEvolution] ${scriptType}: ${result.result} ` +
          `(${result.improvement >= 0 ? '+' : ''}${(result.improvement * 100).toFixed(1)}%)`,
        );
        skipped++;
      }
    } catch (err) {
      console.error(
        `[promptEvolution] ${scriptType} failed:`,
        err instanceof Error ? err.message : err,
      );
      errors++;
    }
  }

  console.log(
    `[promptEvolution] Done — ${challenged} challengers created, ${skipped} skipped, ${errors} errors`,
  );
}
