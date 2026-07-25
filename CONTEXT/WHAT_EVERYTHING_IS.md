Here's the full breakdown, organized by directory.
Root
File	Purpose
.gitignore	Root git ignores (covers both frontend and backend)
.mailmap	Maps commit author name variants for clean git shortlog output
CONTEXT/

Documentation directory — read before making changes.
File	Purpose
project-context.md	✅ Current — project philosophy, current state, migration history, known gaps
technical-architecture.md	✅ Current — full API reference, env vars, matching algorithm, verification flow
databse.md	✅ Current — every database table, column, and relationship documented
Design Philosophy-1.pdf	Still accurate — visual design rules, color tokens, typography, component philosophy, AI design rules
Technical Architecture of Peregri.pdf	⚠️ Superseded by technical-architecture.md
PROJECT_CONTEXT.md.pdf	⚠️ Superseded by project-context.md
backend/

FastAPI Python backend. Runs with uvicorn on port 8000.
File	Purpose
main.py	App entrypoint. Creates FastAPI instance, adds CORS middleware (allow all origins), mounts all routers at their /api/... prefixes, exposes GET /health
db.py	Supabase client init. Reads SUPABASE_URL + SUPABASE_SERVICE_KEY from env, creates a single supabase client used across all routers
models.py	All Pydantic request schemas (ListingCreate, MessageCreate, ReviewCreate, ReportCreate, ProfileUpdate) + validation logic (price/capacity limits, date ordering, text length caps) + date helpers: flexibility_window_days, date_falls_in_window, dates_overlap
db_constants.py	Centralized string constants — Tables, ProfileFields, ListingFields, MessageFields, ListingStatus. Prevents typos when referencing Supabase table/column names
error_handlers.py	@handle_db_errors(action) decorator — wraps async route handlers to catch exceptions and return clean 400 responses
query_helpers.py	Generic DB helpers: get_record_by_id, get_records_with_filters — used by a few routers to reduce boilerplate
requirements.txt	Dependencies: fastapi, uvicorn[standard], supabase, stripe, resend, pydantic, python-dotenv, python-jose[cryptography], cryptography, httpx, python-multipart
Dockerfile	Python 3.11 image, installs requirements, runs uvicorn backend.main:app --host 0.0.0.0 --port 8000
backend/routers/

Each file is an APIRouter mounted in main.py.
File	Prefix	Purpose
auth.py	—	Not a mounted router. Exports get_current_user FastAPI dependency — extracts the Bearer token from the Authorization header and validates it against Supabase, returning the user object
listings.py	/api/listings	Browse, create, update, delete listings. Also GET /mine (own listings) and GET /matches (algorithmic matching against own open listings). Contains attach_owner_profiles() — the shared helper that does the two-step profile fetch-and-merge used everywhere
matches.py	/api/matches	Deal lifecycle state machine: POST /confirm (both parties agree → creates delivery_confirmations row + system messages), POST /handover (courier marks item handed over), POST /received (recipient confirms → archives to completed_deals, closes listing)
threads.py	/api/threads	List threads for inbox (parallel-fetches participants, profiles, listings, last message, unread count); create new thread on a listing
messages.py	/api/messages	Fetch all messages for a thread; send a message; mark thread as read
profiles.py	/api/profiles	GET/PATCH /me (own profile); GET /{id} (public profile with rating + review count); GET /{id}/listings (user's public listings); reconstructs deal history from completed_deals snapshots
payments.py	/api/payments	POST /session — creates a Stripe Checkout session for a matched thread's pending payment row. Redirects to FRONTEND_URL/pay/{thread_id}/success on completion (⚠️ those frontend routes don't exist yet)
webhooks.py	/api/webhooks	POST /stripe — receives Stripe checkout.session.completed events, verifies signature, marks the internal payments row as completed
reviews.py	/api/reviews	POST / — submit a review against a completed_deal_id. Enforces: reviewer must be a participant, can't review themselves, one review per deal per person
reports.py	/api/reports	POST / — submit an abuse report targeting either a user or a listing
verification.py	/api/verification	Full manual identity verification flow: GET /status (current state), POST /start-manual (upload ID + selfie → forwarded to Telegram, never stored), POST /bot-webhook (Telegram admin taps Approve/Reject → updates profiles.identity_verified), POST /setup-webhook (one-time Telegram webhook registration)
__init__.py	—	Empty — marks the directory as a Python package
frontend/

