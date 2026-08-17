// ==UserScript==
// @name         AI ChatButtons
// @namespace    https://github.com/local/ai-chatbuttons
// @version      0.0.1
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
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'ai_chatbuttons_v6';
  const STATE_VERSION = 4;
  const BUILTIN_REVISION = 3;
  const MAX_CATEGORIES = 10;
  const MAX_PRESETS = 20;
  const PANEL_WIDTH = 264;
  const PANEL_HEIGHT = 372;
  const PANEL_SIZES = Object.freeze({
    compact: Object.freeze({ width: 220, height: 320, label: 'Compact' }),
    normal: Object.freeze({ width: PANEL_WIDTH, height: PANEL_HEIGHT, label: 'Normal' }),
    large: Object.freeze({ width: 320, height: 448, label: 'Large' })
  });
  const OPACITY_LEVELS = Object.freeze([100, 75, 50, 25]);
  const PANEL_EDGE_MARGIN = 8;

  const AUDIT_CORE = [
    'AUDIT CORE — read-only software quality first pass.',
    '',
    'Purpose and scope:',
    '- Review only the implementation artifact the user explicitly supplied or linked in this conversation.',
    '- The target may be a repository URL, attached archive, attached file, pasted code, or project tree.',
    '- This is a software correctness and maintainability review. Work from the artifact itself and ordinary read access only.',
    '- Do not interact with, test, modify, or inspect any account, service, host, endpoint, infrastructure, or resource outside the supplied artifact.',
    '- If the target is unavailable, private without access, or genuinely ambiguous, stop with BLOCKED and state exactly what artifact or access is missing.',
    '',
    'Target resolution:',
    '- Prefer the most recent explicit implementation target in the conversation.',
    '- Repository URL: inspect only the repository content that is normally readable from that URL. Use the requested branch/commit when given; otherwise use the current default branch. Record the inspected baseline when available.',
    '- Archive: unpack it fully and inspect the actual project tree, not only top-level documentation.',
    '- File/code: inspect the complete supplied artifact and directly referenced local contracts when available.',
    '',
    'Audit correctness before style. Trace the real program path end-to-end:',
    'input -> parsing/validation -> state changes -> core logic -> persistence/I/O -> recovery/error paths -> output/UI.',
    '',
    'Find verified defects such as:',
    '- contradictory logic or broken invariants;',
    '- duplicate or competing implementations of the same rule;',
    '- dead, unreachable, stale, or partially migrated code;',
    '- wrong defaults, missing validation, hidden assumptions, or ordering mistakes;',
    '- data-loss or state-loss paths;',
    '- lifecycle/init/teardown mistakes;',
    '- persistence, serialization, import/export, restart, and recovery mistakes;',
    '- UI state disagreeing with runtime state;',
    '- docs/schema/config/API/CLI contracts disagreeing with actual behavior;',
    '- fallbacks that choose the wrong path or hide a real failure;',
    '- tests that validate the wrong behavior or miss an important invariant.',
    '',
    'Weak-model hardening:',
    '- Replace ambiguous rules with one canonical rule or implementation path.',
    '- Prefer root causes over symptoms.',
    '- Merge duplicate findings.',
    '- Preserve behavior that is already correct.',
    '- Do not add architecture, dependencies, abstractions, dashboards, telemetry, or speculative features unless a verified defect requires them.',
    '- Do not modify the audited artifact during this pass. Produce instructions for the implementation agent instead.',
    '',
    'Every finding must be supported by the inspected artifact. Do not guess. If evidence is insufficient, omit the finding or mark the exact missing evidence.',
    '',
    'Final response: ONE concise code block only. No preamble, essay, or generic advice.',
    'Use exactly:',
    '[P0|P1|P2] path/module/symbol -> verified defect -> exact minimal fix -> verification/test',
    '',
    'Order by impact and dependency. End with:',
    'DONE WHEN: <small explicit completion gate>.',
    '',
    'Keep the directive deterministic, surgical, token-friendly, and executable without follow-up questions.'
  ].join('\n');

  const AUDIT_SECOND_WAVE = [
    'AUDIT SECOND WAVE — read-only complementary software quality pass.',
    '',
    'Precondition: a completed Audit Core for this same target must already exist in the current conversation. If it does not, stop with exactly:',
    'BLOCKED: run Audit Core first for this target.',
    '',
    'Scope:',
    '- Use the same supplied implementation artifact and baseline as Audit Core unless the user explicitly provided a newer revision.',
    '- Review only that artifact with ordinary read access.',
    '- Do not interact with, test, modify, or inspect anything outside the supplied artifact.',
    '- This pass must find what the first pass reasonably could have missed. Do not pad the result by repeating first-wave findings.',
    '',
    'If the artifact revision changed, record the new baseline and verify everything against the current revision.',
    '',
    'Do NOT re-list a first-wave finding unless it is still present, regressed, or directly causes a newly verified defect.',
    '',
    'Inspect boundary and edge behavior:',
    '- initialization, shutdown, cleanup, and repeated startup;',
    '- ownership of mutable state and single-source-of-truth rules;',
    '- empty, invalid, partial, maximum-size, and unusual-but-valid inputs;',
    '- ordering assumptions and out-of-order local events;',
    '- repeated actions, duplicate invocation, cancellation, retries, and idempotence;',
    '- stale references, stale caches, stale UI state, and delayed results;',
    '- persistence, migration, serialization, import/export, partial writes, restart, and recovery;',
    '- resource cleanup and long-session accumulation;',
    '- file/path/locale/platform differences relevant to the project;',
    '- error propagation and fallback precedence;',
    '- UI state versus runtime state;',
    '- config/schema/version/API/CLI/documentation drift;',
    '- integration gaps hidden by mocks or narrow tests.',
    '',
    'Reason through realistic local failure scenarios from the code itself:',
    '- operation interrupted midway;',
    '- same action invoked twice;',
    '- stale stored state loaded after an update;',
    '- partial or missing file;',
    '- slow or unavailable dependency;',
    '- zero items and maximum supported items;',
    '- Unicode, spaces, long paths, or unusual valid text;',
    '- restart immediately after a failed operation.',
    '',
    'Only include scenarios that actually apply to this project. No speculative redesign and no generic checklist dumping.',
    '',
    'Also hunt duplicated truths: the same constant, parser, validator, transition, selector, mapping, or business rule implemented in multiple places. Consolidate only when it clearly reduces drift without adding complexity.',
    '',
    'Every finding must be verified against the current artifact.',
    '',
    'Final response: ONE concise code block only. Produce only NEW, REGRESSED, or STILL-BROKEN findings.',
    'Use exactly:',
    '[P0|P1|P2] path/module/symbol -> verified second-wave defect -> exact minimal fix -> verification/test',
    '',
    'End with:',
    'SECOND WAVE DONE WHEN: <explicit gate proving the new findings are fixed and the first wave was not merely repeated>.',
    '',
    'Keep the directive deterministic, surgical, token-friendly, and executable without follow-up questions.'
  ].join('\n');

  const AUDIT_PERFORMANCE = [
    'AUDIT PERFORMANCE / STABILITY / EFFECTIVENESS — read-only third pass.',
    '',
    'Precondition: both Audit Core and Audit Second Wave for this same target must already exist in the current conversation. If either is missing, stop with exactly:',
    'BLOCKED: run Audit Core and Audit Second Wave first for this target.',
    '',
    'Scope:',
    '- Review only the same supplied implementation artifact and its current baseline.',
    '- This is optimization of program behavior, responsiveness, resource use, and stability.',
    '- Do not interact with or load-test external systems. If a live measurement is unavailable, specify a local benchmark or verification method instead of inventing numbers.',
    '- Correctness and observable behavior are invariants. Do not trade determinism, accessibility, recoverability, or clear state for benchmark cosmetics.',
    '',
    'Primary goal: maximum responsiveness with less wasted work.',
    '',
    'Inspect real hot paths for:',
    '- repeated parsing, serialization, validation, or transformation;',
    '- repeated broad DOM/tree scans or unnecessarily broad selectors;',
    '- duplicate allocations, copies, conversions, or temporary objects;',
    '- repeated file or local I/O that can be safely avoided;',
    '- unnecessary synchronous work in clicks, keystrokes, startup, render, or frequent events;',
    '- excessive timers, retries, polling, or repeated status checks;',
    '- repeated render/rebuild cycles, layout/reflow churn, or unnecessary repaint work;',
    '- duplicate event listeners or stale subscriptions;',
    '- stale caches, caches without clear invalidation, or repeated work that should use stable cached data;',
    '- unbounded queues, logs, lists, buffers, or retained objects;',
    '- blocking startup work that can be delayed until explicitly needed;',
    '- fallbacks that cost more than the normal success path.',
    '',
    'Stability pass:',
    '- double-submit or double-dispatch;',
    '- stale async results applied after state changed;',
    '- cancellation and teardown mistakes;',
    '- retry storms or excessively long retry chains;',
    '- partial failure and recovery;',
    '- repeated long-session behavior;',
    '- deterministic ordering and bounded resource use.',
    '',
    'Effectiveness pass:',
    '- remove redundant branches or helpers when one canonical path is both simpler and faster;',
    '- move expensive work out of hot paths;',
    '- cache only stable data with explicit invalidation;',
    '- prefer event-driven updates over polling when behavior remains predictable;',
    '- batch/coalesce work only when it cannot delay user-visible actions;',
    '- reject optimizations whose gain is negligible, unprovable, or bought with extra complexity.',
    '',
    'UI rule when a UI exists:',
    '- input and button response should feel immediate;',
    '- no layout shifts caused by this tool;',
    '- no unnecessary work on every pointer move, keystroke, frame, or render;',
    '- stable dimensions and narrow DOM scope;',
    '- event handlers should perform the minimum synchronous work;',
    '- preserve the project UI contract exactly.',
    '',
    'For each finding classify the evidence as one of:',
    'PROVEN BOTTLENECK | STRONGLY EVIDENCED WASTE | LOW-RISK SIMPLIFICATION.',
    '',
    'Never fabricate timings. When direct measurement is unavailable, provide the exact benchmark or regression test to run.',
    '',
    'Final response: ONE concise code block only. No prose outside it.',
    'Use exactly:',
    '[P0|P1|P2] path/module/symbol -> evidence class + bottleneck/stability waste -> exact optimization -> behavior guardrail -> benchmark/verification',
    '',
    'End with:',
    'PERFORMANCE PASS DONE WHEN: <explicit responsiveness, stability, and behavior gates>.',
    '',
    'Keep the directive deterministic, surgical, token-friendly, and executable without follow-up questions.'
  ].join('\n');

  const BUILTIN_PRESETS = [
    {
      builtinId: 'audit-core-v2-quality',
      legacyIds: ['audit-core-v1'],
      name: 'Audit Core',
      desc: 'Read-only first-pass correctness and logic review',
      text: AUDIT_CORE
    },
    {
      builtinId: 'audit-second-wave-v2-quality',
      legacyIds: ['audit-second-wave-v1'],
      name: 'Audit Second Wave',
      desc: 'Read-only complementary edge and lifecycle review',
      text: AUDIT_SECOND_WAVE
    },
    {
      builtinId: 'audit-performance-v2-quality',
      legacyIds: ['audit-performance-v1'],
      name: 'Audit Performance',
      desc: 'Read-only performance, stability, and effectiveness review',
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
  height: 20px !important;
  min-height: 20px !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 0 2px !important;
  background: var(--surface) !important;
  color: var(--textPrimary) !important;
  border-bottom: 2px solid var(--borderDark) !important;
  user-select: none !important;
  touch-action: none !important;
}

#acb-titlebar.acb-movable { cursor: move !important; }
#acb-title { flex: 1 1 auto !important; min-width: 0 !important; font-size: 12px !important; font-weight: 700 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
#acb-site { flex: 0 1 auto !important; max-width: 82px !important; color: var(--textSecondary) !important; font-size: 10px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }

#acb-popup button,
#acb-popup .acb-buttonlike {
  min-width: 24px !important;
  min-height: 20px !important;
  margin: 0 !important;
  padding: 2px 6px !important;
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
  min-width: 58px !important;
  min-height: 16px !important;
  height: 16px !important;
  padding: 1px 4px !important;
  font-size: 10px !important;
}

