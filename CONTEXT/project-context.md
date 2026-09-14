# Project Context: Viactor (backend still speaks Peregri)

> Supersedes all earlier versions. Read this plus `technical-architecture.md`,
> `database.md`, and `design.md` before changing anything. `docs/` outranks
> this directory when they disagree.

**Project name:** Viactor (frontend). Backend, DB, and infra keep the
working title Peregri. Lowercase wordmark `viactor`.
**Status:** MVP loop complete end to end, self-hosted, pre-launch. No real
users yet. Admin: pledsterr@gmail.com.

## 1. What is Viactor?

A marketplace connecting international travelers with people who need items
moved across borders. Travelers earn from luggage space on trips they were
already making. Senders pay less than courier tariffs. The platform only
facilitates matching, communication, and payment. The traveler is always an
independent user, never an employee or contractor.

Example: Alice flies Berlin to Istanbul with spare space. Bob needs a box
moved along that route, or wants something bought there and brought back.
They match, message, both confirm, hand over, confirm receipt, review.

## 2. Core Philosophy

**People travel anyway.** The platform creates no transportation; it matches
existing transportation. Density over geography: one liquid corridor beats
fifty empty countries. Launch corridors: Mexico/US, EU/UK, Turkey/Germany,
Poland/Ukraine, Azerbaijan/Russia, Kazakhstan/Russia.

**Trust is the product.** Identity verification (human-checked ID on file,
duplicates blocked), mutual reviews, held escrow, fast bans. Verification is
optional and means deterrence, never a promise. Copy rule: the user always
decides; nothing is automatic.

**Business model:** platform fee on completed transactions. No aggressive
monetization during MVP.

## 3. Model: carry / need (replaces trip / request / delivery)

- `carry`: "I am going, I have space." Owner is the courier.
- `need`: "Move this for me." Non-owner is the courier.
- `needs_purchase` flag on need: carrier buys the item, cost settled in chat.
- No weight/capacity fields. No flex control in UI: one anchor date, the
  listing's own flexibility flag widens matching automatically.
- Listing lifecycle:
  open > conversation > both confirm > handover > receipt > completed.
  Carry listings stay open after a deal (other senders welcome).
  Need listings close on completion.

## 4. Current Project State

### Implemented and verified live

| Feature | Notes |
|---------|-------|
| Auth | Self-owned email/password: signup/signin/refresh/signout/me + password change. 15-min JWT, rotating 30-day refresh. Proven: 201/200/200/401 paths |
| Profiles | Dossier pages, avatar (512px JPEG), bio, home city, track record, reviews |
| Listings | carry/need, create, browse ledger, anchor-date search, buy flag |
| My Routes | Matches grouped under own listings + manage (close/delete). `/matches` forwards here |
| Messaging | Threads, polling (15s list, 5s open thread), system event notices, mark-read, unread badges |
| Deal flow | confirm x2 > handover > received > snapshot. Proven for carry AND need paths |
| Reviews | Anchored to `completed_deal_id`, one per participant per deal, seg 1-5 input |
| Reports | Submission from profiles (backend complete, admin queue removed for now) |
| Verification | In-app manual review: photos held on disk until decision, blind admin queue at `/admin`, ID hash duplicate detection, photos deleted on decision |
| Account menu | Avatar menu (Profile, Messages, My routes, Settings, Sign out), both navs |
| Settings | Profile/account/danger sections, avatar change, password change |

### Known gaps

| Item | Status |
|------|--------|
| Payments | Free while pre Yookassa. Handover code carries receipt. `payments` table dormant, no Stripe code left |
| Password reset email | No email flows at all; Resend unwired, no token needed yet |
| Reports admin queue | Built then reverted at user request; submit endpoint kept |
| Email confirmation | Signup signs straight in by design |
| Server move | Laptop `docker compose` is canonical; real server needs fresh secrets + HTTPS + `/files` routing |

## 5. Development Philosophy

Correct architecture over fast hacks. AI accelerates implementation but does
not redesign architecture without approval. Consistency over novelty.
Surgical changes: every changed line traces to the request. Verify through
execution: builds, live API probes, headless-browser checks. Nothing is
committed without explicit request.

Backend runs from a baked docker image: code changes need
`up -d --build`, a plain restart does nothing. Dev frontend needs restart
after `vite.config.ts` changes. Single canonical schema in `db/schema.sql`;
changes ship as numbered files in `db/migrations/` applied live with psql.