React + Vite + TypeScript SPA. Dev server runs on port 5000, proxies /api to backend port 8000.
Config files
File	Purpose
vite.config.ts	Vite setup: React + Tailwind v4 plugins, @ alias → src/, dev server on 0.0.0.0:5000, /api proxy to localhost:8000, allowedHosts: true (required for Replit preview)
index.html	HTMLHere's the full breakdown, organized by directory.
Root
File	Purpose
.gitignore	Root git ignores (covers both frontend and backend)
.mailmap	Maps commit author name variants for clean git shortlog output
CONTEXT/

Documentation directory — read before making changes.
File	Purpose
project-context.md	✅ Current — project philosophy, current state, migration history, known gaps
technical-architecture.md	✅ Current — full API reference, env vars, matching algorithm, verification flow
databse.md	✅ Current — every database table, column, and relationship documented
Design Philosophy-1.pdf	Still accurate — visual design rules, color tokens, typography, component philosophy, AI design rules
Technical Architecture of Peregri.pdf	⚠️ Superseded by technical-architecture.md
PROJECT_CONTEXT.md.pdf	⚠️ Superseded by project-context.md
backend/

FastAPI Python backend. Runs with uvicorn on port 8000.
File	Purpose
main.py	App entrypoint. Creates FastAPI instance, adds CORS middleware (allow all origins), mounts all routers at their /api/... prefixes, exposes GET /health
db.py	Supabase client init. Reads SUPABASE_URL + SUPABASE_SERVICE_KEY from env, creates a single supabase client used across all routers
models.py	All Pydantic request schemas (ListingCreate, MessageCreate, ReviewCreate, ReportCreate, ProfileUpdate) + validation logic (price/capacity limits, date ordering, text length caps) + date helpers: flexibility_window_days, date_falls_in_window, dates_overlap
db_constants.py	Centralized string constants — Tables, ProfileFields, ListingFields, MessageFields, ListingStatus. Prevents typos when referencing Supabase table/column names
error_handlers.py	@handle_db_errors(action) decorator — wraps async route handlers to catch exceptions and return clean 400 responses
query_helpers.py	Generic DB helpers: get_record_by_id, get_records_with_filters — used by a few routers to reduce boilerplate
requirements.txt	Dependencies: fastapi, uvicorn[standard], supabase, stripe, resend, pydantic, python-dotenv, python-jose[cryptography], cryptography, httpx, python-multipart
Dockerfile	Python 3.11 image, installs requirements, runs uvicorn backend.main:app --host 0.0.0.0 --port 8000
backend/routers/

Each file is an APIRouter mounted in main.py.
File	Prefix	Purpose
auth.py	—	Not a mounted router. Exports get_current_user FastAPI dependency — extracts the Bearer token from the Authorization header and validates it against Supabase, returning the user object
listings.py	/api/listings	Browse, create, update, delete listings. Also GET /mine (own listings) and GET /matches (algorithmic matching against own open listings). Contains attach_owner_profiles() — the shared helper that does the two-step profile fetch-and-merge used everywhere
matches.py	/api/matches	Deal lifecycle state machine: POST /confirm (both parties agree → creates delivery_confirmations row + system messages), POST /handover (courier marks item handed over), POST /received (recipient confirms → archives to completed_deals, closes listing)
threads.py	/api/threads	List threads for inbox (parallel-fetches participants, profiles, listings, last message, unread count); create new thread on a listing
messages.py	/api/messages	Fetch all messages for a thread; send a message; mark thread as read
profiles.py	/api/profiles	GET/PATCH /me (own profile); GET /{id} (public profile with rating + review count); GET /{id}/listings (user's public listings); reconstructs deal history from completed_deals snapshots
payments.py	/api/payments	POST /session — creates a Stripe Checkout session for a matched thread's pending payment row. Redirects to FRONTEND_URL/pay/{thread_id}/success on completion (⚠️ those frontend routes don't exist yet)
webhooks.py	/api/webhooks	POST /stripe — receives Stripe checkout.session.completed events, verifies signature, marks the internal payments row as completed
reviews.py	/api/reviews	POST / — submit a review against a completed_deal_id. Enforces: reviewer must be a participant, can't review themselves, one review per deal per person
reports.py	/api/reports	POST / — submit an abuse report targeting either a user or a listing
verification.py	/api/verification	Full manual identity verification flow: GET /status (current state), POST /start-manual (upload ID + selfie → forwarded to Telegram, never stored), POST /bot-webhook (Telegram admin taps Approve/Reject → updates profiles.identity_verified), POST /setup-webhook (one-time Telegram webhook registration)
__init__.py	—	Empty — marks the directory as a Python package
frontend/

