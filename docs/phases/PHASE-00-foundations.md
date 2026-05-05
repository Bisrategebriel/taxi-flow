# Phase 0 — Foundations & Tooling

> **Status:** Ready to execute
> **Estimated time:** 2–3 hours (most of it waiting on installs and Vercel)
> **Branch:** `phase-00-foundations`

---

## 0.1 Goal

Take an empty machine to a working dev environment with:
- Tooling installed (pnpm, Supabase CLI, GitHub CLI)
- Next.js 14 + TypeScript + Tailwind scaffolded
- Folder structure per `PLAN.md` §3.1
- Fluent UI v9 installed and rendering one smoke component
- Local Supabase running
- GitHub repo created, CI green
- Vercel project linked, first deploy live
- `PLAN.md` and SRS committed under `docs/`

**No features. No business logic. Just the skeleton.**

---

## 0.2 Pre-flight check

Run these in your terminal and confirm before continuing:

```bash
node -v          # must be v20.x or higher
git --version    # any recent
docker -v        # any recent, Docker Desktop must be running
```

If Node is below 20: install via [nvm](https://github.com/nvm-sh/nvm) or [the Node website](https://nodejs.org).
If Docker isn't running: open Docker Desktop and wait for the whale icon to be steady.

You also need accounts on:
- [GitHub](https://github.com) (free)
- [Vercel](https://vercel.com) (free, sign in with GitHub)
- [Supabase](https://supabase.com) (free — we'll create the production project in Phase 10, but make the account now so it's ready)
- [Stripe](https://stripe.com) (free, test mode is enough — needed in Phase 7)
- [Google AI Studio](https://aistudio.google.com) for Gemini API key (needed in Phase 5)
- [OpenRouteService](https://openrouteservice.org) (needed in Phase 4)

You don't need API keys yet — just the accounts.

---

## 0.3 Install Claude Code (if you haven't)

Claude Code is the agentic coding tool we'll use for every phase. Install once:

```bash
npm install -g @anthropic-ai/claude-code
```

After install, run `claude` in any terminal to start. The first run will prompt you to authenticate.

> Reference: [Claude Code docs](https://docs.claude.com/en/docs/claude-code/overview)

---

## 0.4 Step-by-step tasks

These tasks are split into **manual setup** (you run them yourself) and **Claude Code prompts** (what you paste into Claude Code). Do them in order.

---

### Task 1 — Install pnpm, Supabase CLI, GitHub CLI

Run these yourself. Pick the section for your OS.

**macOS (Homebrew):**
```bash
brew install pnpm supabase/tap/supabase gh
```

**Windows (scoop):**
```bash
scoop install pnpm supabase gh
```

If you don't have scoop: install pnpm with `iwr https://get.pnpm.io/install.ps1 -useb | iex`, install Supabase CLI from [github.com/supabase/cli/releases](https://github.com/supabase/cli/releases), install GitHub CLI from [cli.github.com](https://cli.github.com).

**Linux:**
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
# Supabase CLI: download binary from https://github.com/supabase/cli/releases
# GitHub CLI: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
```

**Verify all three:**
```bash
pnpm -v       # expect 9.x or higher
supabase -v   # expect 1.x or higher
gh --version  # any recent
```

**Authenticate GitHub CLI:**
```bash
gh auth login
# Choose: GitHub.com → HTTPS → Authenticate with browser
```

---

### Task 2 — Create the project folder

Pick where TaxiFlow will live. I'll assume `~/projects/taxiflow` — adjust if you want it elsewhere.

```bash
mkdir -p ~/projects/taxiflow
cd ~/projects/taxiflow
```

**From this point forward, every command runs from inside `~/projects/taxiflow` unless I say otherwise.**

---

### Task 3 — Move PLAN.md and the SRS into the project

Before we scaffold, drop the planning docs in. Claude Code reads these and uses them as context.

```bash
mkdir -p docs/phases
```

Now:
- Move the `PLAN.md` I gave you into the project root: `~/projects/taxiflow/PLAN.md`
- Move `TaxiFlow_SRS_v1_3.docx` into `~/projects/taxiflow/docs/`
- Save this very file (the one you're reading) to `~/projects/taxiflow/docs/phases/PHASE-00-foundations.md`

When you're done, your folder should look like:
```
taxiflow/
├── PLAN.md
└── docs/
    ├── TaxiFlow_SRS_v1_3.docx
    └── phases/
        └── PHASE-00-foundations.md
```

---

### Task 4 — Start Claude Code in the project folder

```bash
cd ~/projects/taxiflow
claude
```

Claude Code is now your engineer. Everything from Task 5 onward, you paste into Claude Code as a prompt and review what it produces.

---

### Task 5 — The Phase 0 Claude Code prompt

Copy everything inside the fence below and paste it into Claude Code as a single prompt:

```
Read PLAN.md and docs/phases/PHASE-00-foundations.md in full before doing anything. We are executing Phase 0.

Goal: scaffold a Next.js 14 App Router project with TypeScript, Tailwind, and Fluent UI v9; set up local Supabase; create the folder structure per PLAN.md §3.1; configure GitHub Actions CI; commit everything.

Tasks in order:

1. Initialize Next.js with the official template:
   pnpm create next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*" --use-pnpm --turbopack=false --no-git
   When prompted to install in the current directory, accept.

2. Install runtime dependencies:
   pnpm add @fluentui/react-components @fluentui/react-icons @supabase/supabase-js @supabase/ssr

3. Install dev dependencies:
   pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/node prettier prettier-plugin-tailwindcss

4. Create the full folder structure per PLAN.md §3.1. For now, every leaf folder gets a `.gitkeep` file so git tracks it. Do not create any TypeScript files inside these folders yet — just the structure.

5. Create a smoke-test page at app/page.tsx that:
   - Wraps content in <FluentProvider theme={webLightTheme}>
   - Renders a Fluent <Button appearance="primary">TaxiFlow Phase 0</Button> and a Tailwind-styled heading
   - This proves Fluent + Tailwind both work
   - Add 'use client' at the top since FluentProvider needs client components

6. Create lib/supabase/client.ts and lib/supabase/server.ts as empty placeholder files with a single comment '// FR-AU-04 - Supabase clients (implemented in Phase 1)' — we'll fill them in Phase 1. Do NOT implement them yet.

7. Configure Vitest. Create vitest.config.ts with jsdom environment and a tests/ folder with one passing smoke test that imports React and asserts true.

8. Add scripts to package.json:
   "test": "vitest run"
   "test:watch": "vitest"
   "type-check": "tsc --noEmit"
   "format": "prettier --write ."
   "format:check": "prettier --check ."

9. Create .prettierrc.json with: { "plugins": ["prettier-plugin-tailwindcss"], "semi": true, "singleQuote": true, "trailingComma": "all" }

10. Create .env.example at repo root with placeholder lines for every env var listed in PLAN.md §3.4 and SRS §14.3. Use empty values like NEXT_PUBLIC_SUPABASE_URL=. Add a comment above each one indicating server-only vs public.

11. Initialize Supabase locally:
    supabase init
    This creates supabase/config.toml and supabase/seed.sql. Do NOT run `supabase start` — I'll run it manually in Task 6.

12. Create .github/workflows/ci.yml that runs on pull_request and push to main, with these jobs in parallel:
    - lint: pnpm lint
    - type-check: pnpm type-check
    - test: pnpm test
    - build: pnpm build (requires placeholder NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars set to dummy values for the build step — set them in the workflow env)
    All jobs use Node 20 and pnpm 9 with pnpm/action-setup. Use actions/checkout@v4 and actions/setup-node@v4.

13. Update .gitignore to include: .env.local, .env*.local, supabase/.branches, supabase/.temp, .vercel

14. Update README.md with: project name, one-paragraph description, prerequisites, dev setup commands (clone, pnpm install, pnpm dev), and a link to PLAN.md.

15. Run these to verify everything works:
    pnpm install
    pnpm lint
    pnpm type-check
    pnpm test
    pnpm build
    All five must pass. If any fail, fix them before declaring Phase 0 task list complete.

16. Stage everything but DO NOT commit yet. I will review and commit manually.

Constraints:
- Do not create any feature code beyond what's listed above.
- Do not modify PLAN.md or any docs/ files.
- If a step is ambiguous, stop and ask me.
- Show me what you're about to do before running destructive commands.
```

**Review every diff Claude Code shows you.** Approve or push back. Don't blanket-accept.

---

### Task 6 — Verify locally and start Supabase

After Claude Code finishes Task 5's checklist, run these yourself in a fresh terminal (still inside the project folder):

```bash
# 1. Confirm the build is clean
pnpm install
pnpm lint
pnpm type-check
pnpm test
pnpm build

# 2. Start the dev server and visit http://localhost:3000
pnpm dev
```

You should see the Fluent button and Tailwind heading on `localhost:3000`. Stop the dev server (`Ctrl+C`) when verified.

**Now start local Supabase:**
```bash
supabase start
```

First run pulls Docker images — give it 2–5 minutes. When it finishes, you'll see output like:
```
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
anon key: eyJhbG...
service_role key: eyJhbG...
```

**Save the anon key and service_role key** — paste them into a fresh `.env.local` file at the repo root:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste anon key here>
SUPABASE_SERVICE_ROLE_KEY=<paste service role key here>
```

Verify Supabase Studio loads at http://127.0.0.1:54323. You should see an empty Postgres database. Don't add tables yet — that's Phase 1.

Confirm `supabase status` shows everything green.

---

### Task 7 — Create the GitHub repo and push

```bash
git init
git add .
git commit -m "phase-0: initial scaffold, Fluent + Tailwind + local Supabase"

gh repo create taxiflow --private --source=. --remote=origin --push
```

`--private` keeps the repo private. Change to `--public` if you want.

After the push, verify:
- The repo exists at `github.com/<your-username>/taxiflow`
- The Actions tab shows the CI workflow running
- All four jobs (lint, type-check, test, build) pass green

If any job fails, click into it, read the error, and fix locally. Push the fix and wait for green. **Do not proceed until CI is green.**

---

### Task 8 — Branch protection on main

In GitHub, go to repo → Settings → Branches → Add branch protection rule:

- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Required checks: `lint`, `type-check`, `test`, `build`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings

Save.

From now on you cannot push directly to `main`. Every phase opens a PR.

---

### Task 9 — Link Vercel and deploy

Go to [vercel.com/new](https://vercel.com/new), import `taxiflow` from your GitHub. Vercel auto-detects Next.js.

In the import screen:
- **Framework Preset:** Next.js (auto)
- **Root Directory:** `./`
- **Environment Variables:** add the same three from `.env.local` BUT with placeholder values for now — Vercel can't reach your local Supabase. Use:
  ```
  NEXT_PUBLIC_SUPABASE_URL=http://placeholder.invalid
  NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
  SUPABASE_SERVICE_ROLE_KEY=placeholder
  ```
  We'll swap these for the production Supabase project in Phase 10. The placeholders are fine because Phase 0 doesn't query Supabase — the build just needs the env vars to exist.

Click **Deploy**. Wait for the build to finish.

Visit the Vercel preview URL. The Fluent button + Tailwind heading should render. If the deploy fails, read the build logs and fix.

---

### Task 10 — Create the PR workflow for future phases

This phase you committed straight to `main` because the repo was empty and there was nothing to PR against. **From Phase 1 onward, every phase opens a PR.** The flow will be:

```bash
git checkout -b phase-NN-name        # at start of phase
# ... work happens ...
git add . && git commit -m "phase-NN: <summary>"
git push -u origin phase-NN-name
gh pr create --fill                  # opens PR
# CI runs. When green:
gh pr merge --squash --delete-branch # or merge in GitHub UI
git checkout main && git pull
```

Memorize this sequence. You'll repeat it 10 times.

---

## 0.5 Acceptance script

Run all of these. Every one must succeed before Phase 0 is done.

```bash
# 1. Local build & test
pnpm install
pnpm lint
pnpm type-check
pnpm test
pnpm build
# All must exit 0

# 2. Dev server
pnpm dev
# Visit http://localhost:3000 → see Fluent button + Tailwind heading
# Stop with Ctrl+C

# 3. Local Supabase
supabase status
# All services must be green

# 4. Studio loads
# Visit http://127.0.0.1:54323 → empty Postgres database visible

# 5. CI green
gh run list --limit 1
# Most recent run shows "completed success"

# 6. Vercel deploy live
# Visit your Vercel URL → see Fluent button + Tailwind heading
```

**All six pass = Phase 0 complete.**

---

## 0.6 Common failure modes

**`pnpm create next-app` hangs.** Kill it (`Ctrl+C`), delete any partial files, run again with `pnpm create next-app@latest .` (without all the flags) and answer the prompts manually.

**Fluent components throw `useId` or hydration errors.** You forgot `'use client'` at the top of `app/page.tsx`. FluentProvider must run on the client.

**`supabase start` fails with port conflicts.** Something else is on ports 54321–54324. Stop it (or run `supabase stop` if a previous Supabase is hanging), then retry.

**`supabase start` hangs pulling images.** Docker Desktop isn't running, or your network is slow. Open Docker Desktop, wait for it to be ready, retry.

**CI build job fails on Vercel/GitHub but works locally.** 99% of the time it's a missing env var. Check `.env.example` matches what's set in CI workflow `env:` block and Vercel env settings.

**`gh repo create` says "already exists".** You created it via the GitHub UI earlier. Delete it on GitHub or pick a different name.

**Branch protection blocks your first push to main.** That's expected — except for the very first commit. If you already pushed once, work on a branch from now on.

---

## 0.7 What's NOT in Phase 0

These belong to later phases. If you find yourself doing them now, stop:

- ❌ Database tables (Phase 1)
- ❌ RLS policies (Phase 1)
- ❌ Auth pages (Phase 1)
- ❌ Fluent token theming (Phase 2)
- ❌ Landing page content (Phase 2)
- ❌ Bottom nav (Phase 3)
- ❌ Maps (Phase 4)
- ❌ Anything from any FR-XX requirement

If Claude Code starts implementing features, stop it and remind it Phase 0 is scaffold-only.

---

## 0.8 When you're done

Reply to me with:
1. A confirmation that all six acceptance checks passed.
2. The Vercel deploy URL.
3. Any deviations from this plan you had to make and why.

I'll then write `PHASE-01-database-and-auth.md`.
