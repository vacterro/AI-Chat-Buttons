// ==UserScript==
// @name         AI ChatButtons
// @namespace    https://github.com/local/ai-chatbuttons
// @version      0.0.16
// @description  Universal AI prompt buttons — SAIPEN Golden Default UI
// @author       AI ChatButtons
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @match        https://claude.ai/*
// @match        https://chat.deepseek.com/*
// @match        https://chat.qwen.ai/*
// @match        https://qwen.ai/*
// @match        https://tongyi.aliyun.com/*
// @match        https://grok.com/*
// @match        https://x.com/i/grok*
// @match        https://gemini.google.com/*
// @match        https://gemini.google.com/app*
// @match        https://copilot.microsoft.com/*
// @match        https://www.bing.com/chat*
// @match        https://kimi.moonshot.cn/*
// @match        https://kimi.com/*
// @match        https://duck.ai/*
// @match        https://duckduckgo.com/*
// @match        https://chat.mistral.ai/*
// @match        https://huggingface.co/chat/*
// @match        https://www.perplexity.ai/*
// @match        https://poe.com/*
// @match        https://pi.ai/*
// @match        https://www.phind.com/*
// @match        https://you.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'ai_chatbuttons_v6';
  const STATE_VERSION = 8;
  const BUILTIN_REVISION = 8;
  const MAX_CATEGORIES = 10;
  const MAX_PRESETS = 20;
  const PANEL_WIDTH = 400;
  const PANEL_HEIGHT = 510;
  const PANEL_SIZES = Object.freeze({
    compact: Object.freeze({ width: 340, height: 420, label: 'Small' }),
    normal: Object.freeze({ width: PANEL_WIDTH, height: PANEL_HEIGHT, label: 'Normal' }),
    large: Object.freeze({ width: 480, height: 620, label: 'Large' })
  });
  const OPACITY_LEVELS = Object.freeze([100, 75, 50, 25]);
  const PANEL_EDGE_MARGIN = 8;
  const AUTO_LEGACY_RUNTIME_KEY = 'ai_chatbuttons_auto_audit_runtime_v2';
  const AUTO_RUNTIME_PREFIX = 'ai_chatbuttons_auto_audit_runtime_v4:';
  const AUTO_LEASE_PREFIX = 'ai_chatbuttons_auto_audit_lease_v1:';
  const AUTO_LEGACY_SESSION_KEY = 'ai_chatbuttons_auto_audit_v1';
  const AUTO_TAB_SESSION_KEY = 'ai_chatbuttons_auto_tab_id_v1';
  const AUTO_DRAFT_SESSION_KEY = 'ai_chatbuttons_auto_draft_id_v1';
  const AUTO_LEASE_TTL_MS = 30000;
  const AUTO_LEASE_RENEW_MS = 10000;
  const AUTO_LEASE_VERIFY_MS = 90;
  const AUTO_MAX_PARTIAL_CONTINUATIONS = 8;
  const AUTO_MAX_CONTINUE_GENERATING = 8;
  const AUTO_MAX_RETRIES = 3;
  const AUTO_MAX_STALL_NUDGES = 6;
  const AUTO_IDLE_STALL_GRACE_MS = 20000;
  const AUTO_LIVENESS_CHECK_MS = 2500;
  const AUTO_STAGE_TIMEOUTS = Object.freeze([60, 120, 180, 360]);
  const AUTO_DELAYS_MS = Object.freeze([500, 1200, 2500, 5000, 10000]);
  const AUTO_RESPONSE_STABLE_MS = 1200;
  const AUTO_OBSERVER_DEBOUNCE_MS = 650;
  const AUTO_SEND_REGISTER_TIMEOUT_MS = 20000;
  const AUTO_SEND_REGISTER_RETRY_MS = 60000;
  const AUTO_MAX_SEND_REGISTRATION_RETRIES = 2;
  const AUTO_SEND_RECEIPT_PREFIX = 'ACB_CHAIN_RECEIPT';
  const CHATGPT_LONG_PROMPT_THRESHOLD = 6000;
  const CHATGPT_ATTACHMENT_TIMEOUT_MS = 30000;
  const CHATGPT_PROMPT_DELIVERY_MODES = Object.freeze(['auto', 'file', 'text']);
  const AUDIT_ATTACHMENT_FILES = Object.freeze({
    core: 'AUDIT_CORE.md',
    second: 'AUDIT_SECOND_WAVE.md',
    performance: 'AUDIT_PERFORMANCE.md'
  });

  const AUDIT_CORE = "AUDIT CORE — deep read-only software correctness audit for implementation handoff.\n\nROLE\n\nYou are the AUDITOR, not the implementation agent.\n\nInspect the supplied project deeply, identify verified flaws, and return a high-value repair handoff for a separate implementation agent. Do not modify the audited implementation or project metadata during this pass.\n\nTARGET\n\nResolve the most recent explicit implementation target in the conversation: repository, archive, project tree, attached file, or pasted code.\n\nPrefer the newest explicit target when several exist.\n\nRepository: inspect the current supplied/default revision unless the user explicitly names another branch/commit.\nArchive: unpack fully and identify the real project root.\nSingle file: inspect the complete supplied file and directly relevant local contracts/dependencies when available.\n\nIf the target itself cannot actually be read, return BLOCKED with the exact missing artifact/access. Do not invent evidence.\n\nPROJECT ORIENTATION — FAST, READ-ONLY, NON-BLOCKING\n\nBefore the deep code audit, spend a small bounded setup pass understanding the project itself.\n\nAt the resolved project root, inspect these only when they exist:\n\n- `.saipen/`: root project STATE/BOARD/LOG plus only relevant KNOWLEDGE/kitchen material. Use it as optional historical/work-state context: prior fixes, known failures, active tasks, stale assumptions, baseline drift.\n- Git: use ordinary Git metadata/commands when available (HEAD, branch, status, useful recent history/diff). Do NOT crawl `.git/objects` or spend audit budget reading Git internals.\n- project manifests and lockfiles: package.json, Cargo.toml, pyproject.toml, requirements, go.mod, solution/project files, build config, etc.;\n- tests/fixtures, migrations, schemas, config, docs/contracts, CI/workflow files, scripts and entry points when relevant;\n- other project-local helper/state directories only when they materially explain runtime behavior.\n\nThese sources are ORIENTATION, not gates.\n\nRules:\n- `.saipen/`, Git, docs, tests, manifests, CI or helper folders may be absent. Continue normally.\n- Do not require an external SAIPEN installation, `saipen_home`, BOOT/CORE/MARKHUNT files, validator, portable protocol bundle, or any other out-of-project authority.\n- Do not initialize, repair, rebind, validate or modify `.saipen/`.\n- If `.saipen/` is stale, contradictory, incomplete, or references inaccessible external paths, record that briefly and continue.\n- Live implementation files are authoritative for current behavior.\n- Do not let project-management metadata consume the audit budget. The implementation is the primary target.\n\nBASELINE\n\nRecord the strongest truthful identity available:\n- Git: branch + current commit when readable;\n- archive: archive filename + hash/fingerprint when available;\n- file: filename + hash/fingerprint when available;\n- otherwise the clearest stable identity available.\n\nAUDIT METHOD\n\nBuild a compact map first:\n\nentry points -> parsing/validation -> state owners -> transitions -> core logic -> persistence/I/O -> recovery/error paths -> UI/output -> tests/contracts.\n\nThen follow real execution/data/state paths end-to-end. Audit correctness before style.\n\nHUNT VERIFIED ROOT DEFECTS\n\nPrioritize:\n- broken invariants and contradictory logic;\n- wrong defaults, branches, ordering or state transitions;\n- missing/incorrect validation and invalid partial-state handling;\n- duplicate/competing sources of truth;\n- duplicated implementations whose behavior can drift;\n- dead/unreachable/stale compatibility paths that still affect runtime;\n- partial migrations and config/schema/version drift;\n- persistence, serialization, import/export, restart, recovery and data-loss faults;\n- init/shutdown/teardown/ownership mistakes;\n- concurrency, repeated invocation, stale async result, retry, cancellation and idempotence faults where applicable;\n- UI state disagreeing with runtime state;\n- stale/replaced targets and incorrect fallback selection;\n- API/CLI/docs/config/tests contradicting actual execution;\n- tests that protect the wrong invariant or fail to cover a demonstrated failure.\n\nQUALITY BAR\n\n- Evidence before finding.\n- Root cause before symptom.\n- Merge symptoms sharing one root cause.\n- Preserve correct behavior.\n- No generic cleanup.\n- No speculative redesign.\n- No framework/dependency/telemetry/dashboard proposals unless required by a verified defect.\n- Never fabricate commands, output, test results, timings, paths, commits or reproduction evidence.\n- Use PARTIAL only when the wave genuinely cannot finish within the current execution/context budget. PARTIAL is a resumable machine checkpoint, not a request for user intervention; finish the current evidence cleanly and expect an automatic same-wave continuation.\n- Do not interact with external accounts, services, hosts, endpoints or infrastructure. Local/static project inspection and ordinary project tests are allowed when available and relevant.\n\nEFFICIENCY\n\nDo not read the project alphabetically and do not repeatedly rescan stable areas.\n\nSpend most analysis on state ownership, transitions, persistence, lifecycle, routing, recovery, user-visible behavior and code implicated by real execution paths.\n\nSkip generated/vendor/build/cache output unless runtime or evidence makes it relevant.\n\nPRIORITY\n\nP0 = data corruption/loss, severe local safety/security defect, crash/unusable primary flow, or fundamental correctness failure.\nP1 = significant functional defect, lifecycle/recovery/integration failure, or high-probability user-visible breakage.\nP2 = lower-impact but real defect, concrete maintainability drift likely to cause failure, or missing regression coverage for a verified issue.\n\nFINAL HANDOFF\n\nReturn ONE code block only. It must be directly usable by a separate implementation agent without needing the audit conversation.\n\nHeader exactly:\n\nPROJECT_NAME: <name>\nDATE_TIME: <current session/local date-time when available; otherwise UTC>\nWAVE: AUDIT CORE\nTARGET: <what artifact/project was actually inspected>\nBASELINE: <identity>\nGIT_CONTEXT: <PRESENT branch@commit | ABSENT | UNREADABLE> - <brief note>\nSAIPEN_CONTEXT: <PRESENT | ABSENT | STALE | UNREADABLE> - <brief useful note>\nAUDIT_SCOPE: <compact modules/areas actually inspected>\nSTATUS: AUDIT_CORE: <COMPLETE | PARTIAL | BLOCKED>\nTICKETS: <count>\nHANDOFF: IMPLEMENTATION_AGENT\n\nThen tickets in priority order. Each ticket must use:\n\n[P0|P1|P2] [CORE-001] <path/module/symbol>\nEVIDENCE: <specific code/path/behavior proving the issue>\nDEFECT: <root cause and concrete consequence>\nREPAIR: <smallest correct implementation change; name exact areas when established>\nVERIFY: <specific regression test/check that proves the repair without breaking correct behavior>\n\nUse CORE-001, CORE-002... only within this handoff. One root cause per ticket.\n\nIf no verified defects exist:\nTICKETS: 0\nNO VERIFIED CORE DEFECTS.\n\nEnd:\nCORE_DONE_WHEN: <compact explicit implementation + verification gate>\n\nNo prose outside the code block.";

  const AUDIT_SECOND_WAVE = "AUDIT SECOND WAVE — complementary read-only audit for implementation handoff.\n\nROLE\n\nYou are the AUDITOR, not the implementation agent. Do not modify the audited implementation or project metadata.\n\nThis is a second independent lens over the SAME project after Audit Core. Its value is finding verified defects Core did not expose, not repeating Core with different wording.\n\nPRECONDITION / TARGET\n\nUse the same target lineage as the latest completed Audit Core in this conversation unless the user explicitly supplied a newer revision of that project.\n\nA matching completed Core result in the conversation is sufficient continuity. `.saipen/` is optional context only.\n\nIf no matching Core exists, return a concise BLOCKED handoff stating that Audit Core for this target is missing.\n\nPROJECT ORIENTATION — REUSE, THEN REFRESH\n\nReuse Core's established map when still valid.\n\nAt project root, quickly refresh only useful local orientation when present:\n- `.saipen/` root STATE/BOARD/LOG and relevant project memory;\n- Git current HEAD/branch/status/diff metadata through ordinary Git operations, never `.git/objects` crawling;\n- manifests/config/schema/migrations/tests/docs/CI/scripts relevant to changed or boundary behavior.\n\nNone of these are required. Do not require external SAIPEN protocol files or maintain `.saipen/`.\n\nIf current baseline differs from Core:\n- identify changed paths first;\n- revalidate only Core conclusions affected by those changes;\n- preserve unaffected evidence;\n- record the new baseline.\n\nSECOND-WAVE PURPOSE\n\nDo NOT perform Core again.\n\nDo not repeat a Core ticket unless it regressed, remains broken and is necessary to explain a new issue, or new evidence materially changes the diagnosed root cause/repair.\n\nAttack boundaries and failure behavior a first correctness pass commonly misses.\n\nLIFECYCLE / OWNERSHIP\n- cold and repeated startup;\n- partial initialization;\n- shutdown/teardown/cleanup;\n- restart/reopen after failure;\n- multiple writers to mutable state;\n- stale references/caches/subscriptions;\n- ownership changing across async steps.\n\nINPUT / BOUNDARIES\n- empty, missing, malformed, partial and maximum inputs;\n- unusual but valid Unicode, spaces, long paths, locale/platform differences when relevant;\n- optional-value combinations;\n- caller/callee disagreement over null/empty/error semantics.\n\nORDERING / REPEATABILITY\n- duplicate invocation;\n- double click/submit/dispatch;\n- out-of-order or delayed events;\n- cancellation/retry after partial work;\n- stale async completion overwriting newer state;\n- idempotence of migration/import/recovery/cleanup;\n- repeated action after restart.\n\nPERSISTENCE / RECOVERY\n- partial writes;\n- stale stored state after upgrade;\n- crash between related writes;\n- migration run twice;\n- serializer/parser asymmetry;\n- import/export round trip;\n- restart immediately after failure;\n- fallback selecting stale persisted state.\n\nERROR / CONTRACT DRIFT\n- swallowed errors and false success;\n- fallback masking the root cause;\n- API/CLI/config/schema/version/docs mismatch;\n- mocks/fixtures hiding integration behavior.\n\nUI / RUNTIME\n- visible state contradicting runtime;\n- impossible action enabled;\n- stale disabled reason;\n- stale/replaced DOM/state target;\n- reload/reopen/resize/maximize/restore/focus/blur leaving invalid state or unreachable controls.\n\nDUPLICATED TRUTH\n\nSpecifically hunt duplicated constants, selectors, validators, parsers, serializers, mappings, transitions, fallback precedence, path resolution and business rules. Consolidate only when duplication creates concrete drift/failure risk.\n\nQUALITY / EFFICIENCY\n\n- New verified root causes only.\n- Evidence before finding.\n- Root cause before symptom.\n- No checklist padding.\n- No speculative redesign.\n- No external-system interaction.\n- Never fabricate evidence or timings.\n- Use PARTIAL only for a genuine execution/context limit. PARTIAL is a resumable machine checkpoint and must not ask the user to supervise; an automatic same-wave continuation may follow.\n- Reuse Core facts instead of rereading unchanged internals.\n- Spend most budget at cross-module seams, lifecycle boundaries, persistence/recovery, and state transitions.\n\nFINAL HANDOFF\n\nReturn ONE code block only, standalone enough for a separate implementation agent.\n\nHeader exactly:\n\nPROJECT_NAME: <name>\nDATE_TIME: <current session/local date-time when available; otherwise UTC>\nWAVE: AUDIT SECOND WAVE\nTARGET: <artifact/project inspected>\nBASELINE: <current identity>\nCORE_BASELINE: <identity from Core>\nGIT_CONTEXT: <PRESENT branch@commit | ABSENT | UNREADABLE> - <brief note>\nSAIPEN_CONTEXT: <PRESENT | ABSENT | STALE | UNREADABLE> - <brief useful note>\nAUDIT_SCOPE: <compact new/boundary areas inspected>\nSTATUS: SECOND_WAVE: <COMPLETE | PARTIAL | BLOCKED>\nTICKETS: <count>\nHANDOFF: IMPLEMENTATION_AGENT\n\nThen only NEW, REGRESSED, or materially RE-DIAGNOSED findings:\n\n[P0|P1|P2] [W2-001] <path/module/symbol>\nEVIDENCE: <specific evidence>\nDEFECT: <root cause and concrete consequence>\nREPAIR: <smallest correct implementation change>\nVERIFY: <specific regression verification>\n\nUse W2-001, W2-002... only within this handoff.\n\nDo not include unchanged Core tickets merely for completeness.\n\nIf no new defects exist:\nTICKETS: 0\nNO NEW VERIFIED SECOND-WAVE DEFECTS.\n\nEnd:\nSECOND_WAVE_DONE_WHEN: <compact implementation + regression gate>\n\nNo prose outside the code block.";

  const AUDIT_PERFORMANCE = "AUDIT PERFORMANCE / STABILITY / EFFECTIVENESS — third read-only audit wave for implementation handoff.\n\nROLE\n\nYou are the AUDITOR, not the implementation agent. Do not modify the audited implementation or project metadata.\n\nThis is the third lens over the SAME target after Audit Core and Audit Second Wave. Spend the audit budget on material responsiveness, latency, stability, bounded resource use and simpler effective execution without changing correct observable behavior.\n\nPRECONDITION / TARGET\n\nUse the same target lineage as the latest matching Core and Second Wave results in this conversation unless the user explicitly supplied a newer revision.\n\nBoth earlier waves must exist for this target. If either is missing, return a concise BLOCKED handoff naming the missing wave.\n\nPROJECT ORIENTATION — REUSE, THEN REFRESH\n\nReuse structural understanding from the first two waves.\n\nWhen present, quickly inspect only useful local context:\n- `.saipen/` root STATE/BOARD/LOG and relevant memory for recent implementation work;\n- Git current HEAD/branch/status/diff through ordinary Git commands, not `.git/objects` crawling;\n- performance-related config/build manifests/tests/benchmarks and only other project metadata needed to understand a hot path.\n\nThese are optional. Never require an external SAIPEN installation or modify `.saipen/`.\n\nIf baseline changed since Second Wave:\n- identify changed paths first;\n- revalidate only affected correctness/stability assumptions;\n- never optimize stale code paths.\n\nPRIMARY OBJECTIVE\n\nCorrectness and observable behavior are invariants. Reject benchmark cosmetics that damage determinism, accessibility, recovery, explicit state or useful error reporting.\n\nTrace frequent paths such as startup, button click, pointer move, keystroke/input, render/update, state transition, parsing, validation, serialization, local persistence/I/O, retry, recovery and shutdown.\n\nCOMPUTATION\n- repeated parsing/serialization/validation/normalization of unchanged data;\n- duplicate transforms/copies/allocations;\n- unnecessary full scans/sorts/filters;\n- repeated linear lookup inside loops and realistic O(n²) paths;\n- expensive fallback used on normal success.\n\nUI / DOM\n- broad/repeated document/tree scans;\n- selectors not scoped to a stable root;\n- repeated layout reads/writes and reflow thrash;\n- unnecessary rerender/rebuild/repaint;\n- synchronous work delaying visible input/button feedback;\n- listener multiplication and stale subscriptions;\n- detached-node retention;\n- stale cache or cache without explicit invalidation;\n- repeated rediscovery during retries;\n- excessive work per pointermove/keystroke/frame;\n- resize/maximize/restore/focus/blur causing stale geometry or targets.\n\nASYNC / STABILITY\n- double submit/dispatch/callback;\n- stale async result overwriting newer state;\n- ignored cancellation;\n- work continuing after target/state changed;\n- retry storms or excessive retry chains;\n- timer polling where a reliable event exists;\n- teardown while work is pending;\n- nondeterministic repeated-operation ordering.\n\nMEMORY / RESOURCE BOUNDS\n- unbounded queues, arrays, maps, sets, logs, buffers or caches;\n- retained detached objects/nodes;\n- duplicate large strings/data;\n- resources not released over long sessions.\n\nI/O / STARTUP\n- repeated read/write of unchanged local state;\n- full-state serialization for tiny changes;\n- expensive local I/O in hot UI paths;\n- repeated hashing/path resolution of stable data;\n- eager loading/scanning that can safely be lazy.\n\nEFFECTIVENESS\n- duplicated hot-path branches that can become one canonical path;\n- unnecessary abstraction/indirection adding material work;\n- complex execution where a smaller path preserves semantics;\n- cache only stable data with explicit invalidation;\n- prefer event-driven work over polling when behavior stays deterministic.\n\nEVIDENCE CLASS\n\nEvery ticket must be exactly one:\n\nPROVEN BOTTLENECK = directly measured or demonstrated from available evidence.\nSTRONGLY EVIDENCED WASTE = execution structure clearly performs unnecessary material work.\nLOW-RISK SIMPLIFICATION = behavior-preserving simplification with credible latency/stability/effectiveness benefit.\n\nNever fabricate timings.\nUse PARTIAL only for a genuine execution/context limit. PARTIAL is a resumable machine checkpoint, not a request for human intervention; expect an automatic same-wave continuation. If measurement is unavailable, prescribe an exact local benchmark/regression method.\n\nDo not interact with or load-test external systems.\n\nNO EARLIER-WAVE REHASH\n\nDo not repeat Core/Second findings unless performance/stability analysis materially changes their root cause or required repair.\n\nFINAL HANDOFF\n\nReturn ONE code block only, standalone for a separate implementation agent.\n\nHeader exactly:\n\nPROJECT_NAME: <name>\nDATE_TIME: <current session/local date-time when available; otherwise UTC>\nWAVE: AUDIT PERFORMANCE / STABILITY / EFFECTIVENESS\nTARGET: <artifact/project inspected>\nBASELINE: <current identity>\nPREVIOUS_BASELINE: <Second Wave identity>\nGIT_CONTEXT: <PRESENT branch@commit | ABSENT | UNREADABLE> - <brief note>\nSAIPEN_CONTEXT: <PRESENT | ABSENT | STALE | UNREADABLE> - <brief useful note>\nAUDIT_SCOPE: <compact hot paths/areas inspected>\nSTATUS: PERFORMANCE: <COMPLETE | PARTIAL | BLOCKED>\nTICKETS: <count>\nHANDOFF: IMPLEMENTATION_AGENT\n\nThen only material findings:\n\n[P0|P1|P2] [PERF-001] <PROVEN BOTTLENECK|STRONGLY EVIDENCED WASTE|LOW-RISK SIMPLIFICATION> <path/module/symbol>\nEVIDENCE: <specific hot-path/stability evidence>\nISSUE: <verified waste/root cause and consequence>\nOPTIMIZE: <smallest behavior-preserving change>\nGUARDRAIL: <correct behavior that must remain unchanged>\nVERIFY: <benchmark/regression procedure>\n\nUse PERF-001, PERF-002... only within this handoff.\n\nIf no material findings exist:\nTICKETS: 0\nNO MATERIAL PERFORMANCE/STABILITY FINDINGS.\n\nEnd:\nPERFORMANCE_DONE_WHEN: <compact latency/stability/behavior verification gate>\n\nNo prose outside the code block.";

  const BUILTIN_PRESETS = [
    {
      builtinId: 'audit-core-v8-unattended',
      legacyIds: ['audit-core-v7-handoff', 'audit-core-v6-audit-first', 'audit-core-v4-saipen-native', 'audit-core-v3-saipen', 'audit-core-v2-quality', 'audit-core-v1'],
      name: 'Audit Core',
      desc: 'Deep correctness audit -> implementation handoff',
      text: AUDIT_CORE
    },
    {
      builtinId: 'audit-second-wave-v8-unattended',
      legacyIds: ['audit-second-wave-v7-handoff', 'audit-second-wave-v6-audit-first', 'audit-second-wave-v4-saipen-native', 'audit-second-wave-v3-saipen', 'audit-second-wave-v2-quality', 'audit-second-wave-v1'],
      name: 'Audit Second Wave',
      desc: 'Complementary second lens -> implementation handoff',
      text: AUDIT_SECOND_WAVE
    },
    {
      builtinId: 'audit-performance-v8-unattended',
      legacyIds: ['audit-performance-v7-handoff', 'audit-performance-v6-audit-first', 'audit-performance-v4-saipen-native', 'audit-performance-v3-saipen', 'audit-performance-v2-quality', 'audit-performance-v1'],
      name: 'Audit Performance',
      desc: 'Performance/stability closing lens -> handoff',
      text: AUDIT_PERFORMANCE
    }
  ];

  const CSS = `
#acb-popup {
  --background:#1A1810;
  --backgroundSoft:#232018;
  --surface:#332E22;
  --surfaceRaised:#3D372A;
  --surfaceAlt:#453D30;
  --borderDark:#100E08;
  --borderHighlight:#F0D060;
  --bevelLight:#75663D;
  --borderMuted:#5A5040;
  --textPrimary:#D4C89A;
  --textSecondary:#9C9371;
  --textMuted:#6E674E;
  --accentTeal:#008080;
  --accentTealDeep:#004C4C;
  --success:#4A7A20;
  --warning:#7A7A20;
  --danger:#7A2020;
  --dangerText:#D66464;
  --selection:#3D372A;
  --compareBack:#14120C;
  --link:#F0D060;
}

#acb-popup,
#acb-popup * {
  font-family: Verdana, sans-serif !important;
  -webkit-font-smoothing: none !important;
  -moz-osx-font-smoothing: unset !important;
  font-smooth: never !important;
  text-rendering: optimizeSpeed !important;
  border-radius: 0 !important;
  transition: none !important;
  animation: none !important;
  box-shadow: none !important;
  text-shadow: none !important;
  box-sizing: border-box !important;
}

#acb-popup {
  position: fixed !important;
  z-index: 2147483646 !important;
  width: ${PANEL_WIDTH}px !important;
  height: ${PANEL_HEIGHT}px !important;
  max-width: calc(100vw - 16px) !important;
  max-height: calc(100vh - 16px) !important;
  display: flex !important;
  flex-direction: column !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: var(--background) !important;
  color: var(--textPrimary) !important;
  border: 2px solid !important;
  border-color: var(--bevelLight) var(--borderDark) var(--borderDark) var(--bevelLight) !important;
  font-size: 12px !important;
  line-height: 1.2 !important;
}

#acb-titlebar {
  height: 24px !important;
  min-height: 24px !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 2px 3px !important;
  background: var(--surface) !important;
  color: var(--textPrimary) !important;
  border-bottom: 2px solid var(--borderDark) !important;
  user-select: none !important;
  touch-action: none !important;
}
#acb-titlebar.acb-movable { cursor: move !important; }
#acb-title {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
#acb-site {
  flex: 0 1 auto !important;
  max-width: 92px !important;
  color: var(--textSecondary) !important;
  font-size: 10px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

#acb-popup button,
#acb-popup .acb-buttonlike {
  min-width: 30px !important;
  min-height: 24px !important;
  margin: 0 !important;
  padding: 3px 7px !important;
  border: 2px solid !important;
  border-color: var(--bevelLight) var(--borderDark) var(--borderDark) var(--bevelLight) !important;
  background: var(--surfaceRaised) !important;
  color: var(--textPrimary) !important;
  cursor: pointer !important;
  font-size: 11px !important;
  line-height: 1.1 !important;
  text-align: center !important;
}
#acb-popup button:hover,
#acb-popup .acb-buttonlike:hover { background: var(--surfaceAlt) !important; }
#acb-popup button:active,
#acb-popup button.acb-active,
#acb-popup .acb-buttonlike:active {
  border-color: var(--borderDark) var(--bevelLight) var(--bevelLight) var(--borderDark) !important;
  background: var(--surface) !important;
  transform: translate(1px, 1px) !important;
}
#acb-popup button.acb-active { transform: none !important; }
#acb-popup button:focus-visible,
#acb-popup input:focus-visible,
#acb-popup select:focus-visible,
#acb-popup textarea:focus-visible,
#acb-popup .acb-buttonlike:focus-visible {
  outline: 1px dotted var(--textPrimary) !important;
  outline-offset: -4px !important;
}
#acb-popup button:disabled {
  color: var(--textMuted) !important;
  background: var(--surfaceRaised) !important;
  cursor: default !important;
}

#acb-collapse {
  flex: 0 0 auto !important;
  min-width: 60px !important;
  min-height: 18px !important;
  height: 18px !important;
  padding: 1px 5px !important;
  font-size: 10px !important;
}

#acb-popup[data-collapsed="true"] #acb-tabs,
#acb-popup[data-collapsed="true"] #acb-content,
#acb-popup[data-collapsed="true"] #acb-status {
  display: none !important;
}
#acb-popup[data-collapsed="true"] #acb-titlebar { border-bottom: 0 !important; }

#acb-tabs {
  height: 30px !important;
  min-height: 30px !important;
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 2px !important;
  padding: 3px !important;
  background: var(--backgroundSoft) !important;
  border-bottom: 2px solid var(--borderDark) !important;
}
#acb-tabs button {
  min-height: 24px !important;
  padding: 2px 4px !important;
  font-size: 11px !important;
  font-weight: 700 !important;
}
#acb-tabs button[aria-selected="true"] {
  border-color: var(--borderDark) var(--bevelLight) var(--bevelLight) var(--borderDark) !important;
  background: var(--selection) !important;
  color: var(--borderHighlight) !important;
}

#acb-content {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: 5px !important;
  background: var(--background) !important;
}

.acb-view {
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  background: var(--background) !important;
}
.acb-view[hidden] { display: none !important; }
.acb-view-scroll {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding-right: 1px !important;
}
#acb-view-commands {
  display: flex !important;
  flex-direction: column !important;
  gap: 5px !important;
  overflow: hidden !important;
}

.acb-section {
  margin: 0 0 6px 0 !important;
  padding: 5px !important;
  background: var(--backgroundSoft) !important;
  border: 1px solid var(--borderMuted) !important;
}
.acb-section:last-child { margin-bottom: 0 !important; }
.acb-section-title {
  margin: 0 0 4px 0 !important;
  color: var(--textPrimary) !important;
  font-size: 12px !important;
  font-weight: 700 !important;
}
.acb-section-note {
  color: var(--textMuted) !important;
  font-size: 10px !important;
  line-height: 1.25 !important;
}
.acb-label {
  display: block !important;
  margin: 0 0 2px 0 !important;
  color: var(--textSecondary) !important;
  font-size: 10px !important;
}

#acb-popup input,
#acb-popup select,
#acb-popup textarea {
  width: 100% !important;
  margin: 0 !important;
  border: 2px solid !important;
  border-color: var(--borderDark) var(--bevelLight) var(--bevelLight) var(--borderDark) !important;
  background: var(--compareBack) !important;
  color: var(--textPrimary) !important;
  font-size: 11px !important;
  outline: none !important;
}
#acb-popup input,
#acb-popup select { height: 24px !important; padding: 2px 4px !important; }
#acb-popup textarea {
  min-height: 120px !important;
  height: 120px !important;
  padding: 4px !important;
  resize: vertical !important;
}
#acb-popup input.acb-error,
#acb-popup textarea.acb-error { border-color: var(--danger) !important; color: var(--dangerText) !important; }

/* RUN: automation stays visible, configuration does not. */
#acb-auto-audit {
  flex: 0 0 auto !important;
  margin: 0 !important;
  padding: 5px !important;
  background: var(--backgroundSoft) !important;
  border: 1px solid var(--borderMuted) !important;
}
#acb-auto-head {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 72px 62px !important;
  gap: 3px !important;
  align-items: center !important;
}
#acb-auto-toggle-label {
  min-height: 28px !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 3px 5px !important;
  color: var(--textPrimary) !important;
  background: var(--surfaceRaised) !important;
  border: 1px solid var(--borderMuted) !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
}
#acb-auto-enabled {
  width: 15px !important;
  min-width: 15px !important;
  height: 15px !important;
  min-height: 15px !important;
  padding: 0 !important;
  margin: 0 !important;
  accent-color: var(--accentTeal) !important;
  appearance: auto !important;
}
#acb-auto-adopt,
#acb-auto-stop {
  min-width: 0 !important;
  min-height: 28px !important;
  padding: 2px 4px !important;
  font-size: 10px !important;
}
#acb-auto-progress {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 2px !important;
  margin-top: 4px !important;
}
.acb-auto-step {
  min-width: 0 !important;
  padding: 3px 2px !important;
  text-align: center !important;
  background: var(--compareBack) !important;
  color: var(--textMuted) !important;
  border: 1px solid var(--borderMuted) !important;
  font-size: 10px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.acb-auto-step[data-state="active"] {
  background: var(--selection) !important;
  color: var(--borderHighlight) !important;
  border-color: var(--bevelLight) !important;
}
.acb-auto-step[data-state="done"] {
  background: var(--surface) !important;
  color: var(--textPrimary) !important;
}
#acb-auto-state {
  min-height: 30px !important;
  max-height: 42px !important;
  margin-top: 4px !important;
  padding: 3px 4px !important;
  overflow: hidden !important;
  background: var(--compareBack) !important;
  color: var(--textSecondary) !important;
  border: 1px solid var(--borderMuted) !important;
  font-size: 10px !important;
  line-height: 1.2 !important;
}
#acb-auto-state[data-kind="success"] { color: var(--textPrimary) !important; }
#acb-auto-state[data-kind="warning"] { color: var(--borderHighlight) !important; }
#acb-auto-state[data-kind="error"] { color: var(--dangerText) !important; }

/* RUN: the three audit waves are permanently pinned. */
#acb-audit-quick {
  flex: 0 0 auto !important;
  margin: 0 !important;
  padding: 5px !important;
  background: var(--backgroundSoft) !important;
  border: 1px solid var(--borderMuted) !important;
}
#acb-audit-quick-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 3px !important;
}
.acb-audit-quick-row {
  display: grid !important;
  grid-template-columns: 34px minmax(0, 1fr) 70px 54px !important;
  gap: 3px !important;
  align-items: center !important;
  min-height: 42px !important;
  padding: 3px !important;
  background: var(--surface) !important;
  border: 1px solid var(--borderMuted) !important;
}
.acb-audit-wave-index {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 30px !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  color: var(--borderHighlight) !important;
  background: var(--compareBack) !important;
  border: 1px solid var(--borderMuted) !important;
}
.acb-audit-wave-copy { min-width: 0 !important; }
.acb-audit-wave-name {
  color: var(--textPrimary) !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.acb-audit-wave-desc {
  margin-top: 2px !important;
  color: var(--textMuted) !important;
  font-size: 9px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.acb-audit-quick-row button {
  min-width: 0 !important;
  min-height: 30px !important;
  padding: 2px 4px !important;
  font-size: 10px !important;
}

/* Other/custom commands use the remaining space only when they exist. */
#acb-other-commands {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 5px !important;
  overflow: hidden !important;
  background: var(--backgroundSoft) !important;
  border: 1px solid var(--borderMuted) !important;
}
#acb-other-commands[hidden] { display: none !important; }
#acb-command-tools {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(120px, 0.8fr) !important;
  gap: 3px !important;
  margin-bottom: 4px !important;
}
#acb-catbar {
  min-width: 0 !important;
  display: flex !important;
  gap: 2px !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  white-space: nowrap !important;
}
#acb-catbar[hidden] { display: none !important; }
#acb-catbar button {
  flex: 0 0 auto !important;
  min-width: 64px !important;
  min-height: 24px !important;
  padding: 2px 5px !important;
  font-size: 10px !important;
}
#acb-catbar button[aria-selected="true"] {
  border-color: var(--borderDark) var(--bevelLight) var(--bevelLight) var(--borderDark) !important;
  background: var(--selection) !important;
}
#acb-filter-wrap { min-width: 0 !important; }
#acb-filter-wrap[hidden] { display: none !important; }
#acb-filter { height: 24px !important; }
#acb-command-list {
  height: calc(100% - 30px) !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 3px !important;
}
.acb-command-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 70px 54px !important;
  gap: 3px !important;
  align-items: center !important;
  min-height: 34px !important;
  padding: 3px !important;
  background: var(--surface) !important;
  border: 1px solid var(--borderMuted) !important;
}
.acb-command-name {
  min-width: 0 !important;
  color: var(--textPrimary) !important;
  font-size: 11px !important;
  overflow: hidden !important;
  white-space: nowrap !important;
  text-overflow: ellipsis !important;
}
.acb-command-row button {
  min-width: 0 !important;
  min-height: 28px !important;
  padding: 2px 4px !important;
  font-size: 10px !important;
}
.acb-empty {
  padding: 8px 5px !important;
  color: var(--textMuted) !important;
  font-size: 11px !important;
  text-align: center !important;
  border: 1px solid var(--borderMuted) !important;
  background: var(--backgroundSoft) !important;
}

/* EDIT */
.acb-row {
  display: flex !important;
  gap: 3px !important;
  align-items: center !important;
  margin-top: 4px !important;
}
.acb-row > * { flex: 1 1 0 !important; min-width: 0 !important; }
#acb-manage-category { margin-bottom: 2px !important; }
#acb-manage-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 3px !important;
}
.acb-manage-row {
  padding: 3px !important;
  background: var(--surface) !important;
  border: 1px solid var(--borderMuted) !important;
}
.acb-manage-name {
  margin-bottom: 3px !important;
  font-size: 11px !important;
  color: var(--textPrimary) !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.acb-manage-actions {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr) !important;
  gap: 2px !important;
}
.acb-manage-actions button { min-width: 0 !important; padding: 2px 3px !important; font-size: 10px !important; }
#acb-editor[hidden] { display: none !important; }
.acb-field { margin-bottom: 5px !important; }
#acb-editor-actions { display: flex !important; gap: 3px !important; }
#acb-editor-actions button { flex: 1 1 0 !important; }
#acb-confirm-text {
  min-height: 40px !important;
  padding: 4px !important;
  overflow-y: auto !important;
  background: var(--compareBack) !important;
  color: var(--textSecondary) !important;
  border: 1px solid var(--borderMuted) !important;
  font-size: 10px !important;
}

/* SETTINGS */
#acb-displaybar {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 4px !important;
}
.acb-display-field {
  min-width: 0 !important;
}
.acb-display-field label,
.acb-settings-field label,
.acb-auto-field label {
  display: block !important;
  margin: 0 0 2px 0 !important;
  color: var(--textSecondary) !important;
  font-size: 10px !important;
}
#acb-lock {
  align-self: end !important;
  min-width: 0 !important;
  height: 24px !important;
}
#acb-auto-config {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 5px !important;
}
.acb-auto-field { min-width: 0 !important; }
#acb-auto-reset {
  width: 100% !important;
  margin-top: 5px !important;
}
#acb-settings-data {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 4px !important;
}

/* Bottom status is a compact global message line, not another scrolling panel. */
#acb-status {
  min-height: 34px !important;
  height: 34px !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 28px !important;
  gap: 3px !important;
  align-items: stretch !important;
  padding: 3px !important;
  background: var(--surfaceRaised) !important;
  border-top: 2px solid var(--borderDark) !important;
}
#acb-status-text {
  min-width: 0 !important;
  overflow: hidden !important;
  padding: 3px 4px !important;
  background: var(--compareBack) !important;
  color: var(--textSecondary) !important;
  border: 1px solid var(--borderMuted) !important;
  font-size: 10px !important;
  line-height: 1.2 !important;
  white-space: nowrap !important;
  text-overflow: ellipsis !important;
}
#acb-status-text[data-kind="success"] { color: var(--textPrimary) !important; }
#acb-status-text[data-kind="warning"] { color: var(--borderHighlight) !important; }
#acb-status-text[data-kind="error"] { color: var(--dangerText) !important; }
#acb-status button {
  min-width: 28px !important;
  width: 28px !important;
  padding: 1px !important;
  font-size: 12px !important;
}

#acb-popup ::selection { background: var(--selection) !important; color: var(--textPrimary) !important; }
#acb-popup a,
#acb-popup a:link,
#acb-popup a:visited { color: var(--link) !important; }
`;

  let state = null;
  let panel = null;
  let activeView = 'commands';
  let editingPresetId = null;
  let drag = null;
  let fileInput = null;
  let pendingAction = null;
  let actionInFlight = false;
  let viewportSyncFrame = 0;
  let autoAuditObserver = null;
  let autoAuditObserverRoot = null;
  let autoAuditCheckTimer = 0;
  let autoAuditNextTimer = 0;
  let autoAuditEvaluating = false;
  let autoRuntime = null;
  let autoBoundConversationKey = '';
  let autoLeaseTimer = 0;
  const autoTabId = (() => {
    try {
      const existing = sessionStorage.getItem(AUTO_TAB_SESSION_KEY);
      if (existing) return existing;
    } catch (_) { }

    const created = globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

    try { sessionStorage.setItem(AUTO_TAB_SESSION_KEY, created); } catch (_) { }
    return created;
  })();
  let autoDraftId = (() => {
    try {
      const existing = sessionStorage.getItem(AUTO_DRAFT_SESSION_KEY);
      if (existing) return existing;
    } catch (_) { }

    const created = globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    try { sessionStorage.setItem(AUTO_DRAFT_SESSION_KEY, created); } catch (_) { }
    return created;
  })();
  const autoInstanceId = `${autoTabId}:${Math.random().toString(36).slice(2, 10)}`;
  const elementCache = { siteKey: '', input: null, send: null };

  function uid() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function trustedHTML(html) {
    if (!window.trustedTypes || !window.trustedTypes.createPolicy) return html;
    if (!window.__acbTrustedPolicy) {
      try {
        window.__acbTrustedPolicy = window.trustedTypes.createPolicy('acb-policy', {
          createHTML: value => value
        });
      } catch (_) {
        return html;
      }
    }
    return window.__acbTrustedPolicy.createHTML(html);
  }

  function setHTML(element, html) {
    element.innerHTML = trustedHTML(html);
  }

  function isVisible(element) {
    if (!element || !element.isConnected || element.hidden) return false;
    try {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0;
    } catch (_) {
      return false;
    }
  }

  const MAX_SHADOW_SCAN = 800;

  function queryDeepFirst(selector, root = document) {
    let first = null;
    try {
      first = root.querySelector(selector);
      if (first && isVisible(first)) return first;
      if (first) {
        const directMatches = root.querySelectorAll(selector);
        for (const direct of directMatches) {
          if (isVisible(direct)) return direct;
        }
      }
    } catch (_) { }

    const start = root === document ? document.documentElement : root;
    if (!start) return null;
    const roots = [start];
    const seen = new Set();
    let scanned = 0;

    while (roots.length && scanned < MAX_SHADOW_SCAN) {
      const current = roots.shift();
      if (!current || seen.has(current)) continue;
      seen.add(current);

      let walker;
      try {
        walker = document.createTreeWalker(current, NodeFilter.SHOW_ELEMENT);
      } catch (_) {
        continue;
      }

      let element = current.nodeType === Node.ELEMENT_NODE ? current : walker.nextNode();
      while (element && scanned < MAX_SHADOW_SCAN) {
        scanned += 1;
        if (element.shadowRoot) {
          const shadow = element.shadowRoot;
          try {
            const hit = shadow.querySelector(selector);
            if (hit && isVisible(hit)) return hit;
          } catch (_) { }
          roots.push(shadow);
        }
        element = walker.nextNode();
      }
    }
    return null;
  }

  function dispatchInputEvent(element, data = null) {
    try {
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data,
        inputType: 'insertText'
      }));
    } catch (_) {
      try {
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      } catch (_) { }
    }
  }

  function nativeSet(element, text) {
    if (!element) return false;
    try {
      element.focus({ preventScroll: true });
      const proto = element.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : element.tagName === 'INPUT'
          ? HTMLInputElement.prototype
          : null;
      if (proto) {
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(element, text);
        else element.value = text;
      } else {
        element.textContent = text;
      }
      dispatchInputEvent(element, text);
      return true;
    } catch (_) {
      return false;
    }
  }

  function nativeAppend(element, text) {
    if (!element) return false;
    const current = 'value' in element ? element.value : element.textContent;
    return nativeSet(element, current ? `${current}\n${text}` : text);
  }

  function placeCaretAtEnd(element) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function richSet(element, text) {
    if (!element) return false;
    try {
      element.focus({ preventScroll: true });
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      const inserted = document.execCommand('insertText', false, text);
      if (!inserted) {
        element.textContent = text;
        dispatchInputEvent(element, text);
      }
      placeCaretAtEnd(element);
      return true;
    } catch (_) {
      try {
        element.textContent = text;
        placeCaretAtEnd(element);
        dispatchInputEvent(element, text);
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  function richAppend(element, text) {
    if (!element) return false;
    try {
      element.focus({ preventScroll: true });
      placeCaretAtEnd(element);
      const current = element.textContent || '';
      const payload = current.trim() ? `\n${text}` : text;
      const inserted = document.execCommand('insertText', false, payload);
      if (!inserted) {
        element.textContent = `${current}${payload}`;
        dispatchInputEvent(element, payload);
      }
      placeCaretAtEnd(element);
      return true;
    } catch (_) {
      return false;
    }
  }

  function quillSet(element, text) {
    if (!element) return false;
    try {
      element.focus({ preventScroll: true });
      const paragraphs = text.split('\n').map(line => line
        ? `<p>${escapeHTML(line)}</p>`
        : '<p><br></p>').join('');
      setHTML(element, paragraphs);
      placeCaretAtEnd(element);
      dispatchInputEvent(element, text);
      return true;
    } catch (_) {
      return false;
    }
  }

  function quillAppend(element, text) {
    return richAppend(element, text);
  }

  function smartSet(element, text) {
    if (!element) return false;
    if (element.classList?.contains('ql-editor')) return quillSet(element, text);
    if (element.isContentEditable) return richSet(element, text);
    return nativeSet(element, text);
  }

  function smartAppend(element, text) {
    if (!element) return false;
    if (element.classList?.contains('ql-editor')) return quillAppend(element, text);
    if (element.isContentEditable) return richAppend(element, text);
    return nativeAppend(element, text);
  }

  function chatGPTComposerRoot() {
    const canonical = document.querySelector('form[data-type="unified-composer"]');
    if (canonical && isVisible(canonical)) return canonical;

    const input = document.querySelector(
      '#prompt-textarea[contenteditable="true"][role="textbox"], ' +
      '#prompt-textarea.ProseMirror[contenteditable="true"], ' +
      '[contenteditable="true"][role="textbox"][aria-label="Chat with ChatGPT"]'
    );
    if (!input || !isVisible(input)) return null;

    // Never accept an editor embedded in a conversation turn. When ChatGPT is
    // editing an old message, that editor is not the bottom unified composer.
    if (input.closest('[data-testid^="conversation-turn-"], article[data-testid], article')) return null;

    const form = input.closest('form');
    if (!form || !isVisible(form)) return null;

    // Fallback root is accepted only when it owns a real ChatGPT send control.
    const send = form.querySelector(
      '[data-testid="send-button"], ' +
      'button[aria-label="Send prompt"], ' +
      'button.composer-submit-btn'
    );
    return send ? form : null;
  }

  function isChatGPTComposerInput(element) {
    if (!element || !isVisible(element)) return false;
    const root = chatGPTComposerRoot();
    if (!root || !root.contains(element)) return false;
    if (element.closest('[data-testid^="conversation-turn-"], article[data-testid], article')) return false;

    const isCanonicalId = element.id === 'prompt-textarea';
    const isCanonicalLabel = element.getAttribute('aria-label') === 'Chat with ChatGPT';
    const isEditable = element.isContentEditable || element.tagName === 'TEXTAREA';

    return isEditable && (isCanonicalId || isCanonicalLabel);
  }

  function getChatGPTInput() {
    const root = chatGPTComposerRoot();
    if (!root) return null;

    const candidates = [
      root.querySelector('#prompt-textarea[contenteditable="true"][role="textbox"]'),
      root.querySelector('#prompt-textarea.ProseMirror[contenteditable="true"]'),
      root.querySelector('[contenteditable="true"][role="textbox"][aria-label="Chat with ChatGPT"]')
    ];

    for (const candidate of candidates) {
      if (candidate && isChatGPTComposerInput(candidate)) return candidate;
    }
    return null;
  }

  function isChatGPTSend(element) {
    if (!element || !isVisible(element)) return false;
    const root = chatGPTComposerRoot();
    if (!root || !root.contains(element)) return false;
    if (element.closest('[data-testid^="conversation-turn-"], article[data-testid], article')) return false;
    return element.matches(
      '[data-testid="send-button"], button[aria-label="Send prompt"], button.composer-submit-btn'
    );
  }

  function getChatGPTSend() {
    const root = chatGPTComposerRoot();
    if (!root) return null;

    const candidates = [
      root.querySelector('[data-testid="send-button"]'),
      root.querySelector('button[aria-label="Send prompt"]'),
      root.querySelector('button.composer-submit-btn')
    ];

    for (const candidate of candidates) {
      if (candidate && isChatGPTSend(candidate)) return candidate;
    }
    return null;
  }


  function chatGPTUploadInput() {
    const root = chatGPTComposerRoot();
    if (!root || root.hasAttribute('inert')) return null;
    const input = root.querySelector('#upload-files[type="file"], input[type="file"][multiple]');
    if (!input || input.disabled) return null;
    return input;
  }

  function chatGPTComposerAttachmentTiles(root = chatGPTComposerRoot()) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('[role="group"][aria-label]')).filter(tile => {
      return Boolean(tile.querySelector('button[aria-label^="Remove file"], button[name="expand-file-tile"]'));
    });
  }

  function chatGPTFindComposerAttachment(filename, root = chatGPTComposerRoot()) {
    const wanted = String(filename || '').trim().toLowerCase();
    if (!wanted) return null;
    return chatGPTComposerAttachmentTiles(root).find(tile => {
      return String(tile.getAttribute('aria-label') || '').trim().toLowerCase() === wanted;
    }) || null;
  }

  function chatGPTAttachmentIsBusy(tile) {
    if (!tile) return false;
    return Array.from(tile.querySelectorAll('[class*="animate-spin"]')).some(node => isVisible(node));
  }

  function waitForDomCondition(root, predicate, timeoutMs) {
    return new Promise(resolve => {
      let settled = false;
      let observer = null;
      let timer = null;

      const finish = value => {
        if (settled) return;
        settled = true;
        if (observer) observer.disconnect();
        if (timer) clearTimeout(timer);
        resolve(value || null);
      };

      const check = () => {
        let value = null;
        try { value = predicate(); } catch (_) { value = null; }
        if (value) finish(value);
      };

      check();
      if (settled) return;

      observer = new MutationObserver(check);
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'aria-disabled', 'class', 'style', 'aria-label']
      });
      check();
      if (settled) return;
      timer = setTimeout(() => finish(null), Math.max(1, timeoutMs));
    });
  }

  function auditKindFromPreset(preset) {
    if (!preset) return '';
    const builtin = String(preset.builtinId || '').toLowerCase();
    if (builtin.includes('audit-core')) return 'core';
    if (builtin.includes('audit-second-wave')) return 'second';
    if (builtin.includes('audit-performance')) return 'performance';
    return classifyAuditMessage(preset.text);
  }

  function safeAttachmentBasename(value) {
    const normalized = String(value || 'COMMAND')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^[_\-.]+|[_\-.]+$/g, '')
      .slice(0, 56);
    return normalized || 'COMMAND';
  }

  function promptAttachmentFilename(preset) {
    const kind = auditKindFromPreset(preset);
    const fingerprint = textFingerprint(String(preset?.text || '')).split(':').pop() || 'prompt';
    if (kind && AUDIT_ATTACHMENT_FILES[kind]) {
      const base = AUDIT_ATTACHMENT_FILES[kind].replace(/\.md$/i, '');
      return `${base}_${fingerprint}.md`;
    }
    return `AI_CHATBUTTONS_${safeAttachmentBasename(preset?.name)}_${fingerprint}.md`;
  }

  function promptAttachmentMarker(preset, filename) {
    const kind = auditKindFromPreset(preset);
    const marker = kind === 'core'
      ? 'AUDIT CORE'
      : kind === 'second'
        ? 'AUDIT SECOND WAVE'
        : kind === 'performance'
          ? 'AUDIT PERFORMANCE / STABILITY / EFFECTIVENESS'
          : `COMMAND: ${String(preset?.name || 'Attached prompt')}`;

    const lines = [
      marker,
      `The complete command is attached as "${filename}".`,
      'Treat that attached file as my full instruction for this turn and execute it exactly; do not merely summarize the file.'
    ];

    if (preset?.machineReceipt) {
      lines.push(`${AUTO_SEND_RECEIPT_PREFIX}: ${preset.machineReceipt}`);
    }

    return lines.join('\n');
  }

  function shouldUseChatGPTPromptAttachment(site, preset) {
    if (site?.key !== 'chatgpt' || !preset?.text) return false;
    if (preset.forceTextDelivery === true) return false;
    const mode = CHATGPT_PROMPT_DELIVERY_MODES.includes(state?.chatgptPromptDelivery)
      ? state.chatgptPromptDelivery
      : 'auto';
    if (mode === 'text') return false;
    if (mode === 'file') return true;
    return String(preset.text).length >= CHATGPT_LONG_PROMPT_THRESHOLD;
  }

  function setNativeFileList(input, files) {
    if (!input || typeof DataTransfer !== 'function') return false;
    try {
      const transfer = new DataTransfer();
      for (const file of files) transfer.items.add(file);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files')?.set;
      if (setter) setter.call(input, transfer.files);
      else input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }));
      return true;
    } catch (_) {
      return false;
    }
  }

  async function attachChatGPTPromptFile(preset, input) {
    const root = chatGPTComposerRoot();
    if (!root || !input || !root.contains(input) || root.hasAttribute('inert')) {
      return { ok: false, reason: 'composer-unavailable' };
    }

    const filename = promptAttachmentFilename(preset);
    let tile = chatGPTFindComposerAttachment(filename, root);

    if (!tile) {
      const upload = chatGPTUploadInput();
      if (!upload || !root.contains(upload)) {
        return { ok: false, reason: 'upload-input-unavailable', filename };
      }
      if (typeof File !== 'function' || typeof DataTransfer !== 'function') {
        return { ok: false, reason: 'file-api-unavailable', filename };
      }

      const file = new File([String(preset.text || '')], filename, {
        type: 'text/markdown;charset=utf-8',
        lastModified: Date.now()
      });

      if (!setNativeFileList(upload, [file])) {
        return { ok: false, reason: 'file-injection-rejected', filename };
      }

      tile = await waitForDomCondition(root, () => {
        const candidate = chatGPTFindComposerAttachment(filename, root);
        return candidate && !chatGPTAttachmentIsBusy(candidate) ? candidate : null;
      }, CHATGPT_ATTACHMENT_TIMEOUT_MS);

      if (!tile) {
        return { ok: false, reason: 'attachment-timeout', filename };
      }
    } else if (chatGPTAttachmentIsBusy(tile)) {
      tile = await waitForDomCondition(root, () => {
        const candidate = chatGPTFindComposerAttachment(filename, root);
        return candidate && !chatGPTAttachmentIsBusy(candidate) ? candidate : null;
      }, CHATGPT_ATTACHMENT_TIMEOUT_MS);
      if (!tile) return { ok: false, reason: 'attachment-timeout', filename };
    }

    const marker = promptAttachmentMarker(preset, filename);
    const current = composerPlainText(input);
    if (!current.includes(filename)) {
      if (!smartAppend(input, marker)) {
        return { ok: false, reason: 'marker-write-rejected', filename };
      }
    }

    return { ok: true, filename, marker, tile };
  }

  async function waitForChatGPTSendReady(timeoutMs = CHATGPT_ATTACHMENT_TIMEOUT_MS) {
    const root = chatGPTComposerRoot();
    if (!root) return null;
    return waitForDomCondition(root, () => {
      const button = getChatGPTSend();
      return button && !button.disabled && button.getAttribute('aria-disabled') !== 'true' ? button : null;
    }, timeoutMs);
  }

  const SITES = {
    chatgpt: {
      hosts: ['chat.openai.com', 'chatgpt.com'],
      label: 'ChatGPT',
      getInput: getChatGPTInput,
      getSend: getChatGPTSend,
      validateInput: isChatGPTComposerInput,
      validateSend: isChatGPTSend,
      allowEnterFallback: false
    },
    claude: {
      hosts: ['claude.ai'],
      label: 'Claude',
      getInput: () => queryDeepFirst('.ProseMirror[contenteditable="true"], div[contenteditable="true"][role="textbox"], div[contenteditable="true"]'),
      getSend: () => queryDeepFirst('button[aria-label="Send Message"], button[aria-label*="Send" i], button[type="submit"]')
    },
    deepseek: {
      hosts: ['chat.deepseek.com'],
      label: 'DeepSeek',
      getInput: () => queryDeepFirst('#chat-input, textarea[placeholder], textarea'),
      getSend: () => queryDeepFirst('[aria-label="send" i], button[type="submit"]')
    },
    qwen: {
      hosts: ['chat.qwen.ai', 'qwen.ai', 'tongyi.aliyun.com'],
      label: 'Qwen',
      getInput: () => queryDeepFirst('textarea.message-input-textarea, textarea[placeholder*="Message" i], textarea[placeholder], textarea, div[contenteditable="true"][role="textbox"]'),
      getSend: () => queryDeepFirst('[class*="message-input-right-button-send"] button, button[type="submit"], button[aria-label*="send" i]')
    },
    grok: {
      hosts: ['grok.com', 'x.com'],
      label: 'Grok',
      pageMatch: ({ host, pathname }) => host.endsWith('grok.com') || (host.endsWith('x.com') && pathname.startsWith('/i/grok')),
      getInput: () => queryDeepFirst('div.tiptap.ProseMirror[contenteditable="true"], div[contenteditable="true"][role="textbox"], div[contenteditable="true"]'),
      getSend: () => queryDeepFirst('button[type="submit"], button[aria-label*="send" i]')
    },
    gemini: {
      hosts: ['gemini.google.com'],
      label: 'Gemini',
      getInput: () => queryDeepFirst('.ql-editor, [data-test-id="rich-textarea-input"], div[contenteditable="true"][aria-label*="Message" i], div[contenteditable="true"][role="textbox"], textarea[placeholder*="Ask" i], textarea'),
      getSend: () => queryDeepFirst('button[aria-label*="Send message" i], button[aria-label*="Send" i], [data-test-id="send-button-container"] button, .send-button, button[type="submit"]')
    },
    copilot: {
      hosts: ['copilot.microsoft.com', 'www.bing.com'],
      label: 'Copilot',
      pageMatch: ({ host, pathname }) => host.endsWith('copilot.microsoft.com') || (host.endsWith('bing.com') && /^\/chat(?:\/|$)/i.test(pathname)),
      getInput: () => queryDeepFirst('textarea[data-testid="composer-input"], textarea#searchbox, textarea[placeholder], textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"]'),
      getSend: () => queryDeepFirst('button[type="submit"], button[aria-label*="send" i]')
    },
    kimi: {
      hosts: ['kimi.moonshot.cn', 'kimi.com'],
      label: 'Kimi',
      getInput: () => queryDeepFirst('.ProseMirror[contenteditable="true"], div[contenteditable="true"][data-placeholder], div[contenteditable="true"][role="textbox"], div[contenteditable="true"]'),
      getSend: () => queryDeepFirst('button[aria-label*="send" i], [data-testid*="send" i], button[type="submit"]')
    },
    duck: {
      hosts: ['duck.ai', 'duckduckgo.com'],
      label: 'Duck AI',
      pageMatch: ({ host, pathname, searchParams }) => {
        if (host.endsWith('duck.ai')) return true;
        if (!host.endsWith('duckduckgo.com')) return false;
        return /^\/(?:chat|duckai)(?:\/|$)/i.test(pathname) ||
          /^(?:chat|duckai)$/i.test(String(searchParams.get('ia') || '')) ||
          /^(?:chat|duckai)$/i.test(String(searchParams.get('iax') || ''));
      },
      getInput: () => queryDeepFirst('textarea[placeholder], textarea, input[type="text"]'),
      getSend: () => queryDeepFirst('button[aria-label*="send" i], button[type="submit"]')
    },
    mistral: {
      hosts: ['chat.mistral.ai'],
      label: 'Mistral',
      getInput: () => queryDeepFirst('textarea[placeholder], textarea, [contenteditable="true"]'),
      getSend: () => queryDeepFirst('button[aria-label*="send" i], button[type="submit"]')
    },
    huggingface: {
      hosts: ['huggingface.co'],
      label: 'HuggingChat',
      pageMatch: ({ pathname }) => /^\/chat(?:\/|$)/i.test(pathname),
      getInput: () => queryDeepFirst('textarea[placeholder], textarea, [contenteditable="true"]'),
      getSend: () => queryDeepFirst('button[type="submit"], button[aria-label*="Send" i]')
    },
    perplexity: {
      hosts: ['perplexity.ai'],
      label: 'Perplexity',
      getInput: () => queryDeepFirst('textarea[placeholder], textarea, [contenteditable="true"]'),
      getSend: () => queryDeepFirst('button[aria-label*="Submit" i], button[type="submit"], button[aria-label*="send" i]')
    },
    poe: {
      hosts: ['poe.com'],
      label: 'Poe',
      getInput: () => queryDeepFirst('textarea[placeholder], textarea, [contenteditable="true"]'),
      getSend: () => queryDeepFirst('button[aria-label*="send" i], button[type="submit"]')
    },
    pi: {
      hosts: ['pi.ai'],
      label: 'Pi',
      getInput: () => queryDeepFirst('textarea[placeholder], textarea, [contenteditable="true"]'),
      getSend: () => queryDeepFirst('button[aria-label*="send" i], button[type="submit"]')
    },
    phind: {
      hosts: ['phind.com'],
      label: 'Phind',
      getInput: () => queryDeepFirst('textarea[placeholder], textarea, [contenteditable="true"]'),
      getSend: () => queryDeepFirst('button[aria-label*="send" i], button[type="submit"]')
    },
    you: {
      hosts: ['you.com'],
      label: 'You.com',
      getInput: () => queryDeepFirst('textarea[placeholder], textarea, [contenteditable="true"]'),
      getSend: () => queryDeepFirst('button[aria-label*="send" i], button[type="submit"]')
    }
  };

  function detectSite() {
    const host = location.hostname.replace(/^www\./, '').toLowerCase();
    const pathname = location.pathname || '/';
    const searchParams = new URLSearchParams(location.search || '');

    for (const [key, site] of Object.entries(SITES)) {
      const hostMatches = site.hosts.some(candidate => {
        const normalized = candidate.replace(/^www\./, '').toLowerCase();
        return host === normalized || host.endsWith(`.${normalized}`);
      });
      if (!hostMatches) continue;

      if (site.pageMatch && !site.pageMatch({ host, pathname, searchParams })) continue;
      return { key, ...site };
    }

    // Unsupported/non-chat surfaces are intentionally inert. A universal generic
    // textarea fallback can target search boxes or edit fields on unrelated pages.
    return {
      key: 'unknown',
      label: host || 'Unsupported page',
      getInput: () => null,
      getSend: () => null,
      allowEnterFallback: false
    };
  }

  function resetElementCache(siteKey = '') {
    elementCache.siteKey = siteKey;
    elementCache.input = null;
    elementCache.send = null;
  }

  function cachedSiteElement(site, kind) {
    if (!site || (kind !== 'input' && kind !== 'send')) return null;
    if (elementCache.siteKey !== site.key) resetElementCache(site.key);

    const validator = kind === 'input' ? site.validateInput : site.validateSend;
    const cached = elementCache[kind];
    if (cached && isVisible(cached) && (!validator || validator(cached))) return cached;

    elementCache[kind] = null;
    const found = kind === 'input' ? site.getInput() : site.getSend();
    if (!found || !isVisible(found) || (validator && !validator(found))) return null;

    elementCache[kind] = found;
    return found;
  }

  function yieldToBrowser() {
    return new Promise(resolve => {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
      else setTimeout(resolve, 0);
    });
  }

  function makeAuditCategory() {
    return {
      id: uid(),
      name: 'Audit',
      presets: BUILTIN_PRESETS.map(preset => ({
        id: uid(),
        builtinId: preset.builtinId,
        name: preset.name,
        desc: preset.desc,
        text: preset.text
      }))
    };
  }

  function defaultState() {
    const audit = makeAuditCategory();
    return {
      stateVersion: STATE_VERSION,
      builtinRevision: BUILTIN_REVISION,
      builtinsSeededV2: true,
      popupPos: { x: 16, y: 72 },
      posLocked: false,
      collapsed: false,
      opacity: 100,
      panelSize: 'normal',
      autoAuditEnabled: false,
      autoAuditStrictGate: true,
      autoAuditDelayMs: 1200,
      autoAuditTimeoutMin: 180,
      chatgptPromptDelivery: 'auto',
      activeCategoryId: audit.id,
      categories: [audit]
    };
  }

  function canonicalBuiltinId(value) {
    const id = String(value || '');
    if (!id) return '';
    for (const builtin of BUILTIN_PRESETS) {
      if (id === builtin.builtinId || builtin.legacyIds.includes(id)) return builtin.builtinId;
    }
    return '';
  }

  function uniquePresetName(category, baseName, exceptId = '') {
    const used = new Set(
      category.presets
        .filter(preset => preset.id !== exceptId)
        .map(preset => String(preset.name || '').toLowerCase())
    );
    if (!used.has(baseName.toLowerCase())) return baseName;
    for (let index = 1; index < 1000; index += 1) {
      const suffix = index === 1 ? ' (custom)' : ` (custom ${index})`;
      const candidate = `${baseName}${suffix}`.slice(0, 40);
      if (!used.has(candidate.toLowerCase())) return candidate;
    }
    return `${baseName.slice(0, 30)} ${uid().slice(-6)}`.slice(0, 40);
  }

  function sanitizeCategories(categories) {
    if (!Array.isArray(categories)) return [];
    const clean = [];
    for (const rawCategory of categories) {
      if (!rawCategory || typeof rawCategory !== 'object') continue;
      const name = String(rawCategory.name || '').trim().slice(0, 30);
      if (!name) continue;
      const presets = [];
      if (Array.isArray(rawCategory.presets)) {
        for (const rawPreset of rawCategory.presets) {
          if (!rawPreset || typeof rawPreset !== 'object') continue;
          const presetName = String(rawPreset.name || '').trim().slice(0, 40);
          const text = String(rawPreset.text || '').trim();
          if (!presetName || !text) continue;
          const builtinId = canonicalBuiltinId(rawPreset.builtinId);
          presets.push({
            id: String(rawPreset.id || uid()),
            ...(builtinId ? { builtinId } : {}),
            name: presetName,
            desc: String(rawPreset.desc || '').trim().slice(0, 100),
            text
          });
        }
      }
      clean.push({
        id: String(rawCategory.id || uid()),
        name,
        presets
      });
    }
    return clean;
  }

  function syncBuiltins(data) {
    let audit = data.categories.find(category => category.name.toLowerCase() === 'audit');
    if (!audit) {
      if (data.categories.length < MAX_CATEGORIES) {
        audit = { id: uid(), name: 'Audit', presets: [] };
        data.categories.unshift(audit);
      } else {
        audit = data.categories[0];
      }
    }

    for (const builtin of BUILTIN_PRESETS) {
      const matches = [];
      for (const category of data.categories) {
        for (const preset of category.presets) {
          if (canonicalBuiltinId(preset.builtinId) === builtin.builtinId) {
            matches.push({ category, preset });
          }
        }
      }

      let existing = matches[0]?.preset || null;
      if (existing) {
        existing.builtinId = builtin.builtinId;
        existing.name = builtin.name;
        existing.desc = builtin.desc;
        existing.text = builtin.text;

        // Duplicate legacy identities are downgraded to custom entries rather than
        // being allowed to impersonate the same canonical built-in twice.
        for (const duplicate of matches.slice(1)) {
          delete duplicate.preset.builtinId;
          duplicate.preset.name = uniquePresetName(duplicate.category, `${builtin.name} (custom)`, duplicate.preset.id);
        }
        continue;
      }

      // A same-name custom preset is not canonical identity. Keep it, but make the
      // distinction visible if it occupies the built-in category/name slot.
      const nameCollision = audit.presets.find(preset =>
        !preset.builtinId && preset.name.toLowerCase() === builtin.name.toLowerCase()
      );
      if (nameCollision) {
        nameCollision.name = uniquePresetName(audit, `${builtin.name} (custom)`, nameCollision.id);
      }

      if (audit.presets.length < MAX_PRESETS) {
        audit.presets.push({
          id: uid(),
          builtinId: builtin.builtinId,
          name: builtin.name,
          desc: builtin.desc,
          text: builtin.text
        });
      }
    }

    const allCanonical = BUILTIN_PRESETS.every(builtin => {
      const matches = data.categories.flatMap(category =>
        category.presets.filter(preset => preset.builtinId === builtin.builtinId)
      );
      return matches.length === 1 &&
        matches[0].name === builtin.name &&
        matches[0].desc === builtin.desc &&
        matches[0].text === builtin.text;
    });

    if (allCanonical) {
      data.builtinRevision = BUILTIN_REVISION;
      data.builtinsSeededV2 = true;
      return true;
    }

    // Never claim a revision that was not actually reconciled.
    data.builtinRevision = Math.min(Number(data.builtinRevision) || 0, BUILTIN_REVISION - 1);
    return false;
  }

  function loadState() {
    let data = null;
    try {
      const raw = GM_getValue(STORAGE_KEY, null);
      if (raw) data = JSON.parse(raw);
    } catch (_) { }

    if (!data || typeof data !== 'object') return defaultState();

    if (Array.isArray(data.presets) && !Array.isArray(data.categories)) {
      data.categories = [{ id: uid(), name: 'General', presets: data.presets }];
      delete data.presets;
    }

    const categories = sanitizeCategories(data.categories);
    if (!categories.length) return defaultState();

    const clean = {
      stateVersion: STATE_VERSION,
      builtinRevision: Number(data.builtinRevision) || 0,
      builtinsSeededV2: Boolean(data.builtinsSeededV2),
      popupPos: data.popupPos && Number.isFinite(Number(data.popupPos.x)) && Number.isFinite(Number(data.popupPos.y))
        ? { x: Number(data.popupPos.x), y: Number(data.popupPos.y) }
        : { x: 16, y: 72 },
      posLocked: Boolean(data.posLocked),
      collapsed: Boolean(data.collapsed),
      opacity: OPACITY_LEVELS.includes(Number(data.opacity)) ? Number(data.opacity) : 100,
      panelSize: Object.prototype.hasOwnProperty.call(PANEL_SIZES, String(data.panelSize || ''))
        ? String(data.panelSize)
        : 'normal',
      autoAuditEnabled: false, // legacy field retained for compatibility; per-chat runtime owns enablement
      autoAuditStrictGate: data.autoAuditStrictGate !== false,
      autoAuditDelayMs: AUTO_DELAYS_MS.includes(Number(data.autoAuditDelayMs))
        ? Number(data.autoAuditDelayMs)
        : 1200,
      autoAuditTimeoutMin: AUTO_STAGE_TIMEOUTS.includes(Number(data.autoAuditTimeoutMin))
        ? Number(data.autoAuditTimeoutMin)
        : 180,
      chatgptPromptDelivery: CHATGPT_PROMPT_DELIVERY_MODES.includes(String(data.chatgptPromptDelivery || ''))
        ? String(data.chatgptPromptDelivery)
        : 'auto',
      activeCategoryId: String(data.activeCategoryId || ''),
      categories
    };

    syncBuiltins(clean);

    if (!clean.activeCategoryId || !clean.categories.some(category => category.id === clean.activeCategoryId)) {
      clean.activeCategoryId = clean.categories[0].id;
    }

    return clean;
  }

  function saveState() {
    try {
      const payload = JSON.stringify(state);
      GM_setValue(STORAGE_KEY, payload);
      const verified = GM_getValue(STORAGE_KEY, null);
      if (verified !== payload) throw new Error('userscript storage read-back mismatch');
      return true;
    } catch (error) {
      setStatus(
        `Could not save settings: ${error?.message || 'userscript storage rejected the write'}. The change was rolled back.`,
        'error'
      );
      return false;
    }
  }

  function snapshotState() {
    return JSON.stringify(state);
  }

  function restoreStateSnapshot(snapshot) {
    try {
      state = JSON.parse(snapshot);
      return true;
    } catch (_) {
      return false;
    }
  }

  function renderStateViewsAfterMutation() {
    if (!panel) return;
    applyDisplayState();
    updateLockState();
    renderCategoryTabs();
    renderCommands();
    renderManageCategory();
    renderManageList();
    renderAutoAuditState();
  }

  function commitStateMutation(mutator, failureMessage = 'The change could not be persisted and was rolled back.') {
    const before = snapshotState();
    try {
      mutator();
    } catch (error) {
      restoreStateSnapshot(before);
      renderStateViewsAfterMutation();
      setStatus(`Change failed before save: ${error?.message || 'unexpected mutation error'}.`, 'error');
      return false;
    }

    if (saveState()) return true;

    restoreStateSnapshot(before);
    renderStateViewsAfterMutation();
    setStatus(failureMessage, 'error');
    return false;
  }

  function activeCategory() {
    return state.categories.find(category => category.id === state.activeCategoryId) || state.categories[0] || null;
  }

  function setStatus(message, kind = 'info') {
    if (!panel) return;
    const status = panel.querySelector('#acb-status-text');
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind;
    status.title = message;
  }

  function viewportRect() {
    const root = document.documentElement;
    const visual = window.visualViewport;

    const width = Math.max(
      1,
      Number(visual?.width) || Number(window.innerWidth) || Number(root?.clientWidth) || 1
    );
    const height = Math.max(
      1,
      Number(visual?.height) || Number(window.innerHeight) || Number(root?.clientHeight) || 1
    );
    const left = Number.isFinite(Number(visual?.offsetLeft)) ? Number(visual.offsetLeft) : 0;
    const top = Number.isFinite(Number(visual?.offsetTop)) ? Number(visual.offsetTop) : 0;

    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height
    };
  }

  function currentPanelGeometry(viewport = viewportRect()) {
    const selected = PANEL_SIZES[state.panelSize] || PANEL_SIZES.normal;
    const availableWidth = Math.max(1, viewport.width - (PANEL_EDGE_MARGIN * 2));
    const availableHeight = Math.max(1, viewport.height - (PANEL_EDGE_MARGIN * 2));
    const width = Math.max(1, Math.min(selected.width, availableWidth));
    const expandedHeight = Math.max(1, Math.min(selected.height, availableHeight));

    return {
      viewport,
      width,
      height: state.collapsed ? Math.min(24, availableHeight) : expandedHeight,
      maxWidth: availableWidth,
      maxHeight: availableHeight
    };
  }

  function applyDisplayState(geometry = currentPanelGeometry()) {
    if (!panel) return geometry;

    panel.dataset.collapsed = state.collapsed ? 'true' : 'false';
    panel.style.setProperty('width', `${geometry.width}px`, 'important');
    panel.style.setProperty('height', `${geometry.height}px`, 'important');
    panel.style.setProperty('max-width', `${geometry.maxWidth}px`, 'important');
    panel.style.setProperty('max-height', `${geometry.maxHeight}px`, 'important');
    panel.style.setProperty('opacity', String(state.opacity / 100), 'important');

    const collapse = panel.querySelector('#acb-collapse');
    if (collapse) {
      collapse.textContent = state.collapsed ? 'Expand' : 'Collapse';
      collapse.setAttribute('aria-expanded', state.collapsed ? 'false' : 'true');
      collapse.title = state.collapsed ? 'Expand the widget' : 'Collapse the widget to the title bar';
    }

    const opacity = panel.querySelector('#acb-opacity');
    if (opacity) opacity.value = String(state.opacity);

    const size = panel.querySelector('#acb-size');
    if (size) size.value = state.panelSize;

    return geometry;
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function clampPanelPosition(options = {}) {
    if (!panel) return null;

    const commit = options.commit === true;
    const report = options.report === true;
    const geometry = applyDisplayState(currentPanelGeometry());
    const viewport = geometry.viewport;
    const rect = panel.getBoundingClientRect();

    // Use a smaller edge margin only when the viewport itself is extremely tiny.
    const marginX = Math.min(PANEL_EDGE_MARGIN, Math.max(0, (viewport.width - rect.width) / 2));
    const marginY = Math.min(PANEL_EDGE_MARGIN, Math.max(0, (viewport.height - rect.height) / 2));
    const minX = viewport.left + marginX;
    const minY = viewport.top + marginY;
    const maxX = Math.max(minX, viewport.right - rect.width - marginX);
    const maxY = Math.max(minY, viewport.bottom - rect.height - marginY);

    const rawX = Number(state.popupPos?.x);
    const rawY = Number(state.popupPos?.y);
    const desiredX = Number.isFinite(rawX) ? rawX : minX;
    const desiredY = Number.isFinite(rawY) ? rawY : minY;
    const x = clampNumber(desiredX, minX, maxX);
    const y = clampNumber(desiredY, minY, maxY);
    const corrected = Math.abs(x - desiredX) > 0.5 || Math.abs(y - desiredY) > 0.5;

    // Inline !important makes the userscript the single owner of its coordinates.
    panel.style.setProperty('left', `${x}px`, 'important');
    panel.style.setProperty('top', `${y}px`, 'important');

    if (commit) {
      state.popupPos = { x, y };
    } else if (report && corrected) {
      setStatus('Panel was kept inside the current viewport after a window, zoom, or screen change. Your saved position was preserved.', 'info');
    }

    return { x, y, corrected, viewport, width: rect.width, height: rect.height };
  }

  function updateLockState() {
    const button = panel?.querySelector('#acb-lock');
    const titlebar = panel?.querySelector('#acb-titlebar');
    if (!button || !titlebar) return;
    button.classList.toggle('acb-active', state.posLocked);
    button.setAttribute('aria-pressed', state.posLocked ? 'true' : 'false');
    titlebar.classList.toggle('acb-movable', !state.posLocked);
  }

  function renderTabs() {
    if (!panel) return;
    for (const button of panel.querySelectorAll('#acb-tabs button')) {
      const selected = button.dataset.view === activeView;
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
    }
    panel.querySelector('#acb-view-commands').hidden = activeView !== 'commands';
    panel.querySelector('#acb-view-manage').hidden = activeView !== 'manage';
    panel.querySelector('#acb-view-settings').hidden = activeView !== 'settings';
  }

  function renderCategoryTabs() {
    const container = panel?.querySelector('#acb-catbar');
    if (!container) return;
    container.textContent = '';
    container.hidden = state.categories.length <= 1;
    for (const category of state.categories) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = category.name;
      button.title = category.name;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', category.id === state.activeCategoryId ? 'true' : 'false');
      button.addEventListener('click', () => {
        if (!commitStateMutation(
          () => { state.activeCategoryId = category.id; },
          'Category selection could not be persisted; the previous selection was restored.'
        )) return;
        renderCategoryTabs();
        renderCommands();
        renderManageCategory();
        renderManageList();
        hideEditor();
        setStatus(`Selected category: ${category.name}.`, 'info');
      });
      container.appendChild(button);
    }
  }

  function auditWaveForPreset(preset) {
    const builtinId = canonicalBuiltinId(preset?.builtinId);
    if (builtinId.startsWith('audit-core-')) return 'core';
    if (builtinId.startsWith('audit-second-wave-')) return 'second';
    if (builtinId.startsWith('audit-performance-')) return 'performance';
    return '';
  }

  function findAuditPreset(wave) {
    for (const category of state.categories) {
      const preset = category.presets.find(item => auditWaveForPreset(item) === wave);
      if (preset) return preset;
    }
    return null;
  }

  function renderAuditQuickActions() {
    const list = panel?.querySelector('#acb-audit-quick-list');
    if (!list) return;

    const specs = [
      { wave: 'core', index: '1', label: 'Audit Core', desc: 'Correctness + root causes' },
      { wave: 'second', index: '2', label: 'Second Wave', desc: 'Edges + lifecycle + recovery' },
      { wave: 'performance', index: '3', label: 'Performance', desc: 'Latency + stability + waste' }
    ];

    list.textContent = '';
    for (const spec of specs) {
      const preset = findAuditPreset(spec.wave);
      const row = document.createElement('div');
      row.className = 'acb-audit-quick-row';
      row.dataset.wave = spec.wave;
      setHTML(row, `
        <div class="acb-audit-wave-index">${spec.index}</div>
        <div class="acb-audit-wave-copy">
          <div class="acb-audit-wave-name">${escapeHTML(preset?.name || spec.label)}</div>
          <div class="acb-audit-wave-desc">${escapeHTML(preset?.desc || spec.desc)}</div>
        </div>
        <button type="button" data-quick-action="append" ${preset ? '' : 'disabled'} title="Prepare this wave in the ChatGPT composer without sending.">Prepare</button>
        <button type="button" data-quick-action="run" ${preset ? '' : 'disabled'} title="Prepare and send this wave now.">Run</button>
      `);
      list.appendChild(row);
    }
  }

  function renderCommands() {
    const list = panel?.querySelector('#acb-command-list');
    const filter = panel?.querySelector('#acb-filter');
    const section = panel?.querySelector('#acb-other-commands');
    const filterWrap = panel?.querySelector('#acb-filter-wrap');
    if (!list || !filter || !section || !filterWrap) return;

    renderAuditQuickActions();

    const category = activeCategory();
    const query = filter.value.trim().toLowerCase();
    const hasAnyCustom = state.categories.some(item =>
      item.presets.some(preset => !auditWaveForPreset(preset))
    );

    filterWrap.hidden = !hasAnyCustom;
    const presets = category
      ? category.presets.filter(preset =>
        !auditWaveForPreset(preset) &&
        (!query || `${preset.name}\n${preset.desc}\n${preset.text}`.toLowerCase().includes(query))
      )
      : [];

    section.hidden = !hasAnyCustom;
    list.textContent = '';

    if (!hasAnyCustom) return;

    if (!presets.length) {
      const empty = document.createElement('div');
      empty.className = 'acb-empty';
      empty.textContent = query
        ? 'No custom commands match this filter.'
        : 'No custom commands in this category.';
      list.appendChild(empty);
      return;
    }

    for (const preset of presets) {
      const row = document.createElement('div');
      row.className = 'acb-command-row';
      row.dataset.presetId = preset.id;
      setHTML(row, `
        <div class="acb-command-name" title="${escapeHTML(preset.desc || preset.text)}">${escapeHTML(preset.name)}</div>
        <button type="button" data-action="append" aria-label="Prepare ${escapeHTML(preset.name)} in composer">Prepare</button>
        <button type="button" data-action="run" aria-label="Prepare ${escapeHTML(preset.name)} and send">Run</button>
      `);
      list.appendChild(row);
    }
  }

  function renderManageCategory() {
    const select = panel?.querySelector('#acb-manage-category');
    const nameInput = panel?.querySelector('#acb-category-name');
    if (!select || !nameInput) return;
    select.textContent = '';
    for (const category of state.categories) {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      option.selected = category.id === state.activeCategoryId;
      select.appendChild(option);
    }
    nameInput.value = activeCategory()?.name || '';
  }

  function renderManageList() {
    const list = panel?.querySelector('#acb-manage-list');
    if (!list) return;
    const category = activeCategory();
    list.textContent = '';
    if (!category || !category.presets.length) {
      const empty = document.createElement('div');
      empty.className = 'acb-empty';
      empty.textContent = 'No commands in this category.';
      list.appendChild(empty);
      return;
    }

    category.presets.forEach((preset, index) => {
      const row = document.createElement('div');
      row.className = 'acb-manage-row';
      row.dataset.presetId = preset.id;
      setHTML(row, `
        <div class="acb-manage-name" title="${escapeHTML(preset.desc || preset.text)}">${escapeHTML(preset.name)}</div>
        <div class="acb-manage-actions">
          <button type="button" data-manage="edit">Edit</button>
          <button type="button" data-manage="up" title="Move command up.">Move up</button>
          <button type="button" data-manage="down" title="Move command down.">Move down</button>
          <button type="button" data-manage="delete">Delete</button>
        </div>
      `);
      list.appendChild(row);
    });
  }

  function showEditor(presetId = null) {
    const editor = panel?.querySelector('#acb-editor');
    const title = panel?.querySelector('#acb-editor-title');
    const name = panel?.querySelector('#acb-edit-name');
    const desc = panel?.querySelector('#acb-edit-desc');
    const text = panel?.querySelector('#acb-edit-text');
    if (!editor || !title || !name || !desc || !text) return;

    const category = activeCategory();
    const preset = presetId && category ? category.presets.find(item => item.id === presetId) : null;
    editingPresetId = preset ? preset.id : null;
    title.textContent = preset ? `Edit command: ${preset.name}` : 'Add command';
    name.value = preset ? preset.name : '';
    desc.value = preset ? preset.desc : '';
    text.value = preset ? preset.text : '';
    name.classList.remove('acb-error');
    text.classList.remove('acb-error');
    editor.hidden = false;
    setStatus(preset ? `Editing command: ${preset.name}.` : 'New command editor opened.', 'info');
  }

  function hideEditor() {
    const editor = panel?.querySelector('#acb-editor');
    if (!editor) return;
    editor.hidden = true;
    editingPresetId = null;
  }

  function saveEditor() {
    const category = activeCategory();
    const nameInput = panel?.querySelector('#acb-edit-name');
    const descInput = panel?.querySelector('#acb-edit-desc');
    const textInput = panel?.querySelector('#acb-edit-text');
    if (!category || !nameInput || !descInput || !textInput) return;

    const name = nameInput.value.trim();
    const desc = descInput.value.trim();
    const text = textInput.value.trim();
    nameInput.classList.toggle('acb-error', !name);
    textInput.classList.toggle('acb-error', !text);

    if (!name || !text) {
      setStatus('Command was not saved: Name and Prompt are required. Fill both labeled fields, then press Save.', 'error');
      return;
    }

    const duplicateName = category.presets.some(item =>
      item.id !== editingPresetId && item.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicateName) {
      nameInput.classList.add('acb-error');
      setStatus(`Command was not saved: "${name}" already exists in ${category.name}. Use a unique command name and retry.`, 'error');
      return;
    }

    clearPendingAction();

    if (editingPresetId) {
      const preset = category.presets.find(item => item.id === editingPresetId);
      if (!preset) {
        setStatus('Command was not saved: the edited command no longer exists. Reopen it from the Manage list.', 'error');
        return;
      }
      if (!commitStateMutation(() => {
        preset.name = name.slice(0, 40);
        preset.desc = desc.slice(0, 100);
        preset.text = text;
      }, 'Command edit could not be persisted; the previous command was restored.')) return;
      renderCommands();
      renderManageList();
      hideEditor();
      setStatus(`Saved command: ${preset.name}.`, 'success');
      return;
    }

    if (category.presets.length >= MAX_PRESETS) {
      setStatus(`Command was not added: ${category.name} already has the ${MAX_PRESETS}-command limit. Delete or move a command first.`, 'error');
      return;
    }

    const preset = {
      id: uid(),
      name: name.slice(0, 40),
      desc: desc.slice(0, 100),
      text
    };
    if (!commitStateMutation(
      () => { category.presets.push(preset); },
      'New command could not be persisted; it was not added.'
    )) return;
    renderCommands();
    renderManageList();
    hideEditor();
    setStatus(`Added command: ${preset.name}.`, 'success');
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function triggerSend(site, input, options = {}) {
    const waitForReadyMs = Number(options.waitForReadyMs) || 0;
    const fence = typeof options.fence === 'function' ? options.fence : null;

    const fenceCheck = async () => {
      if (!fence) return true;
      try {
        return Boolean(await fence());
      } catch (_) {
        return false;
      }
    };

    if (site?.key === 'chatgpt' && waitForReadyMs > 0) {
      const ready = await waitForChatGPTSendReady(waitForReadyMs);
      if (ready) {
        if (!(await fenceCheck())) return { ok: false, mode: 'ownership-lost' };
        ready.click();
        return { ok: true, mode: 'button' };
      }
    } else {
      const retryDelays = [0, 35, 70, 120, 180, 260];
      for (const delay of retryDelays) {
        if (delay) await sleep(delay);
        const button = cachedSiteElement(site, 'send');
        if (button && !button.disabled && button.getAttribute('aria-disabled') !== 'true') {
          if (!(await fenceCheck())) return { ok: false, mode: 'ownership-lost' };
          button.click();
          return { ok: true, mode: 'button' };
        }
      }
    }

    if (site.allowEnterFallback === false) {
      return { ok: false, mode: 'manual-only' };
    }

    if (!(await fenceCheck())) return { ok: false, mode: 'ownership-lost' };

    try {
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        shiftKey: false
      }));
      input.dispatchEvent(new KeyboardEvent('keyup', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        shiftKey: false
      }));
      return { ok: false, mode: 'enter-fallback' };
    } catch (_) {
      return { ok: false, mode: 'failed' };
    }
  }

  async function executePreset(preset, mode, options = {}) {
    if (actionInFlight) {
      if (!options.quietBusy) {
        setStatus('A command action is already running. Wait for that action to finish before triggering another one.', 'warning');
      }
      return { ok: false, sent: false, reason: 'busy' };
    }

    actionInFlight = true;
    try {
      const site = detectSite();
      const siteLabel = site.label;
      const input = cachedSiteElement(site, 'input');
      if (!input) {
        setStatus(`Composer not found on ${siteLabel}. Open a chat composer on this page, then press ${mode === 'run' ? 'Run' : 'Append'} again.`, 'error');
        return { ok: false, sent: false, reason: 'composer-not-found' };
      }

      setStatus(`${mode === 'run' ? 'Running' : 'Appending'} ${preset.name}...`, 'info');
      await yieldToBrowser();

      const inputValidator = site.validateInput;
      if (!input.isConnected || !isVisible(input) || (inputValidator && !inputValidator(input))) {
        elementCache.input = null;
        elementCache.send = null;
        setStatus(`Composer changed before insertion on ${siteLabel}. No text was written. Close message editing or restore the main composer, then retry.`, 'error');
        return { ok: false, sent: false, reason: 'composer-changed' };
      }

      const attachmentDelivery = shouldUseChatGPTPromptAttachment(site, preset);
      let attachment = null;

      if (options.autoOwnership && !(await options.autoOwnership.verify())) {
        setStatus(`Automatic send for ${preset.name} was canceled because this tab lost Auto3 ownership or the composer was changed before insertion. Nothing was written or sent.`, 'warning');
        return { ok: false, sent: false, reason: 'ownership-lost' };
      }

      if (attachmentDelivery) {
        setStatus(`Attaching ${preset.name} as a prompt file so ChatGPT does not parse the full text in ProseMirror...`, 'info');
        attachment = await attachChatGPTPromptFile(preset, input);
        if (!attachment.ok) {
          setStatus(`Could not attach ${preset.name} as a file (${attachment.reason}). The large prompt was NOT pasted into the editor, preventing a UI freeze. Change Delivery to Text only if you explicitly want raw text.`, 'error');
          return { ok: false, sent: false, reason: attachment.reason, delivery: 'attachment' };
        }
      } else {
        const deliveryText = preset?.machineReceipt
          ? `${preset.text}\n\n${AUTO_SEND_RECEIPT_PREFIX}: ${preset.machineReceipt}`
          : preset.text;
        const appended = smartAppend(input, deliveryText);
        if (!appended) {
          elementCache.input = null;
          setStatus(`Could not write to the ${siteLabel} composer. The page editor rejected scripted input; click the composer once and retry.`, 'error');
          return { ok: false, sent: false, reason: 'write-rejected' };
        }
      }

      if (mode === 'append') {
        if (attachmentDelivery) {
          setStatus(`Attached ${preset.name} as ${attachment.filename} and added only a short instruction marker. Existing composer text/files were preserved.`, 'success');
          return { ok: true, sent: false, mode: 'append-attachment', delivery: 'attachment', filename: attachment.filename };
        }
        setStatus(`Appended ${preset.name} to the ${siteLabel} composer. Existing composer text was preserved.`, 'success');
        return { ok: true, sent: false, mode: 'append', delivery: 'text' };
      }

      if (options.autoOwnership) options.autoOwnership.captureWrite();

      setStatus(attachmentDelivery
        ? `Attached ${preset.name} as ${attachment.filename}. Waiting for ChatGPT to finish registering the attachment and enable Send...`
        : `Inserted ${preset.name}. Waiting briefly for the ${siteLabel} Send control...`, 'info');
      await yieldToBrowser();

      if (typeof options.beforeSend === 'function') {
        let permitted = false;
        try {
          if (options.autoOwnership && !(await options.autoOwnership.verify())) {
            setStatus(`Automatic Send for ${preset.name} was canceled because this tab lost Auto3 ownership while the composer was being prepared. Nothing was sent.`, 'warning');
            return { ok: false, sent: false, reason: 'ownership-lost' };
          }
          permitted = await options.beforeSend({ site, input, preset, attachmentDelivery, attachment });
        } catch (_) {
          permitted = false;
        }
        if (!permitted) {
          setStatus(`Automatic Send for ${preset.name} was canceled because its durable pre-send checkpoint could not be saved. The prepared composer content was left untouched.`, 'error');
          return { ok: false, sent: false, reason: 'pre-send-checkpoint-failed' };
        }
      }

      const result = await triggerSend(site, input, {
        waitForReadyMs: attachmentDelivery ? CHATGPT_ATTACHMENT_TIMEOUT_MS : 0,
        fence: options.autoOwnership
          ? () => options.autoOwnership.verify()
          : undefined
      });
      if (result.mode === 'ownership-lost') {
        setStatus(`Automatic Send for ${preset.name} was canceled immediately before the click because this tab no longer owns Auto3 or the composer content changed. Nothing was sent.`, 'warning');
        return { ok: false, sent: false, reason: 'ownership-lost' };
      }
      if (result.ok) {
        setStatus(`Run triggered: ${preset.name}. The ${siteLabel} Send control was clicked.`, 'success');
        return { ok: true, sent: true, mode: result.mode };
      }

      if (result.mode === 'enter-fallback') {
        setStatus(`Prompt was inserted, but the ${siteLabel} Send control did not become ready. Enter fallback was triggered; verify the site accepted it, otherwise press Send manually.`, 'warning');
        return { ok: false, sent: false, mode: result.mode, reason: 'unverified-enter-fallback' };
      }

      if (result.mode === 'manual-only') {
        setStatus(`Prompt was inserted into the verified ${siteLabel} composer, but its Send control did not become ready. Automatic Enter fallback is disabled on this site to prevent sending or editing the wrong field. Press Send manually.`, 'warning');
        return { ok: false, sent: false, mode: result.mode, reason: 'manual-send-required' };
      }

      setStatus(`Prompt was inserted, but ${siteLabel} could not be sent automatically. Press the site's Send control manually.`, 'warning');
      return { ok: false, sent: false, mode: result.mode, reason: 'send-failed' };
    } catch (error) {
      setStatus(`Command action failed: ${error?.message || 'unexpected runtime error'}. Retry once; if it repeats, use Append and send manually.`, 'error');
      return { ok: false, sent: false, reason: 'exception', error };
    } finally {
      actionInFlight = false;
    }
  }


  function emptyAutoRuntime(options = {}) {
    const enabledDefault = options.enabled !== undefined
      ? Boolean(options.enabled)
      : false;

    return {
      version: 4,
      conversationKey: '',
      enabled: enabledDefault,
      stage: 'idle',
      pausedFromStage: '',
      seenUserId: '',
      anchorUserId: '',
      coreUserId: '',
      secondUserId: '',
      performanceUserId: '',
      expectedKind: '',
      startedAt: 0,
      waitStartedAt: 0,
      updatedAt: Date.now(),
      stableResponseKey: '',
      stableSince: 0,
      baselineAssistantKey: '',
      pausedReason: '',
      continuationKind: '',
      continuationReason: '',
      continuationPreviousUserId: '',
      partialContinuations: { core: 0, second: 0, performance: 0 },
      stallNudges: { core: 0, second: 0, performance: 0 },
      continueGeneratingClicks: { core: 0, second: 0, performance: 0 },
      retryClicks: { core: 0, second: 0, performance: 0 },
      idleStallKey: '',
      idleStallSince: 0,
      pendingSendReceipt: '',
      pendingSendKind: '',
      pendingSendPreviousUserId: '',
      pendingSendStartedAt: 0,
      pendingSendRetries: 0,
      pendingSendClickArmed: false,
      completeAt: 0
    };
  }

  function normalizeAutoRuntime(parsed, conversationKey = '') {
    if (!parsed || typeof parsed !== 'object' || typeof parsed.stage !== 'string') return null;
    if (![1, 2, 3, 4].includes(parsed.version)) return null;

    const normalized = {
      ...emptyAutoRuntime({
        enabled: parsed.enabled !== undefined ? parsed.enabled : false
      }),
      ...parsed,
      version: 4
    };

    if (conversationKey) normalized.conversationKey = conversationKey;
    normalized.enabled = Boolean(
      parsed.enabled !== undefined ? parsed.enabled : normalized.enabled
    );

    const normalizeCounterMap = value => ({
      core: Math.max(0, Number(value?.core) || 0),
      second: Math.max(0, Number(value?.second) || 0),
      performance: Math.max(0, Number(value?.performance) || 0)
    });
    normalized.partialContinuations = normalizeCounterMap(parsed.partialContinuations);
    normalized.stallNudges = normalizeCounterMap(parsed.stallNudges);
    normalized.continueGeneratingClicks = normalizeCounterMap(parsed.continueGeneratingClicks);
    normalized.retryClicks = normalizeCounterMap(parsed.retryClicks);
    normalized.continuationKind = String(parsed.continuationKind || '');
    normalized.continuationReason = String(parsed.continuationReason || '');
    normalized.continuationPreviousUserId = String(parsed.continuationPreviousUserId || '');
    normalized.idleStallKey = String(parsed.idleStallKey || '');
    normalized.idleStallSince = Math.max(0, Number(parsed.idleStallSince) || 0);
    normalized.pendingSendReceipt = String(parsed.pendingSendReceipt || '');
    normalized.pendingSendKind = String(parsed.pendingSendKind || '');
    normalized.pendingSendPreviousUserId = String(parsed.pendingSendPreviousUserId || '');
    normalized.pendingSendStartedAt = Math.max(0, Number(parsed.pendingSendStartedAt) || 0);
    normalized.pendingSendRetries = Math.max(0, Number(parsed.pendingSendRetries) || 0);
    normalized.pendingSendClickArmed = Boolean(parsed.pendingSendClickArmed);
    return normalized;
  }

  function autoRuntimeStorageKey(conversationKey) {
    return `${AUTO_RUNTIME_PREFIX}${String(conversationKey || 'unknown')}`;
  }

  function autoLeaseStorageKey(conversationKey) {
    return `${AUTO_LEASE_PREFIX}${String(conversationKey || 'unknown')}`;
  }

  function createDraftLifetimeId() {
    const created = globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    autoDraftId = created;
    try { sessionStorage.setItem(AUTO_DRAFT_SESSION_KEY, created); } catch (_) { }
    return created;
  }

  function currentConversationKey() {
    const match = location.pathname.match(/^\/c\/([^/?#]+)/i);
    if (match) return `c:${match[1]}`;
    return `draft:${autoTabId}:${autoDraftId}`;
  }

  function removeStoredRuntime(conversationKey) {
    if (!conversationKey) return true;
    try {
      GM_deleteValue(autoRuntimeStorageKey(conversationKey));
      return true;
    } catch (_) {
      try {
        GM_setValue(autoRuntimeStorageKey(conversationKey), '');
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  function readStoredRuntime(conversationKey) {
    try {
      const raw = GM_getValue(autoRuntimeStorageKey(conversationKey), null);
      if (!raw) return { runtime: null, found: false };
      const parsed = normalizeAutoRuntime(JSON.parse(raw), conversationKey);
      return { runtime: parsed, found: Boolean(parsed) };
    } catch (_) {
      return { runtime: null, found: false };
    }
  }

  function persistRuntimeForKey(conversationKey, runtime) {
    if (!conversationKey || !runtime) return false;
    const copy = normalizeAutoRuntime(runtime, conversationKey) || emptyAutoRuntime();
    copy.version = 4;
    copy.conversationKey = conversationKey;
    copy.updatedAt = Date.now();
    try {
      GM_setValue(autoRuntimeStorageKey(conversationKey), JSON.stringify(copy));
      return true;
    } catch (_) {
      return false;
    }
  }

  function runtimeHasContinuity(runtime) {
    if (!runtime) return false;
    return (
      Boolean(runtime.enabled) ||
      runtime.stage !== 'idle' ||
      Boolean(runtime.seenUserId) ||
      Boolean(runtime.anchorUserId) ||
      Boolean(runtime.coreUserId) ||
      Boolean(runtime.secondUserId) ||
      Boolean(runtime.performanceUserId) ||
      Boolean(runtime.baselineAssistantKey)
    );
  }

  function loadLegacyAutoRuntimeForCurrentConversation(conversationKey) {
    try {
      const raw = GM_getValue(AUTO_LEGACY_RUNTIME_KEY, null);
      if (raw) {
        const parsed = normalizeAutoRuntime(JSON.parse(raw));
        if (parsed) {
          const turns = getChatGPTTurns();
          const anchorId = parsed.performanceUserId || parsed.secondUserId || parsed.coreUserId || parsed.anchorUserId;
          const anchorIsHere = anchorId && Boolean(findTurnById(anchorId, turns));
          const keyMatches = parsed.conversationKey === conversationKey;

          if (anchorIsHere || keyMatches || (!parsed.conversationKey && conversationKey.startsWith('draft:'))) {
            parsed.conversationKey = conversationKey;
            if (!persistRuntimeForKey(conversationKey, parsed)) return null;
            try { GM_setValue(AUTO_LEGACY_RUNTIME_KEY, ''); } catch (_) { }
            return parsed;
          }
        }
      }
    } catch (_) { }

    try {
      const legacyRaw = sessionStorage.getItem(AUTO_LEGACY_SESSION_KEY);
      if (legacyRaw) {
        const rawParsed = JSON.parse(legacyRaw);
        const rawKey = String(rawParsed?.conversationKey || '');
        const migrated = normalizeAutoRuntime(rawParsed, conversationKey);
        if (migrated) {
          const turns = getChatGPTTurns();
          const anchorId = migrated.performanceUserId || migrated.secondUserId || migrated.coreUserId || migrated.anchorUserId;
          const anchorIsHere = anchorId && Boolean(findTurnById(anchorId, turns));
          const keyMatches = Boolean(rawKey) && rawKey === conversationKey;
          const draftNoKey = !rawKey && conversationKey.startsWith('draft:');

          // The v1 session entry carries no durable conversation key, so it is
          // only adopted when its lineage is verifiable in the live DOM, or
          // when it unambiguously belongs to the current draft conversation.
          if (anchorIsHere || keyMatches || draftNoKey) {
            migrated.conversationKey = conversationKey;
            if (!persistRuntimeForKey(conversationKey, migrated)) return null;
            try { sessionStorage.removeItem(AUTO_LEGACY_SESSION_KEY); } catch (_) { }
            return migrated;
          }
        }
      }
    } catch (_) { }

    return null;
  }

  function loadAutoRuntime(conversationKey = currentConversationKey()) {
    const stored = readStoredRuntime(conversationKey);
    if (stored.runtime) return stored.runtime;

    const migrated = loadLegacyAutoRuntimeForCurrentConversation(conversationKey);
    if (migrated) return migrated;

    const fresh = emptyAutoRuntime();
    fresh.conversationKey = conversationKey;
    return fresh;
  }

  function saveAutoRuntime(options = {}) {
    if (!autoRuntime) return false;
    const key = autoBoundConversationKey || currentConversationKey();
    autoRuntime.version = 4;
    autoRuntime.conversationKey = key;
    autoRuntime.updatedAt = Date.now();

    const persisted = persistRuntimeForKey(key, autoRuntime);
    if (!persisted) {
      clearAutoTimers();
      releaseAutoLease(key);
      if (options.pauseOnFailure !== false) {
        if (autoRuntime.stage !== 'paused') autoRuntime.pausedFromStage = autoRuntime.stage;
        autoRuntime.stage = 'paused';
        autoRuntime.pausedReason = 'Auto3 runtime persistence failed. No further automatic send is allowed until storage works again.';
        autoRuntime.waitStartedAt = 0;
      }
      renderAutoAuditState();
      setStatus('Auto3 persistence failed. Automation stopped before the next irreversible send; reload/Resume after userscript storage is writable again.', 'error');
      return false;
    }

    renderAutoAuditState();
    return true;
  }

  function readAutoLease(conversationKey = autoBoundConversationKey || currentConversationKey()) {
    if (!conversationKey) return null;
    try {
      const raw = GM_getValue(autoLeaseStorageKey(conversationKey), null);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        version: 1,
        ownerId: String(parsed.ownerId || ''),
        conversationKey: String(parsed.conversationKey || conversationKey),
        nonce: String(parsed.nonce || ''),
        expiresAt: Number(parsed.expiresAt) || 0,
        updatedAt: Number(parsed.updatedAt) || 0
      };
    } catch (_) {
      return null;
    }
  }

  function writeAutoLease(conversationKey, lease) {
    try {
      GM_setValue(autoLeaseStorageKey(conversationKey), JSON.stringify(lease));
      return true;
    } catch (_) {
      return false;
    }
  }

  function autoLeaseOwnedByThisTab(conversationKey = autoBoundConversationKey || currentConversationKey()) {
    const lease = readAutoLease(conversationKey);
    return Boolean(
      lease &&
      lease.ownerId === autoInstanceId &&
      lease.expiresAt > Date.now()
    );
  }

  function clearAutoLeaseTimer() {
    if (autoLeaseTimer) {
      clearTimeout(autoLeaseTimer);
      autoLeaseTimer = 0;
    }
  }

  function scheduleAutoLeaseRenewal() {
    clearAutoLeaseTimer();
    if (!autoRuntime?.enabled || !autoBoundConversationKey) return;

    autoLeaseTimer = setTimeout(() => {
      autoLeaseTimer = 0;
      if (!autoRuntime?.enabled || !autoBoundConversationKey) return;

      const lease = readAutoLease(autoBoundConversationKey);
      if (!lease || lease.ownerId !== autoInstanceId || lease.expiresAt <= Date.now()) {
        renderAutoAuditState();
        scheduleAutoAuditCheck(500);
        return;
      }

      const now = Date.now();
      writeAutoLease(autoBoundConversationKey, {
        ...lease,
        ownerId: autoInstanceId,
        conversationKey: autoBoundConversationKey,
        expiresAt: now + AUTO_LEASE_TTL_MS,
        updatedAt: now
      });
      scheduleAutoLeaseRenewal();
    }, AUTO_LEASE_RENEW_MS);
  }

  function claimAutoLease(options = {}) {
    const key = autoBoundConversationKey || currentConversationKey();
    if (!key || !autoRuntime?.enabled) return false;

    const now = Date.now();
    const current = readAutoLease(key);
    if (
      current &&
      current.expiresAt > now &&
      current.ownerId &&
      current.ownerId !== autoInstanceId &&
      !options.force
    ) {
      return false;
    }

    const nonce = `${now.toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
    const candidate = {
      version: 1,
      ownerId: autoInstanceId,
      conversationKey: key,
      nonce,
      expiresAt: now + AUTO_LEASE_TTL_MS,
      updatedAt: now
    };

    if (!writeAutoLease(key, candidate)) return false;

    const verified = readAutoLease(key);
    const owns = Boolean(
      verified &&
      verified.ownerId === autoInstanceId &&
      verified.nonce === nonce &&
      verified.expiresAt > Date.now()
    );

    if (owns) scheduleAutoLeaseRenewal();
    return owns;
  }

  // Returns a fencing token ({ conversationKey, nonce }) only when this tab
  // verifiably owns the lease. The token is carried through every async
  // automatic action and re-validated immediately before each irreversible
  // click and before each runtime commit, so a tab that lost ownership can
  // neither click Send nor persist stale state.
  async function verifyAutoLeaseForSend() {
    if (!claimAutoLease()) return null;
    await sleep(AUTO_LEASE_VERIFY_MS + Math.floor(Math.random() * 60));

    const key = autoBoundConversationKey || currentConversationKey();
    const lease = readAutoLease(key);
    if (!lease || lease.ownerId !== autoInstanceId || lease.expiresAt <= Date.now()) return null;

    const now = Date.now();
    writeAutoLease(key, {
      ...lease,
      expiresAt: now + AUTO_LEASE_TTL_MS,
      updatedAt: now
    });

    const confirmed = readAutoLease(key);
    if (
      !confirmed ||
      confirmed.ownerId !== autoInstanceId ||
      confirmed.nonce !== lease.nonce ||
      confirmed.expiresAt <= Date.now()
    ) {
      return null;
    }
    return { conversationKey: key, nonce: lease.nonce };
  }

  function isLeaseTokenCurrent(token) {
    if (!token || !token.conversationKey || !token.nonce) return false;
    const lease = readAutoLease(token.conversationKey);
    return Boolean(
      lease &&
      lease.ownerId === autoInstanceId &&
      lease.nonce === token.nonce &&
      lease.expiresAt > Date.now()
    );
  }

  function releaseAutoLease(conversationKey = autoBoundConversationKey) {
    if (!conversationKey) return;
    clearAutoLeaseTimer();

    const lease = readAutoLease(conversationKey);
    if (!lease || lease.ownerId !== autoInstanceId) return;

    writeAutoLease(conversationKey, {
      ...lease,
      ownerId: '',
      nonce: '',
      expiresAt: 0,
      updatedAt: Date.now()
    });
  }

  function refreshAutoRuntimeFromStorage() {
    if (!autoBoundConversationKey) return autoRuntime;
    const stored = readStoredRuntime(autoBoundConversationKey);
    if (stored.runtime) autoRuntime = stored.runtime;
    return autoRuntime;
  }

  function bindAutoRuntimeToCurrentConversation(options = {}) {
    const stableMatch = location.pathname.match(/^\/c\/([^/?#]+)/i);
    const previousKey = autoBoundConversationKey;
    const previousRuntime = autoRuntime ? normalizeAutoRuntime(autoRuntime) : null;

    // Leaving an established conversation for a new unsaved chat creates a new
    // draft lifetime even though the browser tab and route "/" are reused.
    if (!stableMatch && previousKey?.startsWith('c:')) {
      createDraftLifetimeId();
    }

    const key = currentConversationKey();
    if (autoBoundConversationKey === key && autoRuntime) return true;

    if (previousKey) releaseAutoLease(previousKey);

    const stored = readStoredRuntime(key);
    let nextRuntime = stored.runtime;

    if (
      !nextRuntime &&
      previousKey?.startsWith('draft:') &&
      key.startsWith('c:') &&
      previousRuntime &&
      runtimeHasContinuity(previousRuntime)
    ) {
      nextRuntime = normalizeAutoRuntime(previousRuntime, key);
      if (persistRuntimeForKey(key, nextRuntime)) {
        // Draft runtime is single-use. Leaving it behind lets a later new-chat
        // route in the same tab resurrect an unrelated chain.
        removeStoredRuntime(previousKey);
      } else {
        // Never carry an active automation chain into a stable conversation when
        // its continuation state could not be durably written.
        nextRuntime = emptyAutoRuntime({ enabled: false });
        nextRuntime.conversationKey = key;
        setStatus('Draft-to-conversation Auto3 migration could not be persisted. Automation is disabled in this chat until storage works and you enable it explicitly.', 'error');
      }
    }

    if (!nextRuntime) nextRuntime = loadAutoRuntime(key);

    autoBoundConversationKey = key;
    autoRuntime = nextRuntime || emptyAutoRuntime();
    autoRuntime.conversationKey = key;

    renderAutoAuditState();

    if (options.claim !== false && autoRuntime.enabled) {
      claimAutoLease();
    }

    return true;
  }

  function clearAutoTimers() {
    if (autoAuditCheckTimer) {
      clearTimeout(autoAuditCheckTimer);
      autoAuditCheckTimer = 0;
    }
    if (autoAuditNextTimer) {
      clearTimeout(autoAuditNextTimer);
      autoAuditNextTimer = 0;
    }
  }

  function turnRole(turn) {
    if (!turn) return '';

    const direct = String(turn.getAttribute?.('data-turn') || '').toLowerCase();
    if (direct === 'user' || direct === 'assistant') return direct;

    const own = String(turn.getAttribute?.('data-message-author-role') || '').toLowerCase();
    if (own === 'user' || own === 'assistant') return own;

    const nested = turn.querySelector?.(
      '[data-message-author-role="user"], [data-message-author-role="assistant"]'
    );
    const role = String(nested?.getAttribute('data-message-author-role') || '').toLowerCase();
    return role === 'user' || role === 'assistant' ? role : '';
  }

  function getChatGPTTurns() {
    const turns = [];
    const seen = new Set();

    const add = node => {
      if (!node) return;
      const role = turnRole(node);
      if (role !== 'user' && role !== 'assistant') return;

      const message = node.matches?.('[data-message-id]')
        ? node
        : node.querySelector?.('[data-message-id]');
      const stableKey =
        node.getAttribute?.('data-turn-id') ||
        message?.getAttribute('data-message-id') ||
        node.getAttribute?.('data-testid') ||
        node;

      if (seen.has(stableKey)) return;
      seen.add(stableKey);
      turns.push(node);
    };

    // Stable semantic source: authored user/assistant messages. ChatGPT has used
    // section, article and other wrappers over time, so wrapper tag is not truth.
    for (const message of document.querySelectorAll(
      '[data-message-author-role="user"], [data-message-author-role="assistant"]'
    )) {
      const wrapper = message.closest(
        'section[data-turn], article[data-turn], ' +
        'section[data-testid^="conversation-turn-"], article[data-testid^="conversation-turn-"], ' +
        '[data-testid^="conversation-turn-"]'
      );
      add(wrapper || message);
    }

    // Hydration fallback when the turn wrapper appears before its message subtree.
    for (const wrapper of document.querySelectorAll(
      'section[data-turn], article[data-turn], ' +
      'section[data-testid^="conversation-turn-"], article[data-testid^="conversation-turn-"], ' +
      '[data-testid^="conversation-turn-"]'
    )) {
      add(wrapper);
    }

    return turns.sort((a, b) => {
      if (a === b) return 0;
      const relation = a.compareDocumentPosition(b);
      if (relation & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (relation & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
  }

  function getTurnId(turn) {
    if (!turn) return '';
    const message = turn.matches?.('[data-message-id]')
      ? turn
      : turn.querySelector?.('[data-message-id]');

    return String(
      turn.getAttribute?.('data-turn-id') ||
      message?.getAttribute('data-message-id') ||
      turn.getAttribute?.('data-testid') ||
      turn.getAttribute?.('id') ||
      ''
    );
  }

  function cleanTurnText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
      .replace(/\r\n/g, '\n')
      .trim();
  }

  function readableNodeText(node) {
    if (!node) return '';

    // innerText preserves the visual block/newline structure that the user sees.
    // textContent remains the fallback for virtualized/hidden ChatGPT surfaces.
    try {
      const visual = cleanTurnText(node.innerText);
      if (visual) return visual;
    } catch (_) { }

    return cleanTurnText(node.textContent);
  }

  function assistantTextCandidates(turn) {
    if (!turn || turnRole(turn) !== 'assistant') return [];

    const message = turn.matches?.('[data-message-author-role="assistant"]')
      ? turn
      : (turn.querySelector?.('[data-message-author-role="assistant"]') || turn);
    const candidates = [];
    const seen = new Set();

    const add = value => {
      const cleaned = cleanTurnText(value);
      if (!cleaned || seen.has(cleaned)) return;
      seen.add(cleaned);
      candidates.push(cleaned);
    };

    // Authored answer surfaces first. ChatGPT can render a final answer as ordinary
    // markdown, a code/pre block, a writing block, or a mixture of those.
    for (const surface of message.querySelectorAll(
      '.markdown.prose, .markdown[class*="prose"], .markdown, ' +
      'pre, [data-writing-block="true"], [data-testid="writing-block-container"]'
    )) {
      add(readableNodeText(surface));
      add(surface.textContent);
    }

    // Robust fallbacks. These intentionally happen after authored surfaces so UI
    // chrome never masks a good answer, but can still rescue us after DOM changes.
    add(readableNodeText(message));
    add(message.textContent);
    add(readableNodeText(turn));
    add(turn.textContent);

    return candidates.slice(0, 16);
  }

  function getTurnText(turn) {
    if (!turn) return '';
    const role = turnRole(turn);
    const message = turn.matches?.(`[data-message-author-role="${role}"]`)
      ? turn
      : turn.querySelector?.(`[data-message-author-role="${role}"]`);

    if (role === 'user' && message) {
      // Prefer only authored user text so attachment filenames cannot arm the chain.
      const authoredText = message.querySelector(
        '.user-message-bubble-color .markdown, .user-message-bubble-color, [data-message-content-part-type="text"]'
      );
      if (authoredText) return readableNodeText(authoredText);
    }

    if (role === 'assistant') {
      const candidates = assistantTextCandidates(turn);
      if (candidates.length) return candidates[0];
    }

    return readableNodeText(message || turn);
  }

  function latestChatGPTUserTurn(turns = getChatGPTTurns()) {
    for (let index = turns.length - 1; index >= 0; index -= 1) {
      if (turnRole(turns[index]) === 'user') return turns[index];
    }
    return null;
  }

  function assistantTurnAfter(userTurn, turns = getChatGPTTurns()) {
    if (!userTurn) return null;
    const start = turns.indexOf(userTurn);
    if (start < 0) return null;
    let result = null;
    for (let index = start + 1; index < turns.length; index += 1) {
      const kind = turnRole(turns[index]);
      if (kind === 'user') break;
      if (kind === 'assistant') result = turns[index];
    }
    return result;
  }

  function userTurnAfter(userTurn, turns = getChatGPTTurns()) {
    if (!userTurn) return null;
    const start = turns.indexOf(userTurn);
    if (start < 0) return null;
    for (let index = start + 1; index < turns.length; index += 1) {
      if (turnRole(turns[index]) === 'user') return turns[index];
    }
    return null;
  }

  function findTurnById(id, turns = getChatGPTTurns()) {
    if (!id) return null;
    return turns.find(turn => getTurnId(turn) === id) || null;
  }

  const AUDIT_COMMAND_MARKERS = Object.freeze([
    {
      kind: 'performance',
      line: /^AUDIT\s+PERFORMANCE(?:\s*\/\s*STABILITY(?:\s*\/\s*EFFECTIVENESS)?)?(?:\s+CONTINUE)?(?:\s+[—–-].*)?$/i
    },
    {
      kind: 'second',
      line: /^AUDIT\s+SECOND\s+WAVE(?:\s+CONTINUE)?(?:\s+[—–-].*)?$/i
    },
    {
      kind: 'core',
      line: /^AUDIT\s+CORE(?:\s+CONTINUE)?(?:\s+[—–-].*)?$/i
    }
  ]);

  // One canonical audit-command recognizer. A message is a command only when the
  // marker is the first meaningful authored line, optionally followed by the
  // canonical prompt body (em-dash) or the generated CONTINUE framing. Quoted
  // handoffs, fenced code examples, headings, bullets and prose that merely
  // mentions a marker never classify, so talking about "AUDIT CORE" cannot arm
  // automation. Attachment filenames alone are never trusted.
  function classifyAuditMessage(text) {
    const head = String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1800);
    if (!head) return '';

    const meaningful = [];
    for (const line of head.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^[>#|`]/.test(trimmed) || /^[-*]\s/.test(trimmed)) continue;
      meaningful.push(trimmed);
      if (meaningful.length >= 2) break;
    }
    if (!meaningful.length) return '';

    for (const spec of AUDIT_COMMAND_MARKERS) {
      if (spec.line.test(meaningful[0])) return spec.kind;
    }
    return '';
  }

  function classifyAuditTurn(turn) {
    if (!turn || turnRole(turn) !== 'user') return '';

    const fromText = classifyAuditMessage(getTurnText(turn));
    if (fromText) return fromText;

    // ChatGPT converts very large pasted text into an internal attachment with
    // a "Show in text field" control. Its label starts with the pasted text, so
    // the canonical command framing is verified on that label itself. A bare
    // attachment filename is never enough to classify a turn.
    for (const tile of turn.querySelectorAll('[role="group"][aria-label]')) {
      const label = String(tile.getAttribute('aria-label') || '').trim();
      const bigPaste = tile.querySelector('button[name="expand-file-tile"][aria-label="Show in text field"], button[name="expand-file-tile"]');
      if (bigPaste) {
        const fromBigPaste = classifyAuditMessage(label);
        if (fromBigPaste) return fromBigPaste;
      }
    }

    return '';
  }

  function textFingerprint(text) {
    const value = String(text || '');
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${value.length}:${(hash >>> 0).toString(36)}`;
  }

  function assistantFingerprint(turn) {
    if (!turn) return '';
    const text = turnRole(turn) === 'assistant'
      ? assistantTextCandidates(turn).join('\n\n---ACB-SURFACE---\n\n')
      : getTurnText(turn);
    return `${getTurnId(turn)}:${textFingerprint(text)}`;
  }

  function chatGPTIsGenerating() {
    const root = chatGPTComposerRoot();
    if (!root) return false;
    return Boolean(root.querySelector(
      '[data-testid="stop-button"], ' +
      'button[data-testid*="stop" i], ' +
      'button[aria-label*="Stop streaming" i], ' +
      'button[aria-label*="Stop generating" i], ' +
      'button[aria-label="Stop"]'
    ));
  }

  function assistantHasFinalActions(turn) {
    if (!turn) return false;
    return Boolean(
      turn.querySelector('button[data-testid="copy-turn-action-button"][aria-label*="Copy response" i]') ||
      turn.querySelector('[aria-label="Response actions"] button[data-testid="copy-turn-action-button"]')
    );
  }

  // Authored answer content. Platform recovery chrome never lives inside these,
  // so controls found here are answer/artifact buttons, not ChatGPT recovery UI.
  const ASSISTANT_AUTHORED_CONTENT_SELECTOR =
    '.markdown, pre, code, [data-writing-block="true"], ' +
    '[data-testid="writing-block-container"], [data-message-content-part-type="text"]';

  // ChatGPT owns its response-action chrome. A plain "Retry"/"Try again" label is
  // only trusted inside that container; everywhere else it could be authored.
  const ASSISTANT_RESPONSE_ACTIONS_SELECTOR = '[aria-label="Response actions"], [data-testid="response-actions"]';

  function isAuthoredAssistantContent(element) {
    if (!element) return false;
    try {
      return Boolean(element.closest(ASSISTANT_AUTHORED_CONTENT_SELECTOR));
    } catch (_) {
      return false;
    }
  }

  // Single ChatGPT-scoped recovery lookup shared by the predicate helpers and the
  // click target. Never falls back to arbitrary descendant button text.
  function findAssistantRecoveryControl(turn, kind) {
    if (!turn) return null;
    const scope = turn.matches?.('[data-message-author-role="assistant"]')
      ? turn
      : (turn.querySelector?.('[data-message-author-role="assistant"]') || turn);

    const buttons = Array.from(scope.querySelectorAll('button'));
    for (const button of buttons) {
      if (isAuthoredAssistantContent(button)) continue;
      const label = String(button.getAttribute('aria-label') || '').trim();
      const testid = String(button.getAttribute('data-testid') || '');

      if (kind === 'continue') {
        if (/^continue generating$/i.test(label)) return button;
        if (/continue[-_\s]?generating/i.test(testid)) return button;
        continue;
      }

      if (/^retry response$/i.test(label)) return button;
      if (/retry/i.test(testid)) return button;
      // A bare "Retry" or "Try again" label is only trusted inside ChatGPT's
      // own response-action chrome. Authored content (e.g. a markdown block
      // that contains a button with such text) must never be clicked.
      if (
        /^(retry|try again)$/i.test(label) &&
        button.closest(ASSISTANT_RESPONSE_ACTIONS_SELECTOR)
      ) {
        return button;
      }
    }
    return null;
  }

  function assistantNeedsContinuation(turn) {
    return Boolean(findAssistantRecoveryControl(turn, 'continue'));
  }

  function assistantHasRetryError(turn) {
    return Boolean(findAssistantRecoveryControl(turn, 'retry'));
  }

  function assistantContinueGeneratingButton(turn) {
    return findAssistantRecoveryControl(turn, 'continue');
  }

  function assistantRetryButton(turn) {
    return findAssistantRecoveryControl(turn, 'retry');
  }

  function activeWaveKind(stage = autoRuntime?.stage || '') {
    if (stage === 'wait-core') return 'core';
    if (stage === 'wait-second') return 'second';
    if (stage === 'wait-performance') return 'performance';
    if (stage === 'sending-continuation' || stage === 'await-continuation-user') {
      return String(autoRuntime?.continuationKind || '');
    }
    return '';
  }

  function waveLabel(kind) {
    if (kind === 'core') return 'Core';
    if (kind === 'second') return 'Second Wave';
    if (kind === 'performance') return 'Performance';
    return 'Audit';
  }

  function waveWaitStage(kind) {
    if (kind === 'core') return 'wait-core';
    if (kind === 'second') return 'wait-second';
    if (kind === 'performance') return 'wait-performance';
    return '';
  }

  function waveUserId(kind) {
    if (kind === 'core') return autoRuntime?.coreUserId || '';
    if (kind === 'second') return autoRuntime?.secondUserId || '';
    if (kind === 'performance') return autoRuntime?.performanceUserId || '';
    return '';
  }

  function setWaveUserId(kind, id) {
    if (!autoRuntime || !id) return;
    if (kind === 'core') autoRuntime.coreUserId = id;
    if (kind === 'second') autoRuntime.secondUserId = id;
    if (kind === 'performance') autoRuntime.performanceUserId = id;
  }

  function bumpWaveCounter(field, kind) {
    if (!autoRuntime || !kind) return 0;
    if (!autoRuntime[field] || typeof autoRuntime[field] !== 'object') {
      autoRuntime[field] = { core: 0, second: 0, performance: 0 };
    }
    autoRuntime[field][kind] = Math.max(0, Number(autoRuntime[field][kind]) || 0) + 1;
    return autoRuntime[field][kind];
  }

  function auditContinuationPrompt(kind, attempt, reason = 'partial') {
    const marker = kind === 'core'
      ? 'AUDIT CORE CONTINUE'
      : kind === 'second'
        ? 'AUDIT SECOND WAVE CONTINUE'
        : 'AUDIT PERFORMANCE / STABILITY / EFFECTIVENESS CONTINUE';

    const statusMarker = kind === 'core'
      ? 'STATUS: AUDIT_CORE: COMPLETE'
      : kind === 'second'
        ? 'STATUS: SECOND_WAVE: COMPLETE'
        : 'STATUS: PERFORMANCE: COMPLETE';

    const ticketPrefix = kind === 'core'
      ? 'CORE'
      : kind === 'second'
        ? 'W2'
        : 'PERF';

    const maxAttempts = reason === 'stall'
      ? AUTO_MAX_STALL_NUDGES
      : AUTO_MAX_PARTIAL_CONTINUATIONS;

    const triggerLines = reason === 'stall'
      ? [
        'The previous assistant turn became idle/stopped without a trustworthy terminal audit status.',
        'Treat this as an interrupted response, not as completion and not as a request for human supervision.',
        'Continue from the exact point already reached in this SAME wave.'
      ]
      : [
        'The immediately preceding result reported PARTIAL.',
        'Treat PARTIAL as a machine-resumable checkpoint, not as a request for human supervision.',
        'Continue from the exact point already reached in this SAME wave.'
      ];

    return [
      `${marker} — unattended ${reason === 'stall' ? 'liveness recovery' : 'continuation'} ${attempt}/${maxAttempts}.`,
      '',
      ...triggerLines,
      '',
      'Continue the SAME audit wave for the SAME project, target and revision in this conversation.',
      'Do not restart the wave from scratch.',
      'Reuse the project map, inspected files, evidence and conclusions already established in this conversation.',
      'Spend this continuation only on still-uncovered, interrupted or insufficiently verified high-value surface.',
      'Do not repeat already-covered analysis unless it is necessary to validate or merge a root cause.',
      'Preserve all still-valid findings already produced in earlier responses of this same wave.',
      '',
      'FINAL CONSOLIDATED HANDOFF:',
      `When this wave is exhausted, return ONE standalone final ${waveLabel(kind)} handoff in the original format.`,
      `Include ALL still-valid ${ticketPrefix} findings from every earlier response of this same wave plus newly verified findings.`,
      'Deduplicate by root cause.',
      `Renumber the final ${ticketPrefix} tickets sequentially so the final response can be handed to the implementation agent by itself.`,
      `Use ${statusMarker} only when the wave is actually complete.`,
      '',
      'If a hard execution/context limit genuinely prevents completion again, return PARTIAL again with all verified findings accumulated so far.',
      'Do not request human confirmation. The automation will continue this same wave again.',
      '',
      'Keep implementation read-only and preserve the original audit evidence, priority, scope and handoff rules.'
    ].join('\n');
  }

  function resetIdleStallWatch(options = {}) {
    if (!autoRuntime) return;
    const changed = Boolean(autoRuntime.idleStallKey || autoRuntime.idleStallSince);
    autoRuntime.idleStallKey = '';
    autoRuntime.idleStallSince = 0;
    if (changed && options.save !== false) saveAutoRuntime();
  }

  function queueSameWaveContinuation(kind, reason = 'partial') {
    if (!autoRuntime || !kind) return false;

    const counterField = reason === 'stall' ? 'stallNudges' : 'partialContinuations';
    const limit = reason === 'stall' ? AUTO_MAX_STALL_NUDGES : AUTO_MAX_PARTIAL_CONTINUATIONS;
    const count = bumpWaveCounter(counterField, kind);

    if (count > limit) {
      pauseAutoAudit(
        `${waveLabel(kind)} exceeded the unattended ${reason === 'stall' ? 'idle-recovery' : 'PARTIAL-continuation'} safety cap (${limit}). Chain stopped to prevent an infinite loop.`
      );
      return false;
    }

    clearPendingSendReceipt({ save: false });
    autoRuntime.continuationKind = kind;
    autoRuntime.continuationReason = reason;
    autoRuntime.continuationPreviousUserId = waveUserId(kind);
    autoRuntime.expectedKind = kind;
    autoRuntime.stage = 'sending-continuation';
    autoRuntime.waitStartedAt = Date.now();
    autoRuntime.stableResponseKey = '';
    autoRuntime.stableSince = 0;
    autoRuntime.idleStallKey = '';
    autoRuntime.idleStallSince = 0;
    if (!saveAutoRuntime()) return false;

    setStatus(
      reason === 'stall'
        ? `${waveLabel(kind)} appears idle/stopped without a terminal audit status. Sending a same-wave recovery nudge automatically (${count}/${limit}).`
        : `${waveLabel(kind)} reported PARTIAL. Continuing the same wave automatically (${count}/${limit}); no user action is required.`,
      'success'
    );

    scheduleAuditContinuation(kind);
    return true;
  }

  function auditStallFingerprint(kind, assistant) {
    return assistant
      ? `${kind}:${assistantFingerprint(assistant)}`
      : `${kind}:no-assistant:${waveUserId(kind) || 'unknown'}`;
  }

  async function watchIdleAuditStall(kind, assistant, reason = 'incomplete') {
    if (!autoRuntime || !kind) return false;

    if (chatGPTIsGenerating()) {
      resetIdleStallWatch();
      scheduleAutoAuditCheck(AUTO_LIVENESS_CHECK_MS);
      return true;
    }

    const fingerprint = auditStallFingerprint(kind, assistant);
    const now = Date.now();

    // If the response changes, ChatGPT is still making progress even if the Stop
    // control temporarily disappears. Reset the idle grace window.
    if (autoRuntime.idleStallKey !== fingerprint) {
      autoRuntime.idleStallKey = fingerprint;
      autoRuntime.idleStallSince = now;
      saveAutoRuntime();
      scheduleAutoAuditCheck(AUTO_LIVENESS_CHECK_MS);
      return true;
    }

    const elapsed = now - (Number(autoRuntime.idleStallSince) || now);
    if (elapsed < AUTO_IDLE_STALL_GRACE_MS) {
      scheduleAutoAuditCheck(Math.min(
        AUTO_LIVENESS_CHECK_MS,
        AUTO_IDLE_STALL_GRACE_MS - elapsed + 100
      ));
      return true;
    }

    const ready = chatGPTComposerReadyForAutoSend();
    if (!ready.ok) {
      if (
        ready.reason === 'ChatGPT is still generating.' ||
        ready.reason === 'Main ChatGPT composer is not available.'
      ) {
        scheduleAutoAuditCheck(AUTO_LIVENESS_CHECK_MS);
        return true;
      }

      // Never overwrite a human draft or mix our recovery with a manual attachment.
      pauseAutoAudit(
        `${waveLabel(kind)} appears stalled, but unattended recovery cannot safely use the composer: ${ready.reason}`
      );
      return true;
    }

    queueSameWaveContinuation(kind, 'stall');
    return true;
  }


  async function autoClickAssistantRecovery(turn, type, kind) {
    if (!turn || !kind) return false;
    const token = await verifyAutoLeaseForSend();
    if (!token) return false;

    const isContinue = type === 'continue';
    const button = isContinue
      ? assistantContinueGeneratingButton(turn)
      : assistantRetryButton(turn);
    if (!button || !isVisible(button) || button.disabled || button.getAttribute('aria-disabled') === 'true') {
      return false;
    }

    const field = isContinue ? 'continueGeneratingClicks' : 'retryClicks';
    const limit = isContinue ? AUTO_MAX_CONTINUE_GENERATING : AUTO_MAX_RETRIES;
    const count = bumpWaveCounter(field, kind);

    if (count > limit) {
      pauseAutoAudit(`${waveLabel(kind)} exceeded the unattended ${isContinue ? 'Continue generating' : 'Retry'} safety cap (${limit}). Chain stopped to prevent an infinite recovery loop.`);
      return false;
    }

    // Persist the recovery budget before the irreversible UI click.
    if (!saveAutoRuntime()) return false;
    if (!isLeaseTokenCurrent(token)) {
      refreshAutoRuntimeFromStorage();
      renderAutoAuditState();
      scheduleAutoAuditCheck(900);
      return false;
    }
    button.click();
    autoRuntime.waitStartedAt = Date.now();
    autoRuntime.stableResponseKey = '';
    autoRuntime.stableSince = 0;
    if (!isLeaseTokenCurrent(token)) {
      refreshAutoRuntimeFromStorage();
      renderAutoAuditState();
      scheduleAutoAuditCheck(900);
      return false;
    }
    if (!saveAutoRuntime({ pauseOnFailure: true })) return false;

    setStatus(
      `${waveLabel(kind)}: ${isContinue ? 'Continue generating' : 'Retry'} clicked automatically (${count}/${limit}).`,
      'success'
    );
    scheduleAutoAuditCheck(isContinue ? 1200 : 1800);
    return true;
  }

  function composerPlainText(input) {
    if (!input) return '';
    if ('value' in input) return String(input.value || '');
    return String(input.textContent || '').replace(/\u200b/g, '');
  }

  function chatGPTComposerStateSnapshot() {
    const root = chatGPTComposerRoot();
    if (!root) return null;
    const input = getChatGPTInput();
    return {
      rootId: String(root.id || root.getAttribute?.('data-testid') || ''),
      text: composerPlainText(input),
      tiles: chatGPTComposerAttachmentTiles(root).map(tile =>
        String(tile.getAttribute('aria-label') || '').trim().toLowerCase()
      ),
      generating: chatGPTIsGenerating()
    };
  }

  function sameComposerState(left, right) {
    if (!left || !right) return false;
    if (left.rootId !== right.rootId || Boolean(left.generating) !== Boolean(right.generating)) return false;
    if (cleanTurnText(left.text) !== cleanTurnText(right.text)) return false;
    return (
      left.tiles.length === right.tiles.length &&
      left.tiles.every(tile => right.tiles.includes(tile))
    );
  }

  // Auto3-only composer ownership guard. The empty-composer snapshot is taken
  // right before execution; every async boundary (browser yield, attachment
  // registration, send-ready wait) re-verifies that the composer still holds
  // exactly the Auto3-owned content and that the lease token is still current.
  function createAutoSendOwnershipGuard(token, initialSnapshot) {
    const initial = initialSnapshot || chatGPTComposerStateSnapshot();
    let afterWrite = null;

    return {
      initial,
      async verify() {
        if (!isLeaseTokenCurrent(token)) return false;
        const current = chatGPTComposerStateSnapshot();
        if (!current) return false;
        if (!afterWrite) {
          // Before the first Auto3 mutation the composer must still be the
          // verified empty snapshot; a manual draft or attachment that appeared
          // during the async gap aborts the automatic transaction.
          return sameComposerState(initial, current) && !cleanTurnText(current.text) && !current.tiles.length;
        }
        return sameComposerState(afterWrite, current);
      },
      captureWrite() {
        afterWrite = chatGPTComposerStateSnapshot();
      }
    };
  }

  function chatGPTComposerReadyForAutoSend() {
    const site = detectSite();
    if (site.key !== 'chatgpt') return { ok: false, reason: 'ChatGPT only.' };
    const input = cachedSiteElement(site, 'input');
    const root = chatGPTComposerRoot();
    if (!input || !root || root.hasAttribute('inert')) return { ok: false, reason: 'Main ChatGPT composer is not available.' };
    if (composerPlainText(input).trim()) {
      return { ok: false, reason: 'Composer contains a manual draft; automatic sending will not overwrite or append to it.' };
    }
    if (chatGPTComposerAttachmentTiles(root).length) {
      return { ok: false, reason: 'Composer contains a pending manual attachment; automatic sending stopped to avoid mixing it with the next audit wave.' };
    }
    if (chatGPTIsGenerating()) return { ok: false, reason: 'ChatGPT is still generating.' };
    return { ok: true, input, site };
  }

  function normalizeAuditResponseText(text) {
    return cleanTurnText(text)
      .normalize('NFKC')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
  }

  function auditGateSpec(stage) {
    if (stage === 'wait-core') {
      return {
        wave: /AUDIT\s+CORE/i,
        explicit: /\bAUDIT[_\s-]*CORE\s*:\s*(COMPLETE|PARTIAL|BLOCKED)\b/i,
        status: /^\s*STATUS\s*:\s*(?:AUDIT[_\s-]*CORE|CORE)\s*:\s*(COMPLETE|PARTIAL|BLOCKED)\s*$/im,
        done: /^\s*CORE_DONE_WHEN\s*:\s*(.+)$/im
      };
    }

    if (stage === 'wait-second') {
      return {
        wave: /AUDIT\s+SECOND\s+WAVE/i,
        explicit: /\bSECOND[_\s-]*WAVE\s*:\s*(COMPLETE|PARTIAL|BLOCKED)\b/i,
        status: /^\s*STATUS\s*:\s*(?:AUDIT[_\s-]*SECOND[_\s-]*WAVE|SECOND[_\s-]*WAVE)\s*:\s*(COMPLETE|PARTIAL|BLOCKED)\s*$/im,
        done: /^\s*SECOND(?:[_\s-]*WAVE)?_DONE_WHEN\s*:\s*(.+)$/im
      };
    }

    if (stage === 'wait-performance') {
      return {
        wave: /AUDIT\s+PERFORMANCE(?:\s*\/\s*STABILITY\s*\/\s*EFFECTIVENESS)?/i,
        explicit: /\bPERFORMANCE\s*:\s*(COMPLETE|PARTIAL|BLOCKED)\b/i,
        status: /^\s*STATUS\s*:\s*(?:AUDIT[_\s-]*PERFORMANCE(?:\s*\/\s*STABILITY\s*\/\s*EFFECTIVENESS)?|PERFORMANCE)\s*:\s*(COMPLETE|PARTIAL|BLOCKED)\s*$/im,
        done: /^\s*PERFORMANCE_DONE_WHEN\s*:\s*(.+)$/im
      };
    }

    return null;
  }

  function gateState(value) {
    const normalized = String(value || '').toUpperCase();
    if (normalized === 'BLOCKED') return 'blocked';
    if (normalized === 'PARTIAL') return 'partial';
    if (normalized === 'COMPLETE') return 'complete';
    return 'unknown';
  }

  function handoffHeader(body) {
    const lines = normalizeAuditResponseText(body).split('\n');
    const header = [];
    for (const line of lines) {
      if (/^\s*\[P[012]\]\s*\[/i.test(line)) break;
      header.push(line);
      if (header.length >= 48) break;
    }
    return header.join('\n').trim();
  }

  function concreteHandoffState(stage, body, spec) {
    if (!spec || !body) return 'unknown';
    const scoped = normalizeAuditResponseText(body).slice(0, 120000);
    const header = handoffHeader(scoped);
    if (!header) return 'unknown';

    const waveLine = header.match(/^\s*WAVE\s*:\s*(.+)$/im)?.[1] || '';
    const ticketsLine = header.match(/^\s*TICKETS\s*:\s*(\d+)\s*$/im);
    const handoffLine = header.match(/^\s*HANDOFF\s*:\s*IMPLEMENTATION_AGENT\s*$/im);

    if (waveLine && spec.wave.test(waveLine) && ticketsLine && handoffLine) {
      const structuredStatus = header.match(spec.status);
      if (structuredStatus) return gateState(structuredStatus[1]);
    }

    // Compatibility with older compact handoffs: direct wave status is accepted
    // only from the header region, never from quoted ticket evidence below it.
    const explicit = header.match(spec.explicit);
    if (explicit && (waveLine ? spec.wave.test(waveLine) : header.split('\n').length <= 16)) {
      return gateState(explicit[1]);
    }

    // Structural COMPLETE fallback when only STATUS was omitted. This still needs
    // concrete numeric tickets + handoff + DONE_WHEN, so echoed templates fail.
    const doneLine = scoped.match(spec.done);
    if (waveLine && spec.wave.test(waveLine) && ticketsLine && handoffLine && doneLine) {
      const doneValue = String(doneLine[1] || '').trim();
      if (doneValue && !/^<.*>$/.test(doneValue)) return 'complete';
    }

    return 'unknown';
  }

  function responseGate(stage, text) {
    const body = normalizeAuditResponseText(text);
    if (!body) return 'unknown';
    const scoped = body.slice(0, 120000);
    const spec = auditGateSpec(stage);
    if (!spec) return 'unknown';

    const concrete = concreteHandoffState(stage, scoped, spec);
    if (concrete !== 'unknown') return concrete;

    // A truly concise hard precondition failure is allowed without a full handoff.
    // Nested evidence snippets cannot win because this is evaluated on the whole
    // assistant answer first and is intentionally restricted to a leading BLOCKED.
    const firstNonEmpty = scoped.split('\n').find(line => line.trim()) || '';
    if (/^\s*BLOCKED\s*:/i.test(firstNonEmpty) && scoped.length <= 12000) return 'blocked';

    return 'unknown';
  }

  function responseGateFromAssistantTurn(stage, turn) {
    if (!turn) return { state: 'unknown', text: '', sourceCount: 0 };

    const candidates = assistantTextCandidates(turn);
    const wholeMessageCandidates = [];
    const message = turn.matches?.('[data-message-author-role="assistant"]')
      ? turn
      : (turn.querySelector?.('[data-message-author-role="assistant"]') || turn);

    const addWhole = value => {
      const cleaned = cleanTurnText(value);
      if (cleaned && !wholeMessageCandidates.includes(cleaned)) wholeMessageCandidates.push(cleaned);
    };
    addWhole(readableNodeText(message));
    addWhole(message.textContent);
    addWhole(readableNodeText(turn));
    addWhole(turn.textContent);

    // Whole authored answer is authoritative. It contains the real header plus all
    // tickets; nested code/pre snippets are evidence, not independent handoffs.
    for (const candidate of wholeMessageCandidates) {
      const state = responseGate(stage, candidate);
      if (state !== 'unknown') {
        return { state, text: candidate, sourceCount: candidates.length };
      }
    }

    // Fallback only for a complete handoff rendered entirely as one isolated block.
    for (const candidate of candidates) {
      const spec = auditGateSpec(stage);
      const state = concreteHandoffState(stage, candidate, spec);
      if (state !== 'unknown') {
        return { state, text: candidate, sourceCount: candidates.length };
      }
    }

    const combined = candidates.join('\n\n');
    const combinedState = concreteHandoffState(stage, combined, auditGateSpec(stage));
    return {
      state: combinedState,
      text: combined || getTurnText(turn),
      sourceCount: candidates.length
    };
  }

  function autoStageSummary() {
    if (!autoRuntime) return { text: 'Auto chain initializing for this chat...', kind: 'info' };
    if (!autoRuntime.enabled) return { text: 'Auto 3 waves is disabled for this chat. Saved progress is preserved.', kind: 'info' };

    const lease = readAutoLease(autoBoundConversationKey || currentConversationKey());
    if (
      lease &&
      lease.ownerId &&
      lease.ownerId !== autoInstanceId &&
      lease.expiresAt > Date.now()
    ) {
      return {
        text: 'Standby for this conversation: another tab currently owns Auto3. This tab will take over automatically if that tab closes or its lease expires.',
        kind: 'warning'
      };
    }

    const continuationKind = String(autoRuntime.continuationKind || '');
    const continuationReason = String(autoRuntime.continuationReason || 'partial');
    const continuationCount = continuationKind
      ? Number(
        continuationReason === 'stall'
          ? autoRuntime.stallNudges?.[continuationKind]
          : autoRuntime.partialContinuations?.[continuationKind]
      ) || 0
      : 0;
    const continuationLimit = continuationReason === 'stall'
      ? AUTO_MAX_STALL_NUDGES
      : AUTO_MAX_PARTIAL_CONTINUATIONS;

    const labels = {
      idle: 'Armed. Waiting for a NEW latest AUDIT CORE. Active chain state is persisted across tab/browser close.',
      'wait-core': '1/3 Core is running. Waiting for COMPLETE.',
      'sending-second': 'Core COMPLETE. Preparing Audit Second Wave.',
      'await-second-user': 'Second Wave was sent. Waiting for ChatGPT to register the new user turn.',
      'wait-second': '2/3 Second Wave is running. Waiting for COMPLETE.',
      'sending-performance': 'Second Wave COMPLETE. Preparing Audit Performance.',
      'await-performance-user': 'Performance was sent. Waiting for ChatGPT to register the new user turn.',
      'wait-performance': '3/3 Performance is running. Waiting for COMPLETE.',
      'sending-continuation': continuationReason === 'stall'
        ? `${waveLabel(continuationKind)} went idle without a terminal status. Sending a recovery nudge (${continuationCount}/${continuationLimit})...`
        : `${waveLabel(continuationKind)} returned PARTIAL. Continuing the SAME wave automatically (${continuationCount}/${continuationLimit})...`,
      'await-continuation-user': `${waveLabel(continuationKind)} ${continuationReason === 'stall' ? 'recovery nudge' : 'continuation'} was sent. Waiting for ChatGPT to register it.`,
      complete: '3/3 COMPLETE. All three audit waves finished; any PARTIAL/stall recovery was handled automatically.',
      paused: `Paused: ${autoRuntime.pausedReason || 'manual attention required.'}`
    };

    let text = labels[autoRuntime.stage] || `Auto chain state: ${autoRuntime.stage}`;
    if (
      autoRuntime.idleStallSince &&
      ['wait-core', 'wait-second', 'wait-performance'].includes(autoRuntime.stage) &&
      !chatGPTIsGenerating()
    ) {
      const remainingMs = Math.max(
        0,
        AUTO_IDLE_STALL_GRACE_MS - (Date.now() - autoRuntime.idleStallSince)
      );
      const seconds = Math.ceil(remainingMs / 1000);
      text += seconds > 0
        ? ` Idle watchdog: recovery nudge in ~${seconds}s if nothing changes.`
        : ' Idle watchdog: recovery nudge is due.';
    }
    const kind = autoRuntime.stage === 'complete'
      ? 'success'
      : autoRuntime.stage === 'paused'
        ? 'warning'
        : 'info';
    return { text, kind };
  }

  function renderAutoAuditState() {
    if (!panel || !state) return;

    const enabled = panel.querySelector('#acb-auto-enabled');
    const strict = panel.querySelector('#acb-auto-gate');
    const delay = panel.querySelector('#acb-auto-delay');
    const timeout = panel.querySelector('#acb-auto-timeout');
    const delivery = panel.querySelector('#acb-prompt-delivery');
    const status = panel.querySelector('#acb-auto-state');
    const progress = panel.querySelector('#acb-auto-progress');
    const adopt = panel.querySelector('#acb-auto-adopt');
    const reset = panel.querySelector('#acb-auto-reset');
    const stop = panel.querySelector('#acb-auto-stop');

    if (enabled) enabled.checked = Boolean(autoRuntime?.enabled);
    if (strict) strict.value = state.autoAuditStrictGate ? 'strict' : 'relaxed';
    if (delay) delay.value = String(state.autoAuditDelayMs);
    if (timeout) timeout.value = String(state.autoAuditTimeoutMin);
    if (delivery) delivery.value = state.chatgptPromptDelivery;

    const summary = autoStageSummary();
    if (status) {
      status.textContent = summary.text;
      status.dataset.kind = summary.kind;
      status.title = summary.text;
    }

    if (progress) {
      const rawStage = String(autoRuntime?.stage || 'idle');
      const stage = rawStage === 'paused'
        ? String(autoRuntime?.pausedFromStage || 'paused')
        : rawStage;
      const continuationKind = String(autoRuntime?.continuationKind || '');
      const continuationStep = continuationKind === 'core'
        ? 1
        : continuationKind === 'second'
          ? 2
          : continuationKind === 'performance'
            ? 3
            : 0;
      const activeStep = stage === 'wait-core' ? 1
        : ['sending-second', 'await-second-user', 'wait-second'].includes(stage) ? 2
          : ['sending-performance', 'await-performance-user', 'wait-performance'].includes(stage) ? 3
            : ['sending-continuation', 'await-continuation-user'].includes(stage) ? continuationStep
              : rawStage === 'complete' ? 4
                : 0;

      for (const step of progress.querySelectorAll('.acb-auto-step')) {
        const number = Number(step.dataset.step);
        step.dataset.state = activeStep === 4 || (activeStep > 0 && number < activeStep)
          ? 'done'
          : number === activeStep
            ? 'active'
            : 'idle';
      }
    }

    const chatgpt = detectSite().key === 'chatgpt';
    if (delivery) delivery.disabled = !chatgpt;
    if (adopt) adopt.disabled = !autoRuntime?.enabled || !chatgpt;
    if (reset) reset.disabled = !chatgpt;
    if (stop) stop.disabled = !autoRuntime?.enabled || !chatgpt || autoRuntime?.stage === 'idle' || autoRuntime?.stage === 'complete';
  }

  function pauseAutoAudit(reason, kind = 'warning') {
    if (!autoRuntime) autoRuntime = emptyAutoRuntime();
    clearAutoTimers();
    if (autoRuntime.stage !== 'paused') autoRuntime.pausedFromStage = autoRuntime.stage;
    autoRuntime.stage = 'paused';
    autoRuntime.pausedReason = reason;
    autoRuntime.waitStartedAt = 0;
    autoRuntime.stableResponseKey = '';
    autoRuntime.stableSince = 0;
    const persisted = saveAutoRuntime({ pauseOnFailure: false });
    setStatus(
      persisted ? `Auto audit paused: ${reason}` : `Auto audit paused in memory but could not persist the pause: ${reason}`,
      persisted ? kind : 'error'
    );
  }

  function resetAutoAuditRuntime(options = {}) {
    clearAutoTimers();
    bindAutoRuntimeToCurrentConversation({ claim: false });

    const enabled = Boolean(autoRuntime?.enabled);
    const turns = getChatGPTTurns();
    const latestUser = latestChatGPTUserTurn(turns);
    const latestAssistant = latestUser ? assistantTurnAfter(latestUser, turns) : null;

    autoRuntime = emptyAutoRuntime({ enabled });
    autoRuntime.conversationKey = autoBoundConversationKey || currentConversationKey();
    autoRuntime.seenUserId = getTurnId(latestUser);
    autoRuntime.baselineAssistantKey = assistantFingerprint(latestAssistant);
    if (!saveAutoRuntime()) return false;

    if (enabled) claimAutoLease();

    if (!options.silent) {
      setStatus('Reset only this conversation\'s Auto3 chain. Other ChatGPT conversations were not changed.', 'success');
    }
  }

  function stageTimedOut() {
    if (!autoRuntime?.waitStartedAt) return false;
    const maxMs = state.autoAuditTimeoutMin * 60 * 1000;
    return Date.now() - autoRuntime.waitStartedAt > maxMs;
  }

  function ensureAutoConversation(turns) {
    bindAutoRuntimeToCurrentConversation({ claim: false });
    if (!autoRuntime || !autoRuntime.enabled) {
      renderAutoAuditState();
      return false;
    }

    if (claimAutoLease()) {
      // Ownership was just (re)acquired. Adopt the latest persisted runtime so
      // a standby tab that was promoted never starts from a stale in-memory
      // snapshot of the previous owner's chain.
      refreshAutoRuntimeFromStorage();
      return true;
    }

    refreshAutoRuntimeFromStorage();
    renderAutoAuditState();

    const lease = readAutoLease(autoBoundConversationKey);
    const wait = lease?.expiresAt > Date.now()
      ? Math.min(5000, Math.max(900, lease.expiresAt - Date.now() + 120))
      : 900;
    scheduleAutoAuditCheck(wait);
    return false;
  }

  function completedAssistantCandidate(turn, stage = autoRuntime?.stage || '') {
    if (!turn) return { complete: false, reason: 'no-assistant' };
    if (chatGPTIsGenerating()) return { complete: false, reason: 'generating' };
    if (assistantNeedsContinuation(turn)) return { complete: false, reason: 'continue-generating' };
    if (assistantHasRetryError(turn)) return { complete: false, reason: 'retry-error' };

    const gate = responseGateFromAssistantTurn(stage, turn);
    const text = gate.text || getTurnText(turn);
    if (!text) return { complete: false, reason: 'empty' };

    // Response-action buttons are useful but not authoritative after reload:
    // ChatGPT can lazy-render them. A structurally terminal audit handoff is
    // sufficient when generation has stopped.
    const hasUiFinality = assistantHasFinalActions(turn);
    const hasAuditFinality = gate.state !== 'unknown';
    if (!hasUiFinality && !hasAuditFinality) {
      return { complete: false, reason: 'no-finality-evidence' };
    }

    const key = assistantFingerprint(turn);
    const now = Date.now();

    if (autoRuntime.stableResponseKey !== key) {
      autoRuntime.stableResponseKey = key;
      autoRuntime.stableSince = now;
      saveAutoRuntime();
      scheduleAutoAuditCheck(AUTO_RESPONSE_STABLE_MS + 80);
      return { complete: false, reason: 'stabilizing' };
    }

    if (now - autoRuntime.stableSince < AUTO_RESPONSE_STABLE_MS) {
      scheduleAutoAuditCheck(AUTO_RESPONSE_STABLE_MS - (now - autoRuntime.stableSince) + 80);
      return { complete: false, reason: 'stabilizing' };
    }

    return {
      complete: true,
      text,
      key,
      gate: gate.state,
      sourceCount: gate.sourceCount
    };
  }

  function armFromCoreTurn(userTurn, options = {}) {
    if (!userTurn || classifyAuditTurn(userTurn) !== 'core') return false;

    const turns = getChatGPTTurns();
    const assistant = assistantTurnAfter(userTurn, turns);
    const finalAlready = assistant && !chatGPTIsGenerating() && assistantHasFinalActions(assistant);

    if (finalAlready && !options.allowCompleted) return false;

    clearAutoTimers();
    autoRuntime.stage = 'wait-core';
    autoRuntime.conversationKey = currentConversationKey();
    autoRuntime.anchorUserId = getTurnId(userTurn);
    autoRuntime.coreUserId = autoRuntime.anchorUserId;
    autoRuntime.secondUserId = '';
    autoRuntime.performanceUserId = '';
    autoRuntime.expectedKind = '';
    autoRuntime.startedAt = Date.now();
    autoRuntime.waitStartedAt = Date.now();
    autoRuntime.stableResponseKey = '';
    autoRuntime.stableSince = 0;
    autoRuntime.pausedReason = '';
    if (!saveAutoRuntime()) return false;

    setStatus('Auto audit armed from the latest AUDIT CORE turn. Waiting for Core to finish before sending Second Wave.', 'success');
    scheduleAutoAuditCheck(250);
    return true;
  }

  function previousAuditUserTurn(turn, wantedKind, turns = getChatGPTTurns()) {
    const start = turns.indexOf(turn);
    if (start < 0) return null;
    for (let index = start - 1; index >= 0; index -= 1) {
      if (turnRole(turns[index]) !== 'user') continue;
      const kind = classifyAuditTurn(turns[index]);
      // The nearest earlier user turn decides: a wanted-kind sibling is the
      // answer, anything else (plain message or different audit command)
      // interrupts the lineage. Never keep walking past an interruption.
      return kind === wantedKind ? turns[index] : null;
    }
    return null;
  }

  function recoverExpectedStageAnchor(stage, turns = getChatGPTTurns()) {
    const expected = stage === 'wait-core'
      ? 'core'
      : stage === 'wait-second'
        ? 'second'
        : stage === 'wait-performance'
          ? 'performance'
          : '';
    if (!expected) return null;

    const latestUser = latestChatGPTUserTurn(turns);
    if (!latestUser || classifyAuditTurn(latestUser) !== expected) return null;

    const id = getTurnId(latestUser);
    if (!id) return null;

    if (expected === 'core') autoRuntime.coreUserId = id;
    if (expected === 'second') autoRuntime.secondUserId = id;
    if (expected === 'performance') autoRuntime.performanceUserId = id;
    autoRuntime.anchorUserId = autoRuntime.anchorUserId || id;
    autoRuntime.seenUserId = id;
    autoRuntime.conversationKey = currentConversationKey();
    if (!saveAutoRuntime()) return null;
    return latestUser;
  }

  function adoptCurrentAuditTurn() {
    const turns = getChatGPTTurns();
    const latestUser = latestChatGPTUserTurn(turns);
    const kind = classifyAuditTurn(latestUser);

    if (!latestUser || !kind) {
      setStatus('Adopt failed: the latest user turn is not a recognizable AUDIT CORE / SECOND WAVE / PERFORMANCE command.', 'warning');
      return false;
    }

    const resumed = resumeRuntimeFromAuditTurn(latestUser, { turns });
    if (!resumed) {
      setStatus(
        kind === 'core'
          ? 'Adopt failed: the Core turn does not have a stable turn identity yet.'
          : kind === 'second'
            ? 'Adopt failed: no valid earlier AUDIT CORE lineage exists before this Second Wave.'
            : 'Adopt failed: the Performance turn does not have a valid earlier Core -> Second Wave lineage.',
        'warning'
      );
    }
    return resumed;
  }

  function createAutoSendReceipt(kind) {
    const salt = globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
    return `${kind}-${Date.now().toString(36)}-${salt}`;
  }

  function clearPendingSendReceipt(options = {}) {
    if (!autoRuntime) return;
    autoRuntime.pendingSendReceipt = '';
    autoRuntime.pendingSendKind = '';
    autoRuntime.pendingSendPreviousUserId = '';
    autoRuntime.pendingSendStartedAt = 0;
    autoRuntime.pendingSendRetries = 0;
    autoRuntime.pendingSendClickArmed = false;
    if (options.save !== false) saveAutoRuntime();
  }

  function ensurePendingSendReceipt(kind, previousUserId = '') {
    if (!autoRuntime) return '';

    if (autoRuntime.pendingSendReceipt && autoRuntime.pendingSendKind === kind) {
      if (previousUserId && !autoRuntime.pendingSendPreviousUserId) {
        autoRuntime.pendingSendPreviousUserId = previousUserId;
      }
      return autoRuntime.pendingSendReceipt;
    }

    autoRuntime.pendingSendReceipt = createAutoSendReceipt(kind);
    autoRuntime.pendingSendKind = kind;
    autoRuntime.pendingSendPreviousUserId = previousUserId || '';
    autoRuntime.pendingSendStartedAt = Date.now();
    autoRuntime.pendingSendRetries = 0;
    autoRuntime.pendingSendClickArmed = false;
    if (!saveAutoRuntime()) return '';
    return autoRuntime.pendingSendReceipt;
  }

  function userTurnContainsReceipt(turn, receipt) {
    if (!turn || !receipt || turnRole(turn) !== 'user') return false;
    const needle = `${AUTO_SEND_RECEIPT_PREFIX}: ${receipt}`;
    return getTurnText(turn).includes(needle) || readableNodeText(turn).includes(needle);
  }

  function findPendingSentAuditTurn(expectedKind, turns = getChatGPTTurns()) {
    const receipt = String(autoRuntime?.pendingSendReceipt || '');
    const previousId = String(
      autoRuntime?.pendingSendPreviousUserId ||
      (expectedKind === 'second'
        ? autoRuntime?.coreUserId
        : expectedKind === 'performance'
          ? autoRuntime?.secondUserId
          : autoRuntime?.continuationPreviousUserId) ||
      ''
    );

    if (receipt) {
      for (let index = turns.length - 1; index >= 0; index -= 1) {
        if (userTurnContainsReceipt(turns[index], receipt)) return turns[index];
      }
    }

    const previous = previousId ? findTurnById(previousId, turns) : null;
    const previousIndex = previous ? turns.indexOf(previous) : -1;

    if (previousIndex >= 0) {
      for (let index = turns.length - 1; index > previousIndex; index -= 1) {
        const candidate = turns[index];
        if (turnRole(candidate) !== 'user') continue;
        if (classifyAuditTurn(candidate) === expectedKind) return candidate;
      }
    }

    // Virtualization fallback when the previous anchor itself is not mounted.
    for (let index = turns.length - 1; index >= 0; index -= 1) {
      const candidate = turns[index];
      if (turnRole(candidate) !== 'user') continue;
      if (classifyAuditTurn(candidate) !== expectedKind) continue;
      const id = getTurnId(candidate);
      if (!previousId || !id || id !== previousId) return candidate;
    }

    return null;
  }

  function adoptRegisteredAutoSendTurn(expectedKind, turn) {
    if (!autoRuntime || !turn) return false;
    const id = getTurnId(turn);

    if (!id) {
      // Visible message with late hydration is proof enough not to resend.
      setStatus(
        `${waveLabel(expectedKind)} Send is visibly present, but ChatGPT has not hydrated a stable turn id yet. Waiting; no duplicate will be sent.`,
        'info'
      );
      scheduleAutoAuditCheck(AUTO_LIVENESS_CHECK_MS);
      return true;
    }

    setWaveUserId(expectedKind, id);
    autoRuntime.seenUserId = id;
    autoRuntime.stage = waveWaitStage(expectedKind);
    autoRuntime.expectedKind = '';
    autoRuntime.continuationKind = '';
    autoRuntime.continuationReason = '';
    autoRuntime.continuationPreviousUserId = '';
    autoRuntime.waitStartedAt = Date.now();
    autoRuntime.stableResponseKey = '';
    autoRuntime.stableSince = 0;
    autoRuntime.idleStallKey = '';
    autoRuntime.idleStallSince = 0;
    clearPendingSendReceipt({ save: false });
    if (!saveAutoRuntime()) return false;

    setStatus(`${waveLabel(expectedKind)} user turn registered. Waiting for its assistant result.`, 'success');
    scheduleAutoAuditCheck(500);
    return true;
  }

  function recoverPendingSendRegistration(expectedKind, turns = getChatGPTTurns()) {
    const candidate = findPendingSentAuditTurn(expectedKind, turns);
    return candidate ? adoptRegisteredAutoSendTurn(expectedKind, candidate) : false;
  }

  function composerContainsPendingReceipt(receipt) {
    if (!receipt) return false;
    const site = detectSite();
    if (site.key !== 'chatgpt') return false;
    const input = cachedSiteElement(site, 'input');
    if (!input) return false;
    const contains = composerPlainText(input).includes(`${AUTO_SEND_RECEIPT_PREFIX}: ${receipt}`);
    if (!contains) return false;
    const send = cachedSiteElement(site, 'send');
    return Boolean(send && !send.disabled && send.getAttribute('aria-disabled') !== 'true');
  }

  function scheduleRegistrationRecovery(expectedKind, resendStage) {
    if (!autoRuntime) return;

    const elapsed = Date.now() - (
      Number(autoRuntime.pendingSendStartedAt) ||
      Number(autoRuntime.waitStartedAt) ||
      Date.now()
    );

    // A verified Send click is irreversible and DOM absence is not evidence that it
    // failed. Retry only when the exact receipt is still sitting in the canonical
    // composer, which is positive local evidence that submission never left.
    if (
      elapsed >= AUTO_SEND_REGISTER_RETRY_MS &&
      !chatGPTIsGenerating() &&
      composerContainsPendingReceipt(autoRuntime.pendingSendReceipt)
    ) {
      const retries = Math.max(0, Number(autoRuntime.pendingSendRetries) || 0);
      if (retries < AUTO_MAX_SEND_REGISTRATION_RETRIES) {
        autoRuntime.pendingSendRetries = retries + 1;
        autoRuntime.pendingSendStartedAt = Date.now();
        autoRuntime.stage = resendStage;
        autoRuntime.waitStartedAt = Date.now();
        if (!saveAutoRuntime()) return;
        setStatus(
          `${waveLabel(expectedKind)} receipt is still present in the composer, so the previous click did not leave the editor. Retrying Send (${autoRuntime.pendingSendRetries}/${AUTO_MAX_SEND_REGISTRATION_RETRIES}).`,
          'warning'
        );
        scheduleAutoAuditCheck(0);
        return;
      }
    }

    setStatus(
      `${waveLabel(expectedKind)} Send was clicked and is awaiting ChatGPT DOM registration. Auto3 will not re-send without positive composer evidence; it keeps watching for the receipt-bearing turn.`,
      'info'
    );
    scheduleAutoAuditCheck(AUTO_LIVENESS_CHECK_MS);
  }

  async function sendAutoAuditWave(kind) {
    const token = await verifyAutoLeaseForSend();
    if (!token) {
      refreshAutoRuntimeFromStorage();
      renderAutoAuditState();
      scheduleAutoAuditCheck(900);
      return false;
    }

    const mapping = {
      second: { name: 'Audit Second Wave', text: AUDIT_SECOND_WAVE, next: 'await-second-user' },
      performance: { name: 'Audit Performance', text: AUDIT_PERFORMANCE, next: 'await-performance-user' }
    };
    const wave = mapping[kind];
    if (!wave) return false;

    const ready = chatGPTComposerReadyForAutoSend();
    if (!ready.ok) {
      if (
        ready.reason === 'ChatGPT is still generating.' ||
        ready.reason === 'Main ChatGPT composer is not available.'
      ) {
        scheduleAutoAuditCheck(1000);
        return false;
      }
      pauseAutoAudit(ready.reason);
      return false;
    }

    const ownership = createAutoSendOwnershipGuard(token, chatGPTComposerStateSnapshot());

    const previousUserId = kind === 'second'
      ? autoRuntime.coreUserId
      : autoRuntime.secondUserId;
    const receipt = ensurePendingSendReceipt(kind, previousUserId);
    if (!receipt || autoRuntime.stage === 'paused') return false;
    const preset = {
      name: wave.name,
      text: wave.text,
      machineReceipt: receipt
    };
    const result = await executePreset(preset, 'run', {
      quietBusy: true,
      autoOwnership: ownership,
      beforeSend: async () => {
        autoRuntime.stage = wave.next;
        autoRuntime.expectedKind = kind;
        autoRuntime.pendingSendClickArmed = true;
        autoRuntime.pendingSendStartedAt = Date.now();
        autoRuntime.waitStartedAt = Date.now();
        autoRuntime.stableResponseKey = '';
        autoRuntime.stableSince = 0;
        return saveAutoRuntime();
      }
    });

    if (result?.reason === 'ownership-lost') {
      refreshAutoRuntimeFromStorage();
      renderAutoAuditState();
      scheduleAutoAuditCheck(900);
      return false;
    }

    if (result?.reason === 'busy') {
      scheduleAutoAuditCheck(1200);
      return false;
    }

    if (!result?.sent) {
      pauseAutoAudit(`Could not verify automatic sending of ${wave.name}. Nothing else will be sent until Reset/Adopt.`);
      return false;
    }

    // The click already happened, but the token is re-verified before the
    // follow-up state commit: a stale owner must never persist its snapshot.
    if (!isLeaseTokenCurrent(token)) {
      refreshAutoRuntimeFromStorage();
      renderAutoAuditState();
      scheduleAutoAuditCheck(900);
      return false;
    }

    autoRuntime.pendingSendStartedAt = Date.now();
    autoRuntime.pendingSendClickArmed = true;
    if (!saveAutoRuntime({ pauseOnFailure: true })) return false;
    scheduleAutoAuditCheck(500);
    return true;
  }

  async function sendAutoAuditContinuation(kind) {
    if (!kind) return false;
    const token = await verifyAutoLeaseForSend();
    if (!token) {
      refreshAutoRuntimeFromStorage();
      renderAutoAuditState();
      scheduleAutoAuditCheck(900);
      return false;
    }

    const reason = String(autoRuntime.continuationReason || 'partial');
    const count = Math.max(
      1,
      Number(
        reason === 'stall'
          ? autoRuntime.stallNudges?.[kind]
          : autoRuntime.partialContinuations?.[kind]
      ) || 1
    );
    const ready = chatGPTComposerReadyForAutoSend();
    if (!ready.ok) {
      if (
        ready.reason === 'ChatGPT is still generating.' ||
        ready.reason === 'Main ChatGPT composer is not available.'
      ) {
        scheduleAutoAuditCheck(1000);
        return false;
      }
      pauseAutoAudit(ready.reason);
      return false;
    }

    const ownership = createAutoSendOwnershipGuard(token, chatGPTComposerStateSnapshot());

    const receipt = ensurePendingSendReceipt(
      kind,
      autoRuntime.continuationPreviousUserId || waveUserId(kind)
    );
    if (!receipt || autoRuntime.stage === 'paused') return false;
    const preset = {
      name: `${waveLabel(kind)} Continue ${count}`,
      text: auditContinuationPrompt(kind, count, reason),
      forceTextDelivery: true,
      machineReceipt: receipt
    };
    const result = await executePreset(preset, 'run', {
      quietBusy: true,
      autoOwnership: ownership,
      beforeSend: async () => {
        autoRuntime.stage = 'await-continuation-user';
        autoRuntime.expectedKind = kind;
        autoRuntime.pendingSendClickArmed = true;
        autoRuntime.pendingSendStartedAt = Date.now();
        autoRuntime.waitStartedAt = Date.now();
        autoRuntime.stableResponseKey = '';
        autoRuntime.stableSince = 0;
        return saveAutoRuntime();
      }
    });

    if (result?.reason === 'ownership-lost') {
      refreshAutoRuntimeFromStorage();
      renderAutoAuditState();
      scheduleAutoAuditCheck(900);
      return false;
    }

    if (result?.reason === 'busy') {
      scheduleAutoAuditCheck(1200);
      return false;
    }

    if (!result?.sent) {
      pauseAutoAudit(`Could not verify automatic sending of the ${waveLabel(kind)} continuation. Chain stopped to prevent a duplicate continuation send.`);
      return false;
    }

    if (!isLeaseTokenCurrent(token)) {
      refreshAutoRuntimeFromStorage();
      renderAutoAuditState();
      scheduleAutoAuditCheck(900);
      return false;
    }

    autoRuntime.pendingSendStartedAt = Date.now();
    autoRuntime.pendingSendClickArmed = true;
    if (!saveAutoRuntime({ pauseOnFailure: true })) return false;
    scheduleAutoAuditCheck(500);
    return true;
  }

  function scheduleAuditContinuation(kind) {
    if (autoAuditNextTimer) return;
    const previousId = autoRuntime.continuationPreviousUserId || waveUserId(kind);
    const delay = Math.max(500, Number(state.autoAuditDelayMs) || 1200);

    autoAuditNextTimer = setTimeout(async () => {
      autoAuditNextTimer = 0;
      if (!autoRuntime?.enabled || autoRuntime.stage !== 'sending-continuation' || autoRuntime.continuationKind !== kind) return;

      const turns = getChatGPTTurns();
      const previous = findTurnById(previousId, turns);
      const manualUser = previous ? userTurnAfter(previous, turns) : null;

      if (manualUser) {
        const manualKind = classifyAuditTurn(manualUser);
        if (manualKind !== kind) {
          pauseAutoAudit('A manual user message appeared before the automatic same-wave continuation. Chain stopped to avoid attaching automation to unrelated context.');
          return;
        }

        const id = getTurnId(manualUser);
        setWaveUserId(kind, id);
        autoRuntime.seenUserId = id;
        autoRuntime.stage = waveWaitStage(kind);
        autoRuntime.expectedKind = '';
        autoRuntime.continuationKind = '';
        autoRuntime.continuationPreviousUserId = '';
        autoRuntime.waitStartedAt = Date.now();
        autoRuntime.stableResponseKey = '';
        autoRuntime.stableSince = 0;
        if (!saveAutoRuntime()) return;
        scheduleAutoAuditCheck(0);
        return;
      }

      await sendAutoAuditContinuation(kind);
    }, delay);
  }

  function scheduleNextWave(kind) {
    if (autoAuditNextTimer) return;
    const delay = state.autoAuditDelayMs;
    const stageExpected = kind === 'second' ? 'sending-second' : 'sending-performance';

    autoAuditNextTimer = setTimeout(async () => {
      autoAuditNextTimer = 0;
      if (!autoRuntime?.enabled || autoRuntime.stage !== stageExpected) return;

      const turns = getChatGPTTurns();
      const anchorId = kind === 'second' ? autoRuntime.coreUserId : autoRuntime.secondUserId;
      const anchor = findTurnById(anchorId, turns);
      const manualUser = anchor ? userTurnAfter(anchor, turns) : null;
      if (manualUser) {
        const manualKind = classifyAuditTurn(manualUser);
        if (manualKind !== kind) {
          pauseAutoAudit('A manual user message appeared before the next audit wave. The chain stopped to avoid sending into the wrong context.');
          return;
        }

        // The user manually sent the exact expected next wave during the configured
        // delay. Adopt it instead of sending a duplicate.
        const id = getTurnId(manualUser);
        autoRuntime.seenUserId = id;
        autoRuntime.waitStartedAt = Date.now();
        autoRuntime.stableResponseKey = '';
        autoRuntime.stableSince = 0;
        if (kind === 'second') {
          autoRuntime.secondUserId = id;
          autoRuntime.stage = 'wait-second';
        } else {
          autoRuntime.performanceUserId = id;
          autoRuntime.stage = 'wait-performance';
        }
        if (!saveAutoRuntime()) return;
        scheduleAutoAuditCheck(0);
        return;
      }

      await sendAutoAuditWave(kind);
    }, delay);
  }

  async function evaluateAutoAudit(options = {}) {
    if (autoAuditEvaluating) return;
    if (detectSite().key !== 'chatgpt') return;

    autoAuditEvaluating = true;
    try {
      const turns = getChatGPTTurns();
      if (!ensureAutoConversation(turns)) return;

      const latestUser = latestChatGPTUserTurn(turns);
      const latestUserId = getTurnId(latestUser);
      const latestKind = classifyAuditTurn(latestUser);

      if (autoRuntime.stage === 'complete') {
        if (latestUserId && latestUserId !== autoRuntime.seenUserId && latestKind === 'core') {
          resetAutoAuditRuntime({ silent: true });
          armFromCoreTurn(latestUser, { allowCompleted: false });
        }
        return;
      }

      if (autoRuntime.stage === 'idle') {
        if (!autoRuntime.seenUserId) {
          autoRuntime.seenUserId = latestUserId;
          autoRuntime.baselineAssistantKey = assistantFingerprint(assistantTurnAfter(latestUser, turns));
          if (!saveAutoRuntime()) return;
        }

        const isFreshUser = latestUserId && latestUserId !== autoRuntime.seenUserId;
        if (isFreshUser) {
          autoRuntime.seenUserId = latestUserId;
          autoRuntime.baselineAssistantKey = assistantFingerprint(assistantTurnAfter(latestUser, turns));
          if (!saveAutoRuntime()) return;
          if (latestKind === 'core') {
            armFromCoreTurn(latestUser, { allowCompleted: false });
            return;
          }
        }

        if (options.adoptCurrent) {
          adoptCurrentAuditTurn();
          return;
        }

        const currentAssistantKey = assistantFingerprint(assistantTurnAfter(latestUser, turns));
        const coreActivityChanged = latestKind === 'core' &&
          currentAssistantKey &&
          currentAssistantKey !== autoRuntime.baselineAssistantKey;

        // This catches the common case where Auto was enabled after Core was sent
        // but while ChatGPT was already thinking/streaming. Old completed Core turns
        // remain inert because their fingerprint does not change.
        if (latestKind === 'core' && (chatGPTIsGenerating() || coreActivityChanged)) {
          armFromCoreTurn(latestUser, { allowCompleted: false });
          return;
        }

        return;
      }

      if (autoRuntime.stage === 'paused') return;

      if (autoRuntime.stage === 'sending-continuation') {
        scheduleAuditContinuation(autoRuntime.continuationKind);
        return;
      }

      if (autoRuntime.stage === 'sending-second') {
        scheduleNextWave('second');
        return;
      }

      if (autoRuntime.stage === 'sending-performance') {
        scheduleNextWave('performance');
        return;
      }

      if (autoRuntime.stage === 'await-continuation-user') {
        const expectedKind = autoRuntime.expectedKind || autoRuntime.pendingSendKind || autoRuntime.continuationKind;

        if (recoverPendingSendRegistration(expectedKind, turns)) return;

        const elapsed = Date.now() - (
          Number(autoRuntime.pendingSendStartedAt) ||
          Number(autoRuntime.waitStartedAt) ||
          Date.now()
        );

        if (elapsed > AUTO_SEND_REGISTER_TIMEOUT_MS) {
          scheduleRegistrationRecovery(expectedKind, 'sending-continuation');
          return;
        }

        scheduleAutoAuditCheck(800);
        return;
      }

      if (autoRuntime.stage === 'await-second-user' || autoRuntime.stage === 'await-performance-user') {
        const expectedKind = autoRuntime.expectedKind;

        if (recoverPendingSendRegistration(expectedKind, turns)) return;

        const elapsed = Date.now() - (
          Number(autoRuntime.pendingSendStartedAt) ||
          Number(autoRuntime.waitStartedAt) ||
          Date.now()
        );

        if (elapsed > AUTO_SEND_REGISTER_TIMEOUT_MS) {
          scheduleRegistrationRecovery(
            expectedKind,
            expectedKind === 'second' ? 'sending-second' : 'sending-performance'
          );
          return;
        }

        scheduleAutoAuditCheck(800);
        return;
      }

      const stageAnchorId = autoRuntime.stage === 'wait-core'
        ? autoRuntime.coreUserId
        : autoRuntime.stage === 'wait-second'
          ? autoRuntime.secondUserId
          : autoRuntime.performanceUserId;
      let anchor = findTurnById(stageAnchorId, turns);
      if (!anchor) {
        anchor = recoverExpectedStageAnchor(autoRuntime.stage, turns);
      }
      if (!anchor) {
        pauseAutoAudit('The saved audit anchor is not present in this conversation. Open the original ChatGPT audit thread or use Adopt current audit if this is the correct recovered wave.');
        return;
      }

      const interveningUser = userTurnAfter(anchor, turns);
      if (interveningUser) {
        pauseAutoAudit('A manual user message was sent while an audit response was being awaited. Chain stopped to avoid advancing from stale context.');
        return;
      }

      const assistant = assistantTurnAfter(anchor, turns);
      const currentWaveKind = activeWaveKind(autoRuntime.stage);

      if (!assistant) {
        if (chatGPTIsGenerating()) {
          resetIdleStallWatch();
          scheduleAutoAuditCheck(AUTO_LIVENESS_CHECK_MS);
          return;
        }

        await watchIdleAuditStall(currentWaveKind, null, 'no-assistant');
        if (stageTimedOut() && autoRuntime.stage.startsWith('wait-')) {
          pauseAutoAudit(`No assistant response appeared within ${state.autoAuditTimeoutMin} minutes even after unattended liveness recovery attempts.`);
        }
        return;
      }

      if (chatGPTIsGenerating()) {
        resetIdleStallWatch();
        scheduleAutoAuditCheck(AUTO_LIVENESS_CHECK_MS);
        return;
      }

      if (assistantNeedsContinuation(assistant)) {
        resetIdleStallWatch();
        const handled = await autoClickAssistantRecovery(assistant, 'continue', currentWaveKind);
        if (!handled && autoRuntime.stage !== 'paused') scheduleAutoAuditCheck(1000);
        return;
      }

      if (assistantHasRetryError(assistant)) {
        resetIdleStallWatch();
        const handled = await autoClickAssistantRecovery(assistant, 'retry', currentWaveKind);
        if (!handled && autoRuntime.stage !== 'paused') scheduleAutoAuditCheck(1500);
        return;
      }

      const final = completedAssistantCandidate(assistant, autoRuntime.stage);
      if (!final.complete) {
        if (final.reason === 'stabilizing') return;

        await watchIdleAuditStall(currentWaveKind, assistant, final.reason || 'incomplete');
        if (stageTimedOut() && autoRuntime.stage.startsWith('wait-')) {
          pauseAutoAudit(`No verified final response within ${state.autoAuditTimeoutMin} minutes even after unattended liveness recovery attempts.`);
        }
        return;
      }

      const gate = final.gate && final.gate !== 'unknown'
        ? final.gate
        : responseGateFromAssistantTurn(autoRuntime.stage, assistant).state;
      if (gate === 'blocked') {
        resetIdleStallWatch();
        pauseAutoAudit(`The ${waveLabel(activeWaveKind(autoRuntime.stage))} response reported BLOCKED. This is treated as a hard audit precondition failure rather than a normal unfinished wave.`);
        return;
      }

      if (gate === 'partial') {
        resetIdleStallWatch();
        queueSameWaveContinuation(activeWaveKind(autoRuntime.stage), 'partial');
        return;
      }

      if (gate === 'unknown' && state.autoAuditStrictGate) {
        await watchIdleAuditStall(currentWaveKind, assistant, 'terminal-status-missing');
        return;
      }

      if (autoRuntime.stage === 'wait-core') {
        autoRuntime.continuationKind = '';
        autoRuntime.continuationReason = '';
        autoRuntime.continuationPreviousUserId = '';
        resetIdleStallWatch({ save: false });
        autoRuntime.stage = 'sending-second';
        autoRuntime.waitStartedAt = Date.now();
        if (!saveAutoRuntime()) return;
        scheduleNextWave('second');
        return;
      }

      if (autoRuntime.stage === 'wait-second') {
        autoRuntime.continuationKind = '';
        autoRuntime.continuationReason = '';
        autoRuntime.continuationPreviousUserId = '';
        resetIdleStallWatch({ save: false });
        autoRuntime.stage = 'sending-performance';
        autoRuntime.waitStartedAt = Date.now();
        if (!saveAutoRuntime()) return;
        scheduleNextWave('performance');
        return;
      }

      if (autoRuntime.stage === 'wait-performance') {
        autoRuntime.continuationKind = '';
        autoRuntime.continuationReason = '';
        autoRuntime.continuationPreviousUserId = '';
        resetIdleStallWatch({ save: false });
        autoRuntime.stage = 'complete';
        autoRuntime.completeAt = Date.now();
        autoRuntime.waitStartedAt = 0;
        autoRuntime.stableResponseKey = '';
        autoRuntime.stableSince = 0;
        if (!saveAutoRuntime()) return;
        setStatus('Auto audit chain complete: Core -> Second Wave -> Performance all received final responses.', 'success');
      }
    } finally {
      autoAuditEvaluating = false;
    }
  }

  function scheduleAutoAuditCheck(delay = AUTO_OBSERVER_DEBOUNCE_MS) {
    if (detectSite().key !== 'chatgpt') return;
    bindAutoRuntimeToCurrentConversation({ claim: false });
    if (!autoRuntime?.enabled) return;
    if (autoAuditCheckTimer) clearTimeout(autoAuditCheckTimer);
    autoAuditCheckTimer = setTimeout(() => {
      autoAuditCheckTimer = 0;
      evaluateAutoAudit().catch(error => {
        pauseAutoAudit(`Monitor error: ${error?.message || 'unexpected runtime error'}.`);
      });
    }, Math.max(0, delay));
  }

  function stageForAuditKind(kind) {
    if (kind === 'core') return 'wait-core';
    if (kind === 'second') return 'wait-second';
    if (kind === 'performance') return 'wait-performance';
    return '';
  }

  function auditKindForStage(stage) {
    if (stage === 'wait-core') return 'core';
    if (stage === 'wait-second') return 'second';
    if (stage === 'wait-performance') return 'performance';
    return '';
  }

  function latestRecognizableAuditUserTurn(turns = getChatGPTTurns()) {
    for (let index = turns.length - 1; index >= 0; index -= 1) {
      const turn = turns[index];
      if (turnRole(turn) !== 'user') continue;
      if (classifyAuditTurn(turn)) return turn;
    }
    return null;
  }

  function resumeRuntimeFromAuditTurn(userTurn, options = {}) {
    if (!userTurn || !autoRuntime) return false;
    const turns = options.turns || getChatGPTTurns();
    const kind = classifyAuditTurn(userTurn);
    const stage = stageForAuditKind(kind);
    const id = getTurnId(userTurn);
    if (!kind || !stage || !id) return false;

    let coreUserId = '';
    let secondUserId = '';
    let performanceUserId = '';

    if (kind === 'core') {
      coreUserId = id;
    } else if (kind === 'second') {
      const priorCore = previousAuditUserTurn(userTurn, 'core', turns);
      coreUserId = getTurnId(priorCore);
      if (!priorCore || !coreUserId) return false;
      secondUserId = id;
    } else {
      const priorSecond = previousAuditUserTurn(userTurn, 'second', turns);
      const priorCore = priorSecond ? previousAuditUserTurn(priorSecond, 'core', turns) : null;
      coreUserId = getTurnId(priorCore);
      secondUserId = getTurnId(priorSecond);
      if (!priorSecond || !priorCore || !coreUserId || !secondUserId) return false;
      performanceUserId = id;
    }

    // Validation above is side-effect-free. Commit one complete rebuilt runtime only
    // after the whole lineage is known to be valid.
    const nextRuntime = {
      ...autoRuntime,
      conversationKey: currentConversationKey(),
      anchorUserId: autoRuntime.anchorUserId || coreUserId || id,
      seenUserId: id,
      startedAt: autoRuntime.startedAt || Date.now(),
      waitStartedAt: Date.now(),
      stableResponseKey: '',
      stableSince: 0,
      pausedReason: '',
      pausedFromStage: '',
      expectedKind: '',
      pendingSendReceipt: '',
      pendingSendKind: '',
      pendingSendPreviousUserId: '',
      pendingSendStartedAt: 0,
      pendingSendRetries: 0,
      stage,
      coreUserId,
      secondUserId,
      performanceUserId
    };

    clearAutoTimers();
    autoRuntime = nextRuntime;
    if (!saveAutoRuntime()) return false;

    const assistant = assistantTurnAfter(userTurn, turns);
    const proof = assistant ? responseGateFromAssistantTurn(stage, assistant) : { state: 'unknown', sourceCount: 0 };

    if (proof.state === 'complete') {
      setStatus(`Resume rebuilt the ${kind === 'core' ? 'Core' : kind === 'second' ? 'Second Wave' : 'Performance'} lineage atomically and found a COMPLETE handoff across ${proof.sourceCount || 1} response surface(s).`, 'success');
    } else {
      setStatus(`Resume rebuilt the current ${kind === 'core' ? 'Core' : kind === 'second' ? 'Second Wave' : 'Performance'} lineage atomically. Waiting for verifiable completion.`, 'success');
    }

    scheduleAutoAuditCheck(0);
    return true;
  }

  function resumeAutoAuditFromConversation() {
    bindAutoRuntimeToCurrentConversation({ claim: false });
    if (!autoRuntime?.enabled) {
      setStatus('Enable Auto 3 waves for this chat before Resume.', 'warning');
      return false;
    }
    if (!claimAutoLease()) {
      setStatus('Resume is in standby because another tab currently controls this same ChatGPT conversation.', 'warning');
      return false;
    }

    const turns = getChatGPTTurns();
    const latestUser = latestChatGPTUserTurn(turns);
    const latestAudit = latestRecognizableAuditUserTurn(turns);

    // A later non-audit user message means the lineage is no longer safe to resume.
    if (latestUser && latestAudit && latestUser !== latestAudit) {
      setStatus('Resume stopped: a newer non-audit user message exists after the last audit command. Start/adopt the intended audit wave explicitly to avoid attaching automation to stale context.', 'warning');
      return false;
    }

    if (!latestAudit) {
      setStatus('Resume failed: no recognizable AUDIT CORE / SECOND WAVE / PERFORMANCE user turn is present in this conversation.', 'warning');
      return false;
    }

    return resumeRuntimeFromAuditTurn(latestAudit, { turns });
  }

  function recoverLegacySendRegistrationPauseFromDom() {
    if (!autoRuntime || autoRuntime.stage !== 'paused') return false;

    const reason = String(autoRuntime.pausedReason || '');
    if (!/Send was recorded, but its user turn is still absent|user turn is still absent/i.test(reason)) {
      return false;
    }

    const turns = getChatGPTTurns();
    const expectedKind = String(
      autoRuntime.expectedKind ||
      autoRuntime.continuationKind ||
      (autoRuntime.pausedFromStage === 'await-second-user'
        ? 'second'
        : autoRuntime.pausedFromStage === 'await-performance-user'
          ? 'performance'
          : '')
    );

    const latestAudit = latestRecognizableAuditUserTurn(turns);
    const fallbackKind = expectedKind || classifyAuditTurn(latestAudit);
    if (!fallbackKind) return false;

    let matched = findPendingSentAuditTurn(fallbackKind, turns);
    if (!matched && latestAudit && classifyAuditTurn(latestAudit) === fallbackKind) {
      matched = latestAudit;
    }

    if (matched) {
      const id = getTurnId(matched);
      autoRuntime.stage = waveWaitStage(fallbackKind);
      autoRuntime.pausedReason = '';
      autoRuntime.pausedFromStage = '';
      if (id) {
        setWaveUserId(fallbackKind, id);
        autoRuntime.seenUserId = id;
      }
      clearPendingSendReceipt({ save: false });
      autoRuntime.waitStartedAt = Date.now();
      autoRuntime.stableResponseKey = '';
      autoRuntime.stableSince = 0;
      if (!saveAutoRuntime()) return false;
      setStatus(`Recovered the old false send-registration pause. ${waveLabel(fallbackKind)} is already present; Auto3 resumed.`, 'success');
      scheduleAutoAuditCheck(0);
      return true;
    }

    autoRuntime.stage = autoRuntime.pausedFromStage === 'await-second-user'
      ? 'await-second-user'
      : autoRuntime.pausedFromStage === 'await-performance-user'
        ? 'await-performance-user'
        : 'await-continuation-user';
    autoRuntime.expectedKind = fallbackKind;
    autoRuntime.pausedReason = '';
    autoRuntime.pausedFromStage = '';
    autoRuntime.pendingSendStartedAt = Date.now();
    autoRuntime.waitStartedAt = Date.now();
    if (!saveAutoRuntime()) return false;
    setStatus('Recovered the old send-registration pause. Auto3 will keep watching ChatGPT hydration without human intervention.', 'success');
    scheduleAutoAuditCheck(0);
    return true;
  }

  function recoverLegacyPartialPauseFromDom() {
    if (!autoRuntime || autoRuntime.stage !== 'paused') return false;

    const reason = String(autoRuntime.pausedReason || '');
    if (!/reported\s+PARTIAL|PARTIAL.*audit protocol|automatic advancement.*PARTIAL/i.test(reason)) return false;

    const turns = getChatGPTTurns();
    const preferredStage = String(autoRuntime.pausedFromStage || '');
    const preferredKind = auditKindForStage(preferredStage);

    let userTurn = null;
    if (preferredKind) {
      for (let index = turns.length - 1; index >= 0; index -= 1) {
        const candidate = turns[index];
        if (turnRole(candidate) !== 'user') continue;
        if (classifyAuditTurn(candidate) === preferredKind) {
          userTurn = candidate;
          break;
        }
      }
    }

    if (!userTurn) userTurn = latestRecognizableAuditUserTurn(turns);
    if (!userTurn) return false;

    const kind = classifyAuditTurn(userTurn);
    const stage = stageForAuditKind(kind);
    const assistant = assistantTurnAfter(userTurn, turns);
    if (!kind || !stage || !assistant || chatGPTIsGenerating()) return false;

    const proof = responseGateFromAssistantTurn(stage, assistant);
    if (proof.state !== 'partial' && proof.state !== 'complete') return false;

    const resumed = resumeRuntimeFromAuditTurn(userTurn, { turns });
    if (!resumed) return false;

    setStatus(
      proof.state === 'partial'
        ? `Recovered the old ${waveLabel(kind)} PARTIAL pause. Auto3 will continue the same wave automatically now.`
        : `Recovered the old ${waveLabel(kind)} pause; the existing response is already COMPLETE.`,
      'success'
    );
    scheduleAutoAuditCheck(0);
    return true;
  }

  function recoverStrictGatePauseFromDom() {
    if (!autoRuntime || autoRuntime.stage !== 'paused') return false;

    const reason = String(autoRuntime.pausedReason || '');
    if (!/complete marker|complete audit handoff|strict gate|response reported BLOCKED|reported BLOCKED/i.test(reason)) return false;

    const turns = getChatGPTTurns();
    const preferredStage = String(autoRuntime.pausedFromStage || '');
    const preferredKind = auditKindForStage(preferredStage);

    let userTurn = null;
    if (preferredKind) {
      for (let index = turns.length - 1; index >= 0; index -= 1) {
        if (turnRole(turns[index]) !== 'user') continue;
        if (classifyAuditTurn(turns[index]) === preferredKind) {
          userTurn = turns[index];
          break;
        }
      }
    }

    if (!userTurn) userTurn = latestRecognizableAuditUserTurn(turns);
    if (!userTurn) return false;

    const kind = classifyAuditTurn(userTurn);
    const stage = stageForAuditKind(kind);
    const assistant = assistantTurnAfter(userTurn, turns);
    if (!stage || !assistant || chatGPTIsGenerating()) return false;

    const proof = responseGateFromAssistantTurn(stage, assistant);
    if (proof.state !== 'complete') return false;

    const resumed = resumeRuntimeFromAuditTurn(userTurn, { turns });
    if (resumed) {
      setStatus(`Recovered a false Strict pause directly from the live DOM: ${kind === 'core' ? 'Core' : kind === 'second' ? 'Second Wave' : 'Performance'} is COMPLETE.`, 'success');
    }
    return resumed;
  }

  function ensureAutoAuditObserver() {
    if (detectSite().key !== 'chatgpt') return;
    const root = document.querySelector('main') || document.body;
    if (!root) return;

    const wasBound = Boolean(autoAuditObserver && autoAuditObserverRoot);
    if (wasBound && autoAuditObserverRoot === root && autoAuditObserverRoot.isConnected) return;

    if (autoAuditObserver) autoAuditObserver.disconnect();
    autoAuditObserver = null;
    autoAuditObserverRoot = root;

    autoAuditObserver = new MutationObserver(() => {
      // The observed root can be replaced or detached between mutations;
      // always re-anchor before processing so a live observer never dies.
      ensureAutoAuditObserver();
      const previousKey = autoBoundConversationKey;
      bindAutoRuntimeToCurrentConversation({ claim: false });

      if (previousKey !== autoBoundConversationKey) {
        renderAutoAuditState();
      }

      if (autoRuntime?.enabled) {
        scheduleAutoAuditCheck(AUTO_OBSERVER_DEBOUNCE_MS);
      }
    });
    autoAuditObserver.observe(root, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Exactly one evaluation after a re-bind: mutations that happened while
    // the observer was detached were not seen, so re-sync the chain once
    // against the live conversation.
    if (wasBound && autoRuntime?.enabled) {
      evaluateAutoAudit().catch(error => pauseAutoAudit(`Monitor re-bind failed: ${error?.message || 'unexpected runtime error'}.`));
    }
  }

  function startAutoAuditMonitor(options = {}) {
    if (detectSite().key !== 'chatgpt') {
      renderAutoAuditState();
      return;
    }

    bindAutoRuntimeToCurrentConversation({ claim: false });

    ensureAutoAuditObserver();

    if (!autoRuntime?.enabled) {
      clearAutoTimers();
      releaseAutoLease(autoBoundConversationKey);
      renderAutoAuditState();
      return;
    }

    claimAutoLease();
    recoverLegacySendRegistrationPauseFromDom();
    recoverLegacyPartialPauseFromDom();
    recoverStrictGatePauseFromDom();

    if (autoRuntime.stage === 'idle' && !autoRuntime.seenUserId) {
      resetAutoAuditRuntime({ silent: true });
    }

    renderAutoAuditState();
    scheduleAutoAuditCheck(options.immediate ? 0 : 250);
  }

  function stopAutoAuditMonitor() {
    if (autoAuditObserver) {
      autoAuditObserver.disconnect();
      autoAuditObserver = null;
    }
    autoAuditObserverRoot = null;
    clearAutoTimers();
    releaseAutoLease(autoBoundConversationKey);
  }

  function setAutoAuditEnabled(enabled) {
    bindAutoRuntimeToCurrentConversation({ claim: false });

    const next = Boolean(enabled);
    if (!autoRuntime) autoRuntime = emptyAutoRuntime({ enabled: next });

    const previous = autoRuntime.enabled;
    autoRuntime.enabled = next;
    autoRuntime.conversationKey = autoBoundConversationKey || currentConversationKey();
    if (!saveAutoRuntime()) {
      autoRuntime.enabled = previous;
      renderAutoAuditState();
      return;
    }

    if (!next) {
      clearAutoTimers();
      releaseAutoLease(autoBoundConversationKey);
      setStatus('Auto 3 waves disabled for this chat only. Saved progress is preserved; other and future conversations are unaffected.', 'success');
      renderAutoAuditState();
      return;
    }

    claimAutoLease();
    startAutoAuditMonitor({ immediate: true });
    evaluateAutoAudit().catch(error => pauseAutoAudit(`Monitor start failed: ${error?.message || 'unexpected runtime error'}.`));
    setStatus('Auto 3 waves enabled for this chat only. New conversations stay disabled until enabled explicitly.', 'success');
  }

  function renderConfirm() {
    const text = panel?.querySelector('#acb-confirm-text');
    const cancel = panel?.querySelector('#acb-confirm-cancel');
    const confirm = panel?.querySelector('#acb-confirm-run');
    if (!text || !cancel || !confirm) return;

    if (!pendingAction) {
      text.textContent = 'Nothing pending.';
      cancel.disabled = true;
      confirm.disabled = true;
      cancel.title = 'No destructive action is pending.';
      confirm.title = 'No destructive action is pending.';
      return;
    }

    text.textContent = pendingAction.message;
    cancel.disabled = false;
    confirm.disabled = false;
    cancel.title = 'Cancel the pending destructive action.';
    confirm.title = 'Perform the exact action described above.';
  }

  function clearPendingAction() {
    pendingAction = null;
    renderConfirm();
  }

  function readCategoryName() {
    return String(panel?.querySelector('#acb-category-name')?.value || '').trim().slice(0, 30);
  }

  function addCategory() {
    if (state.categories.length >= MAX_CATEGORIES) {
      setStatus(`Category was not added: the ${MAX_CATEGORIES}-category limit is reached. Delete an unused category first.`, 'error');
      return;
    }
    const name = readCategoryName();
    if (!name) {
      setStatus('Category was not added: Category name is empty. Enter a name in the labeled field, then press Add.', 'error');
      return;
    }
    if (state.categories.some(category => category.name.toLowerCase() === name.toLowerCase())) {
      setStatus(`Category was not added: "${name}" already exists. Enter a unique category name, then press Add.`, 'error');
      return;
    }
    clearPendingAction();
    const category = { id: uid(), name, presets: [] };
    if (!commitStateMutation(() => {
      state.categories.push(category);
      state.activeCategoryId = category.id;
    }, 'New category could not be persisted; it was not added.')) return;
    renderCategoryTabs();
    renderCommands();
    renderManageCategory();
    renderManageList();
    hideEditor();
    setStatus(`Added category: ${category.name}.`, 'success');
  }

  function renameCategory() {
    const category = activeCategory();
    if (!category) return;
    const name = readCategoryName();
    if (!name) {
      setStatus('Category was not renamed: Category name is empty. Enter a name in the labeled field, then press Rename.', 'error');
      return;
    }
    if (state.categories.some(item => item.id !== category.id && item.name.toLowerCase() === name.toLowerCase())) {
      setStatus(`Category was not renamed: "${name}" already exists. Enter a unique category name, then press Rename.`, 'error');
      return;
    }
    clearPendingAction();
    const oldName = category.name;
    if (!commitStateMutation(
      () => { category.name = name; },
      'Category rename could not be persisted; the previous name was restored.'
    )) return;
    renderCategoryTabs();
    renderManageCategory();
    setStatus(`Renamed category: ${oldName} -> ${category.name}.`, 'success');
  }

  function requestDeleteCategory() {
    const category = activeCategory();
    if (!category) return;
    if (state.categories.length <= 1) {
      setStatus('Category was not queued for deletion: at least one category must remain. Add another category first.', 'error');
      return;
    }
    pendingAction = {
      type: 'delete-category',
      categoryId: category.id,
      message: `Delete category "${category.name}" and its ${category.presets.length} command(s)? Confirm removes them from AI ChatButtons.`
    };
    renderConfirm();
    setStatus(`Deletion pending for category: ${category.name}. Read Confirm action, then Confirm or Cancel.`, 'warning');
  }

  function requestDeletePreset(presetId) {
    const category = activeCategory();
    const preset = category?.presets.find(item => item.id === presetId);
    if (!category || !preset) {
      setStatus('Command was not queued for deletion: it no longer exists in the selected category. Refresh by reselecting the category.', 'error');
      return;
    }
    pendingAction = {
      type: 'delete-preset',
      categoryId: category.id,
      presetId: preset.id,
      message: `Delete command "${preset.name}" from category "${category.name}"? Confirm permanently removes this command from AI ChatButtons.`
    };
    renderConfirm();
    setStatus(`Deletion pending for command: ${preset.name}. Read Confirm action, then Confirm or Cancel.`, 'warning');
  }

  function movePreset(presetId, delta) {
    const category = activeCategory();
    if (!category) return;
    const index = category.presets.findIndex(item => item.id === presetId);
    const next = index + delta;
    if (index < 0) {
      setStatus('Command was not moved: it no longer exists in this category. Reselect the category and retry.', 'error');
      return;
    }
    if (next < 0 || next >= category.presets.length) {
      setStatus(`Command was not moved: ${category.presets[index].name} is already ${delta < 0 ? 'first' : 'last'} in ${category.name}.`, 'warning');
      return;
    }
    clearPendingAction();
    const presetName = category.presets[index].name;
    if (!commitStateMutation(() => {
      const [moved] = category.presets.splice(index, 1);
      category.presets.splice(next, 0, moved);
    }, 'Command order could not be persisted; the previous order was restored.')) return;
    renderCommands();
    renderManageList();
    setStatus(`Moved ${presetName} ${delta < 0 ? 'up' : 'down'} in ${category.name}.`, 'success');
  }

  function exportPresets() {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      categories: state.categories
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'AICHATBUTTONS_presets.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    const count = state.categories.reduce((sum, category) => sum + category.presets.length, 0);
    setStatus(`Exported ${count} command(s) from ${state.categories.length} category(s).`, 'success');
  }

  function beginImport() {
    if (!fileInput) return;
    fileInput.value = '';
    fileInput.click();
  }

  function findDuplicateName(categories) {
    const categoryNames = new Set();
    for (const category of categories) {
      const categoryKey = category.name.toLowerCase();
      if (categoryNames.has(categoryKey)) return `duplicate category name "${category.name}"`;
      categoryNames.add(categoryKey);
      const presetNames = new Set();
      for (const preset of category.presets) {
        const presetKey = preset.name.toLowerCase();
        if (presetNames.has(presetKey)) return `duplicate command name "${preset.name}" in category "${category.name}"`;
        presetNames.add(presetKey);
      }
    }
    return '';
  }

  function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        if (!Array.isArray(parsed?.categories)) {
          setStatus('Import rejected: JSON is missing the categories array. Export a valid preset file and retry.', 'error');
          return;
        }
        if (parsed.categories.length > MAX_CATEGORIES) {
          setStatus(`Import rejected: file has ${parsed.categories.length} categories, above the ${MAX_CATEGORIES}-category limit. Reduce the file and retry.`, 'error');
          return;
        }
        const oversizedCategory = parsed.categories.find(category => Array.isArray(category?.presets) && category.presets.length > MAX_PRESETS);
        if (oversizedCategory) {
          setStatus(`Import rejected: category "${String(oversizedCategory.name || 'unnamed')}" exceeds the ${MAX_PRESETS}-command limit. Reduce it and retry.`, 'error');
          return;
        }
        const categories = sanitizeCategories(parsed.categories);
        if (!categories.length) {
          setStatus('Import rejected: JSON contains no valid categories with the required structure. Export a valid preset file and retry.', 'error');
          return;
        }
        const duplicate = findDuplicateName(categories);
        if (duplicate) {
          setStatus(`Import rejected: ${duplicate}. Rename the duplicate in the JSON file and retry.`, 'error');
          return;
        }
        const commandCount = categories.reduce((sum, category) => sum + category.presets.length, 0);
        pendingAction = {
          type: 'import-replace',
          categories,
          commandCount,
          message: `Replace all current data with ${categories.length} imported category(s) and ${commandCount} command(s)? Confirm removes the current categories first.`
        };
        renderConfirm();
        setStatus('Import file is valid but not applied. Read Confirm action, then Confirm or Cancel.', 'warning');
      } catch (error) {
        setStatus(`Import rejected: ${error.message || 'invalid JSON'}. Fix the preset file and retry.`, 'error');
      }
    };
    reader.onerror = () => {
      setStatus('Import failed: the selected file could not be read. Check file permissions and retry.', 'error');
    };
    reader.readAsText(file);
  }

  function confirmPendingAction() {
    if (!pendingAction) {
      setStatus('Nothing was confirmed: no destructive action is pending.', 'warning');
      return;
    }

    const action = pendingAction;
    pendingAction = null;

    if (action.type === 'delete-category') {
      const category = state.categories.find(item => item.id === action.categoryId);
      if (!category) {
        renderConfirm();
        setStatus('Category was not deleted: the pending category no longer exists. Select a current category and request deletion again.', 'error');
        return;
      }
      if (state.categories.length <= 1) {
        renderConfirm();
        setStatus('Category was not deleted: it became the last remaining category. Add another category first.', 'error');
        return;
      }
      if (!commitStateMutation(() => {
        state.categories = state.categories.filter(item => item.id !== category.id);
        if (!state.categories.some(item => item.id === state.activeCategoryId)) {
          state.activeCategoryId = state.categories[0].id;
        }
      }, 'Category deletion could not be persisted; nothing was deleted.')) {
        renderConfirm();
        return;
      }
      renderCategoryTabs();
      renderCommands();
      renderManageCategory();
      renderManageList();
      hideEditor();
      renderConfirm();
      setStatus(`Deleted category: ${category.name}.`, 'success');
      return;
    }

    if (action.type === 'delete-preset') {
      const category = state.categories.find(item => item.id === action.categoryId);
      const preset = category?.presets.find(item => item.id === action.presetId);
      if (!category || !preset) {
        renderConfirm();
        setStatus('Command was not deleted: the pending command no longer exists. Reselect the category and request deletion again.', 'error');
        return;
      }
      if (!commitStateMutation(
        () => { category.presets = category.presets.filter(item => item.id !== preset.id); },
        'Command deletion could not be persisted; nothing was deleted.'
      )) {
        renderConfirm();
        return;
      }
      renderCommands();
      renderManageList();
      if (editingPresetId === preset.id) hideEditor();
      renderConfirm();
      setStatus(`Deleted command: ${preset.name}.`, 'success');
      return;
    }

    if (action.type === 'import-replace') {
      const committed = commitStateMutation(() => {
        state.categories = action.categories.map(category => ({
          id: uid(),
          name: category.name,
          presets: category.presets.map(preset => ({
            id: uid(),
            ...(canonicalBuiltinId(preset.builtinId) ? { builtinId: canonicalBuiltinId(preset.builtinId) } : {}),
            name: preset.name,
            desc: preset.desc,
            text: preset.text
          }))
        }));
        state.activeCategoryId = state.categories[0].id;
        state.builtinRevision = 0;
        state.builtinsSeededV2 = false;
        syncBuiltins(state);
      }, 'Import could not be persisted; the previous preset library was restored.');
      if (!committed) {
        renderConfirm();
        return;
      }
      renderCategoryTabs();
      renderCommands();
      renderManageCategory();
      renderManageList();
      hideEditor();
      renderConfirm();
      setStatus(`Imported ${action.commandCount} command(s) and reconciled canonical audit built-ins.`, 'success');
      return;
    }

    renderConfirm();
    setStatus('Pending action was not executed: its type is unsupported. Request the action again from the current UI.', 'error');
  }

  function attachEvents() {
    panel.querySelector('#acb-collapse').addEventListener('click', () => {
      if (!commitStateMutation(
        () => { state.collapsed = !state.collapsed; },
        'Collapse state could not be persisted; the previous display state was restored.'
      )) return;
      clampPanelPosition({ report: true });
      if (!state.collapsed) {
        setStatus('Widget expanded. Display state restored.', 'success');
      }
    });

    panel.querySelector('#acb-opacity').addEventListener('change', event => {
      const next = Number(event.target.value);
      if (!OPACITY_LEVELS.includes(next)) return;
      if (!commitStateMutation(
        () => { state.opacity = next; },
        'Opacity could not be persisted; the previous value was restored.'
      )) return;
      applyDisplayState();
      setStatus(`Widget opacity set to ${next}%.`, 'success');
    });

    panel.querySelector('#acb-size').addEventListener('change', event => {
      const next = String(event.target.value);
      if (!Object.prototype.hasOwnProperty.call(PANEL_SIZES, next)) return;
      if (!commitStateMutation(
        () => { state.panelSize = next; },
        'Widget size could not be persisted; the previous size was restored.'
      )) return;
      clampPanelPosition({ report: true });
      setStatus(`Widget size set to ${PANEL_SIZES[next].label}.`, 'success');
    });

    panel.querySelector('#acb-lock').addEventListener('click', () => {
      const nextLocked = !state.posLocked;
      if (!commitStateMutation(() => {
        if (nextLocked) clampPanelPosition({ commit: true });
        state.posLocked = nextLocked;
      }, 'Position lock state could not be persisted; the previous state was restored.')) return;
      updateLockState();
      setStatus(`Position ${state.posLocked ? 'locked' : 'unlocked'}.`, 'success');
    });

    panel.querySelector('#acb-auto-enabled').addEventListener('change', event => {
      setAutoAuditEnabled(event.target.checked);
    });

    panel.querySelector('#acb-auto-gate').addEventListener('change', event => {
      const next = event.target.value !== 'relaxed';
      if (!commitStateMutation(
        () => { state.autoAuditStrictGate = next; },
        'Auto audit gate setting could not be persisted; the previous value was restored.'
      )) return;
      renderAutoAuditState();
      setStatus(`Auto audit gate set to ${state.autoAuditStrictGate ? 'Strict' : 'Relaxed'}.`, 'success');
      scheduleAutoAuditCheck(0);
    });

    panel.querySelector('#acb-auto-delay').addEventListener('change', event => {
      const next = Number(event.target.value);
      if (!AUTO_DELAYS_MS.includes(next)) return;
      if (!commitStateMutation(
        () => { state.autoAuditDelayMs = next; },
        'Auto audit delay could not be persisted; the previous value was restored.'
      )) return;
      renderAutoAuditState();
      setStatus(`Auto audit next-wave delay set to ${next / 1000} s.`, 'success');
    });

    panel.querySelector('#acb-auto-timeout').addEventListener('change', event => {
      const next = Number(event.target.value);
      if (!AUTO_STAGE_TIMEOUTS.includes(next)) return;
      if (!commitStateMutation(
        () => { state.autoAuditTimeoutMin = next; },
        'Auto audit timeout could not be persisted; the previous value was restored.'
      )) return;
      renderAutoAuditState();
      setStatus(`Auto audit maximum wait set to ${next} minutes per wave.`, 'success');
    });


    panel.querySelector('#acb-prompt-delivery').addEventListener('change', event => {
      const next = String(event.target.value);
      if (!CHATGPT_PROMPT_DELIVERY_MODES.includes(next)) return;
      if (!commitStateMutation(
        () => { state.chatgptPromptDelivery = next; },
        'Prompt delivery setting could not be persisted; the previous value was restored.'
      )) return;
      renderAutoAuditState();
      const label = next === 'auto'
        ? `Auto file for prompts >= ${CHATGPT_LONG_PROMPT_THRESHOLD} characters`
        : next === 'file'
          ? 'File attachment for every ChatGPT command'
          : 'Raw text insertion';
      setStatus(`ChatGPT prompt delivery: ${label}.`, 'success');
    });

    panel.querySelector('#acb-auto-reset').addEventListener('click', () => {
      resetAutoAuditRuntime();
      if (autoRuntime?.enabled) startAutoAuditMonitor({ immediate: true });
    });

    panel.querySelector('#acb-auto-adopt').addEventListener('click', () => {
      if (!autoRuntime?.enabled) {
        setStatus('Enable Auto 3 waves for this chat before Resume.', 'warning');
        return;
      }
      try {
        resumeAutoAuditFromConversation();
      } catch (error) {
        pauseAutoAudit(`Could not rebuild the current audit chain from the live conversation: ${error?.message || 'unexpected runtime error'}.`);
      }
    });

    panel.querySelector('#acb-auto-stop').addEventListener('click', () => {
      if (!autoRuntime?.enabled) {
        setStatus('Auto 3 waves is already disabled for this chat.', 'info');
        return;
      }
      pauseAutoAudit('Paused manually from the widget.');
    });

    panel.querySelector('#acb-tabs').addEventListener('click', event => {
      const button = event.target.closest('button[data-view]');
      if (!button) return;
      activeView = button.dataset.view;
      renderTabs();
      if (activeView === 'manage') {
        renderManageCategory();
        renderManageList();
        renderConfirm();
      }
      const viewLabel = activeView === 'commands' ? 'Run' : activeView === 'manage' ? 'Edit' : 'Settings';
      setStatus(`Opened ${viewLabel}.`, 'info');
    });

    panel.querySelector('#acb-filter').addEventListener('input', renderCommands);

    panel.querySelector('#acb-audit-quick-list').addEventListener('click', event => {
      const button = event.target.closest('button[data-quick-action]');
      const row = button?.closest('.acb-audit-quick-row');
      if (!button || !row) return;

      const preset = findAuditPreset(row.dataset.wave);
      if (!preset) {
        setStatus('This built-in audit command is missing. Open Edit or reload defaults before running it.', 'error');
        renderAuditQuickActions();
        return;
      }

      executePreset(preset, button.dataset.quickAction);
    });

    panel.querySelector('#acb-command-list').addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      const row = button?.closest('.acb-command-row');
      if (!button || !row) return;
      const category = activeCategory();
      const preset = category?.presets.find(item => item.id === row.dataset.presetId);
      if (!preset) {
        setStatus('Command action failed: the selected command no longer exists. Refresh the list by switching categories.', 'error');
        return;
      }
      executePreset(preset, button.dataset.action);
    });

    panel.querySelector('#acb-manage-category').addEventListener('change', event => {
      const nextCategoryId = event.target.value;
      if (!commitStateMutation(
        () => { state.activeCategoryId = nextCategoryId; },
        'Category selection could not be persisted; the previous selection was restored.'
      )) return;
      renderCategoryTabs();
      renderCommands();
      renderManageCategory();
      renderManageList();
      hideEditor();
      const category = activeCategory();
      setStatus(`Selected category: ${category?.name || 'unknown'}.`, 'info');
    });

    panel.querySelector('#acb-add-category').addEventListener('click', addCategory);
    panel.querySelector('#acb-rename-category').addEventListener('click', renameCategory);
    panel.querySelector('#acb-delete-category').addEventListener('click', requestDeleteCategory);
    panel.querySelector('#acb-add-command').addEventListener('click', () => showEditor(null));
    panel.querySelector('#acb-editor-save').addEventListener('click', saveEditor);
    panel.querySelector('#acb-editor-cancel').addEventListener('click', () => {
      hideEditor();
      setStatus('Command edit canceled. No data changed.', 'info');
    });

    panel.querySelector('#acb-manage-list').addEventListener('click', event => {
      const button = event.target.closest('button[data-manage]');
      const row = button?.closest('.acb-manage-row');
      if (!button || !row) return;
      const presetId = row.dataset.presetId;
      if (button.dataset.manage === 'edit') showEditor(presetId);
      if (button.dataset.manage === 'up') movePreset(presetId, -1);
      if (button.dataset.manage === 'down') movePreset(presetId, 1);
      if (button.dataset.manage === 'delete') requestDeletePreset(presetId);
    });

    panel.querySelector('#acb-export').addEventListener('click', exportPresets);
    panel.querySelector('#acb-import').addEventListener('click', beginImport);
    panel.querySelector('#acb-confirm-cancel').addEventListener('click', () => {
      clearPendingAction();
      setStatus('Pending destructive action canceled. No data changed.', 'info');
    });
    panel.querySelector('#acb-confirm-run').addEventListener('click', confirmPendingAction);
    panel.querySelector('#acb-dismiss-status').addEventListener('click', () => {
      setStatus('Ready. Append preserves composer content; long ChatGPT prompts use file delivery by default; Auto chain advances Core -> Second -> Performance.', 'info');
    });

    const titlebar = panel.querySelector('#acb-titlebar');

    const finishDrag = (event = null, reason = 'pointer') => {
      if (!drag) return;
      if (event?.pointerId != null && event.pointerId !== drag.pointerId) return;

      const pointerId = drag.pointerId;
      drag = null;

      try {
        if (titlebar.hasPointerCapture?.(pointerId)) titlebar.releasePointerCapture(pointerId);
      } catch (_) { }

      if (!commitStateMutation(
        () => { clampPanelPosition({ commit: true }); },
        'Panel position could not be persisted; the previous stored position was restored.'
      )) return;

      if (reason === 'pointer') {
        setStatus('Panel position saved.', 'success');
      } else if (reason === 'viewport') {
        setStatus('Drag ended because the viewport changed. The current visible position was saved safely.', 'info');
      }
    };

    titlebar.addEventListener('pointerdown', event => {
      if (
        state.posLocked ||
        event.button !== 0 ||
        event.isPrimary === false ||
        event.target.closest('button, select, input, textarea, label')
      ) return;

      const visiblePosition = clampPanelPosition();
      if (!visiblePosition) return;

      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: visiblePosition.x,
        originY: visiblePosition.y
      };

      try { titlebar.setPointerCapture(event.pointerId); } catch (_) { }
      event.preventDefault();
    });

    window.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.pointerId) return;

      state.popupPos.x = drag.originX + (event.clientX - drag.startX);
      state.popupPos.y = drag.originY + (event.clientY - drag.startY);
      clampPanelPosition();

      if (event.cancelable) event.preventDefault();
    }, { passive: false });

    window.addEventListener('pointerup', event => finishDrag(event, 'pointer'));
    window.addEventListener('pointercancel', event => finishDrag(event, 'cancel'));
    titlebar.addEventListener('lostpointercapture', event => finishDrag(event, 'capture-lost'));
    window.addEventListener('blur', () => finishDrag(null, 'blur'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) finishDrag(null, 'hidden');
    });

    const syncViewport = () => {
      if (viewportSyncFrame) return;
      viewportSyncFrame = requestAnimationFrame(() => {
        viewportSyncFrame = 0;

        // Resizing/maximizing/restoring during a drag used to leave stale drag
        // coordinates. End that drag first, then clamp only the rendered copy.
        if (drag) finishDrag(null, 'viewport');

        clampPanelPosition({ report: true });
        updateLockState();
      });
    };

    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    window.addEventListener('focus', syncViewport);
    window.addEventListener('pageshow', syncViewport);
    document.addEventListener('fullscreenchange', syncViewport);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncViewport);
      window.visualViewport.addEventListener('scroll', syncViewport);
    }
  }

  function mount() {
    if (panel || !document.body) return;
    state = loadState();
    GM_addStyle(CSS);

    const site = detectSite();
    panel = document.createElement('section');
    panel.id = 'acb-popup';
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', 'AI ChatButtons');
    setHTML(panel, `
      <div id="acb-titlebar">
        <div id="acb-title">AI ChatButtons</div>
        <div id="acb-site" title="Current site">${escapeHTML(site.label)}</div>
        <button id="acb-collapse" type="button" aria-expanded="true" title="Collapse the widget to the title bar">Collapse</button>
      </div>

      <div id="acb-tabs" role="tablist" aria-label="AI ChatButtons views">
        <button type="button" role="tab" data-view="commands" aria-selected="true">Run</button>
        <button type="button" role="tab" data-view="manage" aria-selected="false">Edit</button>
        <button type="button" role="tab" data-view="settings" aria-selected="false">Settings</button>
      </div>

      <div id="acb-content">
        <div id="acb-view-commands" class="acb-view" role="tabpanel">
          <div id="acb-auto-audit">
            <div id="acb-auto-head">
              <label id="acb-auto-toggle-label" for="acb-auto-enabled" title="Automatically continue Core -> Second Wave -> Performance for this ChatGPT conversation only. Other chats keep independent chains.">
                <input id="acb-auto-enabled" type="checkbox" />
                <span>Auto 3 waves · this chat</span>
              </label>
              <button id="acb-auto-adopt" type="button" title="Resume/recover automation from the latest audit turn in this ChatGPT conversation.">Resume</button>
              <button id="acb-auto-stop" type="button" title="Pause the active chain without disabling Auto 3 waves globally.">Pause</button>
            </div>
            <div id="acb-auto-progress" aria-label="Audit chain progress">
              <div class="acb-auto-step" data-step="1" data-state="idle">1 Core</div>
              <div class="acb-auto-step" data-step="2" data-state="idle">2 Second</div>
              <div class="acb-auto-step" data-step="3" data-state="idle">3 Perf</div>
            </div>
            <div id="acb-auto-state" data-kind="info">Auto chain disabled.</div>
          </div>

          <div id="acb-audit-quick">
            <div class="acb-section-title">Audit workflow</div>
            <div id="acb-audit-quick-list" aria-label="Pinned audit waves"></div>
          </div>

          <div id="acb-other-commands" hidden>
            <div class="acb-section-title">Other commands</div>
            <div id="acb-command-tools">
              <div id="acb-catbar" role="tablist" aria-label="Command categories"></div>
              <div id="acb-filter-wrap">
                <input id="acb-filter" type="text" autocomplete="off" aria-label="Filter custom commands" placeholder="Filter commands..." />
              </div>
            </div>
            <div id="acb-command-list" aria-live="off"></div>
          </div>
        </div>

        <div id="acb-view-manage" class="acb-view acb-view-scroll" role="tabpanel" hidden>
          <div class="acb-section">
            <div class="acb-section-title">Categories</div>
            <div class="acb-field">
              <label class="acb-label" for="acb-manage-category">Selected category</label>
              <select id="acb-manage-category"></select>
            </div>
            <div class="acb-field">
              <label class="acb-label" for="acb-category-name">Category name</label>
              <input id="acb-category-name" type="text" maxlength="30" />
            </div>
            <div class="acb-row">
              <button id="acb-add-category" type="button">Add</button>
              <button id="acb-rename-category" type="button">Rename</button>
              <button id="acb-delete-category" type="button">Delete</button>
            </div>
          </div>

          <div class="acb-section">
            <div class="acb-section-title">Commands</div>
            <div id="acb-manage-list"></div>
            <div class="acb-row">
              <button id="acb-add-command" type="button">Add command</button>
            </div>
          </div>

          <div id="acb-editor" class="acb-section" hidden>
            <div id="acb-editor-title" class="acb-section-title">Add command</div>
            <div class="acb-field">
              <label class="acb-label" for="acb-edit-name">Name *</label>
              <input id="acb-edit-name" type="text" maxlength="40" />
            </div>
            <div class="acb-field">
              <label class="acb-label" for="acb-edit-desc">Description</label>
              <input id="acb-edit-desc" type="text" maxlength="100" />
            </div>
            <div class="acb-field">
              <label class="acb-label" for="acb-edit-text">Prompt *</label>
              <textarea id="acb-edit-text"></textarea>
            </div>
            <div id="acb-editor-actions">
              <button id="acb-editor-cancel" type="button">Cancel</button>
              <button id="acb-editor-save" type="button">Save</button>
            </div>
          </div>

          <div class="acb-section">
            <div class="acb-section-title">Confirm action</div>
            <div id="acb-confirm-text">Nothing pending.</div>
            <div class="acb-row">
              <button id="acb-confirm-cancel" type="button" disabled title="No destructive action is pending.">Cancel</button>
              <button id="acb-confirm-run" type="button" disabled title="No destructive action is pending.">Confirm</button>
            </div>
          </div>
        </div>

        <div id="acb-view-settings" class="acb-view acb-view-scroll" role="tabpanel" hidden>
          <div class="acb-section">
            <div class="acb-section-title">Display</div>
            <div id="acb-displaybar" aria-label="Widget display controls">
              <div class="acb-display-field">
                <label for="acb-size">Size</label>
                <select id="acb-size" aria-label="Widget size">
                  <option value="compact">Small</option>
                  <option value="normal">Normal</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div class="acb-display-field">
                <label for="acb-opacity">Opacity</label>
                <select id="acb-opacity" aria-label="Widget opacity">
                  <option value="100">100%</option>
                  <option value="75">75%</option>
                  <option value="50">50%</option>
                  <option value="25">25%</option>
                </select>
              </div>
              <button id="acb-lock" type="button" aria-pressed="false" title="Lock or unlock panel position">Lock position</button>
            </div>
          </div>

          <div class="acb-section">
            <div class="acb-section-title">Auto 3 waves</div>
            <div class="acb-section-note">Advanced automation settings. The main Run screen keeps only the toggle, progress and recovery controls.</div>
            <div id="acb-auto-config">
              <div class="acb-auto-field">
                <label for="acb-auto-gate">Completion gate</label>
                <select id="acb-auto-gate" title="Strict requires COMPLETE before advancing to the NEXT wave. PARTIAL and silent idle/stopped responses automatically continue the SAME wave until COMPLETE.">
                  <option value="strict">Strict</option>
                  <option value="relaxed">Relaxed</option>
                </select>
              </div>
              <div class="acb-auto-field">
                <label for="acb-auto-delay">Next-wave delay</label>
                <select id="acb-auto-delay">
                  <option value="500">0.5 s</option>
                  <option value="1200">1.2 s</option>
                  <option value="2500">2.5 s</option>
                  <option value="5000">5 s</option>
                  <option value="10000">10 s</option>
                </select>
              </div>
              <div class="acb-auto-field">
                <label for="acb-auto-timeout">Maximum wait</label>
                <select id="acb-auto-timeout">
                  <option value="60">60 min</option>
                  <option value="120">120 min</option>
                  <option value="180">180 min</option>
                  <option value="360">360 min</option>
                </select>
              </div>
              <div class="acb-auto-field">
                <label for="acb-prompt-delivery">ChatGPT delivery</label>
                <select id="acb-prompt-delivery" title="Auto attaches long ChatGPT prompts as Markdown files instead of inserting the full text into ProseMirror.">
                  <option value="auto">Auto file</option>
                  <option value="file">Always file</option>
                  <option value="text">Text only</option>
                </select>
              </div>
            </div>
            <button id="acb-auto-reset" type="button" title="Discard only this conversation's saved automation chain and wait for a fresh Core turn.">Reset saved audit chain</button>
          </div>

          <div class="acb-section">
            <div class="acb-section-title">Preset data</div>
            <div id="acb-settings-data">
              <button id="acb-import" type="button">Import presets</button>
              <button id="acb-export" type="button">Export presets</button>
            </div>
          </div>
        </div>
      </div>

      <div id="acb-status" role="status" aria-live="polite">
        <div id="acb-status-text" data-kind="info">Ready. Run an audit wave or enable Auto 3 waves.</div>
        <button id="acb-dismiss-status" type="button" title="Clear status">×</button>
      </div>
    `);

    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.hidden = true;
    fileInput.addEventListener('change', handleImportFile);

    document.body.appendChild(panel);
    document.body.appendChild(fileInput);

    renderTabs();
    renderCategoryTabs();
    renderCommands();
    renderManageCategory();
    renderManageList();
    renderConfirm();
    bindAutoRuntimeToCurrentConversation({ claim: false });
    renderAutoAuditState();
    applyDisplayState();
    clampPanelPosition({ report: true });
    updateLockState();
    attachEvents();
    if (site.key === 'chatgpt') {
      startAutoAuditMonitor({ immediate: true });
    }
  }

  function releasePageAutomationOwnership() {
    releaseAutoLease(autoBoundConversationKey);
    if (autoBoundConversationKey?.startsWith('c:')) {
      try { sessionStorage.removeItem(AUTO_DRAFT_SESSION_KEY); } catch (_) { }
    }
  }

  window.addEventListener('pagehide', releasePageAutomationOwnership);
  window.addEventListener('beforeunload', releasePageAutomationOwnership);

  function init() {
    if (document.body) {
      mount();
      return;
    }
    const observer = new MutationObserver(() => {
      if (!document.body) return;
      observer.disconnect();
      mount();
    });
    observer.observe(document.documentElement, { childList: true });
  }

  if (globalThis.__ACB_ENABLE_TEST_HOOK__) {
    Object.defineProperty(globalThis, '__ACB_TEST__', {
      configurable: true,
      value: {
        version: STATE_VERSION,
        constants: {
          AUDIT_COMMAND_MARKERS,
          ASSISTANT_AUTHORED_CONTENT_SELECTOR,
          ASSISTANT_RESPONSE_ACTIONS_SELECTOR,
          AUTO_LEASE_PREFIX,
          AUTO_RUNTIME_PREFIX,
          AUTO_LEGACY_RUNTIME_KEY,
          AUTO_LEGACY_SESSION_KEY,
          AUTO_TAB_SESSION_KEY,
          AUTO_DRAFT_SESSION_KEY
        },
        storage: {
          gmGet: GM_getValue,
          gmSet: GM_setValue,
          gmDelete: GM_deleteValue
        },
        get autoRuntime() { return autoRuntime; },
        get autoBoundConversationKey() { return autoBoundConversationKey; },
        get autoInstanceId() { return autoInstanceId; },
        classifyAuditMessage,
        classifyAuditTurn,
        findAssistantRecoveryControl,
        isAuthoredAssistantContent,
        assistantNeedsContinuation,
        assistantHasRetryError,
        assistantContinueGeneratingButton,
        assistantRetryButton,
        verifyAutoLeaseForSend,
        isLeaseTokenCurrent,
        claimAutoLease,
        readAutoLease,
        writeAutoLease,
        releaseAutoLease,
        chatGPTComposerStateSnapshot,
        sameComposerState,
        createAutoSendOwnershipGuard,
        chatGPTComposerReadyForAutoSend,
        chatGPTComposerRoot,
        getChatGPTInput,
        chatGPTComposerAttachmentTiles,
        chatGPTIsGenerating,
        composerPlainText,
        previousAuditUserTurn,
        latestChatGPTUserTurn,
        resumeRuntimeFromAuditTurn,
        getTurnId,
        turnRole,
        getChatGPTTurns,
        findTurnById,
        stageForAuditKind,
        loadLegacyAutoRuntimeForCurrentConversation,
        loadAutoRuntime,
        normalizeAutoRuntime,
        emptyAutoRuntime,
        refreshAutoRuntimeFromStorage,
        bindAutoRuntimeToCurrentConversation,
        saveAutoRuntime,
        pauseAutoAudit,
        renderAutoAuditState,
        scheduleAutoAuditCheck,
        clearAutoTimers,
        currentConversationKey,
        detectSite,
        ensureAutoAuditObserver,
        startAutoAuditMonitor,
        stopAutoAuditMonitor,
        triggerSend,
        executePreset,
        sendAutoAuditWave,
        sendAutoAuditContinuation,
        autoClickAssistantRecovery,
        setStatus
      }
    });
  }

  init();
})();
