# Session handoff: 2026-09-14 (Viactor pages + verification system + admin)

Read this plus `docs/session-handoff-2026-09-13.md` and
`docs/superpowers/specs/2026-09-13-selfhosted-auth-db-design.md` to resume.
(NOTE: user mentioned a "compacted first conversation" file sent earlier in
this convo. No such file exists in the repo and none arrived as an
attachment. The 2026-09-13 handoff is treated as that prior context.)

## Standing rules (stay in force)

- **Skills always.** Standby set: `brainstorming`, `karpathy-guidelines`,
  `using-superpowers`, `design-taste-frontend`, `ui-ux-pro-max`, `awwwards`.
  User pastes skill text to mean "apply this". Pasted skill text sometimes
  arrives corrupted with user sentences embedded inside it. Parse the skill
  normally and treat the embedded sentences as the actual request.
- `docs/` outranks `CONTEXT/` (CONTEXT is stale: Supabase era, trip kinds).
- No commits/PRs unless asked. **Nothing this session is committed.**
- Copy: zero em/en-dashes anywhere touched; plain human strings; EN+RU parity.
- Discuss every change; verify by execution; show on localhost.
- Product: Peregri = backend/DB concepts only. Frontend = Viactor.

## Environment

- Main repo: `C:\Users\Admin\travel-couriers` (backend, db, compose).
- Worktree (ALL frontend work):
  `C:\Users\Admin\travel-couriers\.delta\worktrees\jxtftjq7g77d\travel-couriers\frontend`
- Dev frontend: http://127.0.0.1:5000 (vite, `npm run dev`).
  MUST restart after any `vite.config.ts` change (config loads at boot).
- Backend: http://127.0.0.1:8000. **Code is BAKED into the docker image**
  (`build: ./backend`, only `data/` mounted). Backend edits need
  `docker compose --env-file backend/.env up -d --build backend`.
  A plain `restart` does nothing for code changes.
