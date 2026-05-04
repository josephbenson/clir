import { resolveSource } from './lib/source.js';
import { detectStack } from './lib/detector.js';
import { readDocs } from './lib/docs.js';
import { parseInstructions } from './lib/parser.js';
import { execute } from './lib/executor.js';
import { checkEnvExample } from './lib/env.js';
import { runPreflightChecks } from './lib/checks.js';
import { logger } from './lib/logger.js';

type Options = {
  dir?: string;
  install: boolean;
};

export async function run(source: string | undefined, options: Options): Promise<void> {
  logger.info('session_start', { source: source ?? '.', install: options.install });

  const projectDir = await resolveSource(source ?? '.', options.dir);

  await checkEnvExample(projectDir);

  const warnings = runPreflightChecks(projectDir);
  for (const warning of warnings) {
    console.log(`\n\x1b[33m⚠ ${warning.issue}\x1b[0m`);
    console.log(`\x1b[33m  What to do: ${warning.fix}\x1b[0m`);
    logger.warn('preflight_warning', { issue: warning.issue });
  }
  if (warnings.length) console.log('');

  const stack = detectStack(projectDir);
  let installCommand = stack?.installCommand ?? '';
  let setupCommands = stack?.setupCommands ?? [];
  let startCommand = stack?.startCommand ?? '';

  logger.info('stack_detected', { installCommand, setupCommands, startCommand, usedDetector: !!stack });

  if (!installCommand || !startCommand) {
    console.log('Reading project docs to determine setup...');
    const docs = readDocs(projectDir);
    const parsed = await parseInstructions(docs);
    installCommand = installCommand || parsed.installCommand;
    setupCommands = setupCommands.length ? setupCommands : parsed.setupCommands;
    startCommand = startCommand || parsed.startCommand;
    logger.info('docs_parsed', { installCommand, setupCommands, startCommand });
  }

  if (!startCommand) {
    logger.error('start_command_missing');
    console.error('Could not determine the start command. Check the project README and try manually.');
    process.exit(1);
  }

  if (options.install && installCommand) {
    console.log(`\nInstalling: ${installCommand}`);
    await execute(installCommand, projectDir, false);
  }

  for (const command of setupCommands) {
    console.log(`\nSetting up: ${command}`);
    await execute(command, projectDir, false);
  }

  console.log(`\nStarting: ${startCommand}\n`);
  await execute(startCommand, projectDir, true);
}