#acb-displaybar {
  min-height: 24px !important;
  height: 24px !important;
  display: flex !important;
  align-items: center !important;
  gap: 3px !important;
  padding: 2px !important;
  background: var(--backgroundSoft) !important;
  border-bottom: 2px solid var(--borderDark) !important;
}
.acb-display-field {
  display: flex !important;
  align-items: center !important;
  gap: 2px !important;
  min-width: 0 !important;
}
.acb-display-field label {
  color: var(--textSecondary) !important;
  font-size: 10px !important;
  white-space: nowrap !important;
}
#acb-opacity { width: 48px !important; min-width: 48px !important; }
#acb-size { width: 72px !important; min-width: 72px !important; }
#acb-lock {
  flex: 1 1 auto !important;
  min-width: 40px !important;
  min-height: 20px !important;
  height: 20px !important;
  padding: 1px 4px !important;
  font-size: 10px !important;
}

#acb-popup[data-collapsed="true"] #acb-displaybar,
#acb-popup[data-collapsed="true"] #acb-tabs,
#acb-popup[data-collapsed="true"] #acb-content,
#acb-popup[data-collapsed="true"] #acb-status {
  display: none !important;
}
#acb-popup[data-collapsed="true"] #acb-titlebar {
  border-bottom: 0 !important;
}

