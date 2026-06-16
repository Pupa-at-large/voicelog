# CLAUDE.md — 语迹 VoiceLog

Standing handover for any new session. Read this first, then `docs/PROGRESS.md`
for current state and `docs/handoff/voicelog_PRD_v1.md` for product spec.

## What this is
**语迹 VoiceLog** — a voice-driven "time growth system" (not a scheduler). Slogan:
**时间是你最大的资产**. The soul is 复盘+成长 (review + leveling), local-first.
This repo is the **design-version prototype**: a clickable HTML/CSS/JS React
prototype with **3 themes (云/暖/夜)**, a **mobile app** and a **web desktop app**,
shown side-by-side on a pannable design canvas.

## How it runs (no build step)
- Entry: **`VoiceLog.html`** (repo root) loads everything from `project/`.
  `project/VoiceLog.html` is the same canvas with relative paths.
- React 18 + **`@babel/standalone`** compile the `.jsx` in the browser. Plain
  scripts (`tokens.js`/`data.js`/`parser.js`) load first and attach to `window.VL`;
  `.jsx` files load in order and attach components to `window`. **Script order in
  the HTML matters** — shared deps before consumers.
- To view: serve the repo root over HTTP (`python3 -m http.server 8080` →
  `/VoiceLog.html`) — `file://` won't work (Babel fetches the .jsx). Also live on
  GitHub Pages at `/VoiceLog.html` if enabled.

## File map
- `project/app/` — mobile + shared:
  - `data.js` — all shared model on `window.VL.*` (events seed, levels/XP, quadrants,
    capacity, rollover, batch executor, helpers). **Put shared logic here.**
  - `parser.js` — `window.VL.parse` (one utterance→event) + `window.VL.parseBatch`
    (multi-intent). Rule-based, offline (prod swaps an LLM).
  - `ui.jsx` — shared primitives + shared components (Card/Btn/…, FocusCard,
    CapacityBanner, RolloverBanner, BatchReviewList, MatrixView, QuadrantChip/Bar).
    All exported via `Object.assign(window, {…})`.
  - `icons.jsx`, `screens-home.jsx` (home + voice overlay + detail/edit + swipe row),
    `screens-overview.jsx`, `screens-review.jsx`, `screens-export.jsx` (export + 我的),
    `screens-growth.jsx` (成长 page + GrowthReport + level-up), `VoiceLogApp.jsx` (mobile shell).
- `project/webapp/` — web desktop: `web-app.jsx` (shell + views + modals),
  `web-calendar.jsx`, `web-voice.jsx`, `web-growth.jsx`, `web-celebrate.jsx`, `web-welcome.jsx`.
- `project/frames/` — `ios-frame.jsx`, `design-canvas.jsx` (starter scaffolds; don't edit).
- `docs/` — `PROGRESS.md` (milestone log, update it), `handoff/` (PRD + research).

## Design principles (from PRD §4 — must follow)
1. 赋能不强制 — the user owns their time; the app advises, never polices.
2. 复盘是主场、说教是禁区 — sink "good for you" nudges into review/growth, never
   interrupt with preachy modals.
3. 抹平摩擦 > 加功能 — undo/recover/forgiveness at the moment & place of the mistake.
4. 奖励"做了"而非"做完"; 等级/XP 只升不降; **no punishment, no bare streaks**.
5. 本地优先 — data is the user's, exportable, never locked in.
Also: keep **mobile and web consistent ("处处一致")**; match surrounding code style
(dense inline-style React, OKLCH theme tokens via `t`); **keep the demo overlap-free**.

## Data model notes
- Event: `{ id, t:'HH:MM', dur(min), title, cat:meet|deep|life|learn|misc, status:
  todo|done|cancelled, loc?, reminder?(min), important?, urgent?, repeat?, progress?, goal?, note? }`.
- "Today" in the demo is **`06-16`** (`window.VL.todayKey()`); week is `06-15..06-21`.
- important×urgent → Eisenhower quadrant (`window.VL.quadrant`); Q2「重要不紧急」=成长区.
- Persistence: localStorage, per-theme key on mobile (`voicelog:<theme>`), `voicelog-web-v2` on web.

## How to verify (default: no browser available)
Run the project's exact transformer + logic assertions in node:
1. **Parse** every `.jsx` through `@babel/standalone` (catches syntax errors) and
   `new Function()` the plain `.js`. (`npm i @babel/standalone@7.29.0` in a temp dir.)
2. **Logic**: shim `{window:{}}`, run `tokens.js`+`data.js`+`parser.js` in a `vm`,
   assert against `window.VL.*` (levels, quadrants, capacity, rollover, parseBatch,
   applyBatchTo, speechTrust, etc.).
Cross-check `window.*` exports vs consumers and script load order. Then sanity-check
visually on GitHub Pages if asked.

## State & what's next
- **Done: M0–M9** (growth/leveling, one-tap-complete fix, mobile undo/recycle/postpone,
  Now/Next card, capacity warning, rollover, multi-intent batch, Typeless growth report,
  speech trust feedback, Eisenhower matrix). See `docs/PROGRESS.md`.
- **Queued (experimental tier):** 建议式改期 (conflict → 2-3 options, needs-confirm),
  Web ⌘K command bar, mobile new-user welcome page. Plus productionizing: PWA, real
  speech/LLM API. Discuss scope before large autonomous runs; commit per milestone.

## Conventions
- Commit per logical change; concise subject + body. If the env's commit-signing
  server errors (400), use `--no-gpg-sign` (cosmetic only).
- Update `docs/PROGRESS.md` when you finish a milestone.
- Don't render screenshots unless asked; read the source — dimensions/colors are inline.
