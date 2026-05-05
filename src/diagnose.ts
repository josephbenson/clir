import fs from 'fs';
import path from 'path';
import { LOG_DIR } from './lib/logger.js';
import { printInfo } from './lib/ui.js';

export async function diagnose(): Promise<void> {
  if (!fs.existsSync(LOG_DIR)) {
    console.log('No logs yet. Run clir on a project first.');
    return;
  }

  const logFiles = fs.readdirSync(LOG_DIR)
    .filter(f => f.endsWith('.log'))
    .sort()
    .slice(-3);

  if (!logFiles.length) {
    console.log('No logs yet. Run clir on a project first.');
    return;
  }

  const rawLogs = logFiles
    .map(f => fs.readFileSync(path.join(LOG_DIR, f), 'utf-8').trim())
    .filter(Boolean)
    .join('\n');

  console.log(`\nLog files: ${LOG_DIR}\n`);

  const lines = rawLogs.split('\n').slice(-30);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as { timestamp: string; level: string; event: string; data?: unknown };
      const data = entry.data ? ' ' + JSON.stringify(entry.data) : '';
      const color = entry.level === 'error' ? '\x1b[31m' : entry.level === 'warn' ? '\x1b[33m' : '\x1b[0m';
      console.log(`${color}${entry.timestamp} [${entry.level}] ${entry.event}${data}\x1b[0m`);
    } catch {
      console.log(line);
    }
  }

  printInfo([
    'To get a diagnosis, paste the above into ChatGPT, Claude, or Gemini:',
    '   "I used a tool called clir to run a project locally.',
    '    What went wrong and what should I do?"',
  ]);
}
