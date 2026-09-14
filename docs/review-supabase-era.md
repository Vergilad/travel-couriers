# HANDOFF — Peregri (repo: travel-couriers) — completed full code review + context

You are continuing work on a project that has just received a complete code review. This document gives you
everything the previous session knew: project facts, review coverage, every finding with file:line references,
the agreed fix priority, and one open product decision. Verify line numbers before editing — they were accurate
at review time.

## 1. Project in one paragraph
**Peregri** (working title, folder `travel-couriers`) is a pre-launch MVP marketplace connecting international
travelers with spare luggage capacity to people who need items transported (Berlin→NYC style trips). Travelers
post "trip" listings, requesters post "request"/"delivery" listings; matching is route+date based; two parties
confirm a match in a chat thread, then handover → receipt confirmation archives a `completed_deals` snapshot and
unlocks reviews tied to that deal. Identity verification is manual: user submits ID+selfie → backend forwards to
a private Telegram admin chat → admin taps Approve/Reject → `profiles.identity_verified` set. Revenue model is a
platform fee on completed transactions, but payments are NOT wired end-to-end yet (see H4). Philosophy docs live
in `CONTEXT/` — `CONTEXT/project-context.md` is the declared single source of truth (supersedes the PDF);
`CONTEXT/databse(1).md` (typo intended) documents the DB design. Core product rule: trust features are the
product; consistency over novelty; no architectural rewrites without explicit approval.

## 2. Architecture & repo layout
- `backend/` — FastAPI (uvicorn). Talks to Supabase with the **service-role key** (bypasses RLS). Routers under
  `backend/routers/`: auth (JWT bearer → supabase.auth.get_user), listings, threads, messages, matches,
  payments, webhooks, reviews, reports, profiles, verification. Pydantic models in `models.py`. `main.py` mounts
  everything under `/api/*`. No tests exist.
- `frontend/` — React 19 + TypeScript + Vite + Tailwind v4 + TanStack Router/Query + framer-motion. Talks to the
  backend via relative `/api/...` fetches (dev: Vite proxy → :8000) AND directly to Supabase JS for auth,
  profile reads, avatar storage, and Realtime subscriptions. i18n is a hand-rolled context (`src/i18n/`), en+ru.
- `supabase/` — 7 migrations (0001 initial + 6 dated 2026-06-21 → 2026-07-12), seed.sql, config.toml, and three
  identical template-stub edge functions (real webhook logic lives in FastAPI, not Deno).
- `sql/schema.sql` — documentation-only snapshot of the ORIGINAL schema; drifted from reality (see Lows).
- Dual access paths matter: because the frontend also hits PostgREST directly with the public anon key, **RLS is
  a real security boundary**, not a formality. Two of the three critical findings live there.

## 3. Review coverage (how much was actually read)
- Backend: 100% read first-hand (every router, models, db, helpers, Dockerfile, requirements).
- SQL: 100% first-hand (schema.sql, all 7 migrations, seed, config.toml, edge functions, db_constants cross-check).
- Frontend: two-pass — direct reads of the security/core surfaces (router, auth context, api, supabase client,
  Inbox, Browse, Matches, ListingDetail, VerificationGate, Profile data layer, Settings avatar flow, i18n) plus a
  subagent that read ALL of frontend/src. Trust its line numbers.
- Verified hard facts: en/ru locale key parity is perfect (445/445); installed stripe is 15.2.1 and the
  `stripe.error` module does NOT exist; `git log --all` shows .env files were never committed (30 commits);
  `verification_requests` has no CREATE TABLE anywhere in migrations.

