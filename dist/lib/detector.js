import fs from 'fs';
import path from 'path';
export function detectStack(projectDir) {
    const packageJsonPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        return detectNodeStack(projectDir, packageJsonPath);
    }
    if (fs.existsSync(path.join(projectDir, 'go.mod'))) {
        return { installCommand: 'go mod download', setupCommands: [], startCommand: resolveGoStartCommand(projectDir) };
    }
    return null;
}
function detectNodeStack(projectDir, packageJsonPath) {
    const packageManager = resolvePackageManager(projectDir);
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
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
function detectSetupCommands(projectDir, packageManager, scripts) {
    const commands = [];
    if (prismaGenerateNeeded(projectDir)) {
        commands.push(`${packageManager} prisma generate`);
    }
    if (scripts.build && !scripts.dev) {
        const buildCmd = packageManager === 'npm' ? 'npm run build' : `${packageManager} build`;
        commands.push(buildCmd);
    }
    return commands;
}
function resolveGoStartCommand(projectDir) {
    const cmdDir = path.join(projectDir, 'cmd');
    if (!fs.existsSync(cmdDir))
        return 'go run .';
    const entries = fs.readdirSync(cmdDir, { withFileTypes: true })
        .filter(e => e.isDirectory());
    if (entries.length === 1)
        return `go run ./cmd/${entries[0].name}`;
    const preferred = ['server', 'api', 'app', 'main', 'web'];
    const match = entries.find(e => preferred.includes(e.name.toLowerCase()));
    if (match)
        return `go run ./cmd/${match.name}`;
    return 'go run .';
}
function prismaGenerateNeeded(projectDir) {
    const schemaPath = path.join(projectDir, 'prisma', 'schema.prisma');
    if (!fs.existsSync(schemaPath))
        return false;
    const generatedDir = path.join(projectDir, 'node_modules', '.prisma', 'client');
    if (!fs.existsSync(generatedDir))
        return true;
    const schemaModified = fs.statSync(schemaPath).mtimeMs;
    const clientModified = fs.statSync(generatedDir).mtimeMs;
    return schemaModified > clientModified;
}
function resolvePackageManager(projectDir) {
    if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml')))
        return 'pnpm';
    if (fs.existsSync(path.join(projectDir, 'bun.lockb')))
        return 'bun';
    if (fs.existsSync(path.join(projectDir, 'yarn.lock')))
        return 'yarn';
    return 'npm';
}
