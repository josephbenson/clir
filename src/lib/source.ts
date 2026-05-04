import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function resolveSource(source: string, targetDir?: string): Promise<string> {
  if (isGitHubUrl(source)) {
    return cloneRepo(source, targetDir);
  }

  const localPath = path.resolve(source);
  if (!fs.existsSync(localPath)) {
    throw new Error(`Path does not exist: ${localPath}`);
  }
  console.log(`Using local project: ${localPath}`);
  return localPath;
}

function isGitHubUrl(source: string): boolean {
  return /^https?:\/\/github\.com\//.test(source) || source.startsWith('git@github.com:');
}

function cloneRepo(url: string, targetDir?: string): string {
  const repoName = url.split('/').pop()?.replace(/\.git$/, '') ?? 'repo';
  const destination = path.resolve(targetDir ?? repoName);

  if (fs.existsSync(destination)) {
    console.log(`Using existing directory: ${destination}`);
    return destination;
  }

  console.log(`Cloning ${url}...`);
  execSync(`git clone "${url}" "${destination}"`, { stdio: 'inherit' });
  return destination;
}
