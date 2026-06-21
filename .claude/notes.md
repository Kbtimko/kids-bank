# Project: kids-bank

## Goal
Family savings tracker (not a real bank) — makes saving tangible for kids. Parents manage balances and allowances; kids can view their account and submit withdrawal requests.

## Current Status
App is live at kidsbank.keithtimko.com on Vercel. Database has fully migrated from Supabase to Neon. Teddy Timko's account is set up with retroactive transaction history. The account is fresh — all pre-migration Supabase data was lost and re-entered manually this session.

## Blockers
- none

## In Progress
- none

## Prioritized Backlog
<!-- Risk tiers: [auto] runner may build→test→PR unattended · [review] needs spec/plan approval · [human] you drive. See ~/projects/CLAUDE.md → Backlog Risk Tiers. Note: kids-bank is a financial app on a shared Neon prod DB — DB writes/schema changes are [human]. -->
1. `[human]` Auto-interest cron — GitHub Actions to apply interest on last day of each month _(automated financial mutation against shared prod DB — route through db-migration-guardian)_
2. `[human]` Demo seed script — `scripts/seed-demo.ts` with 24 months of history _(safer tier: a seed script can write to the shared dev/prod Neon DB; needs you to confirm it targets an isolated demo family, not real data)_
3. `[review]` Push notifications for withdrawal request approval _(net-new feature + new push infra — needs a spec)_
4. `[review]` Kid-facing mobile-optimized view _(net-new UI surface — needs design)_
5. `[human]` Notes field for why a child is saving toward a goal _(adds a column → schema change on shared Neon)_
6. `[human]` Bridge to real custodial account when child is ready _(external financial integration, real money, effectively irreversible)_
7. `[review]` Skylight Calendar integration (no public API — workaround needed) _(research/unknowns — needs investigation before any build)_

## Completed
<!-- Tags below are retrospective/illustrative — runner skips done items regardless. -->
- `[human]` ~~Neon migration~~ — all 9 tables migrated, Vercel env updated, redeployed (2026-05-12)
- `[human]` ~~Login restored~~ — root cause: Supabase deleted but Vercel still pointed to old URL (2026-05-12)
- `[human]` ~~Teddy Timko retroactive transactions~~ — 12 transactions from 3/15–5/10, balance $46.38 (2026-05-12)
- `[review]` ~~FAQ/Help page~~ at /faq (2026-04-22)
- `[auto]` ~~Interest UI simplified~~ — auto-load preview, show Apply button by default (2026-04-22)
- `[auto]` ~~Date formatting fixes~~ — all dates as M/D/YYYY (2026-04-22)
- `[human]` ~~Multi-family login/registration~~ (prior session)
- `[human]` ~~Goals, chores, streaks, badges, projections, recurring, withdrawal requests, tax summary~~ (prior session)
- `[human]` ~~Shareable read-only links per child~~ (prior session)
