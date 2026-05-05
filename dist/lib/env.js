import fs from 'fs';
import path from 'path';
import { printInfo } from './ui.js';
const TEMPLATE_FILENAMES = ['.env.example', '.env.sample', '.env.template'];
const ENV_FILENAMES = ['.env', '.env.local'];
export async function checkEnvExample(projectDir) {
    const templatePath = TEMPLATE_FILENAMES
        .map(f => path.join(projectDir, f))
        .find(f => fs.existsSync(f));
    if (!templatePath)
        return;
    const envExists = ENV_FILENAMES
        .map(f => path.join(projectDir, f))
        .some(f => fs.existsSync(f));
    if (envExists)
        return;
    const templateName = path.basename(templatePath);
    const targetPath = path.join(projectDir, '.env.local');
    fs.copyFileSync(templatePath, targetPath);
    printInfo([
        `Copied ${templateName} → .env.local`,
        'Fill in any required secrets in .env.local before the app will run.',
    ]);
}