#acb-tabs {
  display: flex !important;
  gap: 0 !important;
  padding: 2px 2px 0 2px !important;
  background: var(--backgroundSoft) !important;
}
#acb-tabs button { flex: 1 1 0 !important; }
#acb-tabs button[aria-selected="true"] {
  border-color: var(--borderDark) var(--bevelLight) var(--bevelLight) var(--borderDark) !important;
  background: var(--selection) !important;
}

#acb-content {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: 4px !important;
  background: var(--background) !important;
}

.acb-view {
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  background: var(--background) !important;
}
.acb-view[hidden] { display: none !important; }

.acb-section {
  margin: 0 0 8px 0 !important;
  padding: 4px !important;
  background: var(--backgroundSoft) !important;
  border: 1px solid var(--borderMuted) !important;
}
.acb-section:last-child { margin-bottom: 0 !important; }
.acb-section-title { margin: 0 0 4px 0 !important; color: var(--textPrimary) !important; font-size: 12px !important; font-weight: 700 !important; }
.acb-label { display: block !important; margin: 0 0 2px 0 !important; color: var(--textSecondary) !important; font-size: 10px !important; }

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
#acb-popup select { height: 20px !important; padding: 1px 3px !important; }
#acb-popup textarea { min-height: 96px !important; height: 96px !important; padding: 3px !important; resize: none !important; }
#acb-popup input.acb-error,
#acb-popup textarea.acb-error { border-color: var(--danger) !important; color: var(--dangerText) !important; }