- DB: Postgres 17, `backend/.env` holds `POSTGRES_PASSWORD` (never print it).
- Temp scratch: `C:\Users\Admin\AppData\Local\Temp\opencode\` (emptied EOD).
- Test users (all `@test.dev` / `password123` unless noted):
  cara, ned, authtest1, authtest2, avtest. pledsterr@gmail.com = admin
  (user id `86ee28de-39c1-488f-a15f-bf97307f7201`). All throwaway flow
  users were deleted same-day.

## What was built this session (frontend = worktree, backend = main repo)

### 1. Auth ticket (`src/pages/Auth.tsx`) + shell paths
- Rewrote old dark-terminal Auth as narrow Viactor ticket: gate caption,
  headline, sub, seg signin/join, route-inputs, primary submit, perforation,
  stub with mode switch + back-to-browse. Same API contract.
- `/auth` added to `VIACTOR_PATHS` (`src/components/layout/Layout.tsx`).
- New CSS in `viactor-layout.css`: `.perforation` (dashed 2px + square
  notches), `.stamp` (rotated double-rule, animates unless reduced motion),
  `.ticket` (560px, collapses <768px).
- New `auth.*` locale keys EN+RU (gate, headlines, subs, labels, submits,
  switch questions, `verified_stamp` reserved for verify page).
- REMOVED from Auth per user: VERIFIED stamp flash on signin. Stamp moment
  belongs to verification, not signin.
- **Bug fixed:** after signup/signin user landed signed-out until refresh.
  `saveSession` wrote storage but context stayed null. Exposed provider's
  `reload()` as `refreshSession` in `src/lib/auth.tsx`; Auth calls it before
  navigating. Proven live (signup 201, signin 200, me 200, wrong pass 401).

### 2. Account menu + landing nav auth state
- New shared `src/components/landing/viactor/AccountMenu.tsx`: 32px square
  avatar (photo or initial) at the very right of the bar; menu = Profile,
  Messages (with orange unread badge), My listings/My routes, Settings,
  Sign out. Desktop only; closes on outside click / Escape / route change.
  Display name is OUT of the bar (20-char names obliterated it).
- `ViactorNav` (landing) never called `useAuth`: always showed signin/Join.
  Now shows AccountMenu when signed in (desktop + mobile panel rows).
- App shell desktop: signout button deleted (lives in menu); account slot
  moved last (after +Carry/+Need). Mobile panels use menu vocabulary.
- Later: desktop Messages link deleted (redundant with menu; badge lives in
  menu). Mobile panel keeps its Messages row (no avatar menu on touch).

### 3. Profile dossier (`src/pages/Profile.tsx`, 989 lines rewritten)
- Manifest: identity field (96px stamped avatar, name, stamp, home city,
  `4.5/5 · N REVIEWS`, bio), active listings, reviews. Same queries.
- Rating pentagon graph deleted; rate input is a seg 1-5. Report panel kept,
  restyled (destructive-outline submit, AA both modes).
- `VerifiedBadge/UnverifiedBadge` restyled to rubber stamps (teal solid
  VERIFIED -4deg, red outline ! UNVERIFIED +3deg, inline styles so they work
  in old chrome too; added `md` size). Stamp sits under the username.
  Member-since line deleted per user (city kept).
- History section DELETED from profile + `GET /api/profiles/{id}/history`
  deleted from `backend/routers/profiles.py` (display-only decision; the
  `completed_deals` table stays because reviews anchor to it).
- Avatar fallback tiles use fixed `--face` / `--face-ink` tokens (identical
  both modes): faces never change colour with the theme. Applied to menu,
  profile, review faces.
- `/profile` added to `VIACTOR_PATHS`. New `.dossier-row` CSS.

### 4. Settings manifest (`src/pages/Settings.tsx`, 644 lines rewritten)
- Was tabbed old-chrome; now stacked manifest, then user asked for the menu
  back: header seg switches Profile / Account / Danger (one visible).
- Avatar picker with upload flow intact (compress, POST, PATCH, refresh).
- **Upload bug fixed (two real causes):** (a) raw fetch used a 15-min token
  with no refresh; now `authedFetch`, which was fixed to drop the forced
  JSON content-type for FormData. (b) dev server never proxied `/files`, so
  avatars 404d on localhost; added to `vite.config.ts` (needs dev restart).
- Compaction: shared `src/lib/images.ts` (`compressAvatar` 512px/q0.8,
  `compressDocument` 1600px/q0.85, JPEG). Backend caps 2MB avatars / 8MB
  docs. **DB never holds bytes, only URL strings.**
- Fixed silent bug: email label used missing `settings.email` key (rendered
  raw); now `profile.email`. Delete flow is inline two-tap (no modal).
- `/settings` in shell paths.

### 5. Verification remake + backend verification overhaul
- `VerificationGate.tsx`: `bare` inline mode for `/verify` (modal preserved
  for inbox, wrapped as Viactor island via own theme scope), `authedFetch`
  submit, full RU wiring (it hardcoded English incl. a truncated sentence),
  fixed em-dashes in `human_review` + `documents_sent` (EN+RU).
- `Verification.tsx`: narrow ticket; checking skeletons; verified state
  shows the big VERIFIED stamp + message + GO TO MESSAGES. `/verify` in
  shell paths.
- **Telegram fully deleted.** Manual review is in-app now.
- `db/migrations/0002_admin_review.sql` (+ `schema.sql` sync): adds
  `reviewed_by`, `id_photo_sha256` to `verification_requests`.
- `verification.py` rewritten: photos stored under
  `data/verification/{user}/` until decision, then deleted; blind queue
  (`GET /requests` returns request UUID + submitted name + date + dup count
  only); photo serve + approve/reject keyed by request ID, admin-only;
  `reviewed_by` recorded. Submit contract unchanged for the gate.
- `require_admin` dep (`routers/auth.py`, backed by `user_roles`);
  `GET /api/auth/me` now returns `is_admin`; pledsterr granted admin via
  psql (`INSERT INTO user_roles ... 'admin'`).
- `.env.example` Telegram block replaced with grant instructions.
- **Bug found by testing:** public profile endpoint never selected
  `identity_verified`, so every profile read unverified forever. Added
  `ProfileFields.IDENTITY_VERIFIED` to the public field list.
- Proven live: submit 200, blind queue shape asserted key-by-key, approve
  200, status flips, photos 404 after decision, non-admin 403s, unconfigured
  submit 503s honestly. Test traces removed; queue empty.

### 6. My Routes merge (user-approved simplification)
- `/my-listings` now renders `MyRoutes.tsx`: your listings FIRST (open
  first, inline two-tap close/delete, no tabs/modals), matches grouped
  underneath. Same two endpoints, zero backend changes.
- `/matches` forwards to `/my-listings`. Deleted `MyListings.tsx`,
  `Matches.tsx`. Menu + both panels relabeled MY ROUTES (`myroutes.*` keys).
  `/my-listings` + `/matches` added to shell paths (probe caught the page
  rendering in old chrome without it).
- Fixed inherited bug: old Matches always passed `hasListings={false}`.

### 7. Inbox remake + backend messaging cleanup
- `Inbox.tsx` (771 lines) rewritten: ledger + open letter in one manifest
  field, fixed-height panel, deal strip per stage, square delivery ticks,
  teal own-bubbles, route-input composer, orange unread stamps. Same
  endpoints + polling (15s list, 5s open thread) + mark-read + unverified
  modal. framer-motion gone from the page. `/messages` in shell paths.
- Fixed: stale trip/request/delivery kind colors, hardcoded English time
  strings (now RU keys), raw `INBOX.NOT_VERIFIED_WARNING` (now
  `messages.not_verified_warning`, dash fixed EN+RU).
- `threads.py` (275 lines) de-fanned: dropped asyncio executor pattern,
  sequential queries, N+1 dedup loop became one JOIN. Shapes identical.
- `matches.py` REAL BUG: listing-completed UPDATE sat one indent outside its
  transaction (closed cursor): every NEED completion 400d at the last
  step. Now inside. Proven live: carry completes open, need completes
  completed. `messages.py` untouched (already clean).
- Proven in headless Chrome signed in, probe data cleaned.

## REVERTED this session (do not reintroduce blindly)

User asked for then cancelled: reports admin queue (backend endpoints
removed again, `reports.py` back to submit-only), admin 404 guard (back to
browse redirect), custom 404 (original restored), reports/admin-tab locale
keys removed. The reports-tab work also produced a marathon phantom parse
error hunt in `Admin.tsx` (fully balanced file, both parsers failed at one
line; resolved by reverting to the known-green verify-only version).
`Admin.tsx` is verify-queue-only and green. Reports queue can be redone
cleanly later if wanted.

## Incidents / lessons

- Black-screen episode: `write`-tool truncation raced the dev server's
  transform cache (empty module for VerifiedBadge). Killed :5000, fresh
  `npm run dev`. Prefer `edit` over `write` for existing files.
- `tsc -p tsconfig.app.json` direct invocation misresolves `@/` paths;
  always verify with `npm run build`.
- PowerShell 5.1: no `&&`, `||`, `tail`, `head`. Temp `.py` filenames can
  shadow stdlib (`bisect.py` broke `urllib`): prefix temp scripts.
- Dev server died once with the temp-dir wipe; relaunch if :5000 closed.

## Verified end state (all green at handoff)

- `npm run build` green (tsc + vite). Ordinal dash check clean on touched
  files (remaining hits are pre-existing locale lines, untouched).
- Backend healthy (`/health` ok), rebuilt with all changes. DB: migration
  0002 applied, pledsterr sole admin, no pending verifications, no leftover
  test users/threads/photos (`data/verification/` empty).
- Headless-Chrome proven: landing, browse, auth, settings, profile,
  verify (form + stamp states), admin queue, my-routes + redirect, inbox
  list + thread. Zero page exceptions.

## Open / next

- Old chrome remains: reports placeholder form, retired drawer links.
- Unwired: Resend (no token needed until email flows exist), Stripe
  payments UI (`/pay/*` still 404s), password-reset email.
- Proposed but unbuilt: verified-name binding on profiles ("Verified as
  Dmitri K."), reports queue redo, `httpx` strip from requirements.
- Server move checklist (user owns hardware): Postgres volume, backend
  `.env` with FRESH secrets, public HTTPS for future webhooks, `/files`
  routed to backend in prod.
