import { getClient, isAuthError } from './anthropic.js';

type ParsedInstructions = {
  installCommand: string;
  setupCommands: string[];
  startCommand: string;
};

function isValidInstructions(value: unknown): value is ParsedInstructions {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.installCommand === 'string' &&
    Array.isArray(v.setupCommands) &&
    v.setupCommands.every(c => typeof c === 'string') &&
    typeof v.startCommand === 'string'
  );
}

export async function parseInstructions(docs: string): Promise<ParsedInstructions> {
  const client = getClient();

  let response;
  try {
    response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: 'You extract CLI setup commands from project documentation. Respond with JSON only, no explanation.',
    messages: [
      {
        role: 'user',
        content:
          `Extract all commands needed to set up and run this project locally from these project files.\n\n` +
          `${docs}\n\n` +
          `Respond with this exact JSON format, no other text:\n` +
          `{"installCommand":"...","setupCommands":["command1","command2"],"startCommand":"..."}\n\n` +
          `setupCommands should include things like code generation, database migrations, seeding — ` +
          `anything that runs after install but before starting the server. ` +
          `Omit commands that require secrets or external services (like docker). ` +
          `Use empty array if none.`,
      },
    ],
  });
  } catch (err) {
    if (isAuthError(err)) {
      throw new Error(
        'Your ANTHROPIC_API_KEY is invalid or has been revoked.\n' +
        'Generate a new key at https://console.anthropic.com and update your shell profile.',
      );
    }
    throw err;
  }

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Claude returned a response that could not be parsed. Try running again.');
  }

  if (!isValidInstructions(parsed)) {
    throw new Error('Claude returned an unexpected response shape. Try running again.');
  }

  return parsed;
}
