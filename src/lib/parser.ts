import Anthropic from '@anthropic-ai/sdk';

type ParsedInstructions = {
  installCommand: string;
  setupCommands: string[];
  startCommand: string;
};

export async function parseInstructions(docs: string): Promise<ParsedInstructions> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Set it to let clir read complex project instructions.\n' +
      'Export it in your shell or add it to a .env file in the project directory.',
    );
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
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

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    return JSON.parse(json) as ParsedInstructions;
  } catch {
    throw new Error('Could not parse setup instructions from project docs.');
  }
}
