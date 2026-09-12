# LLM Wall Card -- Implementation Plan

## 0) Mode

**OPUS-HEAVY.**

Routes to HEAVY on file count (5 new files), LOC (well over 150), a new desktop app, and an optional outbound HTTP call to OpenRouter. There is no existing app to extend.

Start-LITE failed immediately: this is a greenfield product, not a 2-file wiring change.

### 0.1 Inputs read

| Input | Status |
|---|---|
| `cursor/input/agent.md` | **Missing.** Searched `/Users/newaardvark/Desktop/LLM Wall Card/cursor/input/agent.md` and `/Users/newaardvark/Desktop/cursor/input/agent.md`. Closest operating file is `cursor/input/opus.md`. |
| `cursor/input/plan.md` | **Read in full** (`/Users/newaardvark/Desktop/cursor/input/plan.md`). This document follows that contract. |
| `cursor/input/opus.md` | **Read in full.** Discipline, mode selector, no-comments, no full-suite, ask-vs-proceed. |
| `cursor/output/discovery_output.md` | **Missing.** No discovery artifact exists in the workspace or at `/Users/newaardvark/Desktop/cursor/output/`. |
| `cursor/input/files.md` | **Read.** Contents are `Gemfile` / `Gemfile.lock` from a different repo. **Ignore.** |
| `cursor/input/diff.md` | **Read.** PE-13916 datadog bump for AdWerx/promote. **Ignore.** |
| `cursor/input/best_practices/**` | **Read enough to reject.** `rails.md`, `rubocop.md`, `jest.md`, `react.md`, `rspec.md` describe a Rails 7 + React monolith (`app/javascript/<feature>/`). That tree does not exist here. Do not cargo-cult it. |
| `cursor/input/discovery.md` | **Read.** Used only to confirm what a discovery artifact would have contained. |
| Workspace `/Users/newaardvark/Desktop/LLM Wall Card` | **Glob `**/*` → 0 project files** (only `cursor/output/` created for this plan). |
| Prior conversation (2026-09-12) | Product decisions: 400×700 dedicated window; job→model→why; glanceable; curated copy; no blog scraping. |
| OpenRouter `GET /api/v1/models` | **Fetched 2026-09-12.** 445 models. Seed `modelId` values below were taken from that payload. |

### 0.2 Repository-truth gate

| Gate | Result |
|---|---|
| 1. Entrypoint / caller / callee | **None.** Empty workspace. No `index.html`, no `package.json`, no native project. |
| 2. Read files that will be modified | **None to modify.** All files are creates. |
| 3. Same-pattern examples (need 2) | **0 found.** Searched the workspace; there is no UI, no data file, no launcher. Stated as a verified absence, not a skipped search. |
| 4. Why not extend an existing file | There are no existing files. Each create below is a new responsibility, not a split of something already present. |

**Not `[BLOCKED: INSUFFICIENT CONTEXT]`.** The missing patterns are a verified empty repo, not unread context. Blocking would require reads that do not exist.

### 0.3 Discovery gaps

Minimum extra work that would have lived in `discovery_output.md` and is now closed or explicitly assumed:

| Gap | Resolution in this plan |
|---|---|
| No discovery artifact | Proceed from conversation + empty-repo verification. Assumptions tagged `[UNVERIFIED]`. |
| Which shell (Tauri / Electron / HTML) | Vanilla HTML + Chrome `--app`. See §1. Heavier shells fail the opus.md technology gate. |
| Which Chrome-like browser exists on this Mac | `[UNVERIFIED]`. `launch.sh` tries Chrome, then Chromium, then Brave, then `open`. |
| Exact Chrome window-chrome vs `--window-size` | `[UNVERIFIED]`. CSS also locks `400×700`. Close enough for a parked card. |
| Always-on-top | Not requested. Out of scope. User said "park," not "pin." |

No further reads are required before execution.

---

## 1) Decision Record

- **Intent:** Ship a 400×700 desktop card Misha can park on a second monitor. It answers "what am I trying to do → which model do I reach for" in one glance, and it can be updated without reprinting.
- **Root cause / driver:** N/A for a pure feature. Driver: a printed model list goes stale in about a month; a dedicated window with a local data file does not.
- **Assumptions:**
  - Job-first layout (not a model encyclopedia). Confirmed in conversation.
  - 8 rows, not 40. Glanceable or it fails.
  - "Why" copy is curator-owned and never generated from blogs or the OpenRouter description field.
  - Refresh is a liveness check of pinned `modelId`s, not an author of specialties. `[UNVERIFIED]` that this is dynamic enough long-term; it is the correct v1.
  - Chrome-class browser is available. `[UNVERIFIED]`
  - No npm, no React, no Tauri, no Electron, no API keys.
  - User standing rule: do not add tests unless instructed. Alternative verification only.
