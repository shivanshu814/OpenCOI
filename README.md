# CertShield — web app

**AI COI (Certificate of Insurance) tracking & vendor-compliance SaaS** for US property managers and small/mid general contractors.

|                           |                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Prod**                  | https://getcertshield.vercel.app                                                                                           |
| **GitHub**                | https://github.com/shivanshu814/Certshield (`main`)                                                                        |
| **Company OS / strategy** | Parent folder — [`../STATUS.md`](../STATUS.md), [`../docs/`](../docs/), [`../company/`](../company/)                       |
| **Plans**                 | Starter **$99** · Pro **$249** · Business **$499** / mo via **Paddle** (MoR)                                               |
| **Build status**          | Spec Weeks **1–6 + D2/D3 ~95% code-complete**. Live handoff: always read **[`../STATUS.md`](../STATUS.md)** before coding. |

One-liner (docs/01): _Never work with an uninsured vendor again._

---

## What this product does

```
Vendors send ACORD 25 PDFs
        ↓
Intake (upload · email-in · vendor magic-link portal)
        ↓
AI extracts (Appendix A) + confidence scores
        ↓
Rules engine → PASS / FAIL / needs attention (endorsements CG 20 10 / 20 37, limits, dates…)
        ↓
Human review if <90% confidence or FAIL — never auto-approve
        ↓
Customer is final approver (Appendix B)
        ↓
Auto-chase EN + ES · SMS (TCPA) · agent confirm · audit trail + PDF reports
```

Diagram (static): [`public/diagrams/how-it-works.png`](./public/diagrams/how-it-works.png) · canonical source [`../assets/product/`](../assets/README.md)

**Honesty (non-negotiable):**

- Not legal / insurance / professional advice — disclaimer on every verdict & report.
- Never promise “guaranteed compliance”.
- Never claim automatic mid-term cancellation detection (mitigation = agent confirm + notice-of-cancellation + re-verify).
- Until Month 3 ≥98% golden-set gate: **100% internal review before publish**.

---

## Stack (fixed — do not substitute)

| Layer   | Choice                                                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| App     | Next.js **App Router** · React 19 · **TypeScript strict** · Tailwind 4 · **shadcn/ui**                                           |
| Host    | **Vercel**                                                                                                                       |
| Data    | **Supabase** (Postgres + **RLS** + Auth + Storage) — **US region only**                                                          |
| Jobs    | **Inngest** (extract, digests, owner reports; local can extract inline)                                                          |
| AI      | **Claude via OpenRouter** (`OPENROUTER_API_KEY`) — vision → strict JSON, temp 0; log cost / latency / confidence / model version |
| Email   | **Resend** outbound · **Postmark** inbound                                                                                       |
| SMS     | **Twilio** (TCPA opt-in; A2P 10DLC before hard sell)                                                                             |
| Billing | **Paddle**                                                                                                                       |
| E-sign  | **Documenso**                                                                                                                    |
| Errors  | **Sentry** (no-op without DSN)                                                                                                   |

---

## Quick start (local)

```bash
cd web
cp .env.example .env.local   # fill keys — see below
npm install
npm run dev
```

Open http://localhost:3000

| Mode                 | Behavior                                                                       |
| -------------------- | ------------------------------------------------------------------------------ |
| **No / partial env** | Marketing + demo UI still load; many app actions need Supabase                 |
| **Full env**         | Magic-link login → org → vendors → upload → extract → review → publish → chase |

```bash
npm run ci              # lint + typecheck + tests + build (same as Actions)
npm run db:push         # apply supabase/migrations to linked project
npm run load-test:1k
```

Optional async worker locally:

```bash
# .env.local: INNGEST_FORCE_QUEUE=1
npx inngest-cli@latest dev
```

---

## What’s built (product map)

Aligned with [`../docs/01-PRODUCT_SPEC.md`](../docs/01-PRODUCT_SPEC.md) §9 Weeks 1–6 + D2/D3.

### Customer app (`/app/*`)

| Area         | Routes / capability                                                                |
| ------------ | ---------------------------------------------------------------------------------- |
| Dashboard    | Traffic-light compliance overview                                                  |
| Vendors      | CRUD, CSV import, SMS opt-in, portal link, onboarding docs (W-9 / licenses), chase |
| Upload       | PDF intake + **sample COI picker** (`public/samples/`)                             |
| Review queue | Extract, correct, approve & publish / save golden-set correction                   |
| Properties   | Per-property requirement overrides (D1)                                            |
| Projects     | GC project mode (D2) + closeout packs                                              |
| Reports      | Compliance PDF + owner reports                                                     |
| Audit        | Append-only trail UI                                                               |
| Settings     | Team roles/invites, billing (Paddle), integrations (API keys / webhooks)           |
| Onboarding   | Wizard for new orgs                                                                |
| Admin        | Metrics + golden-set honesty cards (fixture harness ≠ M3 accuracy)                 |

### Vendor / external (no password)

| Surface            | Path               |
| ------------------ | ------------------ |
| Magic-link portal  | `/portal/[token]`  |
| Agent confirmation | `/confirm/[token]` |
| E-sign demo hook   | `/sign/demo`       |

### Marketing & legal

| Page                            | Path                  |
| ------------------------------- | --------------------- |
| Landing (long, market-informed) | `/`                   |
| Pricing                         | `/pricing`            |
| Help / Security                 | `/help` · `/security` |
| Terms / Privacy                 | `/terms` · `/privacy` |
| Login                           | `/login` (magic link) |

### Core pipelines (lib + API)

