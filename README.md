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
2. Copies `.env.example` to `.env.local` if the project includes one
3. Checks for missing environment variables and warns you about what to fill in
4. Detects the tech stack and figures out the right install and start commands
5. If it cannot figure out the setup on its own, it reads the README and uses Claude to extract the steps
6. Installs dependencies and runs any setup steps (like generating a database client or running migrations)
7. Starts the dev server and prints the local URL so you can open it in your browser

---

## Requirements

- [Node.js](https://nodejs.org) v20 or higher
- [Git](https://git-scm.com)
- An Anthropic API key — only needed when clir has to read a README to figure out how to set up a project. Get one at [console.anthropic.com](https://console.anthropic.com).

---

## Installation

```bash
npm install -g @joeyba/clir
```

Or build from source:

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

**Skip reinstalling dependencies (faster on repeat runs):**
```bash
clir --skip-install
```

**Clone into a specific folder:**
```bash
clir https://github.com/some/repo --dir ~/projects/my-clone
```

**Diagnose issues from recent runs:**
```bash
clir diagnose
```

---

## Environment variables

Many projects require configuration values — database connection strings, API keys, auth secrets — before they will work. These are stored in a file called `.env.local`.

When clir finds a `.env.example` file in a project, it automatically copies it to `.env.local` so the project can start. It will then check for any empty values and tell you exactly what to fill in and where to get it.

For example:
- **Database variables** — clir will tell you to get a connection string from a provider like [Neon](https://neon.tech) or [Supabase](https://supabase.com)
- **Auth secrets** — clir will give you the exact command to generate one
- **API keys** — clir will tell you which service to get them from

Once you have filled in the values, run `clir --skip-install` to restart without reinstalling everything.

---

## Error detection

If the app fails to start, clir reads the error output and tells you what went wrong in plain language, along with steps to fix it. It handles common problems automatically, including:

- Database connection errors
- Missing auth secrets
- Missing or ungenerated Prisma client
- Native module compatibility issues
- Missing environment files

For anything it does not recognise, it sends the error to Claude for analysis (requires an Anthropic API key).

---

## Logging and diagnostics

clir keeps a structured log of every run in `~/.clir/logs/`. Run `clir diagnose` at any time to get a plain-English summary of recent activity and any problems detected.

---

## Supported stacks

clir detects these automatically without needing to read the README:

| Stack | Detected by |
|---|---|
| Node.js (npm / pnpm / yarn / bun) | `package.json` |
| Python (uv / poetry / pipenv / pip) | `uv.lock`, `poetry.lock`, `Pipfile`, `pyproject.toml`, `requirements.txt` |
| Go | `go.mod` |
| Prisma (client generation) | `prisma/schema.prisma` |

For anything else, clir reads the README and uses Claude to extract the setup steps.

---

## Troubleshooting

**`command not found: pnpm` (or yarn / bun)**
Your package manager is installed but not registered as a system command. Run:
```bash
corepack enable pnpm   # or yarn, or bun
```

**App starts but shows database errors**
Open `.env.local` in a text editor and fill in the database connection string. You can get a free one from [Neon](https://neon.tech) or [Supabase](https://supabase.com). If the project includes a `docker-compose.yml` with a local database, start it with:
```bash
docker compose up -d
```

**clir cannot figure out how to set up a project**
Make sure `ANTHROPIC_API_KEY` is set in your shell. Run `clir diagnose` to see what happened.

**A variable in `.env.local` is empty**
clir will warn you at startup and tell you what each variable is for. Fill in the values, then run `clir --skip-install` to restart.

**The app shows a Prisma error**
clir automatically generates the Prisma client before starting the app, but if something went wrong you can run it manually:
```bash
npx prisma generate
```
