# Travel-Couriers — MVP Plan

A peer-to-peer marketplace where travelers carry items for people who need something
from another city/country, or senders who want to deliver something to a friend or relative.

---

## 1. Roles

A single user account can act in any of these roles per listing:

- **Courier** — posts a trip (route + dates + capacity + price)
- **Requester** — posts a request to buy & bring something from place X to place Y
- **Sender** — posts an item they want delivered from place X to place Y

No fixed account type — the role is on the listing, not the user. The same person
can be a courier this month and a requester next month.

---

## 2. Core Pages

```text
/                         Landing (cinematic hero, how it works, CTA)
/auth                     Sign in / Sign up (email + password, Google)
/browse                   Search & filter listings (by route, dates, type, rating)
/trips/new                Create a trip (courier)
/requests/new             Create a request (requester)
/deliveries/new           Create a delivery (sender)
/listings/$id             Listing detail + "Contact" button
/messages                 Inbox of conversations (with match-status badge)
/messages/$threadId       Conversation view (realtime) + Confirm Match button
/pay/$threadId            Stripe Checkout flow (payer-side)
/pay/$threadId/success    Post-payment confirmation screen
/profile/$userId          Public profile: avatar, bio, rating, reviews, listings
/settings                 Edit own profile, avatar
/reports/new?target=...   Submit a report on a user or listing
```

Public routes (no auth required): `/`, `/auth`, `/browse`, `/listings/$id`, `/profile/$userId`.
Everything else lives under `_authenticated/`.

---

## 3. Data Model (Lovable Cloud / Supabase)

```text
profiles(id → auth.users, display_name, avatar_url, bio, city, country,
         created_at, is_banned)

user_roles(user_id, role)
  -- 'admin' | 'user'  (security-definer has_role(); never on profiles table)

listings(id, owner_id, kind, origin_city, origin_country,
         dest_city, dest_country, depart_date, arrive_date,
         title, description, price, currency, capacity_kg,
         status, created_at)
  -- kind:   'trip' | 'request' | 'delivery'
  -- status: 'open' | 'matched' | 'completed' | 'cancelled'

threads(id, listing_id, created_at)

thread_participants(thread_id, user_id)

messages(id, thread_id, sender_id, body, created_at, read_at)

match_confirmations(thread_id, user_id, confirmed_at)
  -- unique(thread_id, user_id)
  -- DB trigger: when both participants have a row here
  --   → set listings.status = 'matched'
  --   → insert a payments row with status = 'pending'

payments(id, thread_id, listing_id, payer_id, payee_id,
         amount, currency,
         stripe_payment_intent_id, stripe_session_id,
         status, created_at, completed_at)
  -- status: 'pending' | 'processing' | 'completed' | 'refunded' | 'failed'
  -- payer  = the requester / sender (whoever owes money)
  -- payee  = the courier

reviews(id, listing_id, reviewer_id, reviewee_id, rating 1–5,
        comment, created_at)
  -- unique(listing_id, reviewer_id)
  -- only writable after payments.status = 'completed'

reports(id, reporter_id, target_user_id, target_listing_id,
        reason, details, status, created_at)
  -- status: 'open' | 'reviewed' | 'dismissed'

notification_log(id, user_id, kind, payload jsonb, sent_at)
  -- 'new_message' | 'match_confirmed' | 'payment_received'
  -- written by the Edge Function; prevents duplicate sends
```

### RLS Summary

| Table | Public read | Auth read | Write |
|---|---|---|---|
| profiles | ✅ all | — | owner only |
| listings | ✅ open ones | — | owner only |
| threads / thread_participants | ❌ | participants only | system (Contact fn) |
| messages | ❌ | participants only | participants only |
| match_confirmations | ❌ | participants only | participants only (once each) |
| payments | ❌ | payer + payee | system (trigger + webhook) |
| reviews | ✅ | — | post-payment participant, once |
| reports | ❌ | reporter + admins | any authed user |
| notification_log | ❌ | own rows | Edge Function (service role) |

---

## 4. Match & Confirmation Flow

