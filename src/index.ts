#!/usr/bin/env node
import { Command } from 'commander';
import { run } from './run.js';
import { diagnose } from './diagnose.js';

const program = new Command();

program
  .name('clir')
  .description('Run any GitHub repo or local project with one command');

program
  .command('diagnose')
  .description('Analyze recent clir logs to identify issues')
  .action(async () => {
    try {
      await diagnose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n\x1b[31mError: ${message}\x1b[0m`);
      process.exit(1);
    }
  });

program
  .argument('[source]', 'GitHub URL or local path (defaults to current directory)')
  .option('-d, --dir <path>', 'target directory when cloning a GitHub repo')
  .option('--no-install', 'skip dependency installation')
  .action(async (...args) => {
    try {
      await run(...(args as Parameters<typeof run>));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('exited with code')) {
        console.error(`\n\x1b[31mError: ${message}\x1b[0m`);
      }
      process.exit(1);
    }
  });

program.parse();
