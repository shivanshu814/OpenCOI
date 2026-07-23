# CertShield web app (Week 1 thin path)

## Run

```bash
cd web
cp .env.example .env.local   # optional for demo UI
npm run dev
```

Open http://localhost:3000 → **Open app**. Demo mode works without env vars.

## Connect real stack (founder checklist)

1. Create Supabase project (**US region**).
2. Run SQL in order:
   - `supabase/migrations/001_week1_core.sql`
   - `supabase/migrations/002_storage_golden_org_bootstrap.sql` (creates `cois` bucket + RLS, `create_org` RPC, `golden_set_cases`)
3. Fill `.env.local` from `.env.example` (URL, anon, service role, `OPENROUTER_API_KEY`).
4. Enable Email magic-link in Supabase Auth → URL config allow `http://localhost:3000/auth/callback`.
5. Optional: `npx inngest-cli@latest dev` for async extract (`/api/inngest`). Without Inngest, upload runs Claude sync via OpenRouter if `OPENROUTER_API_KEY` is set.

Then: `/login` → magic link → first login auto-creates org → vendors → upload → internal review → Approve & publish / Save correction.

## What shipped (docs/01 §9 Week 1)

- Schema + RLS + append-only `audit_events` + golden-set stub
- Appendix A Zod schema + requirements engine v1
- Claude extract + Inngest `document/uploaded` → `in_internal_review`
- Data layer with demo fallback; live: vendor CRUD, Storage upload, review publish/correct
- Auth: magic-link login + org bootstrap

## Not yet (Week 2+)

Email-in, chase EN/ES, report PDF, Paddle, customer-accept flow, SMS, vendor portal.
