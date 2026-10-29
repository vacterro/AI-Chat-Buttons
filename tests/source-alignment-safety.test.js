'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {setup, mainEl, assistantTurn, userTurn, addTurns} = require('./helpers');

test('snapshot reads each surface once and never materializes beyond the cap', () => {
  const {h, api} = setup();
  const reads = Array(24).fill(0);
  const turn = assistantTurn(h, 'bounded', message => {
    for (let i = 0; i < reads.length; i++) {
      const surface = h.el('div', {class:'markdown prose'});
      surface._text = 'unique surface ' + i;
      Object.defineProperty(surface, 'innerText', {get() { reads[i]++; return this.textContent; }});
      message.appendChild(surface);
    }
  });
  let wholeReads = 0;
  Object.defineProperty(turn, 'innerText', {get() { wholeReads++; return this.textContent; }});
  addTurns(h, [turn]);
  const snapshot = api.buildAssistantSnapshot(turn);
  assert.equal(snapshot.candidates.length, 16);
  assert.deepEqual(reads, Array.from({length:24}, (_, i) => i < 16 ? 1 : 0));
  assert.equal(wholeReads, 1, 'a shared turn/message node must not be read twice');
  assert.ok(snapshot.whole[0].includes('unique surface 23'), 'full output remains represented beyond candidate cap');
});

test('exact attachment-framed commands survive context, examples never issue commands', () => {
  const {api} = setup();
  assert.equal(api.classifyAuditMessage('project.zip\nAUDIT CORE\nThe complete command is attached as "AUDIT_CORE_test.md".'), 'core');
  for (const example of ['project.zip\n```\nAUDIT CORE\n```', '> AUDIT CORE', 'please describe AUDIT CORE', 'AUDIT_CORE_test.md']) {
    assert.equal(api.classifyAuditMessage(example), '', example);
  }
});

test('supplemental context preserves lineage but a different explicit audit closes it', () => {
  const {h, api} = setup();
  const core = userTurn(h, 'core', 'AUDIT CORE');
  const context = userTurn(h, 'context', 'The project is in this attached archive.');
  const performance = userTurn(h, 'perf', 'AUDIT PERFORMANCE');
  const second = userTurn(h, 'second', 'AUDIT SECOND WAVE');
  addTurns(h, [core, context, second]);
  assert.equal(api.previousAuditUserTurn(second, 'core'), core);
  second.remove();
  addTurns(h, [performance, second]);
  assert.equal(api.previousAuditUserTurn(second, 'core'), null, 'never cross an unrelated explicit wave');
});

test('observer ignores empty records, then rebinds on a real removal record', () => {
  const {h, api} = setup();
  const oldMain = mainEl(h);
  api.startAutoAuditMonitor();
  const newMain = h.el('main');
  oldMain.remove();
  h.dom.body.appendChild(newMain);
  const observed = root => [...h._observers].filter(o => o.connected && o.root === root);
  const before = h.timers.pending().length;
  h.mutate(oldMain, []);
  assert.equal(observed(oldMain).length, 1);
  assert.equal(h.timers.pending().length, before);
  h.mutate(oldMain, [{type:'childList', target:h.dom.body, addedNodes:[newMain], removedNodes:[oldMain]}]);
  assert.equal(observed(oldMain).length, 0);
  assert.equal(observed(newMain).length, 1);
});

test('disabled observer never starts audit evaluation for a real added turn', () => {
  const {h, api} = setup();
  const main = mainEl(h);
  api.startAutoAuditMonitor();
  h.advance(0);
  const before = h.timers.pending().length;
  const turn = userTurn(h, 'unrequested', 'AUDIT CORE');
  main.appendChild(turn);
  h.mutate(main, [{type:'childList', target:main, addedNodes:[turn], removedNodes:[]}]);
  assert.equal(h.timers.pending().length, before);
  assert.equal(api.autoRuntime.enabled, false);
});

test('bridge credential destinations must stay loopback and have no extra URL authority', () => {
  const {api} = setup();
  assert.equal(api.normalizedBridgeUrl('http://127.0.0.1:17843'), 'http://127.0.0.1:17843');
  for (const url of ['https://127.0.0.1', 'http://evil.example', 'http://localhost@evil.example', 'http://localhost/?token=x', 'http://localhost/path']) {
    assert.equal(api.normalizedBridgeUrl(url), '', url);
  }
});
