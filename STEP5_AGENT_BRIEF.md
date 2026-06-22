# STEP 5 — Landing Page + Root Shell
## Agent Brief: Read Every Word Before Writing One Line of Code

This is not a casual prompt. This is a creative brief.
You are not generating a template. You are building something people will remember.
The standard for this step is: someone opens this site and does not think "AI made this."

---

## YOUR MANDATORY WORKFLOW — DO NOT SKIP ANY PART

### PHASE 1: RESEARCH (do this before touching a single file)

You have Playwright. Use it like a creative director doing research, not like a robot fetching URLs.

**Visit these sites one by one. For each one:**
- Take a full screenshot
- Scroll slowly — note what happens as you scroll
- Look for: how do they handle the hero? what happens on hover? how do they use whitespace? what makes it feel premium?
- Write down 3 specific things you want to steal from it

**Sites to visit:**

1. https://linear.app — study the hero section specifically. Note the gradient, the product screenshot floating, the headline size
2. https://luma.events — note how they handle cards and the overall warmth
3. https://www.notion.so — note the simplicity and breathing room
4. https://railway.app — note the dark theme done right, the subtle grid
5. https://godly.website — browse the gallery, find 3 sites that feel like travel or premium marketplaces
6. https://www.airbnb.com — note the search bar placement and hero photo usage
7. https://www.monograph.com — pure editorial design, note the typography hierarchy
8. https://stripe.com — study how they use a single hero animation to communicate the product

After visiting all 8 sites, synthesize what you found into a short "design intent" paragraph before writing code. What specific things from these sites will you bring into Travel Couriers?

---

### PHASE 2: ANIMATION RESEARCH

Visit these specifically for animation and motion references:

1. https://motion.dev/docs — read the examples section. Note: stagger, scroll-triggered reveals, spring physics
2. https://www.framer.com/motion/ — look at the showcase
3. https://lottiefiles.com/search?q=travel — search for travel animations. If you find one that fits (plane, map pin, route line), download the JSON URL — we can use it with lottie-react

**What animations belong in this landing page:**
- Hero headline: words fade up one by one, staggered, on mount. Not all at once.
- Subtitle: fades in 400ms after headline finishes
- CTA button: fades in last, slight y movement
- Stats row (if included): numbers count up when they enter the viewport
- Browse listings row (live listings preview): items stagger in from bottom
- Scroll-triggered sections: each section fades + rises as it enters viewport
- Nav: starts transparent over hero, transitions to solid surface color on scroll

**What animations do NOT belong here:**
- Parallax scrolling — overused, causes motion sickness
- Infinite scroll loops or marquees — cheap
- 3D transforms on hover for no reason
- Anything that plays on a loop unprompted
- Page loading spinners or splash screens

---

### PHASE 3: USE THE SUPABASE MCP

Before building the "live listings" preview section on the landing page:
- Use the Supabase MCP to query the listings table
- Check if there are any open listings
- If there are: display real data in the preview section
- If empty: create 3 realistic seed listings directly via Supabase MCP:

```
Listing 1:
  kind: 'trip'
  origin_city: 'Baku', origin_country: 'Azerbaijan'
  dest_city: 'Istanbul', dest_country: 'Turkey'
  depart_date: 2026-07-15, arrive_date: 2026-07-16
  title: 'Flying Baku → Istanbul, can carry small items'
  price: 25, currency: 'USD', capacity_kg: 3
  status: 'open'

Listing 2:
  kind: 'delivery'
  origin_city: 'London', origin_country: 'United Kingdom'
  dest_city: 'Paris', dest_country: 'France'
  depart_date: 2026-07-20, arrive_date: 2026-07-20
  title: 'Need documents delivered to Paris urgently'
  price: 40, currency: 'EUR', capacity_kg: 0.5
  status: 'open'

Listing 3:
  kind: 'trip'
  origin_city: 'Dubai', origin_country: 'UAE'
  dest_city: 'Tbilisi', dest_country: 'Georgia'
  depart_date: 2026-08-01, arrive_date: 2026-08-02
  title: 'Dubai to Tbilisi, 5kg available'
  price: 35, currency: 'USD', capacity_kg: 5
  status: 'open'
```

This is important: the landing page must show REAL data from the database.
A marketplace with empty listings is a dead marketplace. Seed it now.

---

### PHASE 4: FIND A HERO IMAGE

Use Playwright to open https://unsplash.com/s/photos/airport-travel-window

Browse the results. You are looking for an image that has:
- Warm or golden tones (not cold blue)
- A sense of journey — window seat, departure lounge, plane wing, open road
- Wide/landscape orientation
- NOT: stock photo smiling people, generic landmarks, cheesy luggage shots

