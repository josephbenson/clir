import fs from 'fs';
import path from 'path';

type StackInfo = {
  installCommand: string;
  setupCommands: string[];
  startCommand: string;
};

export function detectStack(projectDir: string): StackInfo | null {
  const packageJsonPath = path.join(projectDir, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    return detectNodeStack(projectDir, packageJsonPath);
  }

  if (fs.existsSync(path.join(projectDir, 'go.mod'))) {
    return { installCommand: 'go mod download', setupCommands: [], startCommand: 'go run .' };
  }

  return null;
}

function detectNodeStack(projectDir: string, packageJsonPath: string): StackInfo {
  const packageManager = resolvePackageManager(projectDir);
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
    scripts?: Record<string, string>;
  };

  const startScript = pkg.scripts?.dev ? 'dev' : pkg.scripts?.start ? 'start' : null;
  const startCommand = startScript
    ? packageManager === 'npm'
      ? `npm run ${startScript}`
      : `${packageManager} ${startScript}`
    : '';

  const setupCommands = detectSetupCommands(projectDir, packageManager, pkg.scripts ?? {});

  return {
    installCommand: `${packageManager} install`,
    setupCommands,
    startCommand,
  };
}

function detectSetupCommands(
  projectDir: string,
  packageManager: string,
  scripts: Record<string, string>,
): string[] {
  const commands: string[] = [];

  if (fs.existsSync(path.join(projectDir, 'prisma', 'schema.prisma'))) {
    commands.push(`${packageManager} prisma generate`);
  }

  if (scripts.build && !scripts.dev) {
    const buildCmd = packageManager === 'npm' ? 'npm run build' : `${packageManager} build`;
    commands.push(buildCmd);
  }

  return commands;
}

function resolvePackageManager(projectDir: string): string {
  if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(projectDir, 'bun.lockb'))) return 'bun';
  if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) return 'yarn';
  return 'npm';
}
