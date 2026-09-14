# Single-Tree Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One normal repo checkout where `frontend/` is the Viactor app, with dead code removed, all verified live.

**Architecture:** Checkpoint-commit both dirty trees, then directory swap in main (git rm retired tree, copy worktree tree in), sweep verified-dead files and deps, re-verify backend and frontend by execution. No API, DB, or user-facing changes; every step is a commit, rollback is `git reset --hard <checkpoint>`.

**Tech Stack:** Git (two checkouts, two object stores), PowerShell 5.1, Docker Compose (backend image), Vite + tsc (frontend build), headless Chrome over CDP (UI probes), psql via `docker exec` (DB checks).

**Spec:** `docs/superpowers/specs/2026-09-14-single-tree-restructure-design.md`

## Global Constraints

- Workdir for main-tree steps is `C:\Users\Admin\travel-couriers`; worktree root is `C:\Users\Admin\travel-couriers\.delta\worktrees\jxtftjq7g77d\travel-couriers`.
- PowerShell 5.1: no `&&`, no `||`, no `tail`/`head`. Chain with `; if ($?) { }`. Quote paths with spaces. Run npm via `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; if ($?) { npm ... }`.
- NEVER touch `.delta/` clones or checkouts beyond reading the worktree files and committing inside it (Task 2). Do not run `git worktree` commands (`git worktree list` shows only main; these checkouts are harness-managed).
- NEVER print secrets. `backend/.env` values stay out of chats, logs, diffs, commits.
- Only the commits listed in this plan are approved. No other commits.
- Touched files: zero em/en-dashes (ordinal check U+2013/U+2014). No locale changes are planned; if any string is touched, EN+RU parity must stay 559/559.
- Backend is baked into the docker image: code changes need `docker compose --env-file backend/.env up -d --build backend`. A plain restart does nothing.
- Kill background dev servers and Chrome trees when done; leave no orphans. Temp scratch is `C:\Users\Admin\AppData\Local\Temp\opencode\` (may be wiped; recreate probe scripts from the steps below if missing).

---

### Task 1: Checkpoint commit, main repo

**Files:**
- Modify: everything dirty under `C:\Users\Admin\travel-couriers` (backend, db, docs, CONTEXT, root files)

**Interfaces:**
- Consumes: nothing
- Produces: clean main tree at commit `main-checkpoint` (hash recorded in the step output, used as rollback point)

- [ ] **Step 1: Inspect what will be committed**

Run: `git status --short` (workdir main)
Expected: the known dirty list (backend/routers/matches.py, backend/routers/auth.py, backend/main.py, backend/models.py, backend/requirements.txt, backend/.env.example, deleted backend/routers/payments.py + webhooks.py, db/migrations/0003_handover_code.sql, db/schema.sql, docs/, CONTEXT/*.md, staged supabase/ + sql/ deletions). Must NOT contain `.delta/`, `backend/.env`, or `backend/data/` lines (covered by `.git/info/exclude` + `.gitignore`, but verify — a `.delta` line here STOPS the plan).

- [ ] **Step 2: Stage everything**

Run: `git add -A` (workdir main)
Expected: exit 0.

- [ ] **Step 3: Commit**

Run: `git commit -m "checkpoint: self-hosted backend, handover code, ship hardening (uncommitted session work)"` (workdir main)
Expected: commit created; output shows files changed. If hooks reject it, fix the hook complaint and create a NEW commit (never amend a failed one).

- [ ] **Step 4: Record the hash and verify clean**

Run: `git log --oneline -1; if ($?) { git status --short }` (workdir main)
Expected: one new commit on top; second command prints nothing (clean tree). Save the hash as `main-checkpoint`.

---

### Task 2: Checkpoint commit, worktree checkout

**Files:**
- Modify: everything dirty under the worktree root (frontend work)

**Interfaces:**
- Consumes: nothing (independent of Task 1; may run after it)
- Produces: clean worktree tree at commit `worktree-checkpoint` (local guard inside its own clone)

- [ ] **Step 1: Inspect**

Run: `git status --short` (workdir worktree root)
Expected: frontend-only dirty list (~92 files). If backend/db files appear dirty here, STOP and report (trees have diverged unexpectedly).

- [ ] **Step 2: Stage and commit**

Run: `git add -A; if ($?) { git commit -m "checkpoint: viactor frontend through ship fixes" }` (workdir worktree root)
Expected: commit created. If the failure mentions missing git identity, STOP and report (do not set identity yourself).

- [ ] **Step 3: Record the hash and verify clean**

Run: `git log --oneline -1; if ($?) { git status --short }` (workdir worktree root)
Expected: new commit; empty status. Save the hash as `worktree-checkpoint`.

---

### Task 3: Clean-gate

**Files:** none (verification only)

**Interfaces:**
- Consumes: `main-checkpoint`, `worktree-checkpoint`
- Produces: go/no-go for destructive steps

- [ ] **Step 1: Both trees clean**

Run: `git status --short` in main, then in worktree root.
Expected: both print nothing. If either is dirty, STOP. Do not proceed to Task 4.

---

### Task 4: Swap the frontend (main repo)

**Files:**
- Delete (tracked, via git rm): `frontend/` (entire retired tree, 50 files incl. `src/lib/supabase.ts`, `src/types/supabase.ts`)
- Delete (untracked, from disk): `frontend/.env` (Supabase keys, never tracked), `frontend/node_modules/`, `frontend/dist/`
- Create: `frontend/` copied from `<worktree>/frontend/` excluding `node_modules/`, `dist/`, `tsconfig.tsbuildinfo`

**Interfaces:**
- Consumes: clean main tree (Task 3)
- Produces: main `frontend/` == worktree Viactor app, commit `swap-commit`

- [ ] **Step 1: Remove the retired tree**

Run: `git rm -r frontend` (workdir main)
Expected: `rm 'frontend/...'` lines for ~50 files.

- [ ] **Step 2: Remove untracked remainders from disk**

Run: `Remove-Item -LiteralPath "frontend\.env" -ErrorAction SilentlyContinue; if ($?) { Remove-Item -LiteralPath "frontend\node_modules" -Recurse -Force -ErrorAction SilentlyContinue }; if ($?) { Remove-Item -LiteralPath "frontend\dist" -Recurse -Force -ErrorAction SilentlyContinue }; if ($?) { Test-Path -LiteralPath "frontend" }` (workdir main)
Expected: final `Test-Path` prints `False` (directory fully gone). If `True`, list leftovers with `Get-ChildItem -LiteralPath "frontend" -Force` and remove them before continuing.

- [ ] **Step 3: Copy the Viactor tree in**

Run (workdir main):
`Copy-Item -LiteralPath "C:\Users\Admin\travel-couriers\.delta\worktrees\jxtftjq7g77d\travel-couriers\frontend" -Destination "C:\Users\Admin\travel-couriers\frontend" -Recurse -Exclude "node_modules","dist","tsconfig.tsbuildinfo"`
Expected: exit 0. Verify with: `(Get-ChildItem -LiteralPath "frontend\src" -Recurse -File | Measure-Object).Count` prints `59` (or more if the tree grew), `Test-Path -LiteralPath "frontend\src\lib\session.ts"` prints `True`, `Test-Path -LiteralPath "frontend\src\lib\supabase.ts"` prints `False`, and `Test-Path -LiteralPath "frontend\node_modules"` prints `False` (excluded from the copy; Task 5 installs fresh).

- [ ] **Step 4: Stage and commit the swap**

Run: `git add frontend; if ($?) { git commit -m "single tree: viactor frontend becomes the repo frontend" }` (workdir main)
Expected: commit created.

---

### Task 5: Fresh install and build in the new tree

**Files:**
- Create (untracked, ignored): `frontend/node_modules/`, `frontend/dist/`

**Interfaces:**
- Consumes: `swap-commit` (Task 4)
- Produces: proven-green build of the new tree. Gate for Task 6.

- [ ] **Step 1: Install**

Run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; if ($?) { npm install }` (workdir main `frontend/`)
Expected: exit 0, `node_modules/` created.

