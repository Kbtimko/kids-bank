# Kids Bank — Session Notes

Last updated: 2026-04-22

---

## What This App Is

Kids Bank is a family savings tracker web app — not a real bank. The balance lives in the app; real money stays in the parent's account. It's a tool to make saving tangible for kids before they're ready for a custodial account. Built with Next.js, Vercel, Supabase, and Claude Code.

**Live app:** `https://kidsbank.keithtimko.com`
**GitHub:** `https://github.com/Kbtimko/kids-bank`
**Vercel project:** kbtimko-5183s-projects

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 App Router (TypeScript) |
| Hosting | Vercel (GitHub auto-deploy from `main`) |
| Database | Supabase PostgreSQL (connection pooler: `aws-0-us-west-2.pooler.supabase.com:6543`) |
| Auth | JWT via `jose` — two cookies: `family_session` (30d) + `parent_session` (2h) |
| DB client | `pg` package with custom `sql` tagged template literal in `lib/db.ts` |

---

## Family & Auth Model

- Families register with **email + PIN**
- PIN is used for both family login AND parent mode unlock
- Two-tier auth:
  - `family_session` — 30 days, identifies the family
  - `parent_session` — 2 hours, grants admin/parent access
- All child/transaction data is scoped to `family_id`
- Kids can view their account without a PIN; only deposits/admin requires parent mode

---

## Database Tables

| Table | Purpose |
|---|---|
| `families` | email, name, pin_hash |
| `children` | name, avatar_emoji, display_color, family_id |
| `transactions` | amount, type, description, date, category, is_need, notes, goal_id, child_id |
| `settings` | key/value with nullable family_id (NULL = global, set = per-family) |
| `goals` | name, target_amount, emoji, is_completed, child_id |
| `chores` | description, reward_amount, completed_at, child_id |
| `recurring_transactions` | type, amount, description, frequency, next_due_date, is_active, child_id |
| `withdrawal_requests` | amount, reason, is_need, status, parent_note, child_id |
| `share_tokens` | token, child_id |

**Settings:** global settings use `NULL` family_id (e.g. `fed_rate_cache`). Per-family settings include `interest_multiplier`, `interest_floor_percent`. Uses `UNIQUE NULLS NOT DISTINCT` (PostgreSQL 15).

---

## Key Files

| File | What it does |
|---|---|
| `lib/db.ts` | DB client, `sql` template literal, shared types |
| `lib/auth.ts` | Session creation/verification, cookie helpers |
| `middleware.ts` | Route protection — redirects unauthenticated users to `/login` |
| `scripts/migrate.ts` | Run to set up/update DB schema |
| `scripts/seed.ts` | Seeds global settings only (no family data) |
| `scripts/seed-demo.ts` | (planned) Demo family with 24 months of history for Todd |
| `app/login/page.tsx` | Family login page |
| `app/register/page.tsx` | Family registration page |
| `app/parent/page.tsx` | Parent admin: interest, add child, settings, PIN, allowance, tax |
| `app/child/[id]/page.tsx` | Child account: overview, goals, chores, history tabs |
| `app/faq/page.tsx` | Help & FAQ page (publicly accessible) |
| `components/ParentAuthContext.tsx` | Auth state, lock/unlock/logout |
| `components/ParentUnlockBanner.tsx` | Top nav with lock icon, Admin link, Help link, Sign out |

---

## Features Implemented

### Core
- Multi-family registration and login
- Add children with emoji/color avatars
- Deposit and withdrawal transactions
- Transaction history with delete

### Educational Features
1. **Savings goals** — progress bars, goal-linked deposits, mark complete
2. **Chores log** — with optional auto-deposit on completion
3. **Streak tracking** — consecutive months with deposits
4. **Milestone badges** — first deposit, $50/$100/$500/$1000, first interest, 3/6-month streaks
5. **Interest visualization** — compound interest projection for 1/3/5/10 years
6. **Interest explanation modal** — how compound interest works
7. **Spending categories** — tag transactions with category
8. **Want vs. need labels** — on transactions and withdrawal requests
9. **Recurring transactions** — weekly/biweekly/monthly allowance (manual apply)
10. **Withdrawal request flow** — kids submit, parents approve/deny with note
11. **Transaction notes** — freeform note field on transactions
12. **Tax year summary** — annual totals by month with CSV export
13. **Shareable read-only links** — per-child public view via token

