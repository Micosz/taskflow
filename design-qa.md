# Design QA — Layout Polish

## Comparison Target

- Source visual truth:
  - `/tmp/codex-clipboard-89542c24-3c03-425a-b556-0e3e2f9e3199.png` — search/add collision, 338 × 88 PNG.
  - `/tmp/codex-clipboard-fe7e2154-d90e-407e-82a4-8cddab4e209f.png` — focus-panel spacing and text, 807 × 881 PNG.
  - `/tmp/codex-clipboard-439c0a03-376f-48bd-b234-c5e4737f9d7c.png` — focus footer below the viewport, 784 × 139 PNG.
  - `/tmp/codex-clipboard-dac51805-7ec1-410f-8621-39c9a6018e3b.png` — task timer/action collision, 762 × 144 PNG.
- Implementation: `http://127.0.0.1:4173/`.
- Implementation screenshot evidence: Codex in-app Browser Tab 3 capture (browser-rendered tool artifact; the capture API did not expose a local filesystem path).
- Implementation pixels / CSS viewport: 1280 × 720 at device scale factor 1.
- State: Thai UI, guest mode, Unfinished view, no search query, no modal open, browser zoom 100%.
- Normalization: the sources are focused issue crops rather than a single full-page mock. Each crop was compared to its matching region in the 1280 × 720 browser capture at 1× density; no density conversion was needed.

## Full-view Comparison Evidence

The revised browser capture was inspected with all four supplied source crops in the same task context. The updated page keeps the existing editorial composition and visual language while changing only the requested layout behavior. At 1280 × 720, the full document reports `clientHeight: 720` and `scrollHeight: 720`, so the page itself no longer scrolls. The left focus panel and the right agenda both end at y = 720; only the agenda is scrollable (`clientHeight: 627`, `scrollHeight: 1198`, `overflow-y: auto`).

## Focused Region Comparison Evidence

- Search/add: the source shows the search underline running directly into the Add button. The revised topbar gives the search its own flex track and leaves a measured 19.19px gap before the Add button.
- Focus inset/type: the source begins approximately at the panel edge and uses low-contrast description copy. The revised focus content starts 48px inside the panel; description text is 16px, `rgb(193, 196, 189)`, line-height 1.7, and clamps long copy to protect the footer.
- Focus footer: the source footer falls below the available viewport. The revised footer ends at y = 705.61 within the 720px viewport, including the progress ring and complete button.
- Timer/actions: the source edit pencil collides with the timer. The revised grid reserves an 80px action track and an independent 10.25–11rem due track with a measured 16px gap. Countdown text is brighter at `rgb(163, 168, 161)`, 11.52px, weight 500.

## Required Fidelity Surfaces

- Fonts and typography: passed. Existing Geist/Thai coverage is retained. Focus description copy is larger and higher contrast without changing the display-title hierarchy; countdown copy is brighter and slightly larger/heavier.
- Spacing and layout rhythm: passed. The focus panel now has a 48px left inset at 1280px, search and Add are separated, the focus footer stays inside the viewport, and task-row due/actions use distinct grid tracks.
- Colors and visual tokens: passed. Existing near-black, off-white, mineral-sage, and overdue-rust tokens are preserved; only the low-contrast description/countdown foregrounds were raised.
- Image quality and asset fidelity: passed. The existing `/public/editorial-atmosphere.png` raster remains unchanged and renders without crop or stretching regressions.
- Copy and content: passed. Real TaskFlow translations, live deadlines, task descriptions, categories, and counts remain intact. Long descriptions are visually clamped in the focus summary only; full content remains available in task details.

## Findings

- No actionable P0, P1, or P2 findings remain for the five reported issues.
- [P3] The source crops contain different task content from the local guest fixture, so exact line-wrap matching is not meaningful. The revised focus region uses a height-aware title scale and four-line clamp below 800px viewport height to keep the equivalent long-content state safe.

## Interaction And Browser Verification

- Language switched English → Thai successfully; navigation, controls, dates, counts, and accessibility names updated.
- Desktop at 100% zoom: document has no vertical overflow (`720 / 720`).
- Agenda: independently scrollable (`1198 / 627`) while the focus panel remains fixed in the viewport.
- Persistent focus controls: footer bottom is 14.39px above the viewport edge.
- Search/add separation: 19.19px.
- Due/action separation: 16px with an 80px reserved action area.
- No Next.js error overlay was present in the final browser capture.
- Automated checks: ESLint passed; TypeScript passed; 13 test files / 63 tests passed; production build passed.

## Comparison History

1. Initial supplied evidence identified one P1 and three P2 issue groups: page-level overflow hiding the focus footer (P1); search/Add collision, weak focus padding/readability, and timer/action collision (P2).
2. Fixes applied: moved desktop search into a dedicated topbar flex slot; locked the desktop app shell to `100dvh`; made only the agenda scroll; changed the focus content to a height-aware flex layout with an auto-pushed footer; added desktop left padding and larger, brighter clamped description copy; widened and separated due/action grid tracks; increased countdown contrast and weight.
3. Post-fix browser evidence at 1280 × 720 confirmed no page scroll, a fully visible footer, 48px focus inset, readable 16px description copy, and positive gaps between both reported collision pairs.

## Implementation Checklist

- [x] Search and Add button occupy separate topbar tracks.
- [x] Focus content has a deliberate desktop left inset.
- [x] Focus description is larger and higher contrast.
- [x] Desktop body is fixed to one viewport; only the right agenda scrolls.
- [x] Progress and complete controls remain fully visible at 100% zoom.
- [x] Task countdown and edit/delete controls have separate grid space.
- [x] Lint, typecheck, tests, build, and browser measurements passed.

## Follow-up Polish

- Optional P3: test the same layout against the user's longest real Thai task title after their browser reload; the current height-aware rules are designed for that state, but the local fixture uses shorter English task titles.

final result: passed
