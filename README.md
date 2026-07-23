# CertShield web app

## Run

```bash
cd web
cp .env.example .env.local   # optional for demo UI
npm run dev
```

Open http://localhost:3000 → **Open app**. Demo mode works without env vars.

## CI/CD (GitHub → Supabase → Vercel)

Production ships via GitHub Actions: quality gate → `supabase db push` → Vercel prod.

Full setup (secrets, environments, manual runbooks): **[`.github/CI_CD.md`](./.github/CI_CD.md)**

```bash
npm run ci          # lint + typecheck + test + build (same as Actions)
npm run db:push     # apply migrations to linked Supabase project
```

Prod: https://getcertshield.vercel.app

## Connect real stack (founder checklist)

1. Create Supabase project (**US region**).
2. Apply migrations (`npm run db:push` once linked, or run SQL in `supabase/migrations/` in order).
3. Fill `.env.local` from `.env.example` (URL, anon, service role, `OPENROUTER_API_KEY`).
4. Enable Email magic-link in Supabase Auth → allow `http://localhost:3000/auth/callback` (+ prod callback).
5. Optional: `npx inngest-cli@latest dev` for async extract (`/api/inngest`).

Then: `/login` → magic link → first login auto-creates org → vendors → upload → internal review → Approve & publish / Save correction.

## Status

See company-os root `STATUS.md` — Weeks 1–6 + D2/D3 live; next is real ACORD golden-set expansion.