#acb-catbar {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 1px !important;
  margin-bottom: 4px !important;
}
#acb-catbar button { flex: 1 1 auto !important; min-width: 52px !important; font-size: 10px !important; padding: 1px 4px !important; }
#acb-catbar button[aria-selected="true"] {
  border-color: var(--borderDark) var(--bevelLight) var(--bevelLight) var(--borderDark) !important;
  background: var(--selection) !important;
}

#acb-filter-wrap { margin-bottom: 4px !important; }
#acb-command-list { display: flex !important; flex-direction: column !important; gap: 2px !important; }
.acb-command-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 56px 44px !important;
  gap: 2px !important;
  align-items: stretch !important;
  min-height: 28px !important;
  padding: 2px !important;
  background: var(--backgroundSoft) !important;
  border: 1px solid var(--borderMuted) !important;
}
.acb-command-name {
  min-width: 0 !important;
  align-self: center !important;
  color: var(--textPrimary) !important;
  font-size: 11px !important;
  overflow: hidden !important;
  white-space: nowrap !important;
  text-overflow: ellipsis !important;
}
.acb-command-row button { min-height: 24px !important; padding: 1px 3px !important; font-size: 10px !important; }
.acb-empty { padding: 8px 4px !important; color: var(--textMuted) !important; font-size: 11px !important; text-align: center !important; border: 1px solid var(--borderMuted) !important; background: var(--backgroundSoft) !important; }

