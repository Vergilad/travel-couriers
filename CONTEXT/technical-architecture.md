# Technical Architecture of Peregri

> **This file supersedes the PDF of the same name.** Keep this file updated as the codebase evolves.

---

## Architecture Overview

```
React + TypeScript  →  (HTTP)  →  FastAPI Backend  →  Supabase (Postgres + Auth + Storage + Realtime)
```

The frontend is intentionally separated from the backend.

- **Supabase** manages infrastructure (auth, database, storage, realtime).
- **FastAPI** manages business logic.
- **React** manages presentation.

The frontend never calls Supabase directly except for: authentication session management and carefully selected realtime subscriptions (unread message count).

---

## Technology Stack

### Frontend
- React 19 + TypeScript
- Vite 8
- TanStack Router (type-safe, nested layouts, search parameter validation)
- TanStack Query (server state, caching, mutation)
- Tailwind CSS v4
- shadcn/ui (copied into project and adjusted to Peregri design language — not a runtime dependency to keep updated)
- Framer Motion

### Backend
- FastAPI (Python)
- Supabase Python client (service role — bypasses RLS, validates auth in Python instead)
- Stripe (payments)
- Resend (transactional email — currently imported, not yet wired to UI flows)
- httpx (Telegram bot communication for verification)

### Database
- Supabase PostgreSQL
- Row Level Security enabled on all tables
- Business logic in Python, not SQL (triggers are used only where atomicity is required)

---

## Frontend Architecture

### Routing
TanStack Router. Routes are defined in `frontend/src/router.tsx`.

```
/                    Landing page (public)
/browse              Browse open listings (public)
/auth                Sign in / sign up
/listings/$id        Listing detail (public)
/profile/$userId     Public user profile (public)
/trips/new           Create trip listing (auth)
/requests/new        Create request listing (auth)
/deliveries/new      Create delivery listing (auth)
/messages            Inbox — thread list (auth)
/messages/$threadId  Specific thread (auth)
/my-listings         User's own listings (auth)
/matches             Algorithmic matching against own listings (auth)
/settings            Profile settings (auth)
/verify              Identity verification flow (auth)
/reports/new         [PLACEHOLDER — not yet implemented as a form]
```

Auth-required routes are wrapped in an `AuthGuard` layout route that redirects unauthenticated users to `/auth`.

### Key frontend files

