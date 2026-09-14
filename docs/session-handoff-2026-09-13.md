# Session handoff — 2026-09-13 (Viactor frontend + self-hosted backend)

Whole conversation extracted because context was filling up. Read this plus
`docs/superpowers/specs/2026-09-13-selfhosted-auth-db-design.md` to resume.

## Standing rules from the user (stay in force)

- **Use skills, always.** Relevant standby set: `brainstorming`,
  `karpathy-guidelines`, `using-superpowers`, `design-taste-frontend`,
  `ui-ux-pro-max`, `awwwards`. Invoke before acting; user pastes skill
  text to mean "apply this".
- User acts as MCP for UI components/images (they supply photos).
- Discuss every change; check against skills; show changes on localhost.
- No commits/PRs unless explicitly asked. **Nothing this session is committed.**
- Product renames: Peregri kept for backend/DB concepts only.
  Frontend restarts as **Viactor** (lowercase wordmark `viactor`).
- Copy rules: zero em-dashes anywhere; plain human strings; EN+RU parity.

## Repos / worktrees

- Main repo: `C:\Users\Admin\travel-couriers` (branch `main`, HEAD `afee6e3`).
  Backend self-host work happened HERE (not in a worktree).
- Worktree (all frontend work):
  `C:\Users\Admin\travel-couriers\.delta\worktrees\jxtftjq7g77d\travel-couriers\frontend`
  (`C:\Users\Admin\travel-couriers\.delta\worktrees\wbm7xt6w90ff\` exists too, untouched).
- Dev frontend: http://127.0.0.1:5000 (detached `npm run dev`, may need restart).
- Backend: http://127.0.0.1:8000 via
  `docker compose --env-file backend/.env up -d` (Compose v5.5.1).
- DB: Postgres 17 container, `pgdata` volume, :5432.

## Part 1 — Landing page (Viactor, neubrutalist transit-paperwork)

Concept: the page is a sheet of transit paperwork; tiles are form fields,
2px rules, zero radius; teal = route, orange = money/action;
Geologica SHRP 100 + Martian Mono + Onest (self-hosted in
`public/fonts`); split-flap departures board is the one signature motion.

- **Travel/parcel rebalance.** Was parcel-heavy (addressing box + handover
  vs one suitcase band). Swapped `addressing` → `in-transit`
  (Fuat Ertus ferry traveler) via `scripts/optimize-images.py`.
  Now 2 travel / 1 parcel. Copy: "Already on the way" / "Уже в пути".
- **Passport round: REVERTED.** User disliked it. Revert applied
  (LandingSheet, locales, pipeline, `shoot.mjs` TILES back to 10) and
  verified (build + shoot 10/10). Passport source file remains in
  `assets/photos/pexels-tima-miroshnichenko-7010095.jpg` (unused).
- **Guide-dot background round: REVERTED** with the above.
- Carry-on orange tag photo (`assets/photos/pexels-introspectivedsgn-4062503.jpg`)
  kept as unused backup.

## Part 2 — Backend: Supabase fully removed, self-hosted

Decision: no Supabase software at all (cost motive; user owns a server).
Plain Postgres 17 + FastAPI-owned email auth. Spec doc governs.

- `db/schema.sql`: single canonical schema, 16 tables from CONTEXT database
  doc. Real FKs to `users.id`; no RLS (backend-only role kills C1/C2 by
  construction); no triggers (signup inserts users+profiles in one txn;
  confirm/received are Python transactions); `verification_requests` +
  review UNIQUE constraint included (H2 folded in).
- Auth (`routers/auth.py`, mounted `/api/auth`): signup/signin/refresh/
  signout/me + PATCH password. HS256 access JWT 15 min via python-jose,
  rotating opaque refresh (sha256 in DB, 30 d). Passwords pbkdf2_sha256
  (passlib+bcrypt5 explodes at runtime — do NOT switch back without
  pinning bcrypt<4.1). `get_current_user` interface unchanged.
- `db.py`: psycopg3 pool + `to_json` (UUID/date/Decimal conversion) +
  `fetchone/fetchall` helpers. `query_helpers.py` same names, SQL inside,
  identifier allowlist.
- All 11 routers rewritten supabase-py → parameterized SQL, same REST
  contract. `order_by` allowlisted. New `routers/files.py`: avatar upload
  (image only, 2 MB, fixed per-user name) + `GET /files/...` public serve
  via StaticFiles; `data/` volume (gitignored).
- C3 closed: Telegram webhook fails closed without secret, callback
  chat.id must equal admin chat, `setup-webhook` endpoint deleted
  (one-time curl in `.env.example`).
- `compose.yml` (db + backend), `backend/.env` (untracked, DEV secrets —
  regenerate before the real server), `backend/.env.example`,
  requirements: minus `supabase`, plus `psycopg[binary]`, `psycopg_pool`,
  `passlib`.
- Verified live: signup→trip/request→matches→thread→message→confirm×2→
  handover→received→completed_deals snapshot→review→double-review 409→
  browse/history; avatar upload+serve 200; restart persistence.
- Cleanup: deleted `infra/supabase` (vendored stack), `supabase/`, `sql/`;
  added root `.gitattributes` (`* text=auto`) for the LF/CRLF noise
  (renormalize at commit time). Left `docs/ scripts/ photos/ review.md`.
- The old "mess" was 95% line-ending noise; real diffs were tiny.

## Part 3 — Model simplification: carry/need (replaces trip/request/delivery)

- `db/migrations/0001_carry_need.sql` (applied live): kind CHECK →
  `(carry, need)`, `+ needs_purchase` bool, DROP `capacity_kg`, test rows
  wiped. `db/schema.sql` synced.
- `ListingCreate`: `Literal["carry","need"]` + `needs_purchase` (coerced
  false on carry). Matching: single carry↔need rule. Courier derivation:
  two branches. Browse gained then LOST `flex_days` (see below).
- Flex decision (user): NO flex control in UI. One anchor date; the
  listing's own ± flag widens matching automatically. Proven live:
  3-Apr search returns 6-Apr ±week listing.
- Worktree frontend converted: `ListingKind`, router `/carry/new` +
  `/need/new`, BUY chip (neutral outline) wherever needs_purchase shows,
  EN+RU `kinds`, `post_carry/post_need`, contact/profile labels split
  carry vs need (+ `sender_profile`), weight removed everywhere
  (incl. `db_constants`, detail MetaCell, create form + validation).
  Legacy main-repo frontend NOT converted (flagged for retirement).

## Part 4 — Viactor remake of browse/create/detail + polish

- `ViactorAppShell` (+ nav): theme scope, stored mode, airmail edge,
  wordmark, Browse, Messages+unread badge, +Carry (orange) / +Need (blue),
  account, mode toggle, EN/RU, mobile panel, ViactorFooter. `Layout`
  routes `/browse /carry/new /need/new /listings/*` (+ `/auth`, see below)
  into it; inbox/profile/settings keep old chrome until their turn.
- Browse = manifest ledger (search field + ruled rows, skeleton/empty/
  error fields). No cards, no price filters, no weight.
- Create = sheet fields, purchase as tickbox row, flex chips as seg,
  `btn--primary` submit. New `create.*` locale namespace (EN+RU).
- Detail = manifest header + meta/sidebar split (explicit mobile collapse).
- System: `.manifest/.manifest-row/.seg/.stencil-chip/.skel/.detail-split/
  .btn--teal/.perforation/.stamp` in `viactor-layout.css`; shape lock
  enforced on old components via scoped `.rounded-sm` override.
- Fixes from user rounds: CityAutocomplete unified to form voice;
  side-color rule carry=orange/need=blue on chips AND buttons; `press`
  on every colored button; `keepPreviousData` (filter-tap skeleton flash);
  single-instance theme toggle (nav had a dead duplicate hook).
- Auth page: still OLD dark terminal style at time of writing — approved
  Viactor ticket design (narrow manifest, perforation, seg signin/join,
  route-inputs, VERIFIED stamp flash ~600ms then redirect, reduced-motion
  skips) was presented but implementation had not started when context ran
  out. Build it next: rewrite `Auth.tsx`, add `/auth` to shell paths
  (already done in Layout? — NO, check: VIACTOR_PATHS got "/auth"? It was
  in the design, verify before building), `auth.verified_stamp` keys,
  perforation+stamp CSS.

## Creds / secrets

- `backend/.env` (untracked): dev-only JWT secret + PG password shown in
  session; Postgres role `peregri`. Regenerate for the real server.
- Test users in live DB: alice/bob (old kinds, wiped by migration),
  cara/ned (carry/need), all `@test.dev` / `password123`.

## Pre-flight standing (taste skill)

Zero em/en-dashes in touched files (ordinal-verified; an earlier inline-
script "FAIL" was PowerShell UTF-8 mangling the literal into matching
an apostrophe — use ordinal checks). Seg actives AA both modes. Press
uniform. Mobile collapses declared. No scroll listeners in new code.
Old em-dashes in inbox/verification locales predate this work, untouched.

## How to resume

1. `docker compose --env-file backend/.env up -d` (main repo).
2. Dev frontend in worktree (`npm run dev`, :5000).
3. Build Auth ticket page (design approved above).
4. `npm run build` + `node scripts/shoot.mjs <out> en` (+ base-url trick
   for `/browse`: tile assertion fails harmlessly, screenshots save).
5. Commit only when the user says so.
