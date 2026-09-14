# Design System: Viactor

> The page is a sheet of transit paperwork. Tiles are form fields, 2px
> rules, zero radius. Teal = route, orange = money/action. One signature
> motion per page at most. Scoped to `[data-theme="viactor"]` until every
> page migrates; old chrome keeps its own tokens meanwhile.

## Concept

Neubrutalist transit paperwork. Every screen is a form being filled:
fields named in small print, values in large print. A third of hero fields
are solid teal or orange rather than paper. The split-flap departures board
is the landing's one signature motion. Elsewhere motion is feedback only.

## Type (self-hosted in `public/fonts`)

- Display/wordmark: Geologica SHRP 100 (`font-display`, `font-wordmark`).
  Wordmark is lowercase `viactor`, same family as headings, never a serif.
- Data/labels: Martian Mono (`font-label`), tabular numbers.
- Body: Onest (`copy`, pretty wrapping for long Russian words).
- Scale: `--t-mega` (single figure) > `--t-hero` > `--t-h1/h2/h3` > body >
  `--t-label`. Never an Inter default, never LLM-favorite display serifs.

## Palette (all pairs measured, AA or better both modes)

- `--ground` sheet the tiles sit on; `--sheet` paper (never pure white).
- `--line` every rule/border/shadow; `--text`, `--text-muted` (6.3:1+).
- `--teal` route/destination/need side; `--orange` action/carry side.
  Side colours identical on chips AND buttons. `--on-fill` flips with mode
  (white on fills in light, ink in dark) so fills always pass.
- `--face` / `--face-ink` FIXED both modes: avatar faces never follow theme.
- `--success` / `--destructive` exist in both scopes (badges use them so
  stamps render in old chrome too).

## Shape and feedback (locks, non-negotiable)

- **All sharp, everywhere** (`--radius-base: 0`). Square avatars, square
  notches on the perforation, square delivery ticks.
- Floating objects press into their shadow (`.press`); fields inside the
  sheet highlight instead (`.field-row`, tone-aware).
- Focus rings follow the surface (ink on paper, paper on fills).

## Component vocabulary (CSS-first, no new CSS per page)

- `.manifest` + `.manifest-field`: ledger pages (browse, dossier, forms).
- `.manifest-row` / `.dossier-row`: result lines (auto-collapse <768px).
- `.sheet-grid` + `.sheet-tile`: landing bento (4 col > 2 col > 1 col).
- `.seg` + `.seg-btn`: pick-one controls (inverted stamp actives, AA).
- `.stencil-chip` (+ `data-side`): kind/buy marks.
- `.route-input`: label-above inputs, never placeholder-as-label.
- `.btn--primary` (orange) / `--teal` / `--plain` / `--ghost`, all `press`,
  labels never wrap.
- `.perforation`: dashed tear line with square notches.
- `.stamp`: rotated double-rule stamp; the one signature motion, static
  under reduced motion. Auth does NOT stamp (sign-in is not verification).
- `.ticket`: 560px centered single column.
- `.skel`: skeleton loaders matching final shapes.
- Verification rubber stamps: green VERIFIED -4deg, red ! UNVERIFIED +3deg.

## Copy and locale

- Zero em/en-dashes anywhere. Plain human strings. EN+RU parity on every
  user-facing string (rating words and report reasons still EN-only,
  flagged for a locale pass).
- One copy register per surface: mono caps for machine print, display for
  values, body for explanations. Middle dot rationed (1 per line).
- Names never in the nav bar (fixed 32px avatar menu instead).

## Page map (all migrated except noted)

Landing (own chrome) / browse / carry+need create / listing detail /
profile dossier / My Routes (+ `/matches` forward) / inbox+threads /
settings (Profile/Account/Danger seg) / verify ticket / auth ticket /
admin blind queue (unlinked) / 404 (original page, remake parked).

## Pre-flight (every page, every time)

Build green; ordinal dash scan clean on touched files; both color modes
seen; narrow viewport checked; explicit <768px collapse per layout;
reduced-motion honored; no scroll listeners; no new deps without asking.
Headless-Chrome probe on localhost for anything behavioral.
