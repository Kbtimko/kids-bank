# Session Log: kids-bank

---
## 2026-05-12 — Session Summary
**Accomplished:** Neon migration complete. Login restored (root cause: Supabase deleted but Vercel still pointed to old URL). Teddy Timko retroactive transactions entered (12 transactions 3/15–5/10, balance $46.38).
**Decisions made:** All pre-migration Supabase data was lost (Supabase project deleted before cutover completed) — data re-entered manually. App is on Neon going forward.
**Where we left off:** App live and working on Neon. No blockers. Next: auto-interest cron via GitHub Actions.

---
## 2026-04-22 — Session Summary
**Accomplished:** FAQ/Help page at /faq. Simplified interest UI (auto-load preview, show Apply button by default). Fixed invalid date on transactions; standardized all dates to M/D/YYYY. Initiated Neon migration plan (no code changes needed, only connection string swap).
**Decisions made:** Auth is custom JWT via `jose` — NOT Clerk or Supabase auth.
**Where we left off:** Neon migration steps documented; Neon project not yet created.
