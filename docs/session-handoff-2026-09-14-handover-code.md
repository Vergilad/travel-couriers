# Session handoff: 2026-09-14, handover code + Stripe deletion + modal remake

Continues `docs/session-handoff-2026-09-14.md`. User decisions (asked, answered):
needer = parcel-owner side; code minted at both-confirm and carrier entry IS
receipt; Stripe deleted but `payments` table kept dormant; modal restyled AND
recopied (new wording below, shown on localhost).

## Backend (main repo)

- `db/migrations/0003_handover_code.sql` (applied live, RC 0) + `db/schema.sql`
  synced: `delivery_confirmations.handover_code TEXT` (plaintext MVP, single
  use, cleared on completion) + `code_attempts INTEGER DEFAULT 0`.
- `backend/routers/matches.py`: code minted idempotently at both-confirm,
  returned only to the needer (recipient); `GET /api/matches` exposes
  `handover_code` (needer only), `is_me_needer`, `code_locked`;
  `POST /api/matches/complete-with-code` (courier only, 5 tries, same
  snapshot txn extracted as `_archive_completion`, also used by
  `mark_received`); `POST /api/matches/regenerate-code` (needer only).
  `backend/models.py`: `HandoverCodeSubmit`.
- Stripe deleted: `routers/payments.py` + `routers/webhooks.py` removed,
  mounts + import gone from `main.py`, `stripe` out of `requirements.txt`
  (`resend` kept), Stripe/FRONTEND_URL out of `.env.example`.
  Legacy `POST /api/matches/received` kept as backend fallback, UI no longer
  calls it. `payments` table untouched for Yookassa.
- Image rebuilt (`up -d --build`), `/health` ok, OpenAPI shows the two new
  routes and no `/api/payments/*` or `/api/webhooks/*`.
- Proven live with throwaway users (created, reviewed, deleted same session):
  mint 6 digits to needer only, carrier state hides code, wrong code 400
  with tries left, needer entry 403, right code completes, carry stays open,
  review eligibility + submit 200, DB clean after (0 probe users/listings).
- `CONTEXT/database.md`, `CONTEXT/technical-architecture.md`,
  `CONTEXT/project-context.md`: payments lines updated to dormant/Yookassa.

## Frontend (worktree `jxtftjq7g77d`, all green)

- `src/pages/Inbox.tsx`: `MatchState` + code fields; `CodeDisplay` (needer:
  big digits, hint, regenerate when locked) and `CodeEntry` (courier: 6 digit
  input, COMPLETE DELIVERY, inline backend error); deal strip renders them in
  `in_transit`/`handed_over`; recipient Confirm Receipt buttons removed;
  `handleReceived` deleted. Same endpoints + polling, no new CSS, no motion.
- `src/components/UnverifiedWarningModal.tsx`: Viactor paperwork (sharp
  manifest box, field-caption, copy/ink-dim, btn ghost + destructive plain,
  no framer-motion, no pills, no JetBrains Mono). Copy rewritten, EN+RU.
- Locales: 9 new `inbox.*` code keys EN+RU, `unverified_warning` values
  rewritten EN+RU. Parity 559/559. Touched files dash clean (remaining hits
  are pre-existing `messages.*` lines).
- `npm run build` green twice (tsc + vite).
- Headless Chrome probes (throwaway users, deleted after): needer sees
  HANDOVER CODE + digits, carrier sees COMPLETE DELIVERY and never the
  digits, modal opens from CONTACT CARRIER with new copy, zero page errors.
  Screenshots in temp `opencode/inbox-code-probe/` (wiped EOD with scratch).

## Open / next (owner calls)

- Money freeze needs Yookassa + Russian ИП. Code is proof of handover only.
- Unused keys left in place: `inbox.confirm_receipt`,
  `messages.confirm_receipt_btn`. Legacy `/received` endpoint still mounted.
- No-carrier-recourse edge: if the courier never enters the code, the needer
  has no complete button (reports submit exists). Dispute flow undecided.
- Nothing committed, per standing rule.
