import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export function resolveSource(source: string, targetDir?: string): string {
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

  try {
    execSync(`git clone "${url}" "${destination}"`, { stdio: 'pipe' });
  } catch (err) {
    const output = err instanceof Error && 'stderr' in err
      ? String((err as NodeJS.ErrnoException & { stderr: Buffer }).stderr)
      : '';

    if (/not found|does not exist|Repository not found/i.test(output)) {
      throw new Error(
        `Could not find the repository at ${url}\n` +
        'Check that the URL is correct and the repo is public.',
      );
    }

    if (/Authentication failed|could not read Username/i.test(output)) {
      throw new Error(
        `Could not access ${url} — the repository may be private.\n` +
        'Make sure you are authenticated with GitHub:\n' +
        '  gh auth login',
      );
    }

    if (/Could not resolve host/i.test(output)) {
      throw new Error('Could not reach GitHub. Check your internet connection.');
    }

    throw new Error(`Git clone failed:\n${output || 'Unknown error — is git installed?'}`);
  }

  return destination;
}