Pick the best one. Right-click → copy image address. Download it to:
`frontend/public/images/hero.jpg`

If Unsplash blocks direct download via Playwright, try:
https://www.pexels.com/search/airport%20window%20golden/

---

## WHAT TO BUILD

### File Structure to Create

```
frontend/src/
  components/
    layout/
      Nav.tsx           — top navigation, auth-aware
      Footer.tsx        — minimal footer
      Layout.tsx        — wraps all pages
    ui/
      Button.tsx        — primary, secondary, ghost variants
      Badge.tsx         — open, matched, completed variants
      ListingRow.tsx    — single row for browse table + landing preview
    landing/
      Hero.tsx          — full viewport hero section
      HowItWorks.tsx    — 3-step process, NO icon grid
      LiveListings.tsx  — real listings from Supabase
      Stats.tsx         — animated counters
  pages/
    Landing.tsx         — composes all landing sections
  App.tsx               — routing setup
```

---

### NAV — `Nav.tsx`

**Behavior:**
- Height: 64px
- Logo left: "Travel Couriers" in DM Serif Display italic, 18px
- Links center (desktop): Browse, How it works — DM Sans 14px weight 400, NO uppercase, NO wide tracking
- Right: Sign in (ghost) + Post a trip (primary pill button) if not logged in
- If logged in: avatar circle + unread message badge
- On scroll past 80px: background transitions from `transparent` to `var(--surface)` with `backdrop-filter: blur(12px)`, smooth 200ms transition
- On hero: fully transparent, text is `var(--text)`
- Mobile: hamburger menu, full screen overlay

**Code rules:**
- Use framer-motion `useScroll` to detect scroll position for the background transition
- No border on nav — just the background transition gives it definition

---

### HERO — `Hero.tsx`

This is the most important component on the site. Do not rush it.

**Layout:**
- Full viewport height (`100vh`)
- Background: the hero.jpg photo you downloaded
- Over the photo: a gradient overlay — NOT a flat dark overlay. Use:
  ```css
  background: linear-gradient(
    to right,
    rgba(14,11,8,0.85) 0%,
    rgba(14,11,8,0.4) 60%,
    rgba(14,11,8,0.1) 100%
  );
  ```
  This makes left side readable, right side shows the photo. Cinematic.
- Content is left-aligned, vertically centered, max-width 600px, padding-left 8% on desktop

**Content inside hero:**
1. A small eyebrow line above the headline:
   ```
   Peer-to-peer courier network
   ```
   Style: DM Sans, 13px, `var(--text-muted)`, letter-spacing 0.08em, uppercase — just this one element gets uppercase because it's a label, not a heading
   
2. Main headline — animate each word separately:
   ```
   Your next trip
   carries more
   than luggage.
   ```
   Style: DM Serif Display italic, clamp(3.5rem, 7vw, 6rem), `var(--text)`, line-height 1.0
   Animation: each word fades up with stagger 0.08s, spring physics

3. Subtitle (fades in after headline):
   ```
   Connect with travelers going your way. 
   Send anything, earn on every trip.
   ```
   Style: DM Sans 300, 17px, `var(--text-muted)`, line-height 1.7, max-width 420px

4. Two buttons side by side (fade in last):
   - Primary pill: "Explore listings" → /browse
   - Secondary pill: "Post a trip" → /trips/new

5. A subtle scroll indicator at the bottom center — animated bouncing chevron or dot

**Animation sequence (framer-motion):**
```
0ms    — eyebrow fades in
100ms  — first word of headline
180ms  — second word
260ms  — third word
...stagger 80ms per word...
final word + 400ms — subtitle fades up
subtitle + 300ms   — buttons fade up
```
Use `useAnimate` or `motion` with `transition.delay` — not CSS keyframes.

---

### HOW IT WORKS — `HowItWorks.tsx`

Three steps. But NOT the standard "icon in a circle, title, description" grid. That is slop.

**Instead:** Three large numbered steps in a horizontal row on desktop, vertical on mobile.
Each step has:
- A massive number "01" "02" "03" in DM Serif Display, 8rem, `var(--border)` color — decorative, faded
- A short title in DM Serif Display italic, 1.5rem
- One sentence description in DM Sans 300

Content:
```
01 — Post your journey
     Going somewhere? List your route, dates, and how much you can carry.

02 — Connect and agree  
     Chat with senders. Confirm the deal. Both parties lock it in.

03 — Carry, deliver, earn
     Make the trip. Get paid. Leave a review.
```

Animation: scroll-triggered, each step fades + slides up, staggered 0.15s apart.

---

### LIVE LISTINGS PREVIEW — `LiveListings.tsx`

This section shows real listings from your database. This is what makes it feel alive.

