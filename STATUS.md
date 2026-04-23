# Kids Bank — Status as of 2026-04-22

## Current State
The app is feature-complete and live at kidsbank.keithtimko.com. All core and educational features are shipped (goals, chores, streaks, badges, interest, recurring transactions, withdrawal requests, tax summary, shareable links). A database migration from Supabase to Neon is pending manual provisioning steps — the code requires no changes, only a new `POSTGRES_URL`.

## Recent Work
- Added FAQ/Help page at `/faq`
- Simplified interest UI: auto-load preview, show Apply button by default
- Fixed invalid date on transactions and standardized date formatting to `M/D/YYYY`
- Previous session: shipped goals, chores, streaks, badges, projections, recurring transactions, withdrawal requests, tax summary in a single large commit
- Added multi-family support with login/registration
- Switched DB client from `@vercel/postgres` to `pg` for Supabase compatibility
- Initiated Neon migration (2026-04-22): no code changes needed, only connection string swap

## Open Blockers
- **Neon migration not yet complete** — Neon project `kids-bank` not yet created; `POSTGRES_URL` in `.env.local` and Vercel still points to Supabase

## Next Up
1. Create Neon project `kids-bank` at neon.tech; copy pooled connection string
2. Update `POSTGRES_URL` in `.env.local`; run `npm run migrate` twice to confirm idempotency
3. Test locally: log in, add transaction, confirm it persists
4. Update `POSTGRES_URL` in Vercel dashboard (Production + Preview + Development)
5. Delete Supabase `kids-bank` project
6. Fix recurring transaction due date display (ISO format bug in `app/parent/page.tsx` line 497)
7. Create `scripts/seed-demo.ts` — 24 months of history for "Todd" (goals: Lego Police Station at $80 completed, Nintendo Switch at $340 in progress)

## Key Context
- Live app: `https://kidsbank.keithtimko.com` (Vercel, auto-deploys from `main`)
- Auth: JWT via `jose` — `family_session` cookie (30d) + `parent_session` cookie (2h, parent mode)
- DB: `pg` client with `sql` tagged template literal in `lib/db.ts`; 9 tables (families, children, transactions, settings, goals, chores, recurring_transactions, withdrawal_requests, share_tokens)
- Interest is applied manually (Admin → Interest → Confirm & Apply); not yet automated
- Recurring allowance requires manual "Apply" tap — does not auto-post
- `SESSION_NOTES.md` "Running Locally" section references Supabase pooler URL — will be stale once Neon migration completes; update it then
