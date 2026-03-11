/**
 * Prompt Lab Runner — the autoresearch-inspired overnight experiment loop.
 *
 * Usage:
 *   npx ts-node packages/api/src/jobs/runPromptLab.ts
 *   npx ts-node packages/api/src/jobs/runPromptLab.ts --type data_drop --cycles 3
 *   npx ts-node packages/api/src/jobs/runPromptLab.ts --all --cycles 5
 *
 * Runs experiment cycles against script prompts. Each cycle:
 *   1. Generates scripts with the current best prompt
 *   2. Scores them with AI evaluator
 *   3. Proposes a challenger prompt
 *   4. Generates + scores scripts with the challenger
 *   5. Keeps the winner
 *
 * ~2 minutes per cycle. Run overnight for ~30 experiments across all script types.
 */
import 'dotenv/config';
import { runExperimentCycle, LabRunResult } from '../lib/promptLab';
import {
  SEED_PROMPTS,
  getCurrentPrompt,
  seedPromptVersions,
  createChallenger,
  promoteChallenger,
} from '../lib/promptVersions';
import { prisma } from '../lib/prisma';
import { readTodaysExperiments } from '../lib/experimentLog';

const SCRIPT_TYPES = Object.keys(SEED_PROMPTS);

async function main() {
  const args = process.argv.slice(2);
  const typeIdx = args.indexOf('--type');
  const cyclesIdx = args.indexOf('--cycles');
  const runAll = args.includes('--all');

  const targetType = typeIdx >= 0 ? args[typeIdx + 1] : undefined;
  const maxCycles = cyclesIdx >= 0 ? parseInt(args[cyclesIdx + 1], 10) : 3;

  const types = runAll
    ? SCRIPT_TYPES
    : targetType
      ? [targetType]
      : SCRIPT_TYPES;

  console.log('=== Prompt Lab Runner ===');
  console.log(`Script types: ${types.join(', ')}`);
  console.log(`Cycles per type: ${maxCycles}`);
  console.log(`Estimated time: ~${types.length * maxCycles * 2} minutes`);
  console.log('');

  // Ensure seed prompt versions exist in DB
  const seeded = await seedPromptVersions();
  if (seeded > 0) {
    console.log(`[runner] Seeded ${seeded} initial prompt versions in DB`);
  }

  // Load current best prompts from DB (not hardcoded seeds)
  const bestPrompts: Record<string, string> = {};
  const bestPromptIds: Record<string, string | null> = {};
  for (const t of types) {
    const { prompt, promptVersionId } = await getCurrentPrompt(t);
    bestPrompts[t] = prompt;
    bestPromptIds[t] = promptVersionId;
  }

  const allResults: LabRunResult[] = [];

  for (let cycle = 1; cycle <= maxCycles; cycle++) {
    console.log(`\n========== CYCLE ${cycle}/${maxCycles} ==========\n`);

    for (const scriptType of types) {
      try {
        const result = await runExperimentCycle(bestPrompts[scriptType], scriptType);
        allResults.push(result);

        if (result.result === 'promoted' && result.challengerPrompt) {
          // Persist winning prompt to DB so it affects production traffic
          const challengerId = await createChallenger(
            scriptType,
            result.challengerPrompt,
            'ai_lab',
            bestPromptIds[scriptType] ?? undefined,
          );
          await promoteChallenger(scriptType, challengerId);

          // Update local tracking
          bestPrompts[scriptType] = result.challengerPrompt;
          bestPromptIds[scriptType] = challengerId;

          // Update scores on the new version
          await prisma.promptVersion.update({
            where: { id: challengerId },
            data: { avgAiScore: result.challengerAvgScore },
          });

          console.log(`[runner] PROMOTED and persisted new prompt for ${scriptType}`);
        }
      } catch (err) {
        console.error(`[runner] Experiment failed for ${scriptType}:`, err);
      }
    }
  }

  // Summary
  console.log('\n\n=== EXPERIMENT SUMMARY ===\n');
  const promoted = allResults.filter((r) => r.result === 'promoted');
  const rejected = allResults.filter((r) => r.result === 'rejected');

  console.log(`Total experiments: ${allResults.length}`);
  console.log(`Promoted: ${promoted.length}`);
  console.log(`Rejected: ${rejected.length}`);

  if (promoted.length > 0) {
    console.log('\nWinning prompts (persisted to DB):');
    for (const p of promoted) {
      console.log(`\n  [${p.scriptType}] +${(p.improvement * 100).toFixed(1)}%`);
      console.log(`  Score: ${p.currentAvgScore.toFixed(2)} -> ${p.challengerAvgScore.toFixed(2)}`);
      console.log(`  Prompt: "${p.challengerPrompt.slice(0, 120)}..."`);
    }
  }

  console.log(`\nFull log: experiment-logs/experiments-${new Date().toISOString().slice(0, 10)}.jsonl`);

  const todays = readTodaysExperiments();
  console.log(`Total experiments logged today: ${todays.length}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
