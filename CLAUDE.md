# kids-bank

Family savings tracker — not a real bank. Balance lives in the app; real money stays in the parent's account.

## Session start

Read `.claude/notes.md` first — it has current project state, blockers, and the prioritized backlog.

## Auth model

**Custom JWT via `jose`** — do NOT use Clerk or Supabase auth here.

- Two cookies set by `lib/auth.ts`:
  - `family_session` (30 days) — identifies the family
  - `parent_session` (2 hours) — grants admin/parent access
- All data is scoped to `family_id`
- Kids can view without a PIN; deposits and admin require parent mode
- Middleware at `middleware.ts` enforces route protection

## Database

- **In transition:** `POSTGRES_URL` in `.env.local` currently points to **Supabase** (pooler: `aws-0-us-west-2.pooler.supabase.com:6543`). Neon migration is pending manual steps (see `.claude/notes.md`).
- Until Neon cutover is confirmed, treat Supabase as the live database.
- **No formal migration system.** Schema changes run manually via `npx tsx scripts/migrate.ts`. Always run twice to confirm idempotency. Document DDL changes in git commit messages.
- Never make schema changes without checking `.claude/notes.md` for in-progress migrations first.

## Key files

| File | Purpose |
|---|---|
| `lib/db.ts` | DB client, `sql` template literal, shared types |
| `lib/auth.ts` | Session creation/verification, cookie helpers |
| `middleware.ts` | Route protection — redirects unauthenticated users |
| `scripts/migrate.ts` | Manual schema migration runner |
| `app/parent/page.tsx` | Admin: interest, allowance, children, settings |
| `app/child/[id]/page.tsx` | Child account: overview, goals, chores, history |
| `.claude/notes.md` | Current state, blockers, prioritized backlog |
| `.claude/sessions/` | Per-session journal, one file per session |
| `SESSION_NOTES.md` | Frozen archive — historical reference only |

## Committing

- Use Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`).
- Never push or deploy without an explicit ask — Vercel auto-deploys from `main`.

## Definition of Done

Before declaring any fix complete:
- Enumerate the edge cases the change must handle (missing/zero values, empty sets, excluded/filtered records, boundary & off-by-one cases) and confirm each is covered — make the enumeration visible, not implicit.
- Validate behavior against the real data source or live app, not just unit tests — a green test is not a working feature.
- Name the root cause, not just the surface patch; if the fix papers over a deeper data/pipeline gap, say so.
