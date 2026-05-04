import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { LOG_DIR } from './lib/logger.js';

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('Set ANTHROPIC_API_KEY to get an AI-powered diagnosis.\n');
    console.log('Recent entries:\n');
    rawLogs.split('\n').slice(-20).forEach(line => {
      try {
        const entry = JSON.parse(line) as { timestamp: string; level: string; event: string; data?: unknown };
        console.log(`${entry.timestamp} [${entry.level}] ${entry.event}${entry.data ? ' ' + JSON.stringify(entry.data) : ''}`);
      } catch {
        console.log(line);
      }
    });
    return;
  }

  console.log('Analyzing logs...\n');

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system:
      'You analyze activity logs from clir, a CLI tool that clones GitHub repos and runs them locally. ' +
      'Each log line is a JSON object with timestamp, session, level, event, and optional data. ' +
      'Summarize what was attempted, what succeeded, what failed, and give clear actionable advice. ' +
      'Group events by session. Be concise and practical. No markdown headers.',
    messages: [{
      role: 'user',
      content: `Here are the recent clir logs:\n\n${rawLogs.slice(-8000)}`,
    }],
  });

  const analysis = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  console.log(analysis);
}
