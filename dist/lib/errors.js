import Anthropic from '@anthropic-ai/sdk';
const KNOWN_ERRORS = [
    {
        pattern: /ECONNREFUSED/,
        issue: 'Database connection refused — your database is not running.',
        fix: 'If this project uses Docker, run:\n  docker compose up -d\nThen try again.',
    },
    {
        pattern: /MissingSecret/,
        issue: 'Auth secret is not configured.',
        fix: 'Add AUTH_SECRET to your .env.local file. Generate one with:\n  openssl rand -base64 32',
    },
    {
        pattern: /Module not found.*prisma/i,
        issue: 'Prisma client has not been generated.',
        fix: 'Run:\n  pnpm prisma generate\nThen try again.',
    },
    {
        pattern: /Cannot find native binding|Cannot find module.*(?:darwin|linux|win32)|binding.*not found/i,
        issue: 'A platform-specific native module failed to load — this is a known optional dependency bug.',
        fix: 'Delete node_modules and force-reinstall:\n  rm -rf node_modules && pnpm install --force\n\n' +
            'If that still fails, your Node.js version may not match your machine architecture.\n' +
            'Check by running: node -p "process.arch"\n' +
            'If it prints x64 on an Apple Silicon Mac, reinstall Node.js natively from https://nodejs.org',
    },
    {
        pattern: /Cannot find module/,
        issue: 'A required module is missing.',
        fix: 'Try reinstalling dependencies:\n  pnpm install (or npm install)',
    },
    {
        pattern: /ENOENT.*\.env/,
        issue: 'A required environment file is missing.',
        fix: 'Copy the example env file:\n  cp .env.example .env.local\nThen fill in the required values.',
    },
];
export function matchKnownErrors(output) {
    const seen = new Set();
    return KNOWN_ERRORS.filter(e => {
        if (!e.pattern.test(output))
            return false;
        if (seen.has(e.issue))
            return false;
        seen.add(e.issue);
        return true;
    });
}
export async function analyzeWithClaude(output) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
        return null;
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: 'You help developers understand why their app failed to start. Be concise and practical. No markdown.',
        messages: [{
                role: 'user',
                content: `This app failed to start with the following output. What went wrong and what should I do?\n\n` +
                    `${output.slice(-3000)}`,
            }],
    });
    return response.content[0].type === 'text' ? response.content[0].text.trim() : null;
}
