# Project Context — Peregri

> **This file supersedes the PDF of the same name.** Keep this file updated whenever a major feature area changes state.

**Project name:** Peregri (working title)
**Status:** MVP with the core marketplace loop implemented end-to-end. Pre-launch; no real users yet.

**Purpose of this document:** Single source of truth for the project's philosophy, current state, and development history. Every developer or AI agent working on this project should read this before making changes. The CONTEXT directory also contains dedicated files for Design Philosophy, Technical Architecture, and Database Design — read all of them.

---

## 1. What is Peregri?

A marketplace that connects international travelers with people who need items transported across borders.

Instead of using traditional courier companies, the platform allows ordinary travelers to carry items in unused luggage space and earn money, while requesters receive significantly cheaper international delivery.

Peregri is **not** a courier company, logistics company, Uber for packages, or classified ads site. It is a marketplace connecting travelers with delivery requests. The traveler is always an independent user. The platform only facilitates matching, communication, and payment.

**Example:**
- Alice is flying from Berlin to New York.
- Bob wants someone to bring him a graphics tablet.
- Alice has spare luggage capacity.
- Bob pays Alice through the platform.
- Both users verify completion. Both leave reviews.

The traveler earns money for a trip they were already making. The requester receives a much cheaper delivery.

---

## 2. Core Philosophy

The project is built around one simple observation: **people travel anyway.**

Peregri connects people who already have matching interests. The platform does not create transportation — it matches existing transportation. That distinction is important because it keeps the marketplace scalable and simple.

### Long-term vision

The goal is to become the default place people visit whenever they think: *"Someone is already going there."*

Instead of asking friends, posting on Facebook, or messaging Telegram groups, people should naturally check Peregri. Eventually the platform should support travelers, delivery requests, personal shopping, airport pickups, local errands, document delivery, and international communities — everything connected through one marketplace.

### Target audience

The initial audience is not "everyone." First users should come from routes where international travel is already common and dense: Mexico ↔ United States, EU ↔ UK, Turkey ↔ Germany, Poland ↔ Ukraine, Azerbaijan ↔ Russia, Kazakhstan ↔ Russia.

Launching in one dense corridor is significantly better than launching globally with no liquidity.

### Marketplace philosophy

**Density over geography.** One active route with thousands of users is better than fifty inactive countries. Every product decision should increase marketplace liquidity.

### Business model

Primary revenue: platform fee on successful transactions.

Future potential: promoted listings, verified traveler subscription, insurance, premium visibility, business accounts, API integrations.

Avoid excessive monetization during MVP. Growth is more valuable than immediate profit.

### Trust philosophy

Trust is the single biggest challenge. Every feature should increase trust. Examples: verified identity, reviews, ratings, completed deliveries, profile history, response time.

### Product principles

Every feature should satisfy at least one of: reduce friction, increase trust, improve matching, simplify communication. If a feature doesn't improve one of those four things, reconsider whether it belongs in the MVP.

---

## 3. Development Philosophy

The project intentionally prioritizes correct architecture over fast hacks. It is acceptable to spend extra time designing a clean solution if it avoids technical debt.

The goal is not simply finishing the MVP — it is building a foundation that can survive years of development.

### AI collaboration philosophy

AI is used as a development assistant. AI should accelerate implementation. AI should **not** redesign architecture without explicit approval.

Whenever AI proposes changes it should preserve: existing architecture, design language, naming conventions, database philosophy, user experience.

Consistency is valued more than novelty. Large rewrites are discouraged unless explicitly requested.

See the Design Philosophy and Technical Architecture files for the specific rules that govern UI and backend decisions respectively.

---

## 4. Current Project State

*(Update this section whenever a major feature area changes.)*

### Implemented and complete

| Feature | Notes |
|---------|-------|
| Authentication | Supabase Auth — sign in, sign up, session management |
| Profiles | Public profile pages, avatar, bio, city/country, transaction history |
| Listings | Trip / delivery / request kinds; create, browse, filter by route + date + price; date flexibility (exact / ±1 week / ±1 month) |
| Listing detail | Full detail page with owner info, verified badge |
| Messaging | Threads, conversations, system-generated event notices (`is_system` messages) |
| Match confirmation | Both parties confirm → `delivery_confirmations` row created |
| Delivery flow | Courier marks handover; recipient confirms receipt → deal archived to `completed_deals` |
| Completed-deal history | Immutable snapshots driving profile history and review eligibility |
| Reviews | Tied to a specific `completed_deal_id`; one review per participant per deal |
| Payments | Stripe Checkout session created; webhook confirms payment |
| Reports | User/listing abuse report submission (backend complete) |
| Algorithmic matching | `/matches` page: shows complementary listings from other users that overlap your own listings by route and date window |
| Identity verification | Manual flow: user submits ID + selfie → admin reviews via Telegram bot → `profiles.identity_verified` set on approval |
| 404 page | Styled not-found page |
| Navigation | Top nav bar, slide-in user drawer, mobile hamburger menu |

### Known gaps / placeholder features

| Item | Status |
|------|--------|
| Payment frontend | Backend Stripe integration is ready; no checkout UI exists in the frontend. `/pay/{thread_id}` and `/pay/{thread_id}/success` routes do not exist → Stripe redirects currently land on 404. |
| Report form | `/reports/new` route renders a "coming soon" placeholder — no submission form yet. |
| `FRONTEND_URL` env var | Required for Stripe redirects; not yet documented in deployment secrets. |

---

## 5. Schema Migration History

Migrations live in `supabase/migrations/`. In chronological order:

| Migration | What it added |
|-----------|--------------|
| `0001_initial_schema.sql` | Base schema: profiles, listings, threads, messages, payments, reviews, reports, notification_log |
| `20260621055403_initial_schema.sql` | Duplicate/revised initial schema |
| `20260626000000_listings_extended_fields.sql` | `listings.date_flexibility` column |
| `20260629000000_match_and_history.sql` | `messages.is_system`, `completed_deals` table, revised match confirmation trigger |
| `20260704000000_simplify_date_flexibility.sql` | Simplified flexibility enum |
| `20260705000000_reviews_anchor_completed_deals.sql` | Reviews now reference `completed_deal_id` instead of `listing_id` directly |
| `20260712000000_option_b_delivery_flow.sql` | `delivery_confirmations` table |

---

## 6. What Peregri is NOT

- Not a courier company or logistics company
- Not Uber for packages
- Not a classified ads website
- Not a platform where the traveler is an employee or contractor

The traveler is always an independent user. The platform facilitates matching, communication, and payment only.
