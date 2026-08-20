# Board

## DOING

## TODO

## DONE
- [x] PERF-001 Drag: rAF-bound pointer-move frames, geometry cached at drag start, zero layout reads during moves
- [x] PERF-002 Observer: config gated by state (nav/turns/stream), characterData only in stream stages, rebind on config/root change, pause/disable wiring
- [x] PERF-003 Lease: idempotent claim fast path, nonce-stable in-place renewal, fresh re-acquire after expiry, foreign lease refused read-only
- [x] PERF-004 Turns: one scoped union-selector scan, wrapper normalization + stable-key dedupe, no compareDocumentPosition, no sort
- [x] PERF-005 Snapshot: single bounded extraction per evaluation (candidates+whole+fingerprint), 16-surface cap with early exit
- [x] PERF instrumentation suites (tests/perf-00*.test.js, 23 tests): rectReads/cdp/qsa/innerText/gmSet counters in harness
- [x] Full regression 86/86 green + node --check clean
- [x] W2-001 Lease fencing: nonce token carried through async sends; takeover reloads persisted runtime
- [x] W2-002 Composer ownership guard across async gaps (empty->owned->send)
- [x] W2-003 Legacy session migration: identity/anchor validation before rebase
- [x] W2-004 Command-framing classifier: marker must be first authored command line
- [x] W2-005 Resume/Adopt interruption-safe lineage walk
- [x] W2-006 SPA observer follows live ChatGPT root, rebinds on replacement
- [x] W2-007 Recovery controls scoped to ChatGPT-owned UI, never authored content
- [x] Deterministic regression suite (tests/) + node --check clean
- [x] T-011 README version 0.0.1 -> 0.0.16 fixed
- [x] T-012 tests/smoke.js deleted per user decision
- [x] T-001 AI Chat Buttons - README + EN/RU/ET translations (v0.0.1)
- [x] T-003 Set version 0.0.1 across source files
- [x] T-004 Connect GitHub remote
- [x] T-005 Initial push to GitHub
- [x] T-006 Add LICENSE (MIT)
- [x] T-007 Add .gitignore
- [x] T-008 Add CONTRIBUTING.md
- [x] T-009 Add version/license badges to README
- [x] T-010 Duplicate userscript entry: ai_chatbuttons.js deleted (commit 46bf28d), AICHATBUTTONS.js canonical v0.0.15 — resolved

## BLOCKED