- Extraction → Appendix A schema · requirements engine · endorsement checks (B4)
- Verdict state machine Appendix B · customer accept
- Chase cadence EN/ES · Resend · optional Twilio SMS
- Carrier ratings · fraud signals · compliance scores · weekly digest (Inngest)
- Free-audit **10/day** UTC cap for unpaid; paid uncapped (`lib/billing/limits.ts`)
- Invite accept → auto-join org (`claim_pending_invites` migration 015)
- Public API keys + webhooks · litigation / project packs

### Not built yet (do not fake as live)

- **AppFolio / Buildium native sync** (pricing already says coming soon)
- QuickBooks · multi-entity · agent marketplace · 1099 pack · SAML  
  → build when **customers ask** / roadmap month (docs/01 §9, docs/11)

Several features are **code-complete but credential-gated** (Twilio, Documenso, Resend domain, Paddle price IDs, OpenRouter). See FOUNDER checklist in [`../STATUS.md`](../STATUS.md).

---

## Repo layout

```
web/
├── src/app/           # App Router pages + API routes
├── src/components/    # UI, marketing, shells, shadcn
├── src/lib/           # domain: extract, requirements, chase, billing, golden…
├── src/inngest/       # background functions
├── supabase/migrations/   # 001–015 (prod applied)
├── public/
│   ├── diagrams/      # how-it-works.svg|.png
│   ├── samples/       # sample ACORD-style PDFs
│   └── logo.svg
├── scripts/           # sample COI gen, 1k-vendor load test
└── .github/CI_CD.md   # Actions → Supabase → Vercel runbook
```

Parent Company OS (not deployed with this app):

```
../docs/00–11     strategy + product truth
../company/       sales / marketing / ops packs (ready to run)
../assets/        canonical diagrams
../STATUS.md      live build handoff — update every coding session
```

---

## Environment variables

Copy from [`.env.example`](./.env.example). Minimum for real happy path:

| Var                                        | Required for           |
| ------------------------------------------ | ---------------------- |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`    | Auth + client          |
| `SUPABASE_SERVICE_ROLE_KEY`                | Server writes          |
| `NEXT_PUBLIC_APP_URL`                      | Callbacks, links       |
| `OPENROUTER_API_KEY`                       | Live AI extraction     |
| `RESEND_API_KEY` + verified domain         | Chase / reports email  |
| Postmark inbound vars                      | Email-in intake        |
| Paddle client + price IDs + webhook secret | Checkout               |
| `TWILIO_*`                                 | SMS chase              |
| `DOCUMENSO_*`                              | E-sign                 |
| `TIN_ENCRYPTION_KEY`                       | W-9 TIN at rest        |
| `NEXT_PUBLIC_SENTRY_DSN`                   | Optional error capture |

Supabase Auth: enable email magic link; allow  
`http://localhost:3000/auth/callback` and prod `{APP_URL}/auth/callback`.

---

## Database & RLS

- Migrations: `supabase/migrations/` (**001–015** applied on prod).
- Every tenant table: **org-scoped RLS**. Never widen invites table for “list all” — invite join uses SECURITY DEFINER RPC.
- `audit_events` is **append-only**.

```bash
npx supabase link   # once
npm run db:push
```

---

## CI/CD

Production path: **GitHub Actions** → quality gate (`npm run ci`) → `supabase db push` → **Vercel prod deploy**.

Full secrets / environments / runbooks: **[`.github/CI_CD.md`](./.github/CI_CD.md)**

**Do not push `main` casually** — push deploys production. Founder go-ahead required when working from Company OS sessions.

---

## Happy path (smoke)

1. `/login` → magic link → first login creates org (or claim pending invite).
2. Add vendor (or CSV) → Upload COI (or pick a sample PDF).
3. Wait for extract / click **Run extraction now**.
4. `/app/review/[id]` → correct if needed → **Approve & publish**.
5. Send chase / issue portal link / download compliance PDF.
6. Confirm disclaimer footer on report surfaces.

---

## Tests & quality

```bash
npm test          # domain unit tests (requirements, chase, billing limits, golden, …)
npm run typecheck
npm run lint      # some pre-existing warnings OK; no new errors
npm run ci        # full gate
```

Golden-set: fixture harness = scorer self-check only. **≥98% on real ACORD corrections** = Month 3 SCALE gate — do not fake it.

---

## Brand & copy

- Name **CertShield** is locked.
- Marketing copy from [`../docs/02-BRANDING_SEO.md`](../docs/02-BRANDING_SEO.md).
- UI: mint brand + Poppins / product shell (do not randomly retheme).
- Features map to problems **P1–P17** (docs/01).

---

## For AI coding agents

1. Read **[`../STATUS.md`](../STATUS.md)** first; update it when you finish.
2. Binding product rules: docs/01 **§0**, **§9**, **Appendix A**, **Appendix B**.
3. Answers consistency: [`../docs/10-FAQ.md`](../docs/10-FAQ.md).
4. Do **not** re-scaffold, swap the stack, or start AppFolio/marketplace until STATUS / customers say so.
5. Parent [`../PROMPT.md`](../PROMPT.md) + [`../CLAUDE.md`](../CLAUDE.md) for company-wide rules.

---

## Related links

| Need                             | Go to                                                              |
| -------------------------------- | ------------------------------------------------------------------ |
| Where the build is now           | [`../STATUS.md`](../STATUS.md)                                     |
| Full feature spec                | [`../docs/01-PRODUCT_SPEC.md`](../docs/01-PRODUCT_SPEC.md)         |
| 12-month calendar                | [`../docs/11-ROADMAP_TIMELINE.md`](../docs/11-ROADMAP_TIMELINE.md) |
| Sales scripts / demo             | [`../company/sales/`](../company/sales/)                           |
| How-it-works diagram (canonical) | [`../assets/README.md`](../assets/README.md)                       |
