# Database Design

> Supersedes all earlier versions including `databse(1).md` (deleted, name
> was a typo). Canonical schema: `db/schema.sql`. Changes: numbered files
> in `db/migrations/`, applied live with psql. No ORM, no frameworks.

Postgres 17, normalized, backend-only role. No RLS (nothing client-side to
protect), no triggers (multi-writes run in Python transactions), no
Supabase `auth.*` references. Real foreign keys to `users.id` everywhere
history must not orphan. Photos and files live on the `data/` volume, never
in the DB: only URL strings and hashes are stored.

## Lifecycle

```
User > Listing > Thread > Messages > match_confirmations
  > delivery_confirmations (handover + receipt) > completed_deals snapshot
  > Review. Payments run parallel (optional, per thread).
```

## Tables (16)

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `users` | Auth only: email, password hash | id uuid PK, email citext UNIQUE |
| `refresh_tokens` | Rotating opaque refresh | token_sha256 PK, user_id FK, expires_at |
| `profiles` | Public marketplace data | id FK users, display_name, avatar_url (string), bio, city, country, identity_verified, verification_method |
| `user_roles` | Permissions (user/moderator/admin) | (user_id, role) PK |
| `listings` | carry/need offers | owner_id FK users, kind CHECK(carry,need), needs_purchase bool, route cities/countries, depart/arrive dates, price/currency, status |
| `threads` | Conversation on one listing | listing_id FK |
| `thread_participants` | Who may read/write | (thread_id, user_id) PK |
| `messages` | Immutable history | thread_id, sender_id NULL = system, body, is_system, read_at NULL = unread |
| `match_confirmations` | Both sides agreed | (thread_id, user_id) PK |
| `delivery_confirmations` | Physical handover | thread_id PK, courier_id, recipient_id, handed_over_at, received_at (binding event) |
| `completed_deals` | Immutable snapshot at receipt | listing route/kind/dates denormalized, user_a/b + name/avatar snapshots |
| `payments` | Dormant until Yookassa (nothing writes here yet) | thread/listing/payer/payee/amount, stripe ids kept for later reuse, pending/processing/completed |
| `reviews` | Post-deal reviews | completed_deal_id FK, reviewer/reviewee, rating, comment, UNIQUE(deal, reviewer) |
| `reports` | Abuse reports, never deleted | reporter/target user/listing, reason, details, open/reviewed/dismissed |
| `verification_requests` | Review queue rows | user_id, method=manual, status, verified_name, rejection_reason, submitted_at, reviewed_at, reviewed_by FK users, id_photo_sha256 |
| `notification_log` | Audit log for notifications | user_id, kind, payload jsonb, sent_at |

## Listing status

open (browsable) > matched (both confirmed) > dealing (handed over) >
completed (receipt confirmed; carry skips this and stays open) | cancelled.

## Design decisions (load-bearing)

- **Auth separate from data:** `users` holds credentials, `profiles`
  holds marketplace. Never merged.
- **Backend returns merged objects:** owner names/avatars attached
  server-side via explicit two-step queries (no PostgREST auto-joins;
  `owner_id` references `users`, not `profiles`).
- **Reviews anchor snapshots, not listings:** listings can close or be
  reused; the reviewed transaction is immutable in `completed_deals`.
- **Verification keeps almost nothing:** name + ID hash + reviewer.
  Photos die on decision. Duplicate hashes across accounts flag in queue.
- **History display was cut** (endpoint deleted). The table stays: reviews
  and eligibility need it.
- **Unread = `read_at IS NULL`** on non-system messages from others.

## Migrations

| File | Change |
|------|--------|
| `0001_carry_need.sql` | kind CHECK to (carry,need), +needs_purchase, dropped capacity_kg, wiped test rows |
| `0002_admin_review.sql` | +reviewed_by, +id_photo_sha256 on verification_requests |

## Future tables (only on real need)

listing_images, saved_listings, user_devices, notification/email
preferences, admin_actions, support_tickets. No speculative schema.