| File | Purpose |
|------|---------|
| `src/router.tsx` | All route definitions |
| `src/lib/auth.tsx` | `useAuth` hook — session, profile, unread count, Supabase realtime |
| `src/lib/api.ts` | `authedFetch` — injects Supabase JWT into every request |
| `src/lib/listings.ts` | Shared formatters: `formatRoute`, `formatListingDate`, `formatPrice`, `kindLabel` |
| `src/lib/supabase.ts` | Supabase client (reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`) |
| `src/components/layout/Nav.tsx` | Top navigation bar + slide-in user drawer + mobile menu |
| `src/components/ui/listing-row.tsx` | Reusable listing row used in Browse, Matches, etc. |
| `src/types/listing.ts` | `Listing` interface (source of truth for frontend types) |

### Listing type

```typescript
interface Listing {
  id: string
  owner_id: string
  kind: "trip" | "request" | "delivery"
  origin_city: string
  origin_country: string
  dest_city: string
  dest_country: string
  depart_date: string
  arrive_date: string
  date_flexibility: "exact" | "week" | "month"
  title: string
  description: string | null
  price: number | null
  currency: string
  capacity_kg: number | null
  status: "open" | "matched" | "dealing" | "completed" | "cancelled"
  created_at: string
  owner_display_name?: string | null
}
```

---

## Backend Architecture

### Entry point
`backend/main.py` — loads env, configures CORS (allow all origins), mounts routers.

### Router structure

All routers live in `backend/routers/`. Each is mounted at a prefix in `main.py`.

| Router file | Prefix | Purpose |
|-------------|--------|---------|
| `listings.py` | `/api/listings` | CRUD for listings + matching |
| `matches.py` | `/api/matches` | Deal lifecycle (confirm, handover, received) |
| `messages.py` | `/api/messages` | Send + read messages |
| `threads.py` | `/api/threads` | Create + list conversation threads |
| `profiles.py` | `/api/profiles` | Read/update profiles |
| `payments.py` | `/api/payments` | Stripe checkout session creation |
| `webhooks.py` | `/api/webhooks` | Stripe webhook handler |
| `reviews.py` | `/api/reviews` | Submit reviews against completed deals |
| `reports.py` | `/api/reports` | Submit user/listing abuse reports |
| `verification.py` | `/api/verification` | Identity verification via Telegram bot |
| `auth.py` | — | `get_current_user` dependency (validates Supabase JWT) |

### API endpoint reference

#### Listings — `/api/listings`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Browse open listings. Filters: `kind`, `origin_city`, `dest_city`, `status`, `price_min`, `price_max`, `depart_from`, `depart_to`, `limit`, `offset`. Date filtering is Python-side to support flexibility windows. |
| GET | `/mine` | Yes | Current user's own listings (all statuses). |
| GET | `/matches` | Yes | Listings from other users that match the current user's open listings by complementary kind, same route (ILIKE), and overlapping date window. Returns `[{ listing, matches[] }]`. |
| GET | `/{id}` | No | Single listing with owner profile attached. |
| POST | `/` | Yes | Create a listing. |
| PATCH | `/{id}` | Yes | Update own listing. |
| DELETE | `/{id}` | Yes | Delete own listing. |

> **Static routes before dynamic:** `/mine` and `/matches` must be defined before `/{id}` in the router so FastAPI resolves them correctly. This is already the case.

#### Matches/Deals — `/api/matches`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | Current state of match for a thread. |
| POST | `/confirm` | Yes | Stage 1: both parties confirm the arrangement. Creates `delivery_confirmations` row and system messages. |
| POST | `/handover` | Yes | Courier marks item as handed over (`handed_over_at`). |
| POST | `/received` | Yes | Recipient confirms receipt (`received_at`). Archives deal to `completed_deals`, marks listing completed (trip listings stay open). |

#### Threads — `/api/threads`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List threads for current user, with last message and unread count. |
| POST | `/` | Yes | Start a new conversation on a listing. |

#### Messages — `/api/messages`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/{thread_id}` | Yes | All messages in a thread. |
| POST | `/` | Yes | Send a message. |

#### Profiles — `/api/profiles`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | Yes | Own profile. |
| PATCH | `/me` | Yes | Update own profile. |
| GET | `/{user_id}` | No | Public profile. |
| GET | `/{user_id}/listings` | No | Public listings for a user. |

#### Payments — `/api/payments`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/session` | Yes | Create Stripe Checkout session. |

> **Known gap:** The frontend has no payment flow UI. The Stripe success/cancel redirect URLs (`/pay/{thread_id}/success` and `/pay/{thread_id}`) do not exist as frontend routes. Payments are backend-ready but not user-accessible yet. `FRONTEND_URL` env var must be set correctly for redirects to work.

#### Webhooks — `/api/webhooks`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/stripe` | No (signature-verified) | Stripe webhook — marks payment completed on `charge.succeeded`. |

#### Reviews — `/api/reviews`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Submit a review against a `completed_deal_id`. |

#### Reports — `/api/reports`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Submit an abuse report. |

> **Known gap:** `/reports/new` in the frontend renders a placeholder page — the report submission form is not yet built.

#### Verification — `/api/verification`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/status` | Yes | Returns verification state: `verified`, `method`, `status`, `rejection_reason`. |
| POST | `/start-manual` | Yes | Submit ID photo + selfie for manual review. Photos are forwarded to admin Telegram chat and **never stored on the server**. A `verification_requests` row records the pending request (name only, no photos). |
| POST | `/bot-webhook` | No (secret-verified) | Telegram bot webhook — receives admin approve/reject callbacks and updates `profiles.identity_verified`. |
| POST | `/setup-webhook` | Yes | One-time helper to register the bot webhook URL with Telegram. |

---

## Matching Algorithm

`GET /api/listings/matches` implements route-based matching:

1. Fetch current user's open listings.
2. For each, determine complementary kinds:
   - `trip` → matches `request` + `delivery`
   - `request` or `delivery` → matches `trip`
3. Query listings from other users on the same route (case-insensitive `ILIKE` on `origin_city` + `dest_city`).
4. Filter by **date window overlap** using `dates_overlap()` in `backend/models.py`:
   ```python
   # Two windows [date_a ± flex_a] and [date_b ± flex_b] overlap if:
   lo_a <= hi_b and lo_b <= hi_a
   # A null date matches everything (undated = always flexible)
   ```
   Flexibility values: `exact` = 0 days, `week` = ±7 days, `month` = ±30 days.
5. Attach owner profiles and return grouped by user's listing.

---

## Date Flexibility

Listings have a `date_flexibility` field (`"exact"` | `"week"` | `"month"`). This widens the matchable date range on both the browse endpoint (via `date_falls_in_window`) and the matches endpoint (via `dates_overlap`). Logic lives in `backend/models.py`.

---

## Identity Verification

Manual verification flow:
1. User submits full name + ID photo + selfie via `POST /api/verification/start-manual`.
2. Backend forwards photos to admin's Telegram chat via bot. **Photos are never written to disk or stored.**
3. A `verification_requests` row is created with `status: "pending"` (name only stored).
4. Admin taps Approve/Reject in Telegram.
5. Bot webhook fires `POST /api/verification/bot-webhook`.
6. On approve: `profiles.identity_verified = true`, `profiles.verification_method = "manual"`, request row updated to `approved`.
7. On reject: request row updated to `rejected` with reason.

Verified status is surfaced on public profiles and listing detail pages via `VerifiedBadge` / `UnverifiedBadge` components.

---

## Environment Variables

### Required — backend
| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS) |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `FRONTEND_URL` | Base URL of deployed frontend (used in Stripe redirect URLs) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for verification |
| `TELEGRAM_ADMIN_CHAT_ID` | Telegram chat ID where verification photos are sent |
| `TELEGRAM_WEBHOOK_SECRET` | Secret token to validate incoming Telegram webhooks |

