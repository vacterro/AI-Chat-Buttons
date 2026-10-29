# ACBBridge Integration Contract

This document explains the integration of AI ChatButtons with the `ACBBridge` daemon. 

## Integration Status
`AICHATBUTTONS.js` enqueues completed audits into `ACBBridge` using Tampermonkey's `GM_xmlhttpRequest` and `GM_setValue` for persistence. Bridge URLs must be loopback HTTP with no credentials, query, fragment or extra path. Pairing credentials remain in userscript storage and are sent only to that loopback endpoint.

## Configuration Additions
The userscript `state` object now includes:
- `useBridge`: (Boolean) Enable/disable bridge logic.
- `bridgeUrl`: `http://127.0.0.1:17843`
- `bridgeToken`: Your secret token.

## The Userscript Delivery Queue
When an audit wave reaches `COMPLETE`, `AICHATBUTTONS.js` captures it via `captureCompletedAudit()`. We intercept this function to check `state.useBridge`. 
If `useBridge` is true, the script creates a JSON job and pushes it to an array stored in `GM_setValue('acb_bridge_queue')`.

### Enqueue Logic
The queue entry (`job`) looks like:
```json
{
  "job_id": "1691234567_core_1691234567890",
  "run_id": "1691234567",
  "conversation_id": "chatgpt_conversation_key",
  "project": "SAIPEN",
  "wave": "core",
  "status": "complete",
  "completed_at": "2026-08-20T19:16:00.000Z",
  "content": "PROJECT_NAME: SAIPEN\\n...",
  "receipt": "1691234567890",
  "attempts": 0,
  "next_attempt_at": 1691234567890
}
```
We deduplicate jobs by `run_id` and `wave`. 
The queue survives page reloads (F5) and tab closures.

### Flush Logic (`flushBridgeQueue()`)
A background flush process runs inside `AICHATBUTTONS.js`. 
1. It reads the queue and finds jobs where `next_attempt_at <= Date.now()`.
2. It attempts to POST each job to `http://127.0.0.1:17843/v1/audits` using `GM_xmlhttpRequest`.
3. If the bridge responds with HTTP 200:
   - The job is removed from the queue.
4. If the bridge responds with 409 (Conflict), 400, 403, 413, or 415:
   - The failure is considered **permanent**.
   - The job is removed from the queue.
   - The script sets a warning status.
5. If the bridge is offline (Network error) or responds with 5xx (e.g. `output_unavailable`):
   - The failure is considered **retriable**.
   - The job remains in the queue.
   - `attempts` is incremented.
   - `next_attempt_at` is set using exponential backoff (max 60 seconds).
   - This ensures Auto3 keeps computing subsequent waves without pausing, even if the drive is unplugged.

## Super Compact Widget UI
The Mini UI (`renderAutoAuditState`) now checks if there are pending bridge jobs:
```javascript
const pendingBridge = getBridgePendingCount();
if (state?.useBridge && pendingBridge > 0) return 'SAVE';
```
If a wave is completed but the bridge is offline, the status says `DONE / SAVE`. When the bridge comes back online and successfully writes the file, the queue empties and the status returns to `DONE`.