1. User A clicks **Contact** on a listing → thread created (idempotent: same listing + same two users → same thread).
2. Both parties chat freely via the realtime conversation view.
3. Either party can click **Confirm Match** in the thread view → a row is inserted into `match_confirmations`.
4. The UI shows which side has confirmed ("Waiting for the other party…").
5. When the second row lands, a Postgres trigger fires:
   - Sets `listings.status = 'matched'`.
   - Creates a `payments` row (`status = 'pending'`) with the listing price & currency.
   - Sends a Supabase Realtime event so both UIs update live.
6. The payer sees a **Proceed to Payment** button → navigates to `/pay/$threadId`.

---

## 5. Payments (Stripe)

### Flow

```
/pay/$threadId
  → server fn creates a Stripe Checkout Session
      (amount from payments row, metadata: payment_id)
  → redirect to Stripe-hosted Checkout
  → on success: Stripe webhook → Edge Function
      → payments.status = 'completed'
      → payments.completed_at = now()
      → listings.status stays 'matched'
      (courier marks 'completed' manually on delivery)
  → user lands on /pay/$threadId/success
```

### Stripe Setup Notes

- Stripe Secret Key stored as a Supabase secret (`STRIPE_SECRET_KEY`).
- Stripe Webhook Secret stored as `STRIPE_WEBHOOK_SECRET`.
- Webhook endpoint: a Supabase Edge Function at `/functions/v1/stripe-webhook`.
- Handle these events: `checkout.session.completed`, `payment_intent.payment_failed`.
- **No escrow in MVP** — payment goes directly to Stripe Connect (or plain charge with manual payout in v2). For v1, document this clearly in the UX: "Payment is processed immediately."
- Currency: use the listing's `currency` field; Stripe handles conversion display.

---

## 6. In-App Messaging

- Thread creation: server fn, called when "Contact" is clicked; idempotent.
- Conversation view subscribes via Supabase Realtime on `messages`.
- Unread badge in the top nav from a `read_at IS NULL` count query.
- Match confirmation state shown as a persistent banner in the thread UI.

---

## 7. Email Notifications

Triggered by a Supabase Edge Function (`/functions/v1/notify`) invoked via:
- A Postgres `AFTER INSERT` trigger on `messages` → notify recipient.
- A Postgres `AFTER UPDATE` trigger on `listings` when `status` changes to `'matched'` → notify both parties.
- A Postgres `AFTER UPDATE` trigger on `payments` when `status` changes to `'completed'` → notify payee.

Email provider: **Resend** (simple REST API, generous free tier).
All emails are plain-text + minimal HTML; no marketing templates.

**Notification types**

| Event | Recipient | Subject line |
|---|---|---|
| New message | Thread recipient | "New message from [name] on Travel-Couriers" |
| Match confirmed | Both parties | "You're matched! Next step: payment" |
| Payment received | Courier (payee) | "Payment confirmed — safe travels!" |

The `notification_log` table prevents duplicate sends (check before sending).

---

## 8. Reviews & Rating

- Either participant can leave one review on the other for a given listing, but only after `payments.status = 'completed'`.
- Profile page shows average rating + count + recent reviews.
- Browse can sort by rating.

---

## 9. Reports & Bans (v1: reports only)

- "Report user" / "Report listing" buttons open `/reports/new`.
- Reports land in `reports` for manual review.
- `is_banned` on profiles blocks login/posting via RLS + auth check.
- Bans are toggled directly in the DB for v1 — no admin UI yet.

---

## 10. Design Direction

The reference feeling: a departure board at a quiet European airport at 5am. Purposeful,
unhurried, every element earning its place. Not a SaaS dashboard. Not a startup landing page.

### Color — exact values, no interpretation

```css
--bg:           #0D0B09;   /* near-black, warm undertone — not #000, not #111 */
--surface:      #151210;   /* cards, inputs, thread bubbles */
--surface-raised:#1C1915;  /* hover states, dropdowns */
--border:       #2C2520;   /* all dividers and outlines */
--accent:       #C47B22;   /* the one amber — airport signage, not generic gold */
--accent-dim:   #7A4D14;   /* secondary amber for icons, muted badges */
--text:         #EDE8E0;   /* warm off-white — not #fff */
--text-muted:   #7C6F62;   /* secondary labels, timestamps */
--text-faint:   #3D342C;   /* placeholder text */
--success:      #4E8A5E;
--destructive:  #9B4040;
```

No light mode in MVP — ship dark only, do it perfectly.

### Typography — exact decisions