.acb-row { display: flex !important; gap: 2px !important; align-items: center !important; margin-top: 4px !important; }
.acb-row > * { flex: 1 1 0 !important; min-width: 0 !important; }
#acb-manage-category { margin-bottom: 2px !important; }

#acb-manage-list { display: flex !important; flex-direction: column !important; gap: 2px !important; }
.acb-manage-row {
  padding: 2px !important;
  background: var(--backgroundSoft) !important;
  border: 1px solid var(--borderMuted) !important;
}
.acb-manage-name { margin-bottom: 2px !important; font-size: 11px !important; color: var(--textPrimary) !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
.acb-manage-actions { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 1px !important; }
.acb-manage-actions button { min-width: 0 !important; padding: 1px 2px !important; font-size: 10px !important; }

#acb-editor[hidden] { display: none !important; }
.acb-field { margin-bottom: 4px !important; }
#acb-editor-actions { display: flex !important; gap: 2px !important; }
#acb-editor-actions button { flex: 1 1 0 !important; }

#acb-confirm-text {
  min-height: 34px !important;
  padding: 3px !important;
  overflow-y: auto !important;
  background: var(--compareBack) !important;
  color: var(--textSecondary) !important;
  border: 1px solid var(--borderMuted) !important;
  font-size: 10px !important;
}

