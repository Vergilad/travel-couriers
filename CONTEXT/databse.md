# 4. Database Design

## Overview

Peregri is built on PostgreSQL (Supabase).

The database is intentionally normalized. Every table has a single responsibility, while business logic lives primarily inside the FastAPI backend rather than SQL procedures or database triggers.

The schema models the lifecycle of the marketplace:

```
User
 │
 │ creates
 ▼
Listing
 │
 │ discussion
 ▼
Thread
 │
 │ participants
 ▼
Messages
 │
 │ agreement
 ▼
Match Confirmation
 │
 │ handover + receipt
 ▼
Delivery Confirmation
 │
 │ archived on completion
 ▼
Completed Deal
 │
 │ enables
 ▼
Review
```

Payment is a parallel, optional track (a thread may or may not involve money) rather than a required step in this chain — see `payments` below.

Supporting systems such as reports, notifications and roles exist independently.

---

# Database Philosophy

## Authentication is separate from application data

Supabase manages authentication.

Application-specific information belongs in the `profiles` table.

Therefore:

```
auth.users
```

contains authentication information.

```
profiles
```

contains marketplace information.

These represent different responsibilities and should never be merged.

Authentication should remain managed by Supabase, while all application data belongs to Peregri.

---

## Backend is the source of truth

The frontend should not assemble business objects from multiple API calls.

Instead, the backend returns frontend-ready data.

Example:

Instead of requesting

```
Listing
```

and then requesting

```
Profile
```

the backend returns

```
Listing
+ owner_display_name
+ owner_avatar_url
```

already merged.

---

## Explicit relationships

Whenever practical, backend code performs explicit queries rather than relying on automatic PostgREST joins.

Advantages include:

- predictable behavior
- easier debugging
- fewer schema-cache issues
- clearer backend logic
- database design stays independent of API implementation

---

# Entity Relationships

```
User
 │
 ├──────────────┐
 │              │
 ▼              ▼
Profiles     User Roles

 │
 │ creates
 ▼
Listings
 │
 │ owns
 ▼
Threads
 │
 ▼
Thread Participants
 │
 ▼
Messages
 │
 ▼
Match Confirmations
 │
 ▼
Delivery Confirmations
 │
 ▼
Completed Deals
 │
 ▼
Reviews

Payments (parallel, optional — tied to a Thread)
Reports
Notification Log
```

---

# Table: profiles

## Purpose

Stores public marketplace information about users.

Authentication data is intentionally excluded.

---

## Columns

| Column | Type | Description |
|----------|---------|-----------------------------|
| id | uuid | Matches auth.users.id |
| display_name | text | Public username |
| avatar_url | text | Profile picture |
| bio | text | User biography |
| city | text | Home city |
| country | text | Home country |
| created_at | timestamptz | Account creation time |
| is_banned | boolean | Administrative moderation flag |

---

## Notes

Every authenticated user should have exactly one profile.

Profiles intentionally do **not** contain:

- email
- password
- OAuth provider
- authentication metadata

Those belong exclusively to Supabase Auth.

---

# Table: user_roles

## Purpose

Stores application permissions.

Using a dedicated table instead of boolean flags makes permission expansion easy.

---

## Columns

| Column | Type | Description |
|----------|---------|----------------|
| user_id | uuid | User identifier |
| role | text | Assigned role |

---

Typical values:

```
user
moderator
admin
```

---

# Table: listings

## Purpose

Represents marketplace offers.

A listing may describe:

- available luggage space
- delivery request
- travel offer

Listings are the central entity of the application.

---

## Columns

| Column | Type | Description |
|----------|---------|---------------------------|
| id | uuid | Primary key |
| owner_id | uuid | Creator of listing |
| kind | text | Listing type |
| origin_city | text | Departure city |
| origin_country | text | Departure country |
| dest_city | text | Destination city |
| dest_country | text | Destination country |
| depart_date | date | Departure date |
| arrive_date | date | Arrival date |
| title | text | Listing title |
| description | text | Detailed description |
| price | numeric | Requested payment |
| currency | text | Currency |
| capacity_kg | numeric | Available luggage capacity |
| status | text | Current state |
| created_at | timestamptz | Creation time |

---

## Listing Types

