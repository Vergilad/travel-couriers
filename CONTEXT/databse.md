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
 │ payment
 ▼
Payment
 │
 │ completed
 ▼
Review
```

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
Payments
 │
 ▼
Reviews

Reports
Notifications
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

Conversation

↓

Agreement

↓

Matched

↓

Completed
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
| sender_id | uuid | Author |
| body | text | Message content |
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

## Typical Statuses

```
pending
authorized
paid
refunded
cancelled
```

---

# Table: reviews

## Purpose

Stores reviews after completed deliveries.

Reviews are linked to successful marketplace interactions.

---

## Columns

| Column | Type | Description |
|----------|---------|----------------|
| id | uuid | Review |
| listing_id | uuid | Listing |
| reviewer_id | uuid | Author |
| reviewee_id | uuid | Recipient |
| rating | integer | Rating |
| comment | text | Optional review |
| created_at | timestamptz | Creation time |

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