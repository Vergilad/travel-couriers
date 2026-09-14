# Technical Architecture: Viactor

> Supersedes all earlier versions. Zero Supabase: no client, no env vars, no
> RLS, no realtime, no triggers. Plain Postgres 17 + FastAPI-owned auth on
> our own hardware.

```
React + TypeScript  →  (HTTP)  →  FastAPI  →  Postgres 17
Vite + TanStack                psycopg3 pool   backend-only role
Router + Query                                 (no client DB access)
```

## Frontend (worktree, the future; legacy main-repo tree retired)

- React 19 + TypeScript, Vite 8, TanStack Router + Query, Tailwind v4,
  framer-motion (shrinking: Auth/Profile/Settings/Inbox/MyRoutes dropped it).
- Icons: Tabler only. No hand-rolled SVG. No emojis.
- Session: access JWT in memory + localStorage, refresh on 401
  (`src/lib/session.ts`; FormData-aware, no forced JSON content type).
  Auth context exposes user, session, unread, `refreshSession`, `isAdmin`.
- Images compact client-side first (`src/lib/images.ts`): avatars 512px,
  verification docs 1600px JPEG. Backend caps as backstop.

### Routes (all Viactor shell unless noted)

```
/                    Landing (own chrome)
/browse              Manifest ledger + route search
/carry/new /need/new Create forms (auth)
/listings/$id        Manifest detail
/profile/$userId     Dossier
/my-listings         My Routes (matches + manage, auth). /matches forwards here
/messages            Inbox ledger + letter (auth). /messages/$threadId deep link
/settings            Profile/account/danger (auth)
/verify              Verification ticket (auth)
/auth                Auth ticket
/admin               Blind review queue (auth + admin, unlinked from navs)
/reports/new         Placeholder (submit works from profiles)
```

`VIACTOR_PATHS` in `src/components/layout/Layout.tsx` decides the shell.
Old chrome remains only where not yet migrated.

### Key files

| File | Purpose |
|------|---------|
| `src/router.tsx` | All routes + `AuthGuard` |
| `src/lib/auth.tsx` | `useAuth`: session restore, unread poll (15s), signOut |
| `src/lib/session.ts` | Token storage, refresh, `authedFetch` |
| `src/lib/images.ts` | Client-side compaction |
| `src/lib/api.ts` | Re-exports `authedFetch` |
| `src/components/landing/viactor/AccountMenu.tsx` | Shared avatar menu, both navs |
| `src/components/VerifiedBadge.tsx` | Rubber stamps (inline styles, both scopes) |
| `src/components/VerificationGate.tsx` | Review form, `bare` page mode + modal island mode |
| `src/styles/viactor.css` | Tokens. `src/styles/viactor-layout.css` controls |

## Backend (`backend/`, baked image: rebuild to deploy)

- `main.py`: CORS open, routers mounted, `/files` static mount, `/health`.
- Auth (`routers/auth.py`, `/api/auth`): signup/signin/refresh/signout/me
   (me returns `is_admin`)/password + self-serve DELETE `/account`.
   pbkdf2_sha256 (NOT bcrypt: bcrypt5
   explodes at runtime). `require_admin` gate on `user_roles`.
   signin/signup/refresh rate-limited in-process (10/10min per IP, 30 for
   refresh). Client keeps its session on network/5xx, drops it only on 401.
- `listings.py`: CRUD + browse + `matches` (single carry/need rule, date
  window overlap). `order_by` allowlisted. Static routes before `/{id}`.
- `threads.py` + `messages.py`: plain sequential queries, same shapes as
  always. Polling replaced realtime (gone with Supabase).
- `matches.py` (deal lifecycle): confirm > handover > received. Received is
  the binding event: snapshot to `completed_deals`, need closes, carry stays
  open. Multi-writes run in Python transactions (no triggers).
- `verification.py`: status, start-manual (photos to
  `data/verification/{user}/`, sha256 of ID, 8MB cap), admin blind queue
  (request-UUID keyed, photo serve, approve/reject with `reviewed_by`,
  photos deleted on decision).
- `files.py`: avatar upload (image only, 2MB, fixed per-user name) +
  `data/` volume served at `/files/...`.
- `profiles.py`, `reviews.py` (eligibility + submit against completed
  deals), `reports.py` (submit only). No payment code: the `payments`
  table sits dormant until Yookassa; handover codes carry receipt meanwhile.
- Helpers: `db.py` (pool + `to_json` + fetch helpers), `models.py`
  (pydantic + date windows), `db_constants.py`, `query_helpers.py`,
  `error_handlers.py`.

## Matching

`GET /api/listings/matches`: for each open own listing, complementary kind
(carry/need), same route (ILIKE cities), overlapping date windows
(exact ±0, week ±7, month ±30). Null dates match everything.

## Verification flow

1. User submits name + ID + selfie (`start-manual`, authed, multipart).
2. Row `pending` with name + ID hash; photos on disk only.
3. Admin opens `/admin`, sees request UUID + name + date + duplicate flag,
   never the account. Approves/rejects with optional reason.
4. Approve sets `profiles.identity_verified`; photos deleted either way.
5. Status endpoint drives badges and gates.

## Environment (`backend/.env`, untracked, dev secrets)

`DATABASE_URL`, `POSTGRES_PASSWORD`, `AUTH_JWT_SECRET` (32+ bytes),
`FRONTEND_URL`, Stripe keys (optional), no Telegram anything.
Shape documented in `backend/.env.example`. Regenerate secrets for the
real server.

## AI rules for this codebase

- Same REST contract; frontend-ready merged objects from the backend.
- Explicit queries over clever SQL. Obvious over clever everywhere.
- New page = page file + route + shell path + nav/panel entries.
- No new state libs, no utility folders, features stay co-located.
- Number-only touch targets: avatar menu is desktop-only; panels are rows.