```
trip
delivery
request
```

---

## Listing Status

```
open
matched
completed
cancelled
```

Only one status should be active at any given time.

---

## Lifecycle

```
Open

↓

Conversation (thread + messages)

↓

Both parties confirm (match_confirmations)

↓

Courier marks handover (delivery_confirmations.handed_over_at)

↓

Recipient confirms receipt (delivery_confirmations.received_at)
→ snapshot written to completed_deals

↓

Completed  (skipped for `trip` listings, which stay open for other senders)
```

Cancelled listings remain stored for historical purposes.

---

# Table: threads

## Purpose

Represents a conversation regarding one listing.

Messages never exist outside a thread.

---

## Columns

| Column | Type | Description |
|----------|---------|----------------|
| id | uuid | Primary key |
| listing_id | uuid | Related listing |
| created_at | timestamptz | Creation timestamp |

---

# Table: thread_participants

## Purpose

Defines which users may access a conversation.

Currently a thread typically contains two participants.

The separate table allows future expansion to group conversations.

---

## Columns

| Column | Type | Description |
|----------|---------|----------------|
| thread_id | uuid | Thread |
| user_id | uuid | Participant |

Composite primary key:

```
(thread_id, user_id)
```

---

# Table: messages

## Purpose

Stores conversation history.

Messages are immutable.

Editing messages is intentionally unsupported.

---

## Columns

| Column | Type | Description |
|----------|---------|----------------|
| id | uuid | Message identifier |
| thread_id | uuid | Conversation |
| sender_id | uuid | Author (NULL for system messages) |
| body | text | Message content |
| is_system | boolean | True for backend-generated notices (e.g. confirmation/handover events) rather than user-authored text |
| created_at | timestamptz | Time sent |
| read_at | timestamptz | Read receipt |

---

## Read Status

```
NULL
```

means unread.

Timestamp

means read.

Unread counters are derived from this field.

---

# Table: match_confirmations

## Purpose

Ensures both participants explicitly agree before a delivery becomes matched.

---

## Columns

| Column | Type | Description |
|----------|---------|----------------|
| thread_id | uuid | Thread |
| user_id | uuid | Confirming user |
| confirmed_at | timestamptz | Confirmation time |

Composite primary key:

```
(thread_id, user_id)
```

---

# Table: delivery_confirmations

## Purpose

Tracks the physical handover once both participants have confirmed the
arrangement (see `match_confirmations`). This is a separate table because
"we agreed on terms" and "the item actually changed hands" are different
events with different actors and different timestamps.

---

## Columns

| Column | Type | Description |
|----------|---------|----------------|
| thread_id | uuid | Thread (one row per matched thread) |
| courier_id | uuid | The participant physically carrying the item |
| recipient_id | uuid | The participant receiving the item |
| handed_over_at | timestamptz | Set when the courier marks handover |
| received_at | timestamptz | Set when the recipient confirms receipt — this is the binding completion event |

---

Row created only once both parties confirm via `match_confirmations`. Who is
courier vs. recipient depends on listing kind: for a `trip` listing the owner
(traveler) is the courier; for `delivery`/`request` listings the non-owner is
the courier.

Confirming receipt (`received_at` set) is what triggers a `completed_deals`
snapshot and marks the listing `completed` (except `trip` listings, which
stay open for other senders).

---

# Table: completed_deals

## Purpose

An immutable snapshot taken the moment a delivery is confirmed received.
Listings, threads and profiles can all change or be removed later, but a
user's transaction history and eligibility to leave a review must not
disappear — so the relevant details are denormalized here rather than
looked up live.

---

## Columns

| Column | Type | Description |
|----------|---------|----------------|
| id | uuid | Completed deal |
| listing_id | uuid | Originating listing |
| kind | text | Listing type at completion time |
| origin_city / origin_country | text | Route origin |
| dest_city / dest_country | text | Route destination |
| depart_date / arrive_date | date | Route dates |
| completed_at | timestamptz | When receipt was confirmed |
| user_a / user_b | uuid | The two participants |
| user_a_name / user_a_avatar | text | Snapshot of user_a's profile at completion time |
| user_b_name / user_b_avatar | text | Snapshot of user_b's profile at completion time |

