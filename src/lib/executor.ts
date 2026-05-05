import { spawn, ChildProcess } from 'child_process';
import { matchKnownErrors, analyzeWithClaude } from './errors.js';
import { logger } from './logger.js';

const LOCAL_URL_RE = /https?:\/\/(localhost|127\.0\.0\.1):\d+/;
const MAX_BUFFER_BYTES = 50 * 1024;
const INSTALL_TIMEOUT_MS = 5 * 60 * 1000;

let activeChild: ChildProcess | null = null;

process.on('SIGINT', () => {
  if (activeChild) {
    activeChild.kill('SIGINT');
  }
  process.exit(0);
});

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

    activeChild = child;

    if (!streamAndDetect) {
      const timer = setTimeout(() => {
        child.kill();
        logger.error('command_timeout', { command });
        reject(new Error(`"${command}" timed out after ${INSTALL_TIMEOUT_MS / 1000}s. It may be waiting for input or hanging.`));
      }, INSTALL_TIMEOUT_MS);

      child.on('close', (code) => {
        clearTimeout(timer);
        activeChild = null;
        const exitCode = code ?? 0;
        logger.info('command_complete', { command, exitCode });
        exitCode === 0 ? resolve() : reject(new Error(`"${command}" exited with code ${exitCode}`));
      });
      child.on('error', (err) => {
        clearTimeout(timer);
        activeChild = null;
        logger.error('command_error', { command, error: err.message });
        reject(err);
      });
      return;
    }

    let urlPrinted = false;
    const seenUrls = new Set<string>();
    const outputChunks: string[] = [];
    let bufferedBytes = 0;
    const shownErrors = new Set<string>();

    const handleChunk = (data: Buffer) => {
      const text = data.toString();
      process.stdout.write(text);

      outputChunks.push(text);
      bufferedBytes += text.length;
      while (bufferedBytes > MAX_BUFFER_BYTES && outputChunks.length > 1) {
        bufferedBytes -= outputChunks.shift()!.length;
      }

      const urlMatches = [...text.matchAll(new RegExp(LOCAL_URL_RE.source, 'g'))];
      for (const match of urlMatches) {
        const url = match[0];
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          if (!urlPrinted) {
            urlPrinted = true;
            console.log('');
          }
          logger.info('url_detected', { url });
          console.log(`\x1b[32m\x1b[1m  Open in browser: ${url}\x1b[0m`);
        }
      }

      const recentOutput = outputChunks.join('');
      for (const error of matchKnownErrors(recentOutput)) {
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
      activeChild = null;
      const exitCode = code ?? 0;

      if (exitCode === 0) {
        logger.info('command_complete', { command, exitCode });
        resolve();
        return;
      }

      logger.error('command_failed', { command, exitCode, knownErrorsDetected: shownErrors.size });

      const outputBuffer = outputChunks.join('');
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
      activeChild = null;
      logger.error('command_error', { command, error: err.message });
      reject(err);
    });
  });
}

function printError(issue: string, fix: string): void {
  console.log(`\n\x1b[31m✗ ${issue}\x1b[0m`);
  console.log(`\x1b[33m  What to do: ${fix}\x1b[0m\n`);
}