**Fetch listings:** call your FastAPI backend `GET /api/listings?status=open&limit=5`
Show a loading skeleton while fetching — NOT a gray shimmer box. Use a pulsing opacity animation on placeholder text lines.

**Layout:** The browse table layout — rows, not cards.

Each row shows:
- Route in mono: `BAKU → ISTANBUL`
- Kind badge: "Trip" / "Delivery" / "Request"
- Date in mono: `Jul 15`
- Price: `$25`
- A subtle "View" link that appears on row hover

**Section header:**
```
Live listings
```
DM Serif Display italic, with a small "View all →" link right-aligned.

Animation: rows stagger in on scroll-enter, 0.04s between each.

---

### STATS — `Stats.tsx`

Four numbers that count up when they enter the viewport.

```
1,200+    Active couriers
48        Countries covered
4.9★      Average rating
3,400+    Deliveries completed
```

Style: numbers in DM Serif Display italic huge (3rem), labels in DM Sans 13px muted uppercase.
Animation: use a counting animation from 0 to the final number over 1.4s easeOut when the section enters the viewport. Use `IntersectionObserver` or framer-motion `whileInView`.

These numbers are hardcoded for now — real analytics come in a future version.

---

### FOOTER — `Footer.tsx`

Minimal. Two lines.

```
Travel Couriers — Move things across borders.

Browse  |  Sign in  |  Post a trip  |  How it works

© 2026 Travel Couriers
```

Background: `var(--surface)`. Top border: 1px `var(--border)`. Padding 48px vertical.
No social icons, no newsletter form, no column grid. Just links and a copyright.

---

## DESIGN RULES — ENFORCED, NO EXCEPTIONS

**Typography:**
- Headlines: DM Serif Display, weight 400, italic
- Body: DM Sans, weight 300, 15px, line-height 1.7
- Labels/eyebrows: DM Sans, 13px, weight 500, uppercase, letter-spacing 0.08em — ONLY for small labels above headlines, nowhere else
- Route/data: JetBrains Mono, 12px, weight 400, `var(--text-muted)`
- Buttons: DM Sans, 14px, weight 500, NO uppercase, border-radius 100px

**Colors — use ONLY these variables, no hardcoded colors except overlays:**
- `var(--bg)` `var(--surface)` `var(--surface-raised)` `var(--border)`
- `var(--accent)` `var(--accent-dim)`
- `var(--text)` `var(--text-muted)` `var(--text-faint)`

**Layout:**
- Max content width: 1200px, centered, padding 0 24px
- Section vertical padding: minimum 96px
- Spacing scale: 4/8/16/24/40/64/96/128px — nothing in between
- Border radius: inputs 10px, buttons 100px, cards 8px, nothing above 8px except buttons
- No shadows — depth through background color layering only

**What this site must NOT contain:**
- NO gradient cards or "glassmorphism" cards
- NO three-icon feature grid
- NO testimonial carousel
- NO hero with centered text over a full-bleed image with a centered button (that is every 2023 SaaS site)
- NO uppercase on body copy, headings, or buttons
- NO `rounded-2xl` class anywhere
- NO purple, blue or teal (we switched themes — remove any remnants)
- NO loading spinner — use skeleton text instead
- NO generic stock illustration (the blob with people doing things)
- NO floating chat bubble
- NO cookie consent popup (this is dev)

---

## ROUTING SETUP

In `App.tsx` set up TanStack Router with these routes:
```
/              → Landing.tsx
/browse        → placeholder for now (just a heading "Browse — coming in step 8")
/auth          → placeholder
/listings/:id  → placeholder
/profile/:id   → placeholder
```

The placeholders just need to render a centered heading so routing works.
Real pages come in later steps.

---

## AFTER BUILDING — VERIFICATION CHECKLIST

Run `npm run dev` and check every item:

- [ ] Nav is transparent over hero, transitions to surface color on scroll
- [ ] Hero photo is visible, gradient makes text readable on left
- [ ] Headline animates word by word on mount
- [ ] Subtitle and buttons appear after headline
- [ ] Stats numbers count up when scrolled into view
- [ ] Live listings section shows real data from Supabase (not hardcoded)
- [ ] How it works section animates on scroll
- [ ] No horizontal scroll on any viewport width
- [ ] Mobile (375px): nav collapses, hero text is readable, sections stack
- [ ] Console: zero errors, zero failed network requests
- [ ] Fonts loading: DM Serif Display italic visible on headline

If any item fails, fix it before reporting done.

---

## FINAL INSTRUCTION

You have everything you need. Playwright for research, Supabase MCP for real data,
the filesystem for building, and a complete spec above.

The difference between a site that looks cheap and a site that looks crafted
is not the technology — it is the decisions. Every spacing choice, every animation
timing, every font size is a decision. Make them deliberately.

Do not generate. Design.
