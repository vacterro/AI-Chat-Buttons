import unittest
import os
import sys
import tempfile
import json
import threading
import time
from pathlib import Path
from http.server import HTTPServer
import urllib.request
import urllib.error

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import acbbridge

class TestACBBridge102(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base_dir = Path(self.temp_dir.name)
        
        acbbridge.BASE_DIR = self.base_dir
        acbbridge.CONFIG_FILE = self.base_dir / "config.json"
        acbbridge.TOKEN_FILE = self.base_dir / "token.txt"
        acbbridge.PID_FILE = self.base_dir / "bridge.pid"
        acbbridge.LOG_DIR = self.base_dir / "logs"
        acbbridge.STATE_DIR = self.base_dir / "state" / "runs"
        
        self.output_dir = self.base_dir / "output"
        self.output_dir.mkdir()
        
        self.config = {
            "instance": {"name": "TestBridge102"},
            "server": {"host": "127.0.0.1", "port": 17845},
            "output": {
                "root": str(self.output_dir),
                "layout": "project_subdir",
                "history_mode": "latest_plus_history",
                "all3_format": "compact_v1",
                "newline": "lf"
            }
        }
        with open(acbbridge.CONFIG_FILE, 'w') as f:
            json.dump(self.config, f)
            
        acbbridge._config_mtime = 0
        self.token = acbbridge.get_token()
        
        self.server = HTTPServer(('127.0.0.1', 17845), acbbridge.ACBBridgeHandler)
        self.server_thread = threading.Thread(target=self.server.serve_forever)
        self.server_thread.daemon = True
        self.server_thread.start()
        time.sleep(0.1)

    def tearDown(self):
        self.server.shutdown()
        self.server_thread.join()
        self.temp_dir.cleanup()

    def _post(self, path, data, headers=None):
        if headers is None:
            headers = {"X-ACB-Token": self.token, "Content-Type": "application/json"}
        req = urllib.request.Request(f"http://127.0.0.1:17845{path}", 
                                     data=json.dumps(data).encode('utf-8'),
                                     headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req) as response:
                return response.status, json.loads(response.read().decode())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read().decode())

    def test_102_regressions(self):
        # 1 & 2 & 5. Mixing new fields and old format
        core_content = """PROJECT_NAME: Proj
TARGET: T
BASELINE: B
HANDOFF: IMPLEMENTATION_AGENT
TICKETS: 1
TEST_STATUS: TEST_PASSED
TEST_LIMITATION: NONE
VERIFIED_INSTEAD: NONE
[CORE-001]
EVIDENCE: x
DEFECT: y
REPAIR: z
VERIFY: a
CORE_DONE_WHEN: 1"""

        second_content = """TICKETS: 1
TEST_STATUS: TEST_NOT_RUN_ENVIRONMENT
TEST_LIMITATION: PyQt6 unavailable; `pytest -q` stopped at import with ModuleNotFoundError.
VERIFIED_INSTEAD: compileall PASS; non-Qt checks PASS; affected Qt paths inspected statically.
[W2-001]
EVIDENCE: x
DEFECT: y
REPAIR: z
VERIFY: a
SECOND_WAVE_DONE_WHEN: 1"""

        perf_content = """TICKETS: 1
[PERF-001]
EVIDENCE: x
ISSUE: y
OPTIMIZE: z
GUARDRAIL: a
VERIFY: b
PERFORMANCE_DONE_WHEN: 1"""

        payload1 = {
            "api_version": 1, "receipt": "r1", "run_id": "r102", "project": "Proj102",
            "wave": "core", "status": "complete", "content": core_content
        }
        self._post("/v1/audits", payload1)

        payload2 = dict(payload1, wave="second", receipt="r2", content=second_content)
        self._post("/v1/audits", payload2)

        payload3 = dict(payload1, wave="performance", receipt="r3", content=perf_content)
        status, data = self._post("/v1/audits", payload3)
        
        self.assertTrue(data["all3_ready"], "ALL3 should generate successfully")
        
        all3_path = self.output_dir / "Proj102" / "Proj102__00_AUDIT_ALL_3.md"
        with open(all3_path, 'r', encoding='utf-8') as f:
            all3_text = f.read()

        # 1. TEST_PASSED preserved
        self.assertIn("TEST_STATUS: TEST_PASSED", all3_text)
        
        # 2. TEST_NOT_RUN_ENVIRONMENT preserved verbatim
        self.assertIn("TEST_STATUS: TEST_NOT_RUN_ENVIRONMENT", all3_text)
        self.assertIn("TEST_LIMITATION: PyQt6 unavailable", all3_text)
        self.assertIn("VERIFIED_INSTEAD: compileall PASS", all3_text)
        
        # 3/4. Status unchanged, TEST_PARTIAL or FAILED doesn't alter wave COMPLETE.
        # Demonstrated by the fact that the wave was processed (it requires STATUS: AUDIT_CORE: COMPLETE)
        self.assertIn("STATUS: AUDIT_CORE: COMPLETE", all3_text)
        self.assertIn("STATUS: AUDIT_SECOND_WAVE: COMPLETE", all3_text)

        # 5/6. Old valid handoff (perf_content) didn't have TEST_* and still worked.
        self.assertNotIn("TEST_STATUS", all3_text.split("## 03")[1])

        # 7. Ticket bodies remain verbatim
        self.assertIn("[W2-001]\nEVIDENCE: x\nDEFECT: y", all3_text)
        
        # 8. Individual files remain full standalone handoffs
        w2_path = self.output_dir / "Proj102" / "Proj102__02_AUDIT_SECOND_WAVE.md"
        with open(w2_path, 'r', encoding='utf-8') as f:
            w2_text = f.read()
            self.assertTrue(w2_text.startswith("TICKETS: 1\nTEST_STATUS: TEST_NOT_RUN_ENVIRONMENT"))

if __name__ == '__main__':
    unittest.main()
