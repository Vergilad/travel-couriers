# Step 5 — Playwright design research (Phase 1 & 2)

Screenshots in this folder. Visited 2026-06-22.

## Design intent (synthesis)

Travel Couriers should feel like **Railway's dark infrastructure** meets **Monograph's editorial numbers** — not another Airbnb clone. We steal Linear's **floating product moment** (but ours is a live departure board, not a SaaS screenshot), Railway's **dot-grid depth on near-black**, Stripe's **single SVG motion** that explains the product (a route line drawing itself), and Monograph's **oversized faded step numbers**. Warm terracotta replaces cold purple. Motion is spring physics + stagger + one-time path draws — never looping marquees.

---

## Phase 1 — Site-by-site steals

### 1. linear.app
**Screenshot:** `01-linear.png`

| Steal | Why |
|---|---|
| Massive split-line headline with tight leading | Commands the viewport without centering |
| Floating UI panel below/beside hero | Product (or marketplace) feels alive, not static copy |
| Dark atmospheric gradient, zero chrome | Premium dev-tool energy we adapt to travel |

### 2. luma.events
**Screenshot:** `02-luma.png`

| Steal | Why |
|---|---|
| Warm off-white / cream text on soft dark | Validates our terracotta palette direction |
| Rounded pill CTAs with generous padding | Friendly without being bubbly |
| Event rows as list, not cards | Same table DNA as our browse page |

### 3. notion.so
**Screenshot:** `03-notion.png`

| Steal | Why |
|---|---|
| Extreme vertical breathing room | Sections need 96px+ padding |
| Single focal headline, one subline | Resist feature-grid clutter |
| Illustration only where it adds meaning | We use route SVG instead of blob art |

### 4. railway.app
**Screenshot:** `04-railway.png`

| Steal | Why |
|---|---|
| Subtle dot-grid on dark bg | Depth without shadows |
| Purple/violet glow accent (→ our amber) | One accent color, used sparingly |
| Display serif headline + mono data | Maps to DM Serif + JetBrains Mono |

### 5. godly.website → recent.design
**Screenshot:** `05-godly.png`

| Steal | Why |
|---|---|
| Gallery as pure typography + whitespace | Editorial restraint |
| tikhon.io-style list rows (from prior pass) | Table browse, not card grid |
| Minimal nav, no borders | Background transition defines nav |

### 6. airbnb.com
**Screenshot:** `06-airbnb.png`

| Steal | Why |
|---|---|
| Search as hero action (we use route CTA) | Action-first, not tagline-first |
| Photography visible on one side | Our left-gradient / right-photo split |
| Category chips as horizontal list | Kind badges in listing rows |

### 7. monograph.com
**Screenshot:** `07-monograph.png`

| Steal | Why |
|---|---|
| Giant decorative numbers behind content | How-it-works 01/02/03 |
| Clear type hierarchy: display → body | DM Serif italic headlines only |
| Horizontal rule as section anchor | Border-only dividers |

### 8. stripe.com
**Screenshot:** `08-stripe.png`

| Steal | Why |
|---|---|
| One hero animation explaining the product | Our SVG route draw: origin → destination |
| Gradient mesh atmosphere (→ warm overlay) | Cinematic hero, not flat darken |
| Confident whitespace left-aligned | Anti-centered-hero rule from plan |

---

## Phase 2 — Motion references

- **motion.dev:** spring transitions, `staggerChildren`, `whileInView` with `once: true`, blur + opacity reveals
- **Applied to landing:** word stagger + blur-in headline, path draw, floating panel enter, scroll-linked section reveals, count-up stats, listing row stagger from bottom

## What we explicitly avoid

Parallax, infinite marquees, 3D card hovers, splash loaders, shimmer skeleton boxes.

---

## Step 5.5 — Originality pass

See `STEP5-5_ORIGINALITY_BRIEF.md`. Round 1 Playwright sites: vercel.com, framer.com, craftz.dog (+ luma revisited).

| Site | Expensive motion detail | Applied |
|---|---|---|
| linear.app | Blur-to-sharp word reveal | Hero headline cubic-bezier + blur(8px) |
| vercel.com | Breathing gradient | Accent glow + hero scale-in |
| framer.com | Clip-path left reveal | Subtitle curtain |
| luma.events | Slight rotate on rise | Listing rows rotate 0.6° → 0 |
| craftz.dog | Magnetic hover | Row x:4 slide + arrow |

Surgical fixes: 105deg gradient, bottom fade, glass CTA, nav rgba blur, stat borders, route ticker, warm hero photo.