### Required — frontend (Vite)
| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public, safe to expose) |

---

## Owner Profile Attachment Pattern

Listings don't have a foreign key to `profiles` (they reference `auth.users`), so PostgREST auto-joins don't work. The backend uses an explicit two-step pattern throughout:

```python
# 1. Fetch listings
rows = supabase.table("listings").select("*").execute().data

# 2. Collect unique owner IDs
owner_ids = {r["owner_id"] for r in rows}

# 3. Fetch profiles
profiles = supabase.table("profiles").select("id, display_name, avatar_url, ...").in_("id", owner_ids).execute().data

# 4. Merge
profile_map = {p["id"]: p for p in profiles}
for row in rows:
    row["owner"] = profile_map.get(row["owner_id"])
```

This pattern is centralized in `attach_owner_profiles()` in `backend/routers/listings.py` and reused across browse, detail, and matches endpoints.

---

## Backend Helpers

| File | Purpose |
|------|---------|
| `backend/db.py` | Supabase client initialization |
| `backend/models.py` | Pydantic schemas + date helpers (`flexibility_window_days`, `date_falls_in_window`, `dates_overlap`) |
| `backend/db_constants.py` | Centralized table/field name constants (`Tables`, `ProfileFields`, `ListingFields`, `MessageFields`, `ListingStatus`) |
| `backend/error_handlers.py` | `@handle_db_errors` decorator for consistent error responses |
| `backend/query_helpers.py` | Generic `get_record_by_id` and `get_records_with_filters` helpers |
| `backend/routers/auth.py` | `get_current_user` FastAPI dependency — validates Supabase JWT from `Authorization` header |

---

## Realtime

Supabase Realtime is used in `frontend/src/lib/auth.tsx` to subscribe to new messages and keep the unread count badge accurate. Realtime is not used for any other feature — other data uses standard query invalidation via TanStack Query.

---

## AI Development Rules

- Do not rewrite existing systems unless explicitly requested.
- Prefer extending existing code.
- Preserve naming conventions, folder organization, and design tokens.
- Do not introduce additional state management libraries.
- Do not add utility folders. Features stay co-located.
- Prefer obvious over clever.
- When adding a backend endpoint that should come before `/{id}` in a router, always place it physically before that route definition.
- When adding a new page: create the page file, register the route in `router.tsx`, and add the nav link to both the `UserDrawer` navItems array and the mobile menu block in `Nav.tsx`.
