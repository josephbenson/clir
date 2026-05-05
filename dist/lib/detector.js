import fs from 'fs';
import path from 'path';
export function detectStack(projectDir) {
    if (fs.existsSync(path.join(projectDir, 'package.json'))) {
        return detectNodeStack(projectDir);
    }
    const pythonPm = resolvePythonPackageManager(projectDir);
    if (pythonPm) {
        return detectPythonStack(projectDir, pythonPm);
    }
    if (fs.existsSync(path.join(projectDir, 'go.mod'))) {
        return { installCommand: 'go mod download', setupCommands: [], startCommand: resolveGoStartCommand(projectDir) };
    }
    return null;
}
// ─── Node ────────────────────────────────────────────────────────────────────
function detectNodeStack(projectDir) {
    const packageJsonPath = path.join(projectDir, 'package.json');
    const packageManager = resolveNodePackageManager(projectDir);
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const startScript = pkg.scripts?.dev ? 'dev' : pkg.scripts?.start ? 'start' : null;
    const startCommand = startScript
        ? packageManager === 'npm'
            ? `npm run ${startScript}`
            : `${packageManager} ${startScript}`
        : '';
    const setupCommands = detectNodeSetupCommands(projectDir, packageManager, pkg.scripts ?? {});
    return { installCommand: `${packageManager} install`, setupCommands, startCommand };
}
function detectNodeSetupCommands(projectDir, packageManager, scripts) {
    const commands = [];
    if (prismaGenerateNeeded(projectDir)) {
        commands.push(`${packageManager} prisma generate`);
    }
    if (scripts.build && !scripts.dev) {
        commands.push(packageManager === 'npm' ? 'npm run build' : `${packageManager} build`);
    }
    return commands;
}
function resolveNodePackageManager(projectDir) {
    if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml')))
        return 'pnpm';
    if (fs.existsSync(path.join(projectDir, 'bun.lockb')))
        return 'bun';
    if (fs.existsSync(path.join(projectDir, 'yarn.lock')))
        return 'yarn';
    return 'npm';
}
function prismaGenerateNeeded(projectDir) {
    const schemaPath = path.join(projectDir, 'prisma', 'schema.prisma');
    if (!fs.existsSync(schemaPath))
        return false;
    const generatedDir = path.join(projectDir, 'node_modules', '.prisma', 'client');
    if (!fs.existsSync(generatedDir))
        return true;
    return fs.statSync(schemaPath).mtimeMs > fs.statSync(generatedDir).mtimeMs;
}
// ─── Python ──────────────────────────────────────────────────────────────────
function resolvePythonPackageManager(projectDir) {
    if (fs.existsSync(path.join(projectDir, 'uv.lock')))
        return 'uv';
    if (fs.existsSync(path.join(projectDir, 'poetry.lock')))
        return 'poetry';
    if (fs.existsSync(path.join(projectDir, 'Pipfile')))
        return 'pipenv';
    const pyprojectPath = path.join(projectDir, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
        const content = fs.readFileSync(pyprojectPath, 'utf-8');
        if (content.includes('[tool.poetry]'))
            return 'poetry';
        if (content.includes('[tool.uv]'))
            return 'uv';
        return 'pip';
    }
    if (fs.existsSync(path.join(projectDir, 'requirements.txt')))
        return 'pip';
    return null;
}
function detectPythonStack(projectDir, pm) {
    return {
        installCommand: pythonInstallCommand(projectDir, pm),
        setupCommands: [],
        startCommand: detectPythonStartCommand(projectDir, pm),
    };
}
function pythonInstallCommand(projectDir, pm) {
    if (pm === 'uv')
        return 'uv sync';
    if (pm === 'poetry')
        return 'poetry install';
    if (pm === 'pipenv')
        return 'pipenv install';
    return fs.existsSync(path.join(projectDir, 'requirements.txt'))
        ? 'pip install -r requirements.txt'
        : 'pip install -e .';
}
function pythonRunner(pm) {
    if (pm === 'uv')
        return 'uv run ';
    if (pm === 'poetry')
        return 'poetry run ';
    if (pm === 'pipenv')
        return 'pipenv run ';
    return '';
}
function detectPythonStartCommand(projectDir, pm) {
    const runner = pythonRunner(pm);
    if (fs.existsSync(path.join(projectDir, 'manage.py'))) {
        return `${runner}python manage.py runserver`;
    }
    const deps = readPythonDeps(projectDir);
    const entryFile = ['app.py', 'main.py', 'server.py', 'run.py', 'api.py', 'wsgi.py', 'asgi.py']
        .find(f => fs.existsSync(path.join(projectDir, f)));
    if (deps.includes('streamlit') && entryFile) {
        return `${runner}streamlit run ${entryFile}`;
    }
    if (deps.includes('fastapi') && entryFile) {
        const module = entryFile.replace('.py', '');
        return `${runner}uvicorn ${module}:app --reload`;
    }
    if (deps.includes('flask')) {
        return entryFile ? `${runner}flask --app ${entryFile} run` : `${runner}flask run`;
    }
    if (entryFile) {
        return `${runner}python ${entryFile}`;
    }
    return '';
}
function readPythonDeps(projectDir) {
    const reqPath = path.join(projectDir, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
        return fs.readFileSync(reqPath, 'utf-8')
            .split('\n')
            .map(line => line.split(/[>=<!\[;\s]/)[0].trim().toLowerCase())
            .filter(Boolean);
    }
    const pyprojectPath = path.join(projectDir, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
        const content = fs.readFileSync(pyprojectPath, 'utf-8');
        return [...content.matchAll(/["']([a-zA-Z0-9][a-zA-Z0-9_-]*)(?:[>=<\[!"'])/g)]
            .map(m => m[1].toLowerCase());
    }
    return [];
}
// ─── Go ──────────────────────────────────────────────────────────────────────
function resolveGoStartCommand(projectDir) {
    const cmdDir = path.join(projectDir, 'cmd');
    if (!fs.existsSync(cmdDir))
        return 'go run .';
    const entries = fs.readdirSync(cmdDir, { withFileTypes: true }).filter(e => e.isDirectory());
    if (entries.length === 1)
        return `go run ./cmd/${entries[0].name}`;
    const preferred = ['server', 'api', 'app', 'main', 'web'];
    const match = entries.find(e => preferred.includes(e.name.toLowerCase()));
    return match ? `go run ./cmd/${match.name}` : 'go run .';
}