- **Constraints:**
  - Do not implement in this step. Plan only.
  - No code comments in any file the executor writes.
  - Do not scrape SEO roundups. They already disagree (Opus 5 vs 4.8, Gemini 3.7 vs 3.1).
  - `files.md` / `diff.md` / Rails best-practices must not influence file layout.
  - Window is 400×700 and dedicated (no browser tabs).
  - Offline-first: the card must render from local `data/card-data.js` with no network.
- **Risks:**
  - Auto-writing "excel at" from the internet produces a confident wrong card. Mitigated by pinning IDs and freezing `why` / `label`.
  - Chrome `--app` + `file://` is slightly fragile vs a native wrapper. Accepted for v1 simplicity.
  - Seed one-liners are editorial, not benchmarks. They will be argued with. That is fine; they are a starting posture, not a leaderboard.
- **Verdict:** Proceed.

---

## 2) Requirements & Success Criteria

| Field | Value |
|------|-------|
| Problem statement | Misha needs a glanceable, parked 400×700 window of current model routing advice. A printed list and a blog dashboard both fail: one goes stale, the other is unreadable at a glance. |
| Desired behavior | Opening `launch.sh` shows a dark 400×700 card with exactly the jobs in `data/families.json`, each as job / model / why. `python3 scripts/refresh.py` re-checks pinned OpenRouter IDs, marks missing ones stale, updates `updatedAt`, and does not rewrite `why` or `label`. |
| In-scope | Static card UI; local data files; Chrome `--app` launcher; OpenRouter liveness refresh; 8 seed jobs. |
| Out-of-scope | Tauri/Electron/WidgetKit; always-on-top; live leaderboards; prices on the face of the card; auto-authored specialties; image models beyond one row; installers; auto-start at login; tests. |
| Acceptance criteria | (1) `launch.sh` opens a tabless window showing 8 rows. (2) Each row is three lines or less: job, model, why. (3) First launch works offline from seeded `data/card-data.js`. (4) Refresh does not change `why` or `label`. (5) A missing `modelId` sets `stale: true` on that row only and leaves other rows intact. (6) Network failure leaves `card-data.js` untouched. |
| Observability | none |
| Perf expectations | First paint from local files. Refresh may take a few seconds; it is CLI-only. |
| Security/authorization | Window never calls OpenRouter. Refresh uses stdlib HTTPS GET, no API key. No secrets files. |

**Questions:** None. Architecture, data shape, and public behavior are decided above. Remaining uncertainty is tagged in §10 with fallbacks.

---

## 3) Current vs Target Behavior

| Aspect | Current (with receipts) | Target |
|--------|------------------------|--------|
| Entrypoint | None. Workspace glob was empty. | `launch.sh` → Chrome `--app` on `file://…/index.html` |
| Key branches | N/A | Render `window.CARD.jobs`. Stale rows get a `stale` class. Reload button calls `location.reload()`. Refresh CLI: success / partial-stale / hard-fail. |
| Return shape / side effects | N/A | `scripts/refresh.py` rewrites `data/card-data.js` only on a parsed catalog response. Hard fail = no write. |
| What must remain unchanged | N/A (greenfield) | `why` and `label` in `families.json` are human-owned forever. Refresh must not invent jobs. |

**Invariants after ship:** the card remains readable with the network down; 8 jobs unless a human edits `families.json`; no browser tabs in the happy-path Chrome launch.

---

## 4) Scope Boundary

### 4.1 Files to create/modify

- `index.html` -- create -- add -- document shell -- markup only; loads CSS + two classic scripts
- `css/card.css` -- create -- add -- poster layout locked to 400×700
- `js/app.js` -- create -- add -- `renderCard` / `formatUpdatedAt` / reload binding
- `data/families.json` -- create -- add -- curator source of truth (job, modelId, label, why)
- `data/card-data.js` -- create -- add -- `window.CARD = …` seed so first launch works before refresh
- `scripts/refresh.py` -- create -- add -- OpenRouter liveness write of `card-data.js`
- `launch.sh` -- create -- add -- dedicated 400×700 window

