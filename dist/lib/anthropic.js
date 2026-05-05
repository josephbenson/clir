import Anthropic from '@anthropic-ai/sdk';
let client = null;
export function getClient() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not set.\n' +
            'Add it to your shell profile:\n' +
            '  echo \'export ANTHROPIC_API_KEY=your-key-here\' >> ~/.zshrc && source ~/.zshrc\n' +
            'Get a key at https://console.anthropic.com');
    }
    if (!client) {
        client = new Anthropic({ apiKey });
    }
    return client;
}