---

Drives two things: a user's profile history (who they've dealt with, where,
when) and review eligibility — a review can only be left against a
`completed_deal_id` the reviewer took part in and hasn't already reviewed.

---

# Table: payments

## Purpose

Tracks financial transactions.

Sensitive payment information never enters the database.

Only Stripe references are stored.

---

## Columns

| Column | Type | Description |
|----------|---------|----------------|
| id | uuid | Payment |
| thread_id | uuid | Related conversation |
| listing_id | uuid | Related listing |
| payer_id | uuid | Customer |
| payee_id | uuid | Traveler |
| amount | numeric | Amount |
| currency | text | Currency |
| stripe_payment_intent_id | text | Stripe Payment Intent |
| stripe_session_id | text | Checkout Session |
| status | text | Payment status |
| created_at | timestamptz | Created |
| completed_at | timestamptz | Completion time |

---

## Statuses

```
pending      — row created, checkout not yet started
processing   — Stripe Checkout Session created, awaiting payment
completed    — confirmed paid via the Stripe webhook
```

`pending`/`processing`/`completed` are the only statuses the backend
currently sets. Refunds and cancellations are not yet implemented — a
`payments` row does not currently support either state.

---

# Table: reviews

## Purpose

Stores reviews left after a completed deal.

---

## Columns

| Column | Type | Description |
|----------|---------|----------------|
| id | uuid | Review |
| completed_deal_id | uuid | The completed deal this review is attached to |
| reviewer_id | uuid | Author |
| reviewee_id | uuid | Recipient |
| rating | integer | Rating |
| comment | text | Optional review |
| created_at | timestamptz | Creation time |

---

Reviews key off `completed_deal_id` rather than `listing_id`. A listing can
be deleted or reused (e.g. a `trip` stays open after one delivery completes),
but the specific completed transaction being reviewed must stay identifiable
— so the review points at the immutable `completed_deals` snapshot instead.

---

Future profile statistics (average rating, completed deliveries, response rate) should preferably be calculated from reviews rather than permanently stored.

---

# Table: reports

## Purpose

Allows users to report abuse.

Reports may target either users or listings.

---

## Columns

| Column | Type | Description |
|----------|---------|----------------|
| id | uuid | Report |
| reporter_id | uuid | Reporter |
| target_user_id | uuid | Reported user |
| target_listing_id | uuid | Reported listing |
| reason | text | Category |
| details | text | Additional information |
| status | text | Moderation state |
| created_at | timestamptz | Creation time |

---

Typical statuses:

```
open
investigating
resolved
dismissed
```

Reports should never be physically deleted.

---

# Table: notification_log

## Purpose

Audit log for notifications.

This table records notifications that have already been generated.

It is useful for:

- debugging
- analytics
- preventing duplicates
- future email notifications
- push notifications

---

## Columns

| Column | Type | Description |
|----------|---------|----------------|
| id | uuid | Notification |
| user_id | uuid | Recipient |
| kind | text | Notification type |
| payload | jsonb | Additional data |
| sent_at | timestamptz | Time sent |

---

# Current Architectural Decisions

## Profiles are loaded explicitly

One important lesson during development involved loading listing owners.

Initially the backend attempted to use automatic PostgREST relationship syntax:

```sql
listings
→ profiles(...)
```

This failed because:

- `listings.owner_id` references `auth.users.id`
- **not** `profiles.id`

Therefore no automatic relationship exists.

Instead, the backend now performs:

1. Fetch listings.
2. Collect unique owner IDs.
3. Fetch matching profiles.
4. Merge profile data into listing objects.
5. Return frontend-ready objects.

Although this requires an additional query, it keeps the schema semantically correct and avoids introducing artificial foreign keys solely for API convenience.

This decision reflects one of Peregri's core engineering principles:

> **Database integrity is more important than query convenience.**

---

# Future Extensions

The current schema intentionally remains lightweight.

Likely future additions include:

- listing_images
- saved_listings
- verification_requests
- user_devices
- email_preferences
- notification_preferences
- admin_actions
- support_tickets
- currencies
- countries
- cities
- listing_views
- listing_favorites

New tables should be introduced only when they solve a real product problem rather than anticipating hypothetical future needs.