- [ ] **Step 2: Build**

Run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; if ($?) { npm run build }` (workdir main `frontend/`)
Expected: `tsc -b && vite build` succeeds (`✓ built in ...`). The `>500kB chunk` warning is known and accepted. Any tsc error STOPS the plan (likely a copy exclusion mistake — compare against the worktree tree).

---

### Task 6: Dead-file sweep + review.md archive

**Files:**
- Delete: `frontend/src/components/ui/{button,badge,input,listing-row}.tsx`, `frontend/src/hooks/use-pointer-position.ts`, `infra/` (empty dir), untracked `frontend/dist/` (disk hygiene; ignored, Task 5 rebuilds it). (`frontend/tsconfig.tsbuildinfo` needs no step: the tracked copy died with `git rm -r frontend` in Task 4 and the Task 4 copy excluded it.)
- Modify: `frontend/src/lib/api.ts` (remove `fetchOpenListings` + its `Listing` import if now unused; keep the `authedFetch` re-export), `SYSTEM_PROMPT.md` (two `review.md` references → `docs/review-supabase-era.md`: the §1 ask_user example and the §3 override rule)
- Move: `review.md` → `docs/review-supabase-era.md` (use `git mv`)

**Interfaces:**
- Consumes: green build (Task 5)
- Produces: sweep changes staged (commit happens in Task 8 together with dep changes)

- [ ] **Step 1: Verify each file is still unused before deleting**

Run (workdir main): `Select-String -LiteralPath "frontend\src" -Recurse -Include "*.tsx","*.ts" -Pattern "components/ui/(button|badge|input|listing-row)|use-pointer-position|fetchOpenListings" | Select-Object Path,LineNumber`
Expected: matches ONLY inside the files being deleted (badge import inside listing-row.tsx) plus the `fetchOpenListings` definition line in `lib/api.ts`. Any importer outside the delete list STOPS the plan.

- [ ] **Step 2: Delete the files and the empty dir**

Run: `git rm frontend/src/components/ui/button.tsx frontend/src/components/ui/badge.tsx frontend/src/components/ui/input.tsx frontend/src/components/ui/listing-row.tsx frontend/src/hooks/use-pointer-position.ts; if ($?) { Remove-Item -LiteralPath "infra" -ErrorAction SilentlyContinue }; if ($?) { Remove-Item -LiteralPath "frontend\dist" -Recurse -Force -ErrorAction SilentlyContinue }` (workdir main)
Expected: `rm ...` lines; no errors. (`dist/` belongs to the fresh Task 5 build; it is ignored build output, safe to drop — rebuild recreates it.)

- [ ] **Step 3: Trim api.ts**

Edit `frontend/src/lib/api.ts`: delete the `fetchOpenListings` function and the `import type { Listing }` line. Keep lines 1–4 (`authedFetch` import + re-export). Verify the file reads:
`import { authedFetch } from "./session"`, `export { authedFetch }`, plus the `API_BASE` line only if still referenced (it was only used by `fetchOpenListings` — if unreferenced after the trim, delete it too, otherwise `noUnusedLocals` fails the build).

- [ ] **Step 4: Archive review.md and repoint SYSTEM_PROMPT.md**

Run: `git mv review.md docs/review-supabase-era.md` (workdir main). Then edit `SYSTEM_PROMPT.md`: the `review.md §10 enforce-vs-warn` mention → `docs/review-supabase-era.md §10 enforce-vs-warn`, and the `` `CONTEXT/project-context.md` and `review.md` override `` line → `` `CONTEXT/project-context.md` and `docs/review-supabase-era.md` override ``.
Expected: `git status --short` shows `R review.md -> docs/review-supabase-era.md` plus `M SYSTEM_PROMPT.md`.

---

### Task 7: Dependency sweep

**Files:**
- Modify: `backend/requirements.txt` (drop `resend`, `httpx` lines), `frontend/package.json` (drop `shadcn`, `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`)

**Interfaces:**
- Consumes: Task 6 edits (their consumers are gone)
- Produces: `npm install` + `npm run build` green without the dropped deps

- [ ] **Step 1: Verify still unused**

Run (workdir main): `Select-String -LiteralPath "backend" -Recurse -Include "*.py" -Pattern "import resend|from resend|import httpx|from httpx"` → expect no matches. `Select-String -LiteralPath "frontend\src" -Recurse -Include "*.tsx","*.ts" -Pattern "@base-ui|class-variance|from ""clsx""|tailwind-merge|from ""shadcn"""` → expect no matches (the `cn` helper in `lib/utils.ts` is deleted with the ui files; if `lib/utils.ts` itself has no other importers, delete it too — check with `-Pattern "lib/utils"` first).
Expected: no matches outside deleted files. Any match STOPS the plan. Then check `lib/utils.ts`: run `Select-String -LiteralPath "frontend\src" -Recurse -Include "*.tsx","*.ts" -Pattern "lib/utils"` — if the only hits are inside the deleted `ui/*` files, run `git rm frontend/src/lib/utils.ts` (its sole consumer `cn` dies with them).

- [ ] **Step 2: Edit the manifests**

`backend/requirements.txt`: delete the `resend` and `httpx` lines, keep everything else byte-identical.
`frontend/package.json`: delete the five dep lines, keep version formatting identical otherwise.

- [ ] **Step 3: Reinstall and rebuild frontend**

Run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; if ($?) { npm install }; if ($?) { npm run build }` (workdir main `frontend/`)
Expected: install exit 0; build `✓ built in ...`. tsc errors here mean a missed importer — go back to Step 1.

---

### Task 8: Commit the sweep

**Files:** all Task 6 + Task 7 changes

**Interfaces:**
- Consumes: green build without dropped deps (Task 7)
- Produces: commit `sweep-commit`

- [ ] **Step 1: Review the diff**

Run: `git status --short; if ($?) { git diff --stat }` (workdir main)
Expected: only the intended deletions/edits/moves. No `backend/.env`, no `backend/data/`, no `.delta/` paths.

- [ ] **Step 2: Commit**

Run: `git add -A; if ($?) { git commit -m "sweep dead code and unused deps" }` (workdir main)
Expected: commit created.

---

### Task 9: Backend verification

**Files:** none (verification only; backend code is unchanged by this plan)

**Interfaces:**
- Consumes: `sweep-commit` (tree shape changed around backend, code identical)
- Produces: proof the backend still boots and behaves

- [ ] **Step 1: Rebuild and boot**

Run: `docker compose --env-file backend/.env up -d --build backend` (workdir main, timeout 600000)
Expected: `Started`, then `py -3 -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=10).read().decode())"` prints `{"status":"ok"}`.

- [ ] **Step 2: Rerun the backend probes**

Prior scripts live in temp scratch (`C:\Users\Admin\AppData\Local\Temp\opencode\`) and may be wiped; if missing, recreate from this logic: `probe_handover_code.py` (signup carrier+needer → carry listing → thread → confirm x2 → code to needer only → wrong-code 400 → courier complete-with-code 200 → carry open → review eligible+submit; then cleanup), `probe_ship_fixes.py` (12x bad signin → 10x401+2x429; malformed-uuid thread → generic 400; foreign-Origin preflight → `400 Disallowed CORS origin`; DELETE /api/auth/account → `/me` 401 and 0 rows left).
Expected: same outputs as the 2026-09-14 sessions. Any deviation STOPS the plan (tree damage until proven otherwise).

---

### Task 10: Frontend verification from the new tree

**Files:** none (verification only)

**Interfaces:**
- Consumes: `sweep-commit`, fresh `npm install` (Task 7)
- Produces: proof the single tree builds and runs

- [ ] **Step 1: Dev server from the new tree, kill the old one**

Start `npm run dev` in main `frontend/` (:5000). Stop the worktree dev server process afterwards (it is the last worktree dependency). Verify `http://127.0.0.1:5000/` returns 200.
Expected: new server 200. (If the port is taken by the old server, kill old first, then start.)

- [ ] **Step 2: Locale parity + dash scan**

Run ordinal checks: en/ru key sets equal (559/559 baseline; count may differ only if strings were touched — none planned, so any diff STOPS the plan), no U+2013/U+2014 in touched files (`Settings.tsx`, `session.ts`, `auth.tsx` were pre-existing changes, now part of the tree — scan the whole `src/` and require zero hits except pre-existing `messages.*` locale lines).
Expected: parity equal, no new dash hits.

- [ ] **Step 3: Authenticated headless probe**

Prior scripts in temp scratch (recreate if wiped): `probe_inbox_code.mjs` (needer sees HANDOVER CODE + digits, carrier sees COMPLETE DELIVERY and never the digits, zero page errors) and `probe_unverified_modal.mjs` (CONTACT CARRIER opens the restyled modal with the new copy, zero page errors). Throwaway users via :8000 with sessions injected over CDP into :5000. Delete probe users after (DELETE /api/auth/account).
Expected: all assertions pass. Screenshots to temp scratch for the human.

---

### Task 11: Close-out

**Files:**
- Create: `docs/session-handoff-<today>-single-tree.md` (short: commits, verification outputs, new dev path)

**Interfaces:**
- Consumes: Tasks 9–10 green
- Produces: finished restructure, clean trees, no orphans

- [ ] **Step 1: Final tree review**

Run: `git status --short` (main — expect clean); `Get-ChildItem -LiteralPath "."` root listing (expect backend, CONTEXT, db, docs, frontend, SKILLS, scripts, compose.yml, dotfiles — no `infra/`, no `review.md`, no `sql/`, no `supabase/`).
Expected: clean + normal shape. Present both to the human.

- [ ] **Step 2: Kill orphans**

Kill the worktree dev server (if still running), any headless Chrome trees (`taskkill /T /F`), `docker compose` stays up (it is the dev backend, not an orphan).

- [ ] **Step 3: Handoff note + report**

Write the handoff doc. Final message: the three commit hashes, verification outputs, the new dev path (`npm run dev` in main `frontend/`), and what was deliberately left alone.