- **Headlines** (`h1`, `h2`): Fraunces, weight 600, negative letter-spacing (`-0.03em`),
  `h1` at `clamp(3rem, 7vw, 6rem)`. No uppercase transforms on headlines.
- **Body**: Inter, 15px/1.65 line-height, weight 400. Not 16px — 15px reads tighter and more deliberate.
- **Route codes / dates / prices**: `JetBrains Mono`, 13px, weight 500, `--text-muted` color.
  Used for `BAKU → LONDON`, departure dates, kg capacity. Monospace makes data feel factual.
- **Labels / nav / buttons**: Inter, 13px, weight 500, `letter-spacing: 0.04em`, uppercase.
- Do **not** mix Fraunces into body copy — it is for display only, 32px minimum.

### Layout — what it looks like

- **Nav**: 64px tall, logo left, links center (desktop), avatar+unread right.
  Translucent `backdrop-blur` over hero; solid `--surface` elsewhere. No border — just a 1px
  bottom line in `--border`.
- **Landing hero**: full-viewport, cinematic airport photo (Unsplash: search "airport window
  golden hour"). Photo is desaturated 40% and color-graded toward warm shadow with a CSS
  `mix-blend-mode: multiply` overlay in `--bg`. Large `h1` in Fraunces overlaid, left-aligned,
  not centered. A single line below in Inter muted. One CTA button — no secondary button next to it.
- **Browse page**: **table/list layout by default** — not a card grid. Each row: route in mono
  (`BAKU → DUBAI`), traveler avatar + name, date, price, capacity. Clean horizontal lines.
  Optional card toggle. This alone separates it from every Airbnb clone.
- **Listing detail**: two-column on desktop (content left, sticky action panel right).
  Action panel has one primary button and the price displayed large in Fraunces.
- **Spacing scale**: 4 / 8 / 16 / 24 / 40 / 64 / 96 / 128px. Nothing in between.
  Sections breathe — 96px vertical padding minimum on landing.
- **Borders**: 1px, `--border` color. No `border-radius` above `8px` on content elements.
  Buttons: `6px` radius. Inputs: `6px` radius. Cards: `8px` max. No `rounded-2xl` anywhere.
- **Shadows**: none. Depth through color layering (`--surface` on `--bg`), not drop shadows.

### What this site must NOT have

- No gradient hero cards or feature sections with gradients
- No three-icon "how it works" row with emoji-sized icons
- No testimonials carousel
- No floating action bubble
- No skeleton that looks like a gray box with shimmer — use a text placeholder approach
- No `rounded-2xl` on anything
- No purple, blue, or teal anywhere in the palette
- No hero with text centered over a full-bleed image with a dark overlay and a centered CTA
  (that's every SaaS site from 2021–2024)

### Motion — purposeful only

All via `framer-motion`. Rules: motion must communicate state change or guide attention.
Never animate something just because you can.

- **Page transitions**: `opacity 0→1`, `y: 8→0`, `duration: 0.25s`. Subtle.
- **Browse list**: staggered `opacity + y` on initial load, `staggerChildren: 0.04s`.
- **Thread messages**: new message slides in from bottom, `y: 12→0`.
- **Match confirmed banner**: scale `0.96→1` + opacity, green tint flash then settles.
- **Buttons**: `scale: 1→0.97` on press (not lift — that's overused).
- **Counters on landing**: count up on scroll-enter, `duration: 1.4s`, easing `easeOut`.
- No infinite loops. No parallax. No scroll-jacking.

### Component restyle rules (shadcn override)

```css
/* Button primary */
background: var(--accent);
color: #0D0B09;
font: 500 13px/1 Inter;
letter-spacing: 0.04em;
text-transform: uppercase;
border-radius: 6px;
padding: 10px 20px;
transition: opacity 150ms;

/* Button primary:hover */
opacity: 0.85;  /* not a color shift, not a glow — just dim */

/* Input */
background: var(--surface);
border: 1px solid var(--border);
border-radius: 6px;
color: var(--text);
font-size: 15px;

/* Input:focus */
border-color: var(--accent-dim);
outline: none;
box-shadow: 0 0 0 3px rgba(196,123,34,0.12);
```

---

## 11. Tech Stack

### Frontend
| Concern | Choice |
|---|---|
| Framework | React + Vite (replaces TanStack Start) |
| Routing | TanStack Router (file-based, keeps existing route structure) |
| UI components | shadcn/ui (restyled — see Design Direction) |
| Animations | Motion (framer-motion) |
| Form validation | Zod + react-hook-form |
| API client | `fetch` / TanStack Query for caching + loading states |
| Realtime | Supabase JS client (subscriptions in browser) |

### Backend (Python)
| Concern | Choice |
|---|---|
| Framework | **FastAPI** |
| Auth middleware | `supabase-py` — validate Supabase JWT on every protected route |
| DB access | `supabase-py` (Python Supabase client) |
| Payments | `stripe` Python SDK |
| Email | `resend` Python SDK |
| Validation | **Pydantic v2** (FastAPI's native, mirrors Zod on the frontend) |
| Background tasks | FastAPI `BackgroundTasks` for post-request work (e.g. sending emails) |
| Stripe webhook | A single `POST /webhooks/stripe` endpoint, signature verified via SDK |
| Server | **Uvicorn** (dev) → **Gunicorn + Uvicorn workers** (prod) |

### Infrastructure
| Concern | Choice |
|---|---|
| DB / Auth / Storage / Realtime | Lovable Cloud (Supabase) |
| Auth methods | Email/password + Google (Supabase Auth) |
| File storage | Supabase bucket `avatars` |
| Deploy (backend) | **Railway** free tier — one `Dockerfile`, zero config |
| Deploy (frontend) | **Vercel** free tier |

### Backend project structure
```
backend/
  main.py               # FastAPI app, router includes
  routers/
    auth.py             # JWT helper, current_user dep
    listings.py         # CRUD + browse
    threads.py          # create thread (idempotent)
    messages.py         # send message
    matches.py          # confirm match
    payments.py         # create Stripe session
    webhooks.py         # stripe webhook handler
    reviews.py
    reports.py
  models.py             # Pydantic request/response models
  db.py                 # supabase-py client singleton
  requirements.txt
  Dockerfile
```

### Auth flow with FastAPI + Supabase
```python
# Every protected route gets this dependency
async def current_user(authorization: str = Header(...)):
    token = authorization.removeprefix("Bearer ")
    user = supabase.auth.get_user(token)   # validates JWT server-side
    if not user:
        raise HTTPException(401)
    return user.user
```
Frontend sends `Authorization: Bearer <supabase_access_token>` with every API call.
Supabase still owns auth and realtime — FastAPI owns all business logic and mutations.

---

## 12. Build Order

| Step | What |
|---|---|
| 1 | Supabase schema migration (tables, RLS, GRANTs, `has_role`, triggers) |
| 2 | FastAPI project scaffold — `main.py`, routers, `db.py`, Dockerfile, `requirements.txt` |
| 3 | Auth middleware (`current_user` dep) + smoke-test with Supabase JWT |
| 4 | Design tokens in `src/styles.css` + fonts + shadcn restyle (tell Antigravity to browse `motion.dev` and `godly.website` for reference first) |
| 5 | Landing page + root shell (nav, footer, auth-aware header) — Antigravity generates hero image via Nano Banana Pro, pulls airport photo via Unsplash MCP |
| 6 | Auth pages (email/password + Google via Supabase) + `_authenticated` route guard |
| 7 | Profile pages (settings + public `/profile/$userId`) + avatar upload to Supabase bucket |
| 8 | Listings: FastAPI CRUD routes + React create forms (trip / request / delivery) + `/browse` + `/listings/$id` |
| 9 | Messaging: FastAPI thread + message routes, React inbox + realtime conversation (Supabase Realtime in browser) + Confirm Match UI |
| 10 | Match confirmation trigger (Postgres) + FastAPI `POST /matches/confirm` endpoint |
| 11 | Stripe: FastAPI `POST /payments/session`, Stripe Checkout redirect, `POST /webhooks/stripe`, success screen |
| 12 | Email notifications: FastAPI `BackgroundTasks` → Resend SDK, triggered from match + payment routes |
| 13 | Reviews: FastAPI route (post-payment guard) + React form + profile display |
| 14 | Reports: FastAPI route + React form |
| 15 | Polish: motion animations, empty states, loading skeletons, mobile pass |

After approval, execute steps 1–15 in build mode.
