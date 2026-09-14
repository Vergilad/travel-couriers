# Session handoff: 2026-09-14, logout fix + ship must-fix backend batch

Continues `docs/session-handoff-2026-09-14-handover-code.md`. User asked two
things: why restarts kick them out, and what blocks shipping. Answer to the
first was a real bug, fixed here with the approved "all must-fix backend"
scope. Nothing committed.

## 1. Logout on restart: root cause + fix

No cookies anywhere: session is `localStorage["viactor.session"]`
(15-min JWT + 30-day refresh). Secret and refresh rows survive restarts, so
restarts alone invalidated nothing. The frontend deleted good sessions:

- `session.ts refreshTokens()` cleared storage on ANY failure, including
  backend-unreachable during the restart window.
- `auth.tsx reload()` (every app mount) cleared on any `/me` failure.
- Bonus race: single-use refresh rotation + parallel polls (5s inbox, 15s
  unread) fired concurrent refreshes; losers 401d and also wiped storage.

Fix (worktree frontend): refresh keeps the session on network/5xx and clears
only on 401; single-flight shared refresh promise; `reload()` clears only on
401, keeps on null/other errors. Separator note: `127.0.0.1` vs `localhost`
are different origins with separate storage.

Proven: headless probe signed up, STOPPED the backend container, loaded
/browse with the session injected: `viactor.session` intact afterwards
(old code wiped it). Backend restarted after, probe user self-deleted.
Only noise: expected vite-proxy 502 console entries while backend is down.

## 2. Backend hardening (main repo, image rebuilt)

- `backend/rate_limit.py` (new): in-process sliding window, 10/10min per IP
  per scope (30 for refresh, tokens are unguessable). Wired into
  signup/signin/refresh in `routers/auth.py`. Single-worker scope noted in
  the module docstring. Probed: 10x401 then 429,429.
- `backend/main.py`: CORS allowlist from `CORS_ORIGINS` env (default empty =
  same-origin only). Old `["*"]` + credentials is gone. Probed: foreign
  Origin preflight gets `400 Disallowed CORS origin`. `.env.example`
  documents the var.
- `backend/error_handlers.py`: new `public_error()` (server-side log, generic
  client line); decorator + all inline `str(e)` sites in matches (6),
  messages (3), threads (3), reports, reviews converted. Reviews 409 branch
  kept. Probed: `Failed to fetch thread. Try again.`, no SQL text.
- `DELETE /api/auth/account` (`routers/auth.py`): one txn deletes
  completed_deals (both sides), delivery rows, listings (cascades threads),
  the user row (cascades rest), plus best-effort `data/avatars/{id}` and
  `data/verification/{id}` removal. Tradeoff: the other party's copy of a
  shared deal goes too (forgotten, not archived). Settings danger button
  wired to it (`Settings.tsx`), stub error gone; success flows through the
  existing signOut. Probed: delete 200, `/me` 401 after, 0 rows left in DB.
- `frontend build` green (tsc + vite). Touched files dash clean.

## Still open (not in approved scope)

Backups (pgdata + data/), password reset email, reports admin queue,
ToS/Privacy pages, error boundary, captcha, prod serving (dist + /api +
/files + HTTPS), fresh prod secrets. Session probe scripts live in temp
scratch (wiped EOD).
