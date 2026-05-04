import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
export const LOG_DIR = path.join(os.homedir(), '.clir', 'logs');
export const SESSION_ID = crypto.randomBytes(4).toString('hex');
function logFilePath() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(LOG_DIR, `${date}.log`);
}
function write(level, event, data) {
    try {
        fs.mkdirSync(LOG_DIR, { recursive: true });
        const entry = {
            timestamp: new Date().toISOString(),
            session: SESSION_ID,
            level,
            event,
            ...(data !== undefined ? { data } : {}),
        };
        fs.appendFileSync(logFilePath(), JSON.stringify(entry) + '\n');
    }
    catch {
        // logging must never crash the tool
    }
}
export const logger = {
    sessionId: SESSION_ID,
    info: (event, data) => write('info', event, data),
    warn: (event, data) => write('warn', event, data),
    error: (event, data) => write('error', event, data),
};
