const MAX_CONTENT_WIDTH = 72;

function visLen(str: string): number {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function drawBox(label: string, lines: string[], color: string): void {
  const maxLine = lines.reduce((m, l) => Math.max(m, visLen(l)), 0);
  const contentWidth = Math.min(
    Math.max(maxLine, label.length + 2),
    MAX_CONTENT_WIDTH,
  );

  // ┌─ {label} {fill}┐  total visible = contentWidth + 6
  const topFill = '─'.repeat(Math.max(1, contentWidth - label.length + 1));
  const top = `${color}┌─ ${label} ${topFill}┐\x1b[0m`;
  const bottom = `${color}└${'─'.repeat(contentWidth + 4)}┘\x1b[0m`;
  const v = `${color}│\x1b[0m`;

  console.log('');
  console.log(top);
  for (const line of lines) {
    const pad = ' '.repeat(Math.max(0, contentWidth - visLen(line)));
    console.log(`${v}  ${line}${pad}  ${v}`);
  }
  console.log(bottom);
  console.log('');
}

export function printStatus(message: string): void {
  console.log(`\n\x1b[2m  clir\x1b[0m  ${message}`);
}

export function printInfo(lines: string[]): void {
  drawBox('clir', lines, '\x1b[2m');
}

export function printWarning(issue: string, fix: string): void {
  drawBox('clir', [
    `⚠  ${issue}`,
    '',
    ...fix.split('\n').map(l => `   ${l}`),
  ], '\x1b[33m');
}

export function printError(issue: string, fix: string): void {
  drawBox('clir', [
    `✗  ${issue}`,
    '',
    ...fix.split('\n').map(l => `   ${l}`),
  ], '\x1b[31m');
}

export function printUrl(url: string): void {
  drawBox('clir', [`\x1b[1m✓  Open in browser: ${url}\x1b[0m`], '\x1b[32m');
}
