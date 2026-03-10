import * as fs from 'fs';
import * as path from 'path';

export interface ExperimentEntry {
  runId: string;
  scriptType: string;
  timestamp: string;
  currentPrompt: string;
  challengerPrompt: string;
  currentAvgScore: number;
  challengerAvgScore: number;
  result: 'promoted' | 'rejected' | 'inconclusive';
  sampleSize: number;
  topScript?: { coldOpen: string; score: number };
  bottomScript?: { coldOpen: string; score: number };
  niche?: string;
}

const LOG_DIR = path.resolve(__dirname, '../../experiment-logs');

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logFilePath(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `experiments-${date}.jsonl`);
}

export function appendExperiment(entry: ExperimentEntry): void {
  ensureLogDir();
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(logFilePath(), line, 'utf-8');
}

export function readTodaysExperiments(): ExperimentEntry[] {
  const filePath = logFilePath();
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ExperimentEntry);
}

export function readAllExperiments(): ExperimentEntry[] {
  ensureLogDir();
  const files = fs.readdirSync(LOG_DIR).filter((f) => f.endsWith('.jsonl')).sort();
  const entries: ExperimentEntry[] = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(LOG_DIR, file), 'utf-8');
    for (const line of content.split('\n').filter(Boolean)) {
      entries.push(JSON.parse(line) as ExperimentEntry);
    }
  }
  return entries;
}
