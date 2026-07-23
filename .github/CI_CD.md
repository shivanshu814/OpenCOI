# CertShield CI/CD — GitHub Actions + Supabase + Vercel

**App repo root:** this `web/` directory (GitHub: `shivanshu814/Certshield`).

## Pipeline

```
PR / push ──► CI (lint · tsc · test · build)
                    │
push main ──────────┼──► Deploy Production
                    │       1. quality gate
                    │       2. supabase db push   (always; no-op if synced)
                    │       3. vercel build --prod → deploy --prebuilt --prod
                    │
migration-only ─────┴──► DB Migrate workflow (path filter)
```

| Workflow | Trigger | What it does |
| -------- | ------- | ------------ |
| `ci.yml` | PR + push `main` | Quality gate only |
| `db-migrate.yml` | `main` when `supabase/migrations/**` changes, or manual | `supabase db push` |
| `deploy.yml` | push `main` + manual | Quality → migrate → Vercel prod |

Prod URL: https://getcertshield.vercel.app  
Supabase project: `certshield-prod` (`zbpeqqqpaugtppphscem`, East US).

Do **not** also enable Vercel Git “Production Branch” auto-deploy, or every push will deploy twice. Preview deploys via Vercel Git are optional; this Actions pipeline owns production.

**Important:** never mark `NEXT_PUBLIC_*` as Sensitive on Vercel. Sensitive publics pull as empty during CLI builds and break Edge middleware (`MIDDLEWARE_INVOCATION_FAILED` / Invalid supabaseUrl). Deploy uses remote `vercel deploy --prod` so dashboard env is applied correctly.


---

## One-time secrets setup

### 1. GitHub → Settings → Secrets and variables → Actions

Create these **repository** secrets (or on the `production` environment):

| Secret | Where to get it |
| ------ | --------------- |
| `VERCEL_TOKEN` | https://vercel.com/account/tokens → Create |
| `VERCEL_ORG_ID` | `team_UOULDDo4WR46P8Gi13sEss9K` (from `.vercel/project.json`) |
| `VERCEL_PROJECT_ID` | `prj_65CfexW4M1nFcYWh4LV8omW2HqjP` |
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → **Direct connection** URI (`postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres`) |

Optional (local CLI / dashboard only — not required by Actions migrate):

| Secret | Notes |
| ------ | ----- |
| `SUPABASE_ACCESS_TOKEN` | Dashboard → Account → Access Tokens (`sbp_…`) — only if you use `supabase link` |
| `SUPABASE_DB_PASSWORD` | DB password alone |
| `SUPABASE_PROJECT_ID` | `zbpeqqqpaugtppphscem` |

CLI helper:

```bash
# From web/
gh secret set VERCEL_ORG_ID -b 'team_UOULDDo4WR46P8Gi13sEss9K'
gh secret set VERCEL_PROJECT_ID -b 'prj_65CfexW4M1nFcYWh4LV8omW2HqjP'

# Paste when prompted:
gh secret set VERCEL_TOKEN
gh secret set SUPABASE_DB_URL   # full direct Postgres URI from .env.local DIRECT_URL
```

### 2. GitHub Environment `Production`

Workflows reference `environment: Production` (already exists on this repo).  
Optional: require manual approval before deploy under Environment protection rules.

### 3. Vercel project env

Keep all runtime secrets in the Vercel dashboard (Production + Preview) — Actions only needs deploy tokens. Do not put `SUPABASE_SERVICE_ROLE_KEY` / `OPENROUTER_API_KEY` in GitHub unless a job truly needs them.

---

## Local commands (same as CI)

```bash
cd web
npm ci
npm run lint
npm run typecheck
npm test
npm run build

# DB (linked project)
npm run db:push   # → supabase db push --yes
```

---

## Manual / emergency

```bash
# Deploy without waiting for Actions
vercel --prod --yes

# Migrate only
supabase db push --yes

# Re-run Actions
gh workflow run "Deploy Production"
gh workflow run "DB Migrate"
```

---

## Branch protection (recommended)

On `main`: require status check **CI / Lint · Typecheck · Test · Build** before merge.
