# Self-hosted auth + DB (no Supabase) — design spec

Date: 2026-09-13. Status: approved (approach 1, email-only auth).
Skills: brainstorming (architectural path), karpathy-guidelines, using-superpowers.

## Goal

Run Peregri with zero Supabase software and zero cloud bills: plain
Postgres 17 + FastAPI-owned auth on the user's own hardware
(laptop now, own server later, identical compose file).

Success criteria:
1. `db/schema.sql` loads clean into a fresh Postgres (`psql -f`, exit 0).
2. `docker compose up` gives Postgres + backend; `/health` returns ok.
3. Signup → signin → create listing → browse → thread → message →
   confirm → handover → received → review passes end-to-end via API.
4. No `supabase` import, env var, or JS client anywhere in code.
5. Landing shoot still 10/10, zero overflow.

## Locked decisions

- No Supabase at all (software included): `infra/supabase` and
  `supabase/` are deleted. RLS is not used; the backend role is the
  only DB user, so the C1/C2 hole classes have nothing to exploit.
- Email + password only. No Google OAuth, no email confirmation
  (Resend stays a dependency for later, unwired as today).
- REST contract unchanged: same routes, same response shapes.
  Either frontend works against the new backend with only its
  session/storage calls swapped.
- Single canonical `db/schema.sql` (fresh, from CONTEXT database doc).
  Future changes: numbered files under `db/migrations/` via psql.
  No ORM, no migration framework (YAGNI).
- Avatars: `data/avatars/{user_id}/avatar.jpg` volume, public GET,
  authenticated backend-validated upload (size + type). No object DB.

## Schema (`db/schema.sql`)

Tables from the database doc, unchanged in purpose:
profiles, user_roles, listings, threads, thread_participants, messages,
match_confirmations, delivery_confirmations, completed_deals, payments,
reviews, reports, verification_requests, notification_log.
Plus: users, refresh_tokens (auth design below).

Deliberate fixes vs old schema:
1. Real FKs: `profiles.id → users.id`, `listings.owner_id → users.id`
   (ON DELETE CASCADE where history must not orphan; completed_deals
   stays denormalized and untouched by deletes).
2. No profile trigger: signup inserts users + profiles in one
   transaction (folds H2 fix #3).
3. `verification_requests` + `UNIQUE(reviews.completed_deal_id,
   reviewer_id)` included from the start (folds H2 #1, review finding).
4. No RLS, no storage schema, no `auth.*` references (C1/C2 gone by
   construction; H2 #2 replaced by the volume).
5. Confirm/received multi-writes run in one Python transaction each
   (single writer; replaces the old SQL trigger path).

## Auth design

- `users`: id uuid PK, email citext UNIQUE NOT NULL,
  password_hash (bcrypt) NOT NULL, created_at.
- `refresh_tokens`: token_sha256 PK, user_id FK, expires_at, created_at.
- `POST /api/auth/signup {email, password>=8, display_name?}` →
  201 + token pair. `POST /api/auth/signin` → pair.
  `POST /api/auth/refresh {refresh_token}` → rotated pair.
  `POST /api/auth/signout` → revoke. `GET /api/auth/me` → {id,email}.
  `PATCH /api/auth/password {old,new}` (Settings page needs it).
- Access JWT: HS256 via python-jose (already a dep), sub=user_id,
  15 min expiry, `AUTH_JWT_SECRET`. `get_current_user` keeps its
  interface (Bearer → object with `.id`/`.email`), so routers are
  untouched by auth plumbing.
- Env: `DATABASE_URL`, `AUTH_JWT_SECRET` (+ existing Stripe/Telegram/
  FRONTEND_URL). Documented in `backend/.env.example`.

## Router mapping (supabase-py → psycopg3, same shapes)

- `db.py`: single `psycopg_pool` (sync pool; routers stay `async`
  def, queries run in executor — keeps the threads.py `_run` pattern
  working, no asyncpg rewrite).
- `query_helpers`: same names; `get_record_by_id` → SELECT by id
  (404 when missing); `get_records_with_filters` → parameterized
  WHERE/ORDER. Returns dict rows (`RealDictCursor`).
- listings/threads/messages/matches/profiles/payments/webhooks/
  reviews/reports: mechanical translation (eq→`=`, ilike→`ILIKE`,
  in_→`= ANY`, single/maybe_single→fetchone, insert→INSERT
  RETURNING, or_→OR). Python-side date/matching logic untouched.
- verification: same flow, SQL pilots; C3 closed (below).
- New `routers/files.py`: avatar upload + public serve.

## Frontend (Viactor worktree — the future; legacy tree flagged)

- Delete `lib/supabase.ts`. `lib/auth.tsx`: session = access token
  (memory + localStorage) + refresh on 401; no realtime → unread
  count polls every 15 s via TanStack Query.
- `Auth.tsx`: email forms hit new endpoints; Google button removed.
- `Settings.tsx`: avatar → files endpoint; password → auth endpoint;
  profile read/update unchanged (same contract).
- `Inbox.tsx`, `VerificationGate.tsx`, `lib/api.ts`: token source
  swap only.

## Security fixes folded in

- C1/C2: gone (no client DB access exists).
- C3: webhook fails closed without secret, callback chat.id must
  equal admin chat, `setup-webhook` endpoint deleted (one-time curl
  in `.env.example`).
- Secrets never committed (backend/.env stays untracked, verified).

## Cleanup

- Delete `infra/supabase`, `supabase/`.
- Add root `.gitattributes` (`* text=auto`); renormalize at commit time.
- Leave `docs/`, `scripts/`, photos, `review.md`, `.delta/` alone.

## Verification plan (karpathy loop)

1. Revert-state check → build + shoot 10/10 (done 2026-09-13).
2. Schema loads clean → `psql -f db/schema.sql` exit 0.
3. Backend boots against compose Postgres → `/health` ok.
4. API flow script (signup→review) → all 200s, snapshot row exists.
5. Frontend worktree build + landing shoot 10/10.
6. `grep -ri supabase` over backend+worktree src (minus history docs)
   → zero code hits.

## Non-goals

Google OAuth, email confirmation, password reset email, realtime
sockets, S3-compatible storage, data migration from cloud (no prod
data), ORM, test suite (none exists; flow script is the gate).
