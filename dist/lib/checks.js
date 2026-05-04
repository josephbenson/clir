import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
export function runPreflightChecks(projectDir) {
    return [
        ...checkEmptyEnvVars(projectDir),
        ...checkDockerRequired(projectDir),
    ];
}
function checkEmptyEnvVars(projectDir) {
    const envFile = ['.env.local', '.env']
        .map(f => path.join(projectDir, f))
        .find(f => fs.existsSync(f));
    if (!envFile)
        return [];
    const emptyVars = fs.readFileSync(envFile, 'utf-8')
        .split('\n')
        .filter(line => /^[A-Z_]+=\s*$/.test(line.trim()))
        .map(line => line.split('=')[0]);
    if (!emptyVars.length)
        return [];
    return [{
            issue: `These variables are empty in ${path.basename(envFile)}:\n  ${emptyVars.join('\n  ')}`,
            fix: `Fill them in — the app will not work correctly until they are set.`,
        }];
}
function checkDockerRequired(projectDir) {
    const hasCompose = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml']
        .some(f => fs.existsSync(path.join(projectDir, f)));
    if (!hasCompose)
        return [];
    try {
        execSync('docker info', { stdio: 'ignore' });
        return [];
    }
    catch {
        return [{
                issue: 'This project requires Docker but Docker is not running.',
                fix: 'Start Docker Desktop, then run:\n  docker compose up -d',
            }];
    }
}
