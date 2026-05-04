# clir

Run any GitHub repo or local project locally with one command.

You point clir at a GitHub URL or a folder on your computer. It reads the project's setup instructions, installs dependencies, runs any required setup steps, starts the app, and gives you a local address to open in your browser.

```bash
clir https://github.com/some/repo
clir ./my-local-project
clir                           # run from inside a project folder
```

---

## What it does

1. Clones the repo (if you gave it a GitHub URL)
2. Checks for missing environment variables and warns you about them
3. Detects the tech stack and figures out the right install and start commands
4. If it can't figure out the setup on its own, it reads the README and uses Claude to extract the steps
5. Installs dependencies, runs setup steps (like database migrations or code generation), and starts the dev server
6. Prints the local URL so you can open it in your browser

---

## Requirements

- [Node.js](https://nodejs.org) v20 or higher
- [Git](https://git-scm.com)
- An Anthropic API key — only used when clir needs to read a README to figure out how to set up a project. You can get one at [console.anthropic.com](https://console.anthropic.com).

---

## Installation

```bash
git clone https://github.com/josephbenson/clir.git
cd clir
npm install
npm run build
npm install -g .
```

---

## API key setup

clir uses Claude (via the Anthropic API) to read project documentation when it cannot automatically detect how to set up a project. You need to provide your own API key — clir does not include one.

Get your key at [console.anthropic.com](https://console.anthropic.com), then add it to your shell profile:

**Mac / Linux (zsh):**
```bash
echo 'export ANTHROPIC_API_KEY=your-key-here' >> ~/.zshrc
source ~/.zshrc
```

**Mac / Linux (bash):**
```bash
echo 'export ANTHROPIC_API_KEY=your-key-here' >> ~/.bash_profile
source ~/.bash_profile
```

Replace `your-key-here` with your actual key. Keep this key private — do not share it or commit it to any repository.

If you use a different AI provider, clir currently only supports the Anthropic API. Contributions to add support for other providers are welcome.

---

## Usage

**Run a GitHub repo:**
```bash
clir https://github.com/some/repo
```

**Run a local project:**
```bash
clir ./path/to/project
# or navigate into the folder and just run:
clir
```

**Skip reinstalling dependencies (faster if already installed):**
```bash
clir --no-install
```

**Clone into a specific directory:**
```bash
clir https://github.com/some/repo --dir ~/projects/my-clone
```

**Diagnose issues from recent runs:**
```bash
clir diagnose
```

---

## Environment variables

When clir finds a `.env.example` file in a project, it automatically copies it to `.env.local` so the project can start. It will also warn you about any variables that are empty and need to be filled in.

Some projects require secrets (API keys, database passwords, etc.) that you will need to supply yourself before the app will work correctly.

---

## Logging

clir writes a structured log of every run to `~/.clir/logs/`. Each file covers one day. Run `clir diagnose` to get a summary of recent activity and any issues detected.

---

## Supported stacks

clir detects these automatically without needing to read the README:

| Stack | Detected by |
|---|---|
| Node.js (npm / pnpm / yarn / bun) | `package.json` |
| Go | `go.mod` |
| Prisma (code generation) | `prisma/schema.prisma` |

For anything else — Python, Ruby, Rust, etc. — clir reads the README and uses Claude to extract the setup steps.

---

## Troubleshooting

**`command not found: pnpm` (or yarn / bun)**
Your package manager is installed but not registered as a system command. Run:
```bash
corepack enable pnpm   # or yarn, or bun
```

**App starts but shows database errors**
The project needs a database that isn't running. If it includes a `docker-compose.yml`, start it with:
```bash
docker compose up -d
```

**clir cannot figure out how to set up a project**
Make sure `ANTHROPIC_API_KEY` is set in your shell. Run `clir diagnose` to see what happened.

**A variable in `.env.local` is empty**
clir will warn you at startup. Open `.env.local` in a text editor, fill in the required values, then run `clir --no-install`.