React + Vite + TypeScript SPA. Dev server runs on port 5000, proxies /api to backend port 8000.
Config files
File	Purpose
vite.config.ts	Vite setup: React + Tailwind v4 plugins, @ alias → src/, dev server on 0.0.0.0:5000, /api proxy to localhost:8000, allowedHosts: true (required for Replit preview)
index.html	HTML shell. Loads Google Fonts (DM Sans weights 300/400/500, JetBrains Mono), sets class="dark" on <html>, mounts at <div id="root">
package.json	Project metadata + scripts (dev, build, lint, preview) + all dependencies
tsconfig.json	Root TS config — references tsconfig.app.json and tsconfig.node.json
tsconfig.app.json	App TS config — targets ES2023, verbatimModuleSyntax, path alias @/* → src/*
tsconfig.node.json	TS config for Vite config file itself (Node environment)
tsconfig.tsbuildinfo	TypeScript incremental build cache
components.json	shadcn/ui config — base-nova style, CSS variables strategy, icon library lucide, @/components aliases
frontend/public/
File	Purpose
(empty)	No static assets currently. hero.jpg was removed — landing page uses a generated SVG background instead
frontend/src/
Entry points
File	Purpose
main.tsx	React DOM mount. Renders <App /> into #root with StrictMode, imports index.css
App.tsx	Root component. Wraps the app in AuthProvider, QueryClientProvider (30s stale time), and RouterProvider
index.css	The design system. Defines all CSS custom properties (--bg, --surface, --surface-raised, --border, --accent, --accent-dim, --text, --text-muted, --text-faint, --success, --destructive, spacing scale --space-1 through --space-8), font variables (--font-sans, --font-serif, --font-mono), and re-exposes them as Tailwind theme tokens via @theme inline
vite-env.d.ts	Vite client type stubs for import.meta.env
router.tsx	All TanStack Router route definitions. Authenticated routes are grouped under an AuthGuard layout route that redirects to /auth if no session
src/lib/

Shared utilities and services.
File	Purpose
supabase.ts	Supabase JS client, initialized from VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY. Exports typed client using Database from types/supabase.ts. Logs a warning (doesn't crash) if env vars are missing
auth.tsx	AuthProvider + useAuth hook. Manages Supabase session, loads and caches the user's profiles row, subscribes to new messages via Supabase Realtime to keep the unreadCount badge accurate across the session
api.ts	authedFetch(path, options) — wraps fetch, injects the current Supabase session JWT as Authorization: Bearer. Also exports fetchOpenListings for public listing queries
listings.ts	Shared listing formatters: formatRoute (e.g. PARIS → DAKAR), formatListingDate (e.g. May 20), formatPrice (handles null/undefined → "Negotiable", zero → "Free", locale-formatted otherwise), kindLabel (e.g. "Trip")
db_constants.ts	Frontend mirror of backend constants — table/field name strings used in Supabase direct calls (e.g. from auth.tsx). Also exports getInitial(name) used by the Nav avatar
utils.ts	One export: cn(...classes) — combines clsx + tailwind-merge for conditional class composition
src/types/
File	Purpose
listing.ts	ListingKind, ListingStatus, and the core Listing interface — source of truth for listing shape across all frontend pages
supabase.ts	Auto-generated Supabase types — maps every database table to TypeScript Row, Insert, and Update interfaces. Not edited by hand; regenerate with supabase gen types when schema changes
src/hooks/
File	Purpose
use-pointer-position.ts	Returns live {x, y} mouse coordinates via a mousemove listener. Used to drive the interactive radial gradient on the Auth page background
src/components/layout/
File	Purpose
Layout.tsx	Root layout wrapper rendered on every route. Stacks ScrollProgress (top bar), Nav, <Outlet /> (page content), Footer
Nav.tsx	Fixed top navigation bar. On desktop: logo left, profile avatar button right (opens UserDrawer). On mobile: logo left, hamburger right (opens fullscreen menu). UserDrawer is the slide-in panel with Browse, My Listings, Matches, Messages (with unread badge), Settings, Sign out
Footer.tsx	App footer. Brand mark, mission line, nav links, Framer Motion scroll-reveal animations
src/components/ui/

Primitive design-system components, all styled with Peregri design tokens.
File	Purpose
badge.tsx	Pill badge using class-variance-authority. Variants: trip (blue), request (green), delivery (purple), matched (yellow), completed (muted)
button.tsx	Base button using @base-ui/react. Variants: default (primary/accent), secondary, outline, ghost, destructive, link. Includes hover scale via Framer Motion
input.tsx	Styled <input> — applies --border, --accent focus ring, --text-faint placeholder color
listing-row.tsx	Reusable listing row used in Browse, Matches, and elsewhere. Grid layout: route → kind badge → date → price → arrow. Hover: slides right 4px, shows left accent bar
src/components/ (root-level components)
File	Purpose
CityAutocomplete.tsx	City search input with autocomplete. Debounces keystrokes, queries the Photon (OpenStreetMap) geocoding API, displays dropdown suggestions. Used in CreateListing and Browse filters
VerifiedBadge.tsx	Two exports: VerifiedBadge (green shield-check, "VERIFIED" label) and UnverifiedBadge (muted warning, "UNVERIFIED"). Appear on listing detail and public profile pages
VerificationGate.tsx	Multi-step modal for submitting identity verification. Collects full name, ID photo, selfie; submits via multipart/form-data to POST /api/verification/start-manual; shows pending/approved/rejected states
UnverifiedWarningModal.tsx	Intercept modal shown before a user contacts or confirms a deal with an unverified person. Warns them and offers "Continue anyway" or "Go back"
src/components/landing/

Sub-components extracted from the large Landing.tsx page to keep it manageable.
File	Purpose
motion.ts	Shared Framer Motion variant presets: springSnappy (spring config), staggerContainer (stagger children), fadeUpBlur (fade + translate + blur entrance)
ScrollReveal.tsx	Generic whileInView wrapper — wraps any child in a Framer Motion div that fades/translates in when scrolled into view
ScrollProgress.tsx	Thin accent-colored bar at the very top of the page that fills as the user scrolls. Uses useScroll + scaleX transform
HeroRoutePanel.tsx	The interactive widget inside the landing hero. Cycles through a static set of "departures" (city pairs + dates) with spring animations, simulating a live departures board
RouteTicker.tsx	Horizontal scrolling ticker of city pair names (e.g. "SÃO PAULO ↔ LISBON"). Infinite loop animation, skews on scroll velocity. Note: hardcoded list, not live data
LiveListings.tsx	Landing section that fetches real open listings from the API and displays them in a list — actual live data, unlike the ticker
LivePulse.tsx	Tiny pulsing green dot animation component. Used as a "live" indicator next to LiveListings
src/pages/
File	Route	Purpose
Landing.tsx	/	Marketing home page. Orchestrates Hero (with HeroRoutePanel), RouteTicker, LiveListings, "How it Works" flow diagram, Trust & Safety section. Large file — delegates visual sub-sections to the landing/ components
Auth.tsx	/auth	Sign in / sign up. Animated SVG network-graph background driven by use-pointer-position. Handles email/password auth and Google OAuth via Supabase. Reads ?mode=signin|signup and ?redirect= from URL
Browse.tsx	/browse	Search and filter all open listings. Filters: kind tabs, origin/dest city autocomplete, price range, date range. Date filtering is done server-side (Python, respects flexibility windows). Results shown as ListingRow list
ListingDetail.tsx	/listings/$id	Full listing detail. Shows route, dates, price, description, owner card (with verified badge), matched status. "Send message" button opens or navigates to the thread
CreateListing.tsx	/trips/new /requests/new /deliveries/new	Single form component for all three listing kinds, parameterized by kind prop. Fields adapt by kind (capacity for trips, price for requests/deliveries). Uses CityAutocomplete
MyListings.tsx	/my-listings	The current user's own listings with All / Open / Closed tabs. Each row has Close and Delete actions with confirmation modals
Matches.tsx	/matches	Algorithmic match discovery page. Fetches GET /api/listings/matches, displays results grouped by user's listing with a section header per group. Empty state encourages posting a trip
Inbox.tsx	/messages /messages/$threadId	Full messaging UI. Left panel: thread list. Right panel: message bubbles + a contextual "Match Bar" at the bottom that progresses through Confirm → Handover → Received depending on deal stage. Uses Supabase Realtime for live messages
Profile.tsx	/profile/$userId	Public user profile. Shows avatar, bio, verified badge, active listings, completed deal history. Also contains the report-user modal and an interactive pentagon-graph rating visualizer
Settings.tsx	/settings	Edit own profile. Display name, bio, city/country text inputs. Profile picture upload — compresses image via <canvas> before uploading to Supabase Storage
Verification.tsx	/verify	Identity verification status page. If unverified, renders VerificationGate. If pending/approved/rejected, shows appropriate status message
NotFound.tsx	* (404)	"Unknown Route" page. Thematic waypoint SVG graphic, links back to Home and Browse
PlaceholderPage.tsx	/reports/new	Generic "coming soon" holding page with a scattered node graph visual. Used for /reports/new while that form is unbuilt
sql/
File	Purpose
schema.sql	Initial schema snapshot for reference — predates the migration system. Not applied directly — use supabase/migrations/ instead
migration.sql	Empty file. Placeholder, not used
supabase/

Supabase project configuration and migrations.
File/Dir	Purpose
config.toml	Supabase CLI project config. Project ID travel-couriers, local API on port 54321
.gitignore	Ignores Supabase local state files
.temp/	Supabase CLI temp files (not committed)
supabase/migrations/

Applied in order; define the live schema.
Migration	What it does
0001_initial_schema.sql	First version of the schema
20260621055403_initial_schema.sql	Revised initial schema (supersedes above)
20260626000000_listings_extended_fields.sql	Adds listings.date_flexibility
20260629000000_match_and_history.sql	Adds messages.is_system, completed_deals table, revises match trigger
20260704000000_simplify_date_flexibility.sql	Simplifies flexibility enum
20260705000000_reviews_anchor_completed_deals.sql	Reviews now reference completed_deal_id instead of listing_id
20260712000000_option_b_delivery_flow.sql	Adds delivery_confirmations table
supabase/functions/

Supabase Edge Functions (Deno). These are separate from the FastAPI backend — they run on Supabase's infrastructure.
Function	Purpose
handle-match-confirmation/	Trigger-based Edge Function for match confirmation logic
notify/	Notification dispatch (messaging events)
stripe-webhook/	Stripe webhook handler (Edge Function alternative to the FastAPI one)

That's every file. The backend is straightforward Python — one file per domain, all routed through main.py. The frontend has more layers: config files at the root, the design system in index.css, shared logic in lib/, reusable pieces in components/, and one file per page in pages/. The CONTEXT/ directory is documentation-as-code — it should stay in sync with the codebase. shell. Loads Google Fonts (DM Sans weights 300/400/500, JetBrains Mono), sets class="dark" on <html>, mounts at <div id="root">
package.json	Project metadata + scripts (dev, build, lint, preview) + all dependencies
tsconfig.json	Root TS config — references tsconfig.app.json and tsconfig.node.json
tsconfig.app.json	App TS config — targets ES2023, verbatimModuleSyntax, path alias @/* → src/*
tsconfig.node.json	TS config for Vite config file itself (Node environment)
tsconfig.tsbuildinfo	TypeScript incremental build cache
components.json	shadcn/ui config — base-nova style, CSS variables strategy, icon library lucide, @/components aliases
frontend/public/
File	Purpose
(empty)	No static assets currently. hero.jpg was removed — landing page uses a generated SVG background instead
frontend/src/
Entry points
File	Purpose
main.tsx	React DOM mount. Renders <App /> into #root with StrictMode, imports index.css
App.tsx	Root component. Wraps the app in AuthProvider, QueryClientProvider (30s stale time), and RouterProvider
index.css	The design system. Defines all CSS custom properties (--bg, --surface, --surface-raised, --border, --accent, --accent-dim, --text, --text-muted, --text-faint, --success, --destructive, spacing scale --space-1 through --space-8), font variables (--font-sans, --font-serif, --font-mono), and re-exposes them as Tailwind theme tokens via @theme inline
vite-env.d.ts	Vite client type stubs for import.meta.env
router.tsx	All TanStack Router route definitions. Authenticated routes are grouped under an AuthGuard layout route that redirects to /auth if no session
src/lib/

Shared utilities and services.
File	Purpose
supabase.ts	Supabase JS client, initialized from VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY. Exports typed client using Database from types/supabase.ts. Logs a warning (doesn't crash) if env vars are missing
auth.tsx	AuthProvider + useAuth hook. Manages Supabase session, loads and caches the user's profiles row, subscribes to new messages via Supabase Realtime to keep the unreadCount badge accurate across the session
api.ts	authedFetch(path, options) — wraps fetch, injects the current Supabase session JWT as Authorization: Bearer. Also exports fetchOpenListings for public listing queries
listings.ts	Shared listing formatters: formatRoute (e.g. PARIS → DAKAR), formatListingDate (e.g. May 20), formatPrice (handles null/undefined → "Negotiable", zero → "Free", locale-formatted otherwise), kindLabel (e.g. "Trip")
db_constants.ts	Frontend mirror of backend constants — table/field name strings used in Supabase direct calls (e.g. from auth.tsx). Also exports getInitial(name) used by the Nav avatar
utils.ts	One export: cn(...classes) — combines clsx + tailwind-merge for conditional class composition
src/types/
File	Purpose
listing.ts	ListingKind, ListingStatus, and the core Listing interface — source of truth for listing shape across all frontend pages
supabase.ts	Auto-generated Supabase types — maps every database table to TypeScript Row, Insert, and Update interfaces. Not edited by hand; regenerate with supabase gen types when schema changes
src/hooks/
File	Purpose
use-pointer-position.ts	Returns live {x, y} mouse coordinates via a mousemove listener. Used to drive the interactive radial gradient on the Auth page background
src/components/layout/
File	Purpose
Layout.tsx	Root layout wrapper rendered on every route. Stacks ScrollProgress (top bar), Nav, <Outlet /> (page content), Footer
Nav.tsx	Fixed top navigation bar. On desktop: logo left, profile avatar button right (opens UserDrawer). On mobile: logo left, hamburger right (opens fullscreen menu). UserDrawer is the slide-in panel with Browse, My Listings, Matches, Messages (with unread badge), Settings, Sign out
Footer.tsx	App footer. Brand mark, mission line, nav links, Framer Motion scroll-reveal animations
src/components/ui/

Primitive design-system components, all styled with Peregri design tokens.
File	Purpose
badge.tsx	Pill badge using class-variance-authority. Variants: trip (blue), request (green), delivery (purple), matched (yellow), completed (muted)
button.tsx	Base button using @base-ui/react. Variants: default (primary/accent), secondary, outline, ghost, destructive, link. Includes hover scale via Framer Motion
input.tsx	Styled <input> — applies --border, --accent focus ring, --text-faint placeholder color
listing-row.tsx	Reusable listing row used in Browse, Matches, and elsewhere. Grid layout: route → kind badge → date → price → arrow. Hover: slides right 4px, shows left accent bar
src/components/ (root-level components)
File	Purpose
CityAutocomplete.tsx	City search input with autocomplete. Debounces keystrokes, queries the Photon (OpenStreetMap) geocoding API, displays dropdown suggestions. Used in CreateListing and Browse filters
VerifiedBadge.tsx	Two exports: VerifiedBadge (green shield-check, "VERIFIED" label) and UnverifiedBadge (muted warning, "UNVERIFIED"). Appear on listing detail and public profile pages
VerificationGate.tsx	Multi-step modal for submitting identity verification. Collects full name, ID photo, selfie; submits via multipart/form-data to POST /api/verification/start-manual; shows pending/approved/rejected states
UnverifiedWarningModal.tsx	Intercept modal shown before a user contacts or confirms a deal with an unverified person. Warns them and offers "Continue anyway" or "Go back"
src/components/landing/

Sub-components extracted from the large Landing.tsx page to keep it manageable.
File	Purpose
motion.ts	Shared Framer Motion variant presets: springSnappy (spring config), staggerContainer (stagger children), fadeUpBlur (fade + translate + blur entrance)
ScrollReveal.tsx	Generic whileInView wrapper — wraps any child in a Framer Motion div that fades/translates in when scrolled into view
ScrollProgress.tsx	Thin accent-colored bar at the very top of the page that fills as the user scrolls. Uses useScroll + scaleX transform
HeroRoutePanel.tsx	The interactive widget inside the landing hero. Cycles through a static set of "departures" (city pairs + dates) with spring animations, simulating a live departures board
RouteTicker.tsx	Horizontal scrolling ticker of city pair names (e.g. "SÃO PAULO ↔ LISBON"). Infinite loop animation, skews on scroll velocity. Note: hardcoded list, not live data
LiveListings.tsx	Landing section that fetches real open listings from the API and displays them in a list — actual live data, unlike the ticker
LivePulse.tsx	Tiny pulsing green dot animation component. Used as a "live" indicator next to LiveListings
src/pages/
File	Route	Purpose
Landing.tsx	/	Marketing home page. Orchestrates Hero (with HeroRoutePanel), RouteTicker, LiveListings, "How it Works" flow diagram, Trust & Safety section. Large file — delegates visual sub-sections to the landing/ components
Auth.tsx	/auth	Sign in / sign up. Animated SVG network-graph background driven by use-pointer-position. Handles email/password auth and Google OAuth via Supabase. Reads ?mode=signin|signup and ?redirect= from URL
Browse.tsx	/browse	Search and filter all open listings. Filters: kind tabs, origin/dest city autocomplete, price range, date range. Date filtering is done server-side (Python, respects flexibility windows). Results shown as ListingRow list
ListingDetail.tsx	/listings/$id	Full listing detail. Shows route, dates, price, description, owner card (with verified badge), matched status. "Send message" button opens or navigates to the thread
CreateListing.tsx	/trips/new /requests/new /deliveries/new	Single form component for all three listing kinds, parameterized by kind prop. Fields adapt by kind (capacity for trips, price for requests/deliveries). Uses CityAutocomplete
MyListings.tsx	/my-listings	The current user's own listings with All / Open / Closed tabs. Each row has Close and Delete actions with confirmation modals
Matches.tsx	/matches	Algorithmic match discovery page. Fetches GET /api/listings/matches, displays results grouped by user's listing with a section header per group. Empty state encourages posting a trip
Inbox.tsx	/messages /messages/$threadId	Full messaging UI. Left panel: thread list. Right panel: message bubbles + a contextual "Match Bar" at the bottom that progresses through Confirm → Handover → Received depending on deal stage. Uses Supabase Realtime for live messages
Profile.tsx	/profile/$userId	Public user profile. Shows avatar, bio, verified badge, active listings, completed deal history. Also contains the report-user modal and an interactive pentagon-graph rating visualizer
Settings.tsx	/settings	Edit own profile. Display name, bio, city/country text inputs. Profile picture upload — compresses image via <canvas> before uploading to Supabase Storage
Verification.tsx	/verify	Identity verification status page. If unverified, renders VerificationGate. If pending/approved/rejected, shows appropriate status message
NotFound.tsx	* (404)	"Unknown Route" page. Thematic waypoint SVG graphic, links back to Home and Browse
PlaceholderPage.tsx	/reports/new	Generic "coming soon" holding page with a scattered node graph visual. Used for /reports/new while that form is unbuilt
sql/
File	Purpose
schema.sql	Initial schema snapshot for reference — predates the migration system. Not applied directly — use supabase/migrations/ instead
migration.sql	Empty file. Placeholder, not used
supabase/

Supabase project configuration and migrations.
File/Dir	Purpose
config.toml	Supabase CLI project config. Project ID travel-couriers, local API on port 54321
.gitignore	Ignores Supabase local state files
.temp/	Supabase CLI temp files (not committed)
supabase/migrations/

Applied in order; define the live schema.
Migration	What it does
0001_initial_schema.sql	First version of the schema
20260621055403_initial_schema.sql	Revised initial schema (supersedes above)
20260626000000_listings_extended_fields.sql	Adds listings.date_flexibility
20260629000000_match_and_history.sql	Adds messages.is_system, completed_deals table, revises match trigger
20260704000000_simplify_date_flexibility.sql	Simplifies flexibility enum
20260705000000_reviews_anchor_completed_deals.sql	Reviews now reference completed_deal_id instead of listing_id
20260712000000_option_b_delivery_flow.sql	Adds delivery_confirmations table
supabase/functions/

Supabase Edge Functions (Deno). These are separate from the FastAPI backend — they run on Supabase's infrastructure.
Function	Purpose
handle-match-confirmation/	Trigger-based Edge Function for match confirmation logic
notify/	Notification dispatch (messaging events)
stripe-webhook/	Stripe webhook handler (Edge Function alternative to the FastAPI one)

That's every file. The backend is straightforward Python — one file per domain, all routed through main.py. The frontend has more layers: config files at the root, the design system in index.css, shared logic in lib/, reusable pieces in components/, and one file per page in pages/. The CONTEXT/ directory is documentation-as-code — it should stay in sync with the codebase.