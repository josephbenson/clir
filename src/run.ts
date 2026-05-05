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
  skipInstall?: boolean;
};

export async function run(source: string | undefined, options: Options): Promise<void> {
  logger.info('session_start', { source: source ?? '.', skipInstall: options.skipInstall ?? false });

  const projectDir = resolveSource(source ?? '.', options.dir);

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
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('Reading project docs to determine setup...');
      const docs = readDocs(projectDir);
      const parsed = await parseInstructions(docs);
      installCommand = installCommand || parsed.installCommand;
      setupCommands = setupCommands.length ? setupCommands : parsed.setupCommands;
      startCommand = startCommand || parsed.startCommand;
      logger.info('docs_parsed', { installCommand, setupCommands, startCommand });
    } else {
      logger.warn('stack_not_detected');
      console.log('\nclir could not automatically detect how to set up this project.');
      console.log('\nOpen the project README and paste it into ChatGPT, Claude, or Gemini with this prompt:');
      console.log('\n  "What commands do I need to run to install and start this project locally?');
      console.log('   List them in order: install, any setup steps, then the start command."');
      console.log('\nOnce you know the commands, run them manually from:\n  ' + projectDir + '\n');
      process.exit(0);
    }
  }

  if (!startCommand) {
    logger.error('start_command_missing');
    console.error('Could not determine the start command. Check the project README and try manually.');
    process.exit(1);
  }

  if (!options.skipInstall && installCommand) {
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
