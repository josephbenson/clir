import { spawn } from 'child_process';
import { matchKnownErrors, analyzeWithClaude } from './errors.js';
import { logger } from './logger.js';

const LOCAL_URL_RE = /https?:\/\/(localhost|127\.0\.0\.1):\d+/;

export function execute(command: string, cwd: string, streamAndDetect: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const home = process.env.HOME ?? '';
    const extraPaths = [
      `${home}/Library/pnpm`,
      `${home}/.local/share/pnpm`,
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/bin',
    ].join(':');

    const shell = process.env.SHELL ?? '/bin/zsh';
    logger.info('command_start', { command, cwd });

    const child = spawn(shell, ['-c', command], {
      cwd,
      stdio: streamAndDetect ? 'pipe' : 'inherit',
      env: { ...process.env, PATH: `${extraPaths}:${process.env.PATH ?? ''}` },
    });

    if (!streamAndDetect) {
      child.on('close', (code) => {
        const exitCode = code ?? 0;
        logger.info('command_complete', { command, exitCode });
        exitCode === 0 ? resolve() : reject(new Error(`"${command}" exited with code ${exitCode}`));
      });
      child.on('error', (err) => {
        logger.error('command_error', { command, error: err.message });
        reject(err);
      });
      return;
    }

    let urlPrinted = false;
    let outputBuffer = '';
    const shownErrors = new Set<string>();

    const handleChunk = (data: Buffer) => {
      const text = data.toString();
      process.stdout.write(text);
      outputBuffer += text;

      if (!urlPrinted) {
        const match = text.match(LOCAL_URL_RE);
        if (match) {
          urlPrinted = true;
          logger.info('url_detected', { url: match[0] });
          console.log(`\n\x1b[32m\x1b[1m  Open in browser: ${match[0]}\x1b[0m\n`);
        }
      }

      for (const error of matchKnownErrors(text)) {
        if (!shownErrors.has(error.issue)) {
          shownErrors.add(error.issue);
          logger.error('error_detected', { issue: error.issue });
          printError(error.issue, error.fix);
        }
      }
    };

    child.stdout?.on('data', handleChunk);
    child.stderr?.on('data', handleChunk);

    child.on('close', async (code) => {
      const exitCode = code ?? 0;

      if (exitCode === 0) {
        logger.info('command_complete', { command, exitCode });
        resolve();
        return;
      }

      logger.error('command_failed', { command, exitCode, knownErrorsDetected: shownErrors.size });

      if (shownErrors.size === 0) {
        const analysis = await analyzeWithClaude(outputBuffer).catch(() => null);
        if (analysis) {
          logger.error('crash_analyzed', { analysis });
          printError('The app failed to start.', analysis);
        }
      }

      reject(new Error(`"${command}" exited with code ${exitCode}`));
    });

    child.on('error', (err) => {
      logger.error('command_error', { command, error: err.message });
      reject(err);
    });
  });
}

function printError(issue: string, fix: string): void {
  console.log(`\n\x1b[31m✗ ${issue}\x1b[0m`);
  console.log(`\x1b[33m  What to do: ${fix}\x1b[0m\n`);
}