#acb-status {
  min-height: 42px !important;
  height: 42px !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 54px !important;
  gap: 2px !important;
  align-items: stretch !important;
  padding: 3px !important;
  background: var(--surfaceRaised) !important;
  border-top: 2px solid var(--borderDark) !important;
}
#acb-status-text {
  min-width: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 2px 3px !important;
  background: var(--compareBack) !important;
  color: var(--textSecondary) !important;
  border: 1px solid var(--borderMuted) !important;
  font-size: 10px !important;
  line-height: 1.2 !important;
}
#acb-status-text[data-kind="success"] { color: var(--textPrimary) !important; }
#acb-status-text[data-kind="warning"] { color: var(--borderHighlight) !important; }
#acb-status-text[data-kind="error"] { color: var(--dangerText) !important; }
#acb-status button { padding: 1px 3px !important; font-size: 10px !important; }

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
    const url = location.href.toLowerCase();
    for (const [key, site] of Object.entries(SITES)) {
      if (site.hosts.some(candidate => host === candidate.replace(/^www\./, '') || host.endsWith(`.${candidate.replace(/^www\./, '')}`) || url.includes(candidate))) {
        return { key, ...site };
      }
    }
    return {
      key: 'unknown',
      label: host || 'AI',
      getInput: () => queryDeepFirst('textarea, div[contenteditable="true"], input[type="text"]'),
      getSend: () => queryDeepFirst('button[type="submit"], button[aria-label*="send" i]')
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
      activeCategoryId: audit.id,
      categories: [audit]
    };
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
          presets.push({
            id: String(rawPreset.id || uid()),
            ...(rawPreset.builtinId ? { builtinId: String(rawPreset.builtinId) } : {}),
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
    const currentRevision = Number(data.builtinRevision) || 0;
    if (currentRevision >= BUILTIN_REVISION) return;

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
      let existing = null;

      for (const category of data.categories) {
        existing = category.presets.find(preset =>
          preset.builtinId === builtin.builtinId ||
          builtin.legacyIds.includes(preset.builtinId)
        );
        if (existing) break;
      }

      if (existing) {
        existing.builtinId = builtin.builtinId;
        existing.name = builtin.name;
        existing.desc = builtin.desc;
        existing.text = builtin.text;
        continue;
      }

      const sameNameExists = data.categories.some(category =>
        category.presets.some(preset => preset.name === builtin.name)
      );

      if (!sameNameExists && audit.presets.length < MAX_PRESETS) {
        audit.presets.push({
          id: uid(),
          builtinId: builtin.builtinId,
          name: builtin.name,
          desc: builtin.desc,
          text: builtin.text
        });
      }
    }

    data.builtinRevision = BUILTIN_REVISION;
    data.builtinsSeededV2 = true;
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
      GM_setValue(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      setStatus('Could not save settings. Browser userscript storage rejected the write; retry after checking extension permissions.', 'error');
    }
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
  }

  function renderCategoryTabs() {
    const container = panel?.querySelector('#acb-catbar');
    if (!container) return;
    container.textContent = '';
    for (const category of state.categories) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = category.name;
      button.title = category.name;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', category.id === state.activeCategoryId ? 'true' : 'false');
      button.addEventListener('click', () => {
        state.activeCategoryId = category.id;
        saveState();
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

  function renderCommands() {
    const list = panel?.querySelector('#acb-command-list');
    const filter = panel?.querySelector('#acb-filter');
    if (!list || !filter) return;
    const category = activeCategory();
    const query = filter.value.trim().toLowerCase();
    const presets = category
      ? category.presets.filter(preset => !query || `${preset.name}\n${preset.desc}\n${preset.text}`.toLowerCase().includes(query))
      : [];

    list.textContent = '';
    if (!presets.length) {
      const empty = document.createElement('div');
      empty.className = 'acb-empty';
      empty.textContent = query ? 'No commands match this filter.' : 'This category has no commands.';
      list.appendChild(empty);
      return;
    }

    for (const preset of presets) {
      const row = document.createElement('div');
      row.className = 'acb-command-row';
      row.dataset.presetId = preset.id;
      setHTML(row, `
        <div class="acb-command-name" title="${escapeHTML(preset.desc || preset.text)}">${escapeHTML(preset.name)}</div>
        <button type="button" data-action="append" aria-label="Append ${escapeHTML(preset.name)} to composer">Append</button>
        <button type="button" data-action="run" aria-label="Append ${escapeHTML(preset.name)} and send">Run</button>
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
      preset.name = name.slice(0, 40);
      preset.desc = desc.slice(0, 100);
      preset.text = text;
      saveState();
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
    category.presets.push(preset);
    saveState();
    renderCommands();
    renderManageList();
    hideEditor();
    setStatus(`Added command: ${preset.name}.`, 'success');
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function triggerSend(site, input) {
    const retryDelays = [0, 35, 70, 120, 180, 260];
    for (const delay of retryDelays) {
      if (delay) await sleep(delay);
      const button = cachedSiteElement(site, 'send');
      if (button && !button.disabled && button.getAttribute('aria-disabled') !== 'true') {
        button.click();
        return { ok: true, mode: 'button' };
      }
    }

    if (site.allowEnterFallback === false) {
      return { ok: false, mode: 'manual-only' };
    }

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

  async function executePreset(preset, mode) {
    if (actionInFlight) {
      setStatus('A command action is already running. Wait for that action to finish before triggering another one.', 'warning');
      return;
    }

    actionInFlight = true;
    try {
      const site = detectSite();
      const siteLabel = site.label;
      const input = cachedSiteElement(site, 'input');
      if (!input) {
        setStatus(`Composer not found on ${siteLabel}. Open a chat composer on this page, then press ${mode === 'run' ? 'Run' : 'Append'} again.`, 'error');
        return;
      }

      setStatus(`${mode === 'run' ? 'Running' : 'Appending'} ${preset.name}...`, 'info');
      await yieldToBrowser();

      const inputValidator = site.validateInput;
      if (!input.isConnected || !isVisible(input) || (inputValidator && !inputValidator(input))) {
        elementCache.input = null;
        elementCache.send = null;
        setStatus(`Composer changed before insertion on ${siteLabel}. No text was written. Close message editing or restore the main composer, then retry.`, 'error');
        return;
      }

      const appended = smartAppend(input, preset.text);
      if (!appended) {
        elementCache.input = null;
        setStatus(`Could not write to the ${siteLabel} composer. The page editor rejected scripted input; click the composer once and retry.`, 'error');
        return;
      }

      if (mode === 'append') {
        setStatus(`Appended ${preset.name} to the ${siteLabel} composer. Existing composer text was preserved.`, 'success');
        return;
      }

      setStatus(`Inserted ${preset.name}. Waiting briefly for the ${siteLabel} Send control...`, 'info');
      await yieldToBrowser();
      const result = await triggerSend(site, input);
      if (result.ok) {
        setStatus(`Run triggered: ${preset.name}. The ${siteLabel} Send control was clicked.`, 'success');
      } else if (result.mode === 'enter-fallback') {
        setStatus(`Prompt was inserted, but the ${siteLabel} Send control did not become ready. Enter fallback was triggered; verify the site accepted it, otherwise press Send manually.`, 'warning');
      } else if (result.mode === 'manual-only') {
        setStatus(`Prompt was inserted into the verified ${siteLabel} composer, but its Send control did not become ready. Automatic Enter fallback is disabled on this site to prevent sending or editing the wrong field. Press Send manually.`, 'warning');
      } else {
        setStatus(`Prompt was inserted, but ${siteLabel} could not be sent automatically. Press the site's Send control manually.`, 'warning');
      }
    } catch (error) {
      setStatus(`Command action failed: ${error?.message || 'unexpected runtime error'}. Retry once; if it repeats, use Append and send manually.`, 'error');
    } finally {
      actionInFlight = false;
    }
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
    state.categories.push(category);
    state.activeCategoryId = category.id;
    saveState();
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
    category.name = name;
    saveState();
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
    const [preset] = category.presets.splice(index, 1);
    category.presets.splice(next, 0, preset);
    saveState();
    renderCommands();
    renderManageList();
    setStatus(`Moved ${preset.name} ${delta < 0 ? 'up' : 'down'} in ${category.name}.`, 'success');
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
      state.categories = state.categories.filter(item => item.id !== category.id);
      if (!state.categories.some(item => item.id === state.activeCategoryId)) {
        state.activeCategoryId = state.categories[0].id;
      }
      saveState();
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
      category.presets = category.presets.filter(item => item.id !== preset.id);
      saveState();
      renderCommands();
      renderManageList();
      if (editingPresetId === preset.id) hideEditor();
      renderConfirm();
      setStatus(`Deleted command: ${preset.name}.`, 'success');
      return;
    }

    if (action.type === 'import-replace') {
      state.categories = action.categories.map(category => ({
        id: uid(),
        name: category.name,
        presets: category.presets.map(preset => ({
          id: uid(),
          name: preset.name,
          desc: preset.desc,
          text: preset.text
        }))
      }));
      state.activeCategoryId = state.categories[0].id;
      state.builtinRevision = BUILTIN_REVISION;
      state.builtinsSeededV2 = true;
      saveState();
      renderCategoryTabs();
      renderCommands();
      renderManageCategory();
      renderManageList();
      hideEditor();
      renderConfirm();
      setStatus(`Imported ${action.commandCount} command(s) into ${state.categories.length} category(s).`, 'success');
      return;
    }

    renderConfirm();
    setStatus('Pending action was not executed: its type is unsupported. Request the action again from the current UI.', 'error');
  }

  function attachEvents() {
    panel.querySelector('#acb-collapse').addEventListener('click', () => {
      state.collapsed = !state.collapsed;
      saveState();
      clampPanelPosition({ report: true });
      if (!state.collapsed) {
        setStatus('Widget expanded. Display state restored.', 'success');
      }
    });

    panel.querySelector('#acb-opacity').addEventListener('change', event => {
      const next = Number(event.target.value);
      if (!OPACITY_LEVELS.includes(next)) return;
      state.opacity = next;
      saveState();
      applyDisplayState();
      setStatus(`Widget opacity set to ${next}%.`, 'success');
    });

    panel.querySelector('#acb-size').addEventListener('change', event => {
      const next = String(event.target.value);
      if (!Object.prototype.hasOwnProperty.call(PANEL_SIZES, next)) return;
      state.panelSize = next;
      saveState();
      clampPanelPosition({ report: true });
      setStatus(`Widget size set to ${PANEL_SIZES[next].label}.`, 'success');
    });

    panel.querySelector('#acb-lock').addEventListener('click', () => {
      const nextLocked = !state.posLocked;
      if (nextLocked) clampPanelPosition({ commit: true });
      state.posLocked = nextLocked;
      saveState();
      updateLockState();
      setStatus(`Position ${state.posLocked ? 'locked' : 'unlocked'}.`, 'success');
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
      setStatus(`Opened ${activeView === 'commands' ? 'Commands' : 'Manage'} view.`, 'info');
    });

    panel.querySelector('#acb-filter').addEventListener('input', renderCommands);

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
      state.activeCategoryId = event.target.value;
      saveState();
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
      setStatus('Ready. Append preserves composer text; Run appends the command and sends.', 'info');
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

      clampPanelPosition({ commit: true });
      saveState();

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

      <div id="acb-displaybar" aria-label="Widget display controls">
        <div class="acb-display-field">
          <label for="acb-opacity">Opacity</label>
          <select id="acb-opacity" aria-label="Widget opacity">
            <option value="100">100%</option>
            <option value="75">75%</option>
            <option value="50">50%</option>
            <option value="25">25%</option>
          </select>
        </div>
        <div class="acb-display-field">
          <label for="acb-size">Size</label>
          <select id="acb-size" aria-label="Widget size">
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="large">Large</option>
          </select>
        </div>
        <button id="acb-lock" type="button" aria-pressed="false" title="Lock or unlock panel position">Lock</button>
      </div>

      <div id="acb-tabs" role="tablist" aria-label="AI ChatButtons views">
        <button type="button" role="tab" data-view="commands" aria-selected="true">Commands</button>
        <button type="button" role="tab" data-view="manage" aria-selected="false">Manage</button>
      </div>

      <div id="acb-content">
        <div id="acb-view-commands" class="acb-view" role="tabpanel">
          <div class="acb-section">
            <div class="acb-section-title">Commands</div>
            <div id="acb-catbar" role="tablist" aria-label="Command categories"></div>
            <div id="acb-filter-wrap">
              <label class="acb-label" for="acb-filter">Filter commands</label>
              <input id="acb-filter" type="text" autocomplete="off" aria-label="Filter commands" />
            </div>
            <div id="acb-command-list" aria-live="off"></div>
          </div>
        </div>

        <div id="acb-view-manage" class="acb-view" role="tabpanel" hidden>
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
            <div class="acb-section-title">Preset file</div>
            <div class="acb-row">
              <button id="acb-import" type="button">Import</button>
              <button id="acb-export" type="button">Export</button>
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
      </div>

      <div id="acb-status" role="status" aria-live="polite">
        <div id="acb-status-text" data-kind="info">Ready. Append preserves composer text; Run appends the command and sends.</div>
        <button id="acb-dismiss-status" type="button">Dismiss</button>
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
    applyDisplayState();
    clampPanelPosition({ report: true });
    updateLockState();
    attachEvents();
  }

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

  init();
})();
