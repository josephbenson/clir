import fs from 'fs';
import path from 'path';

const DOC_FILENAMES = [
  'README.md',
  'readme.md',
  'README.rst',
  'AGENTS.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
];

export function readDocs(projectDir: string): string {
  const parts: string[] = [];

  for (const filename of DOC_FILENAMES) {
    const filePath = path.join(projectDir, filename);
    if (fs.existsSync(filePath)) {
      parts.push(`=== ${filename} ===\n${fs.readFileSync(filePath, 'utf-8')}`);
    }
  }

  const packageJsonPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    parts.push(`=== package.json ===\n${fs.readFileSync(packageJsonPath, 'utf-8')}`);
  }

  return parts.join('\n\n');
}