## 4. CRITICAL findings
- **C1. Any user can join any thread and read its messages.** `supabase/migrations/0001_initial_schema.sql:84`
  (same in sql/schema.sql:96): `thread_participants` INSERT policy only checks `auth.uid() = user_id` — nothing
  ties the insert to a thread the user belongs to. With the public anon key anyone can POST themselves into any
  thread, then read all messages (policy 0001:96), insert match_confirmations (0001:108 → trigger flips other
  people's listing status), and read delivery_confirmations. FIX: security-definer check that the inserter is the
  listing owner / existing participant; same tightening for match_confirmations.
- **C2. Users can self-verify identity (and un-ban) via PostgREST.** `0001:14` profiles UPDATE policy is
  row-level only — `identity_verified`, `verification_method`, `is_banned` are user-writable. Defeats the whole
  verification system. FIX: column-level policy (PG15+) or move verification state to a separate table without
  user-write policy.
- **C3. Telegram verification webhook fails open; setup endpoint user-callable.** `backend/routers/verification.py:173-177`
  skips auth entirely when `TELEGRAM_WEBHOOK_SECRET` is unset; `_handle_callback_query` (190-233) never checks the
  callback came from the admin chat; `POST /api/verification/setup-webhook` (:238-243) needs only ANY logged-in
  user and can repoint the bot webhook to an attacker URL. FIX: fail closed, verify chat.id == admin chat, admin-gate
  or remove setup-webhook.

## 5. HIGH findings
- **H1. Verified badge never renders — API contract mismatch.** `profiles.py:11` `PUBLIC_PROFILE_FIELDS` omits
  `identity_verified`, but `Profile.tsx:722` and `Inbox.tsx:642` read it from `GET /api/profiles/{id}` → always
  undefined. (ListingDetail works only because the listings endpoint selects it, `listings.py:31`.) Also
  `ListingDetail.tsx:36-37` expects `owner.rating`/`owner.review_count` which NO backend code computes — star
  ratings are permanently "No reviews". Fix: add the field (and either compute rating/count or drop from type).
- **H2. Untracked infrastructure.** `verification_requests` table (used at verification.py:66/109/156/211/217)
  exists in NO migration — presumably hand-created; a fresh `supabase db reset` breaks verification. Same for the
  `avatars` storage bucket + policies used by `Settings.tsx:235-239`. Write the migrations.
- **H3. Stripe handlers reference a removed module.** `payments.py:37` `except stripe.error.StripeError`,
  `webhooks.py:18` `except stripe.error.SignatureVerificationError` — stripe 15.x has no `stripe.error`; the
  except clause itself raises AttributeError the first time Stripe errors. Use `stripe.StripeError` /
  `stripe.SignatureVerificationError`.
- **H4. Payments flow orphaned.** The match trigger stopped inserting payment rows (20260629 migration, header
  comment "payments belong to a later phase"); nothing else inserts into `payments`, so `POST /api/payments/session`
  (`payments.py:15`) can never find a pending row → permanent 404. Whole Stripe leg dead end-to-end (docs
  acknowledge no frontend either). When reviving: `int(float(amount)*100)` at payments.py:28 truncates
  (10.10 → 1009 cents) — use round()/Decimal.
- **H5. Unvalidated PATCH.** `listings.py:241-253` takes `body: dict` and writes it straight to Supabase after an
  ownership check — owner can set arbitrary status/owner_id/created_at/columns; no whitelist, no re-validation.
  Needs a ListingUpdate model.
- **H6. Unbounded uploads.** `verification.py:117-118` reads ID+selfie fully into memory with no size/MIME check
  (frontend sends raw files too); the three Telegram sends (:139-153) never check responses — a rejected photo
  (>10 MB Bot API limit) still yields a "pending" request the admin never saw. Enforce ~10 MB + image/*, check `ok`.
- **H-F1. Confirm/handover/received swallow every failure; VerificationGate dead-wired.** `Inbox.tsx:700-708`
  `catch { void err }`; :710-724 no catch; :446-454 try/finally without catch. `apiConfirmMatch` (:93-106) builds a
  structured `identity_not_verified` error that nothing consumes; `VerificationGate.tsx` (self-described as the
  confirm-time gate) is only mounted by `pages/Verification.tsx:88`. Users click CONFIRM and nothing happens on
  failure. Add error states + surface messages.
- **H-F2. All dates render one day early for negative UTC offsets.** `lib/listings.ts:9-14` parses date-only
  strings ("2026-07-18") as UTC midnight then locale-converts. Fix: split-parse into local date; take locale from
  i18n instead of hardcoded "en-US".

## 6. MEDIUM findings
Backend:
- M1. Sync Supabase calls inside async handlers block the event loop — `auth.py:13` does a network round-trip per
  request; only `threads.py:6-9` uses run_in_executor. python-jose is installed/unused — consider local JWT verify.
- M2. `mark_received` (`matches.py:314-346`) is non-atomic (sets received_at → inserts deal → updates listing) and
  `completed_deals` has no unique constraint → duplicate rows possible; failure after the first write wedges the flow.
- M3. Re-confirming a match re-posts the two system messages (`matches.py:155-188`) — only the delivery_confirmations
  insert is idempotent-guarded.
- M4. `.single()` raises on zero rows → `query_helpers.py:8-11` 404 branch is dead code; missing records return 400/500
  with leaked internals; `error_handlers.py:15` returns str(e) for every DB error.
- M5. CORS `allow_origins=["*"]` + `allow_credentials=True` (`main.py:11-17`).
- M6. Browse pagination lossy: Python-side date filtering over a 200-row pool cap (`listings.py:169-193`), no total/has_more.
- M7. Hard-deleting a listing cascades threads/messages/match_confirmations (FKs added in 20260629:58-77;
  `delete_listing` listings.py:256-268) — contradicts matches.py:289 "threads are NEVER deleted". Prefer soft-close.
- M8. `Dockerfile:5` `COPY . .` bakes backend/.env (service key, bot token) into image layers; needs .dockerignore
  (venv, .env, __pycache__); image is python:3.11 vs local venv 3.14.
- M9. `GRANT ALL PRIVILEGES ON ALL TABLES ... TO authenticated` (0001:215) includes TRUNCATE (RLS doesn't apply to it).
- M10. User-controlled ILIKE patterns (`listings.py:97,159-161`) — `%` in city fields games matching; escape wildcards.
Frontend:
- Thread-switch race: `Inbox.tsx:628-644` no stale-response guard → wrong messages under wrong header.
- Global unread badge (`auth.tsx:125-149`, `63-89`): realtime channel unfiltered (every message platform-wide
  triggers a 2-query recount on every client) and nothing recomputes after apiMarkRead → stale navbar badge.
- Split API base: `api.ts` uses VITE_API_URL while all other pages use relative `/api` (dev proxy) — two origins,
  three duplicate fetch wrappers.
- `Matches.tsx:172` hardcodes `hasListings={false}` — users with listings but no matches are told they have none.
- `supabase.ts:11-13` casts null client to non-null type; unguarded uses in Auth.tsx/Settings.tsx/api.ts.
- Chat input cleared before send resolves (`Inbox.tsx:426-432,693-698`); failures lost.
- i18n ~40% unapplied despite perfect key parity: VerificationGate (all copy; one sentence truncated mid-word at
  :229-231), CreateListing, "just now"/"Negotiable"/kind labels (`listings.ts:17-32`), `Nav.tsx:365`, REPORT_REASONS,
  Footer, CityAutocomplete.
- Browser back/forward desyncs Inbox selection (`Inbox.tsx:602` + `router.tsx:134-141`, param-only nav doesn't remount).

## 7. LOW/NITS (condensed, file:line)
Backend: empty files 20260621055403_initial_schema.sql + sql/migration.sql; sql/schema.sql documents the obsolete
trigger/payments-gate; db_constants DEALING unused; listings.py:225 accepts-then-drops accepts_multiple, :229-234
dead date_flexibility retry, :15 leftover Russian dev note; requirements.txt fully unpinned + jose/resend unused;
package.json ships unused i18next/react-inext + `shadcn` as runtime dep; tsconfig.tsbuildinfo + supabase/.temp
committed; seed.sql creates known-password auth user (db reset only); no tests anywhere.
Frontend: Profile.tsx 404 renders empty page (:577-584), status chip always "open" (:822-833), "12 listings" beside
slice(0,10) (:794-811), rating widget click-only (:153-181), client-computed avgRating (:627-630); MyListings
mutations without onError (:121-129), `=== "CANCEL" ? "CANCEL" : "CANCEL"` (:81), third copy of ConfirmModal;
VerificationGate no upload cap (:109-115,135-151); Settings can't clear fields (:262) + fake delete-account modal
(:597-611); CreateListing no past-date guard; router.tsx:61-64/75 unvalidated redirect/mode casts; Google OAuth
always → /browse (Auth.tsx:377); dead code verified by grep: landing/LiveListings, RouteTicker, HeroRoutePanel,
ScrollReveal, hooks/use-pointer-position, i18n/useLanguage, ui/button, ui/input, fetchOpenListings, Browse KindBadge,
MatchBar myVerified prop; Inbox realtime channels keyed on token → churn every hour on refresh (:616-681), no
match-state polling fallback; vite dev server 0.0.0.0 + allowedHosts:true (vite.config.ts:11-14); avatar cache-bust
shown but unversioned URL persisted (Settings.tsx:240-244); © 2026 hardcoded.

## 8. Intentionally fine — do not re-flag
Backend-as-source-of-truth enrichment pattern (listings→profiles, reviews→reviewers); review eligibility enforced
server-side against completed_deals with clean 409 on double-submit (reviews.py:85-117); the two-stage
confirm → handover → receipt state machine with participant checks everywhere; consistent NULL-sender unread-count
logic; threads.py executor+gather pattern; secrets never committed to git (verified); en/ru 445/445 parity; no
dangerouslySetInnerHTML; only the anon key reaches the browser; client-side checks are display-only by design.

## 9. Agreed priority order
1. C1 + C2 + C3 (RLS policies + webhook fail-closed) — small SQL/code changes, closes the worst holes.
2. H1 + H-F1 as ONE decision (see §10), then implement.
3. H-F2 (UTC date parsing — one function).
4. H2 (write missing migrations before next environment).
5. H5 (whitelist PATCH) and H4/H3 (decide payments dead-or-alive; fix stripe.error + cents).
6. H6 (upload limits) + Inbox hardening batch (race guard, unread refresh, input clearing, back/forward).
7. i18n application pass, then dead-code sweep.

## 10. OPEN product decision (owner must choose)
Identity verification is currently warn-only: client shows `UnverifiedWarningModal` with "proceed anyway"
(ConversationPanel.handleConfirm), yet VerificationGate + dead 403 `identity_not_verified` path imply it was meant
to be ENFORCED ("Both participants must be verified before confirming"). Pick one:
(a) enforce → add server-side check in matches.py confirm + wire VerificationGate into Inbox error handling; or
(b) warn → delete the dead 403 path + gate, fix gate copy. Half-state is the current bug.

## 11. Handy facts / environment notes
- Supabase project ref: glgiqjscevurdmgbpwbl. Live secrets sit in `backend/.env` (service key, TELEGRAM_BOT_TOKEN,
  TELEGRAM_ADMIN_CHAT_ID, TELEGRAM_WEBHOOK_SECRET) and `frontend/.env` (anon key) — gitignored, never committed;
  do NOT print their values into chats/logs. No rotation needed per review, but fix Dockerfile COPY before deploy.
- Migrations, chronological: 0001 initial → 20260621 initial duplicate (EMPTY file) → 20260626 date_flexibility
  ('exact/3days/1week/2weeks') → 20260629 match+history rework (dealing status, is_system, no auto-payment,
  FK cascades, completed_deals) → 20260704 flexibility simplified ('exact/week/month') → 20260705 reviews anchored
  to completed_deal_id (UNIQUE per deal+reviewer) → 20260712 delivery_confirmations table.
- Local venv is Python 3.14 (backend/venv/lib/python3.14); Dockerfile says 3.11 — align someday.
- The review ran in a DSH/Windows harness: pwsh commands may print harmless "ConstrainedLanguage" stderr noise;
  glob/read tools exclude nothing automatically — venv and __pycache__ must be filtered manually.
- No goal/ralph machinery was used; no background jobs remain. SQL-review subagent crashed (its scope was absorbed);
  frontend-review subagent completed (its full report is folded into §§5-7 above).