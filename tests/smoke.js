'use strict';
const { createHarness } = require('./harness');

const h = createHarness();
const api = h.load();
console.log('loadError:', h.loadError ? h.loadError.stack : 'none');
console.log('api:', Boolean(api));
if (api) {
  console.log('version:', api.version);
  console.log('constants keys:', Object.keys(api.constants));
  console.log('storage keys:', Object.keys(api.storage));
  console.log('autoInstanceId:', api.autoInstanceId);
  console.log('autoBoundConversationKey:', api.autoBoundConversationKey);
  console.log('runtime:', api.autoRuntime && { enabled: api.autoRuntime.enabled, stage: api.autoRuntime.stage, conversationKey: api.autoRuntime.conversationKey });
  console.log('classify core:', api.classifyAuditMessage('AUDIT CORE — full sweep of the system'));
  console.log('classify prose:', api.classifyAuditMessage('please run AUDIT CORE on this system'));
  console.log('classify bullet:', api.classifyAuditMessage('- AUDIT CORE\n- something else'));
  console.log('classify second:', api.classifyAuditMessage('AUDIT SECOND WAVE — narrow the list'));
  console.log('classify perf:', api.classifyAuditMessage('AUDIT PERFORMANCE — measure speed'));
}