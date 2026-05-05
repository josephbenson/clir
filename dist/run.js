import { resolveSource } from './lib/source.js';
import { detectStack } from './lib/detector.js';
import { readDocs } from './lib/docs.js';
import { parseInstructions } from './lib/parser.js';
import { execute } from './lib/executor.js';
import { checkEnvExample } from './lib/env.js';
import { runPreflightChecks } from './lib/checks.js';
import { logger } from './lib/logger.js';
import { printStatus, printWarning, printInfo } from './lib/ui.js';
export async function run(source, options) {
    logger.info('session_start', { source: source ?? '.', skipInstall: options.skipInstall ?? false });
    const projectDir = resolveSource(source ?? '.', options.dir);
    await checkEnvExample(projectDir);
    const warnings = runPreflightChecks(projectDir);
    for (const warning of warnings) {
        logger.warn('preflight_warning', { issue: warning.issue });
        printWarning(warning.issue, warning.fix);
    }
    const stack = detectStack(projectDir);
    let installCommand = stack?.installCommand ?? '';
    let setupCommands = stack?.setupCommands ?? [];
    let startCommand = stack?.startCommand ?? '';
    logger.info('stack_detected', { installCommand, setupCommands, startCommand, usedDetector: !!stack });
    if (!installCommand || !startCommand) {
        if (process.env.ANTHROPIC_API_KEY) {
            printStatus('Reading project docs to determine setup...');
            const docs = readDocs(projectDir);
            const parsed = await parseInstructions(docs);
            installCommand = installCommand || parsed.installCommand;
            setupCommands = setupCommands.length ? setupCommands : parsed.setupCommands;
            startCommand = startCommand || parsed.startCommand;
            logger.info('docs_parsed', { installCommand, setupCommands, startCommand });
        }
        else {
            logger.warn('stack_not_detected');
            printInfo([
                'clir could not automatically detect how to set up this project.',
                '',
                'Open the project README and paste it into ChatGPT, Claude, or Gemini:',
                '   "What commands do I need to run to install and start this project',
                '    locally? List them in order: install, setup steps, start command."',
                '',
                `Then run those commands from: ${projectDir}`,
            ]);
            process.exit(0);
        }
    }
    if (!startCommand) {
        logger.error('start_command_missing');
        console.error('Could not determine the start command. Check the project README and try manually.');
        process.exit(1);
    }
    if (!options.skipInstall && installCommand) {
        printStatus(`Installing: ${installCommand}`);
        await execute(installCommand, projectDir, false);
    }
    for (const command of setupCommands) {
        printStatus(`Setting up: ${command}`);
        await execute(command, projectDir, false);
    }
    printStatus(`Starting: ${startCommand}`);
    await execute(startCommand, projectDir, true);
}
