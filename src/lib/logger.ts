import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const LOG_DIR = path.join(os.homedir(), '.clir', 'logs');
export const SESSION_ID = crypto.randomBytes(4).toString('hex');

type LogLevel = 'info' | 'warn' | 'error';

type LogEntry = {
  timestamp: string;
  session: string;
  level: LogLevel;
  event: string;
  data?: Record<string, unknown>;
};

function logFilePath(): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `${date}.log`);
}

const LOG_RETENTION_DAYS = 30;

try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const cutoff = Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const file of fs.readdirSync(LOG_DIR)) {
    const filePath = path.join(LOG_DIR, file);
    if (fs.statSync(filePath).mtimeMs < cutoff) {
      fs.unlinkSync(filePath);
    }
  }
} catch {
  // if this fails, writes will silently no-op below
}

function write(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  try {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      session: SESSION_ID,
      level,
      event,
      ...(data !== undefined ? { data } : {}),
    };
    fs.appendFileSync(logFilePath(), JSON.stringify(entry) + '\n');
  } catch {
    // logging must never crash the tool
  }
}

export const logger = {
  sessionId: SESSION_ID,
  info: (event: string, data?: Record<string, unknown>) => write('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => write('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => write('error', event, data),
};
