import fs from 'fs';
import path from 'path';
const DB_PATTERNS = /DATABASE|DB_URL|POSTGRES|MYSQL|MONGO|REDIS|SUPABASE_DB/i;
const SECRET_PATTERNS = /SECRET|PRIVATE_KEY|SIGNING_KEY/i;
const API_KEY_PATTERNS = /API_KEY|ACCESS_TOKEN|CLIENT_SECRET|APP_PRIVATE_KEY/i;
export function runPreflightChecks(projectDir) {
    return checkEmptyEnvVars(projectDir);
}
function checkEmptyEnvVars(projectDir) {
    const envFilePath = ['.env.local', '.env']
        .map(f => path.join(projectDir, f))
        .find(f => fs.existsSync(f));
    if (!envFilePath)
        return [];
    const emptyVars = fs.readFileSync(envFilePath, 'utf-8')
        .split('\n')
        .filter(line => /^[A-Z_]+=\s*$/.test(line.trim()))
        .map(line => line.split('=')[0]);
    if (!emptyVars.length)
        return [];
    const hasCompose = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml']
        .some(f => fs.existsSync(path.join(projectDir, f)));
    const warnings = [];
    const dbVars = emptyVars.filter(v => DB_PATTERNS.test(v));
    const secretVars = emptyVars.filter(v => SECRET_PATTERNS.test(v) && !API_KEY_PATTERNS.test(v));
    const apiKeyVars = emptyVars.filter(v => API_KEY_PATTERNS.test(v));
    const unknownVars = emptyVars.filter(v => !DB_PATTERNS.test(v) && !SECRET_PATTERNS.test(v) && !API_KEY_PATTERNS.test(v));
    if (dbVars.length) {
        const fix = hasCompose
            ? `Set ${dbVars.join(', ')} to a connection string from a cloud provider like Neon (neon.tech) or Supabase.\n  If you prefer a local database, run: docker compose up -d`
            : `Set ${dbVars.join(', ')} to a connection string from a cloud provider like Neon (neon.tech) or Supabase.`;
        warnings.push({
            issue: `Database not configured: ${dbVars.join(', ')} is empty in ${path.basename(envFilePath)}.`,
            fix,
        });
    }
    if (secretVars.length) {
        warnings.push({
            issue: `Auth secret not set: ${secretVars.join(', ')} is empty in ${path.basename(envFilePath)}.`,
            fix: `Generate a value with:\n  openssl rand -base64 32\nThen paste it into ${path.basename(envFilePath)}.`,
        });
    }
    if (apiKeyVars.length) {
        warnings.push({
            issue: `API credentials not set: ${apiKeyVars.join(', ')} is empty in ${path.basename(envFilePath)}.`,
            fix: `Obtain these from the relevant service and add them to ${path.basename(envFilePath)}.`,
        });
    }
    if (unknownVars.length) {
        warnings.push({
            issue: `These variables are empty in ${path.basename(envFilePath)}: ${unknownVars.join(', ')}.`,
            fix: `Fill them in before the app will work correctly.`,
        });
    }
    return warnings;
}