Hard boundary: executor creates only these seven files. No `package.json`, no `README.md`, no `.gitignore` unless a tool they run creates junk and they must ignore it (they should not create a Chrome profile dir).

### 4.2 Not in scope

- Always-on-top / native WidgetKit / Tauri / Electron
- In-window "refresh from internet" button
- Prices, context-window numbers, arena scores on the card
- Auto-promoting to a newer model ID
- Login-item / launch-at-startup
- Tests (user standing rule)
- Rails/React file layout from `best_practices/react.md`

### 4.3 Design restraint

Nothing exists to extend. New files are required.

Nearest comparable abstraction in this repo: **none** (0 examples). New pattern: a static poster driven by one JSON document and a stdlib Python writer.

Do not introduce a framework to render 8 rows.

### 4.4 Diff discipline

Smallest correct v1. No design system, no bundler, no modules (file:// + classic scripts). No comments.

---

## 5) Proposed Approach

### 5.1 Flow overview

Library path:

```
launch.sh → Chrome --app file://index.html
index.html → css/card.css + data/card-data.js + js/app.js
app.js → render window.CARD

python3 scripts/refresh.py
  → read data/families.json
  → GET https://openrouter.ai/api/v1/models
  → confirm each modelId
  → write data/card-data.js (label + why copied through)
  → user hits RELOAD or re-runs launch.sh
```

### 5.2 Components and responsibilities

| Component | Responsibility | Inputs/outputs | File | Pattern reference |
|---|---|---|---|---|
| Launcher | Open a tabless 400×700 window | none → OS window | `launch.sh` | New. No repo example. |
| Shell | Markup | none | `index.html` | New. |
| Poster CSS | Glance layout | none | `css/card.css` | New. |
| Renderer | Paint `window.CARD` | `window.CARD` → DOM | `js/app.js` | New. |
| Families | Human routing table | JSON | `data/families.json` | New. Source of truth. |
| Card payload | Last resolved render data | JS assignment | `data/card-data.js` | New. Seeded + rewritten by refresh. |
| Refresh | Liveness only | families + OpenRouter → card-data.js | `scripts/refresh.py` | New. stdlib only. |

### 5.3 Contracts

**`data/families.json`**

```json
{
  "jobs": [
    {
      "id": "hard-architecture",
      "job": "Hard architecture",
      "modelId": "anthropic/claude-opus-5",
      "label": "Claude Opus 5",
      "why": "Holds the whole problem"
    }
  ]
}
```

Required keys per job: `id`, `job`, `modelId`, `label`, `why`.
No extra keys in v1.
`id` is stable. Changing `id` is a human edit, not a refresh concern.

**`window.CARD` / `data/card-data.js`**

```javascript
window.CARD = {
  "updatedAt": "2026-09-12T07:00:00-04:00",
  "source": "seed",
  "jobs": [
    {
      "id": "hard-architecture",
      "job": "Hard architecture",
      "model": "Claude Opus 5",
      "modelId": "anthropic/claude-opus-5",
      "why": "Holds the whole problem",
      "stale": false
    }
  ]
};
```

- `source` is `"seed"` in the committed file, `"openrouter"` after a successful refresh parse.
- `model` is always `label` from families. Refresh copies it. Never OpenRouter's marketing name.
- `stale` is `true` only when that `modelId` is absent from the catalog (or the catalog row is a `:batch` only match — treat as missing; we pin exact ids).
- Direct callers: `js/app.js` only.
- Downstream consumers: none.
- Tests covering the contract today: none.

**`scripts/refresh.py`**

```
python3 scripts/refresh.py
```

Exit codes:

| Condition | Exit | Write `card-data.js`? | Row behavior |
|---|---|---|---|
| Catalog fetched and parsed; every `modelId` present | 0 | yes | all `stale: false`, `source: "openrouter"` |
| Catalog fetched and parsed; one or more `modelId` missing | 2 | yes | missing rows `stale: true`; others false |
| Network error, HTTP not 200, or JSON parse failure | 1 | **no** | previous file remains |
| `families.json` missing/invalid | 1 | **no** | previous file remains |

Timeout: 20 seconds.
URL: `https://openrouter.ai/api/v1/models`
Match: exact `id` equality against `data[]`. Ignore `:batch` variants unless the pinned id itself ends with `:batch` (seed ids do not).
Do not send an API key.
Do not read or write any other file.

**DOM contract**

```
#updated-at     text content = formatUpdatedAt(CARD.updatedAt)
#jobs           innerHTML replaced each render
#reload         click → location.reload()
#status         empty on healthy card; "N stale" if any job.stale
```

Each job is an `<li>` with `.job`, `.model`, `.why`. Add `.stale` on the `li` when `job.stale`.

### 5.4 Code-forward shape

Five runtime pieces, no framework:

- `launch.sh` picks a browser binary and passes `--app` + `--window-size=400,700`
- `index.html` is a header / list / footer
- `css/card.css` is a dark poster, system fonts, no webfonts
- `js/app.js` exposes `renderCard(card)` and boots from `window.CARD`
- `scripts/refresh.py` is a single `main()` with `load_families`, `fetch_catalog`, `resolve_card`, `write_card`

Rationale: a 400×700 glance card does not need client-side routing, a bundler, or a native shell. Chrome `--app` is the dedicated window. Classic scripts work on `file://`.

---

## 6) Task Breakdown (dependency-ordered, code-forward)

Tasks 1–2 can be parallel. Task 3 depends on 1. Task 4 depends on 1. Task 5 depends on 2–4.

### Task 1: Curator data + seeded card payload

**Tag:** `[MECHANICAL]`

**Goal:** Commit the source of truth and a renderable seed so the window works offline before refresh exists.

**Depends on:** none

**Context needed (read first):**
- This plan §5.3 — contracts
- Seed IDs were verified against OpenRouter on 2026-09-12. Re-fetch at execute time only if a listed id is gone; then pick the nearest same-family current id and record the change. Do not invent IDs.

**Files (scope for this task):**
- `data/families.json` -- create -- add -- whole file
- `data/card-data.js` -- create -- add -- whole file

**Invariants to preserve:**
- none

**Implementation notes (constraints + behavior):**
- Exactly these 8 jobs, in this order.
- `why` max ~32 characters. Do not expand into sentences.
- `job` max ~22 characters.
- `card-data.js` must assign `window.CARD` and end with a semicolon. No comments.
- Seed `updatedAt` = `2026-09-12T07:00:00-04:00`, `source` = `"seed"`, all `stale` = `false`.
- `model` in the seed equals `label` in families.

**Code guidance (copy-paste friendly):**

Create `data/families.json` as:

```json
{
  "jobs": [
    {
      "id": "hard-architecture",
      "job": "Hard architecture",
      "modelId": "anthropic/claude-opus-5",
      "label": "Claude Opus 5",
      "why": "Holds the whole problem"
    },
    {
      "id": "terminal-agents",
      "job": "Terminal / tools",
      "modelId": "openai/gpt-5.6-sol",
      "label": "GPT-5.6 Sol",
      "why": "Drives tools for real"
    },
    {
      "id": "everyday-code",
      "job": "Everyday coding",
      "modelId": "anthropic/claude-sonnet-5",
      "label": "Claude Sonnet 5",
      "why": "Fast and good enough"
    },
    {
      "id": "huge-context",
      "job": "Huge context",
      "modelId": "google/gemini-3.1-pro-preview",
      "label": "Gemini 3.1 Pro",
      "why": "Long docs and files"
    },
    {
      "id": "multimodal-bulk",
      "job": "Fast multimodal",
      "modelId": "google/gemini-3.8-flash",
      "label": "Gemini 3.8 Flash",
      "why": "Images, video, cheap bulk"
    },
    {
      "id": "cheap-agents",
      "job": "Cheap agent loops",
      "modelId": "x-ai/grok-4.6",
      "label": "Grok 4.6",
      "why": "Frontier-ish, less spend"
    },
    {
      "id": "cost-floor",
      "job": "Cost floor",
      "modelId": "deepseek/deepseek-v4-pro",
      "label": "DeepSeek V4 Pro",
      "why": "Near-frontier per dollar"
    },
    {
      "id": "images",
      "job": "Images",
      "modelId": "google/gemini-3.1-flash-image",
      "label": "Gemini Flash Image",
      "why": "Fast image work"
    }
  ]
}
```

Create `data/card-data.js` by projecting that list into the `window.CARD` shape in §5.3 (`model` = `label`, `stale` false, `source` `"seed"`). Do not add comments.

**Tests:**
- none -- user standing rule forbids adding tests unless instructed. Alternative: `python3 -m json.tool data/families.json` must exit 0. `python3 -c "import pathlib; s=pathlib.Path('data/card-data.js').read_text(); assert s.startswith('window.CARD ='); assert s.strip().endswith(';')"`

**Verify (must be concrete):**
- `python3 -m json.tool data/families.json`
- `python3 -c "import pathlib; s=pathlib.Path('data/card-data.js').read_text(); assert s.startswith('window.CARD ='); assert s.strip().endswith(';'); assert s.count('\"id\"')==8"`

---

### Task 2: Poster UI

**Tag:** `[JUDGMENT]`

**Goal:** A dark 400×700 card that is readable from a step away. Three fields per row. No paragraphs.

**Depends on:** `Task 1` for `window.CARD`, but HTML/CSS can be written against the contract if Task 1 is in flight. Prefer Task 1 first so a browser open shows data.

**Context needed (read first):**
- This plan §5.3 DOM contract
- `data/card-data.js` after Task 1

**Files (scope for this task):**
- `index.html` -- create -- add -- whole file
- `css/card.css` -- create -- add -- whole file
- `js/app.js` -- create -- add -- whole file

**Invariants to preserve:**
- none

**Implementation notes (constraints + behavior):**
- Classic scripts only. No `type="module"`.
- Script order in `index.html`: `data/card-data.js` then `js/app.js`.
- If `window.CARD` is missing, `#status` = `No card data` and `#jobs` stays empty. Do not throw.
- `formatUpdatedAt` uses `en-GB` with day numeric, month short, year numeric. Invalid date → raw string.
- Reload binds once on `DOMContentLoaded`.
- No comments.
- No webfonts, no images, no favicon requirement.
- Overflow-y auto on the list as a safety valve; 8 rows should not need it.
- Stale row: reduced opacity and a 9px `STALE` mark after the model name, generated in JS, not hardcoded in HTML.

**Code guidance (copy-paste friendly):**

`index.html` skeleton:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=400, height=700">
    <title>LLM Wall</title>
    <link rel="stylesheet" href="css/card.css">
  </head>
  <body>
    <div class="card">
      <header>
        <h1>LLM Wall</h1>
        <time id="updated-at"></time>
      </header>
      <ol id="jobs"></ol>
      <footer>
        <button type="button" id="reload">Reload</button>
        <p id="status"></p>
      </footer>
    </div>
    <script src="data/card-data.js"></script>
    <script src="js/app.js"></script>
  </body>
</html>
```

`css/card.css` required rules (executor may tune spacing, not the contract):

- `html, body { margin: 0; width: 400px; height: 700px; overflow: hidden; }`
- Background `#0d0d0d`, text `#f2f0ea`, muted `#8a8680`, accent `#c4a574`
- `font-family: ui-sans-serif, system-ui, sans-serif`
- `.card` is 400×700, flex column, padding 20px 18px 16px
- `h1` ~13px, uppercase, letter-spacing, accent color
- `#updated-at` muted, ~11px
- `#jobs` flex 1, list-style none, overflow-y auto, gap ~10px
- `.job` muted 11px
- `.model` 16px / 600
- `.why` 12px / 1.25, color `#c9c4bb`
- `li.stale { opacity: 0.45; }`
- footer row: button + status, not dominating the card
- button: transparent, accent border, 11px uppercase

`js/app.js` skeleton:

```javascript
function formatUpdatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "";
  }
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function renderCard(card) {
  const updatedAt = document.getElementById("updated-at");
  const jobsEl = document.getElementById("jobs");
  const status = document.getElementById("status");
  if (!card || !Array.isArray(card.jobs)) {
    updatedAt.textContent = "";
    jobsEl.replaceChildren();
    status.textContent = "No card data";
    return;
  }
  updatedAt.textContent = formatUpdatedAt(card.updatedAt);
  const staleCount = card.jobs.filter((job) => job.stale).length;
  status.textContent = staleCount ? `${staleCount} stale` : "";
  const fragment = document.createDocumentFragment();
  card.jobs.forEach((job) => {
    const li = document.createElement("li");
    if (job.stale) {
      li.className = "stale";
    }
    const jobLine = document.createElement("div");
    jobLine.className = "job";
    jobLine.textContent = job.job || "";
    const modelLine = document.createElement("div");
    modelLine.className = "model";
    modelLine.textContent = job.model || "";
    if (job.stale) {
      const mark = document.createElement("span");
      mark.className = "stale-mark";
      mark.textContent = " STALE";
      modelLine.appendChild(mark);
    }
    const whyLine = document.createElement("div");
    whyLine.className = "why";
    whyLine.textContent = job.why || "";
    li.append(jobLine, modelLine, whyLine);
    fragment.appendChild(li);
  });
  jobsEl.replaceChildren(fragment);
}

document.addEventListener("DOMContentLoaded", () => {
  renderCard(window.CARD);
  document.getElementById("reload").addEventListener("click", () => {
    location.reload();
  });
});
```

**Tests:**
- none -- user standing rule. Alternative: open `index.html` in a browser and confirm 8 rows, date `12 Sep 2026`, Reload refreshes.

**Verify (must be concrete):**
- Confirm `index.html` contains `id="jobs"`, `id="reload"`, `src="data/card-data.js"`, and no `type="module"`.
- Confirm `js/app.js` defines `renderCard` and `formatUpdatedAt`.
- Open `file:///Users/newaardvark/Desktop/LLM Wall Card/index.html` and confirm 8 rows paint.

---

### Task 3: Dedicated 400×700 window

**Tag:** `[MECHANICAL]`

**Goal:** One command parks a tabless 400×700 window on the file above.

**Depends on:** `Task 2`

**Context needed (read first):**
- `index.html` path after Task 2

**Files (scope for this task):**
- `launch.sh` -- create -- add -- whole file

**Invariants to preserve:**
- none

**Implementation notes (constraints + behavior):**
- Resolve `ROOT` as the directory containing `launch.sh` via `cd "$(dirname "$0")"` then `pwd`.
- Prefer in order: Google Chrome, Chromium, Brave. Use the app binary path, not `open -na`, so `--app` and `--window-size` stick.
- Binary paths to try:
  - `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
  - `/Applications/Chromium.app/Contents/MacOS/Chromium`
  - `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- Args: `--app=file://${ROOT}/index.html` `--window-size=400,700`
- Do not pass `--user-data-dir`.
- If none of the binaries exist: `open "${ROOT}/index.html"` and exit 0. That is the degraded path, not a failure.
- `chmod +x launch.sh`
- No comments.

**Code guidance (copy-paste friendly):**

```bash
#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
URL="file://${ROOT}/index.html"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROMIUM="/Applications/Chromium.app/Contents/MacOS/Chromium"
BRAVE="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
if [[ -x "$CHROME" ]]; then
  exec "$CHROME" --app="$URL" --window-size=400,700
elif [[ -x "$CHROMIUM" ]]; then
  exec "$CHROMIUM" --app="$URL" --window-size=400,700
elif [[ -x "$BRAVE" ]]; then
  exec "$BRAVE" --app="$URL" --window-size=400,700
else
  open "$URL"
fi
```

**Tests:**
- none. Alternative: run `./launch.sh` and confirm a tabless window, not a Chrome tab.

**Verify (must be concrete):**
- `test -x launch.sh`
- `./launch.sh`
- Confirm the window is approximately 400×700, shows the card, and has no tab strip in the Chrome/Chromium/Brave happy path.

---

### Task 4: OpenRouter liveness refresh

**Tag:** `[JUDGMENT]`

**Goal:** A stdlib Python script that proves pinned IDs still exist and marks the ones that do not, without rewriting specialties.

**Depends on:** `Task 1`

**Context needed (read first):**
- This plan §5.3 exit table
- `data/families.json`

**Files (scope for this task):**
- `scripts/refresh.py` -- create -- add -- whole file

**Invariants to preserve:**
- `families.json` is never written by this script
- `label` and `why` pass through unchanged
- job order is families order
- on exit 1, `data/card-data.js` bytes are unchanged

**Implementation notes (constraints + behavior):**
- stdlib only: `json`, `os`, `sys`, `urllib.request`, `urllib.error`, `datetime`
- Paths are relative to repo root: `Path(__file__).resolve().parent.parent`
- Atomic write: write `data/card-data.js.tmp` then `os.replace` onto `data/card-data.js`
- File body: `window.CARD = ` + `json.dumps(card, indent=2)` + `;\n`
- `updatedAt` = `datetime.datetime.now().astimezone().isoformat(timespec="seconds")`
- Catalog index: `{item["id"]: item for item in payload["data"]}` after confirming `data` is a list
- A job is live when `job["modelId"] in catalog`
- Do not use OpenRouter `name` or `description` for display
- No comments
- No print of catalog dump. One line to stdout is enough: `ok`, `stale: id,id`, or the exception message on failure

**Failure modes (exact):**

1. `families.json` missing or not a dict with a `jobs` list → stderr message, exit 1, no write
2. `URLError`, timeout, HTTP status != 200, or top-level JSON not a dict with `data` list → stderr message, exit 1, no write
3. Parsed catalog, some IDs missing → write card with those `stale: true`, stdout `stale: a,b`, exit 2

**Code guidance (copy-paste friendly):**

```python
#!/usr/bin/env python3
import datetime
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FAMILIES_PATH = ROOT / "data" / "families.json"
CARD_PATH = ROOT / "data" / "card-data.js"
CATALOG_URL = "https://openrouter.ai/api/v1/models"
TIMEOUT_SECONDS = 20


def load_families():
    try:
        payload = json.loads(FAMILIES_PATH.read_text())
    except (OSError, json.JSONDecodeError) as error:
        raise SystemExit(f"families: {error}") from error
    jobs = payload.get("jobs") if isinstance(payload, dict) else None
    if not isinstance(jobs, list) or not jobs:
        raise SystemExit("families: jobs must be a non-empty list")
    required = {"id", "job", "modelId", "label", "why"}
    for index, job in enumerate(jobs):
        if not isinstance(job, dict) or not required.issubset(job):
            raise SystemExit(f"families: job {index} missing keys")
    return jobs


def fetch_catalog():
    request = urllib.request.Request(
        CATALOG_URL,
        headers={"User-Agent": "llm-wall-card/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            if response.status != 200:
                raise SystemExit(f"catalog: HTTP {response.status}")
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, UnicodeDecodeError) as error:
        raise SystemExit(f"catalog: {error}") from error
    rows = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        raise SystemExit("catalog: data must be a list")
    return {row.get("id"): row for row in rows if isinstance(row, dict) and row.get("id")}


def resolve_card(jobs, catalog):
    resolved = []
    stale_ids = []
    for job in jobs:
        missing = job["modelId"] not in catalog
        if missing:
            stale_ids.append(job["modelId"])
        resolved.append(
            {
                "id": job["id"],
                "job": job["job"],
                "model": job["label"],
                "modelId": job["modelId"],
                "why": job["why"],
                "stale": missing,
            }
        )
    return {
        "updatedAt": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": "openrouter",
        "jobs": resolved,
    }, stale_ids


def write_card(card):
    body = "window.CARD = " + json.dumps(card, indent=2) + ";\n"
    tmp = CARD_PATH.with_suffix(".js.tmp")
    tmp.write_text(body)
    os.replace(tmp, CARD_PATH)


def main():
    try:
        jobs = load_families()
        catalog = fetch_catalog()
    except SystemExit as error:
        message = error.code if isinstance(error.code, str) else str(error)
        print(message, file=sys.stderr)
        raise SystemExit(1) from error
    card, stale_ids = resolve_card(jobs, catalog)
    write_card(card)
    if stale_ids:
        print("stale: " + ",".join(stale_ids))
        raise SystemExit(2)
    print("ok")


if __name__ == "__main__":
    main()
```

`load_families` and `fetch_catalog` raise `SystemExit("…message…")` with a string payload. `main` prints that string to stderr and exits 1. Do not add another exception wrapper. `resolve_card` / `write_card` only run after a parsed catalog exists, so a hard fetch failure cannot overwrite `card-data.js`.

**Tests:**
- none -- user standing rule. Alternative verification below.

**Verify (must be concrete):**
- `python3 scripts/refresh.py` (network required for the happy path)
- Confirm exit 0 or 2
- Confirm `data/card-data.js` still has the same 8 `why` strings as `data/families.json`
- Confirm `source` is `openrouter`
- Copy `card-data.js` aside, break `families.json` to invalid JSON, run again, confirm exit 1 and `card-data.js` bytes match the aside copy, then restore `families.json`

---

### Task 5: End-to-end park check

**Tag:** `[MECHANICAL]`

**Goal:** Prove the card is actually a parked window, not just files on disk.

**Depends on:** `Task 3`, `Task 4`

**Context needed (read first):**
- Built files from Tasks 1–4

**Files (scope for this task):**
- none -- verify only. Do not add files.

**Invariants to preserve:**
- No extra files, no comments, no README, no tests

**Implementation notes (constraints + behavior):**
- Run the verify commands in §7
- If Chrome `--app` opens as a normal tab, fix `launch.sh` to `exec` the binary path (already specified). Do not switch to Electron.
- If a seed `modelId` 404s against today's catalog, update that one id in both `families.json` and the seed `card-data.js`, then re-run refresh. Do not change `why`.

**Code guidance (copy-paste friendly):**
- none

**Tests:**
- none

**Verify (must be concrete):**
- Commands in §7
- Manual: park the window on a second monitor or desktop corner; confirm it is readable at a glance without scrolling

---

### Task ordering

1. Task 1
2. Task 2 (after Task 1)
3. Task 3 and Task 4 are parallel after Task 1 (Task 3 also needs Task 2)
4. Task 5 last

```
Task 1
  ├─ Task 2 → Task 3 ─┐
  └─ Task 4 ──────────┴→ Task 5
```

---

## 7) Test & Verification Strategy

No automated test files. User standing rule: do not write tests unless instructed. Do not run a suite. There is no suite.

Named checks the executor must run:

```
python3 -m json.tool data/families.json
python3 -c "import pathlib; s=pathlib.Path('data/card-data.js').read_text(); assert s.startswith('window.CARD ='); assert s.strip().endswith(';')"
python3 scripts/refresh.py
test -x launch.sh
./launch.sh
```

After refresh, confirm by reading `data/card-data.js`:
- 8 jobs
- every `why` matches `families.json`
- `source` is `openrouter` if exit was 0 or 2

Lint/typecheck: none configured. Do not add any.

---

## 8) Rollout / Migration / Rollback

Local personal tool. No deploy, no flag, no migration.

Rollback: delete the seven files, or `git checkout` if the repo is initialized later. Refresh cannot corrupt `families.json`. If `card-data.js` is bad, restore the Task 1 seed and the window still works offline.

---

## 9) Risks & Edge Cases

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Chrome `--app` ignored when launched via `open -na` | med | high (tabs, not a card) | `exec` the binary path |
| No Chrome-class browser | low | med | `open` fallback; still a usable page |
| OpenRouter down | med | low | exit 1, keep last card; window stays offline |
| Pinned `modelId` retired | med | low | that row goes stale; other rows stay; human edits one id |
| Executor invents "excel at" from the API | med | high | contract forbids using `name` / `description` for copy |
| More than 8 jobs later | low | med | overflow-y auto; do not add jobs in v1 |
| `file://` script block | low | high | classic relative scripts, no modules |

---

## 10) Unknowns Registry

| Unknown | Why it matters | Conservative fallback | Safe to proceed? |
|---------|---------------|----------------------|-----------------|
| Chrome / Chromium / Brave installed | Dedicated window vs plain `open` | `open index.html` | yes |
| `--window-size` vs OS chrome | Window may be slightly off 400×700 | CSS locks the page to 400×700 | yes |
| OpenRouter IDs still valid at execute time | Seed rows could mark stale immediately | Swap only the dead id to the current same-family id; keep `why` | yes |
| Whether liveness-only refresh feels "dynamic" enough | Product risk, not a build blocker | Human edits `families.json` in 30 seconds; that is the real update path | yes |
| Always-on-top desired later | Would force a native wrapper | Out of scope; park the window | yes |

---

## 11) Definition of Done

- **Files touched:** `index.html`, `css/card.css`, `js/app.js`, `data/families.json`, `data/card-data.js`, `scripts/refresh.py`, `launch.sh`
- **Behavior change:** yes — empty folder becomes a parked 400×700 job→model card with an offline seed and a CLI liveness refresh
- **Tests added/updated:** none -- user standing rule; verification is the commands in §7 plus a parked-window glance
- **How to verify locally:**
  - `python3 -m json.tool data/families.json`
  - `python3 -c "import pathlib; s=pathlib.Path('data/card-data.js').read_text(); assert s.startswith('window.CARD ='); assert s.strip().endswith(';')"`
  - `python3 scripts/refresh.py`
  - `test -x launch.sh && ./launch.sh`
- **Manual verification:**
  - Window is tabless on the Chrome happy path
  - 8 rows, no paragraph blobs
  - Date is readable
  - Reload works after a refresh
  - A stale row (if any) is dimmed and marked `STALE`
  - Card still renders if the network is off
- **Not in scope:**
  - Native always-on-top / Tauri / Electron / WidgetKit
  - In-window network refresh
  - Prices, benchmarks, or auto-authored specialties
  - Tests, README, package manager
- **Observability impact:** none
- **Rollback plan:**
  - Stop using `launch.sh`
  - Restore seeded `data/card-data.js` if a refresh write is unwanted
  - Delete the seven files to return to empty
  - `families.json` is never overwritten, so curator copy cannot be lost by refresh