### Other
- FAQ / Help page at `/faq`
- Custom domain: `kidsbank.keithtimko.com` (A record → `76.76.21.21` in Squarespace DNS)

---

## How Interest Works

- Default rate: `max(fedRate × multiplier, floor)` — currently `max(4.33% × 2, 5%) = 8.66%` annual
- Applied manually: Admin → Interest → Confirm & Apply
- Fed rate cached in `settings` table, refresh button available
- Interest not yet automatic (manual click required each month)
- **Planned:** GitHub Actions cron to auto-apply on last day of month

---

## Recurring Allowance (Important UX Note)

Allowance does **not** apply automatically. The parent must:
1. Go to Admin → Allowance
2. Tap **Apply** next to any overdue recurring transactions

The app shows overdue entries clearly. Automating this via GitHub Actions cron is a planned improvement.

---

## Known Issues / To-Do

- [ ] **Timestamps:** Recurring transaction due dates showing ISO format (`2026-03-29T00:00:00.000Z`) instead of `M/D/YYYY` — fix in `app/parent/page.tsx` line 497
- [ ] **Invalid date** on some transactions in child page — date parsing bug in `app/child/[id]/page.tsx`
- [ ] **Interest apply button** not obvious — UI improvement planned (show default rate + confirm button upfront)
- [ ] **Demo seed script** — create `scripts/seed-demo.ts` with 24 months of history for "Todd" (goals: Lego Police Station completed at $80, Nintendo Switch in progress at $340)
- [ ] **Auto-interest cron** — GitHub Actions workflow to apply interest on last day of each month
- [ ] **Skylight Calendar integration** — no public API available; workaround discussed (manual sync or quick-complete chore links)
- [ ] Push notifications for spending request approval
- [ ] Kid-facing mobile-optimized view
- [ ] Notes field for why a child is saving toward a goal
- [ ] Bridge to real custodial account when child is ready

---

## Running Locally

```bash
npm install
# Set POSTGRES_URL in .env.local (use Supabase pooler URL)
npm run dev
```

**Migrate DB:**
```bash
npx tsx scripts/migrate.ts
```

**Deploy:** Push to `main` — Vercel auto-deploys.

---

## 2026-04-22 — Neon migration (pending manual steps)

All code already uses the `pg` client with `POSTGRES_URL` — zero code changes needed. Only the connection string and Vercel env var need to change.

### Pending manual steps

- [ ] Create Neon project `kids-bank` at [neon.tech](https://neon.tech)
- [ ] Copy the **pooled** connection string from the Neon dashboard
- [ ] Update `POSTGRES_URL` in `.env.local` to the new Neon string
- [ ] Run `npm run migrate` (= `npx tsx scripts/migrate.ts`) — recreates all 9 tables
- [ ] Run `npm run migrate` a second time to confirm it's a no-op (idempotency check)
- [ ] Test locally: log in, add a transaction, confirm it appears
- [ ] Update `POSTGRES_URL` in Vercel dashboard (Settings → Environment Variables → Production + Preview + Development)
- [ ] Delete the Supabase `kids-bank` project

### Stack note

The `SESSION_NOTES.md` "Stack" section and "Running Locally" section still reference Supabase — update those lines once the Neon cutover is complete.

---

## Blog Post

A personal blog post draft was written this session covering:
- Motivation: son started doing chores → wanted allowance tracking tool
- Built with Claude Code as an AI experiment
- Clarification: not a real bank, money stays in parent's account
- Son's first question: "How does the money come out?"
- Son checks balance at Target to see if he can afford Legos
- Sections with screenshot placeholders throughout
- Ends with open source invite and GitHub link
