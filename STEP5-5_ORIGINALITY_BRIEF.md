# STEP 5.5 — Make It Actually Original
## Surgical fixes only. Every instruction here is specific. No interpretation needed.

The foundation is good. Integration works. Now we fix what makes it feel ordinary.
Do not rebuild anything. Surgical edits to existing components only.

---

## BEFORE TOUCHING CODE — MANDATORY RESEARCH

### Round 1: Animation references (Playwright)

Open these URLs one by one. On each page, watch what happens for 30 seconds.
Take a screenshot. Write down the ONE motion detail that makes it feel expensive.

1. https://linear.app — watch the hero on load. Notice the stagger isn't fade-up,
   it's a blur-to-sharp transition combined with upward movement. Much more refined.

2. https://vercel.com — watch the gradient. It shifts slowly, almost breathing.
   Note: the gradient isn't static, it's animated with a subtle keyframe loop.

3. https://www.framer.com — watch how the nav items reveal. They don't fade —
   they clip-reveal from left to right using a mask.

4. https://luma.events — watch the cards on scroll. They don't just fade up —
   they rotate ever so slightly (0-1 degree) as they rise. That tiny rotation
   is what separates Luma from everything else.

5. https://www.craftz.dog — personal portfolio. Study the cursor interaction.
   Note how hovering elements creates a magnetic pull effect.

After all 5 sites: write a paragraph synthesizing exactly which motion techniques
you will apply to Travel Couriers and where. Be specific — which component,
which technique, what values.

### Round 2: Color and hero reference (Playwright)

Open https://unsplash.com/s/photos/airport-golden-hour-warm

Find a photo that is WARM — amber, gold, sunset tones.
The current hero photo is cold/teal which fights the terracotta color palette.
Download the warmest result to frontend/public/images/hero.jpg (overwrite existing).

If Unsplash blocks download, try:
https://www.pexels.com/search/airport%20warm%20sunset/

---

## THE ACTUAL FIXES

### FIX 1 — Hero gradient (most impactful, 5 minute fix)

In Hero.tsx, find the overlay div and replace with this exact gradient:

```css
background: linear-gradient(
  105deg,
  rgba(14, 11, 8, 0.92) 0%,
  rgba(14, 11, 8, 0.75) 35%,
  rgba(14, 11, 8, 0.3) 65%,
  rgba(14, 11, 8, 0.05) 100%
);
```

Also add a second overlay div BELOW the photo for the bottom fade:
```css
background: linear-gradient(
  to top,
  rgba(14, 11, 8, 1) 0%,
  rgba(14, 11, 8, 0) 40%
);
```

This does two things: makes the left side actually readable,
and bleeds the hero naturally into the stats section below.
No hard edge between hero and next section.

### FIX 2 — Hero animations (replace primitive fade-up with refined motion)

The current word-by-word animation is generic. Replace with this exact approach:

Each word animates with THREE simultaneous properties:
- opacity: 0 → 1
- y: 24 → 0
- filter: blur(8px) → blur(0px)

The blur-to-sharp is what Linear uses. It reads as cinematic, not template.

```tsx
// In Hero.tsx, for each word span:
<motion.span
  initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
  transition={{
    duration: 0.7,
    delay: index * 0.09,
    ease: [0.25, 0.46, 0.45, 0.94]  // custom cubic bezier, not 'easeOut'
  }}
>
  {word}
</motion.span>
```

The cubic bezier [0.25, 0.46, 0.45, 0.94] is a specific curve that
accelerates quickly then eases out — feels intentional, not default.

### FIX 3 — Subtitle reveal (currently just fades in, make it feel considered)

The subtitle should NOT word-by-word animate — that's overused.
Instead: reveal from left using a clip-path mask.

```tsx
<motion.p
  initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0.3 }}
  animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }}
  transition={{
    duration: 0.9,
    delay: 0.7,  // after headline finishes
    ease: [0.76, 0, 0.24, 1]
  }}
>
  Connect with travelers going your way...
</motion.p>
```

This is the clip-reveal from left that Framer.com uses on nav items.
Nothing else on the page uses this technique so it stands out.

### FIX 4 — "Post a trip" secondary button (currently invisible)

In Hero.tsx, the secondary button needs a visible border:

```tsx
<button className="btn-secondary" style={{
  border: '1px solid rgba(244, 237, 228, 0.25)',
  color: 'var(--text)',
  background: 'rgba(244, 237, 228, 0.05)',
  backdropFilter: 'blur(8px)',
}}>
  Post a trip
</button>
```

The backdrop blur on the button picks up the photo behind it.
Subtle but premium — the photo bleeds through the button slightly.

### FIX 5 — Stats section (currently 4 lonely numbers on black)

This section needs two things: a top separator and internal tension.

Add a 1px top border in `--border` color to anchor it.
Make the numbers feel weighted — add a thin horizontal line ABOVE each number:

```tsx
// Each stat item:
<div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
  <div className="stat-number">1,200+</div>
  <div className="stat-label">Active couriers</div>
</div>
```

The top border on each stat creates a grid-like structure.
4 numbers separated by borders reads as data, not decoration.

Also: the stat numbers are too similar in size to the labels.
Make the contrast more extreme:
- Numbers: DM Serif Display italic, 4rem, `var(--text)`
- Labels: DM Sans, 11px, `var(--text-faint)`, letter-spacing 0.1em, uppercase

### FIX 6 — Nav backdrop blur (currently solid, should be translucent)

In Nav.tsx, on scroll the background should be:
```css
background: rgba(14, 11, 8, 0.7);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border-bottom: 1px solid rgba(46, 36, 24, 0.6);
```

NOT a solid color. The blur picks up the content below as you scroll —
it's the detail that makes a nav feel like an app, not a webpage.

The framer-motion transition for this:
```tsx
const navBg = useMotionValue('rgba(14,11,8,0)')
// on scroll > 80px:
animate(navBg, 'rgba(14,11,8,0.7)', { duration: 0.3 })
```

### FIX 7 — Live listings rows (currently static, add hover interaction)

Each row in the listings table needs a hover state that feels alive:

```tsx
<motion.tr
  whileHover={{
    backgroundColor: 'var(--surface-raised)',
    x: 4,  // subtle slide right on hover
  }}
  transition={{ duration: 0.15 }}
  style={{ cursor: 'pointer' }}
>
```

The `x: 4` slide is subtle — only 4px — but it makes rows feel clickable,
not just highlighted. It's the detail that makes a table feel interactive.

Also add an arrow `→` that appears only on row hover:
```tsx
<motion.span
  initial={{ opacity: 0, x: -8 }}
  whileHover={{ opacity: 1, x: 0 }}
  style={{ color: 'var(--accent)' }}
>
  →
</motion.span>
```

### FIX 8 — Section transitions (currently sections just start abruptly)

Between every major section, add a scroll-triggered reveal:

```tsx
// Wrap every section except hero with this:
<motion.section
  initial={{ opacity: 0, y: 32 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-80px' }}
  transition={{
    duration: 0.6,
    ease: [0.25, 0.46, 0.45, 0.94]
  }}
>
```

The `margin: '-80px'` means it triggers 80px BEFORE the section enters view.
Content appears to rise to meet you as you scroll, not pop in when you reach it.

### FIX 9 — Add one thing nobody else has: a route ticker

Between the hero and stats section, add a single horizontal scrolling ticker.
This is the ONE element that immediately communicates "live marketplace"
and is used by almost nobody in this space.

```
BAKU → ISTANBUL  ·  LONDON → PARIS  ·  DUBAI → TBILISI  ·  BAKU → ISTANBUL  ·  ...
```

Implementation:
```tsx
const routes = [
  'BAKU → ISTANBUL',
  'LONDON → PARIS',
  'DUBAI → TBILISI',
  'AMSTERDAM → BERLIN',
  'TORONTO → LAGOS',
  'SINGAPORE → SYDNEY',
]

// Duplicate for seamless loop
const doubled = [...routes, ...routes]

<div style={{ overflow: 'hidden', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '14px 0' }}>
  <motion.div
    style={{ display: 'flex', gap: '48px', width: 'max-content' }}
    animate={{ x: [0, -50 + '%'] }}
    transition={{
      duration: 25,
      repeat: Infinity,
      ease: 'linear',
      repeatType: 'loop'
    }}
  >
    {doubled.map((route, i) => (
      <span key={i} className="mono" style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
        {route}
      </span>
    ))}
  </motion.div>
</div>
```

This strip sits between hero and stats. Warm, minimal, and immediately
communicates "this is a live platform with real routes."

---

## WHAT NOT TO TOUCH

- Do not change the hero photo path (only swap the image file itself)
- Do not change the font choices — they are correct
- Do not change the color tokens
- Do not rebuild the listings table structure — only add hover animations
- Do not add any new sections — this is polish, not new content
- Do not change button text or nav link text

---

## VERIFICATION

After all fixes, check these specifically:

1. Hero headline: each word blurs in (not just fades) — check in slow motion
   by adding `transition-duration: 3s` temporarily, then remove it
2. Subtitle: reveals from left like a curtain opening — not a fade
3. Nav: when you scroll, it should be slightly transparent with blur,
   not solid. Hold a colorful tab behind the browser to verify the blur works
4. Route ticker: scrolls smoothly, no jank, seamless loop
5. Stat numbers: have a top border above each one
6. Listing rows: slide 4px right on hover, arrow appears

If any of these fail, fix before reporting done.

---

## FINAL NOTE TO THE AGENT

The difference between ordinary and memorable is not more features.
It is more intentionality in the details you already have.
A blur on the word animation. A 4px slide on a table row. A route ticker.
None of these are big. Together they say: someone made decisions here.
That is what the user is asking for.
