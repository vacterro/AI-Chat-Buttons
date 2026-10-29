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

# Add parent to path to import acbbridge
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import acbbridge

class TestACBBridge(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base_dir = Path(self.temp_dir.name)
        
        # Override paths for testing
        acbbridge.BASE_DIR = self.base_dir
        acbbridge.CONFIG_FILE = self.base_dir / "config.json"
        acbbridge.TOKEN_FILE = self.base_dir / "token.txt"
        acbbridge.PID_FILE = self.base_dir / "bridge.pid"
        acbbridge.LOG_DIR = self.base_dir / "logs"
        acbbridge.STATE_DIR = self.base_dir / "state" / "runs"
        
        self.output_dir = self.base_dir / "output"
        self.output_dir.mkdir()
        
        self.config = {
            "instance": {"name": "TestBridge"},
            "server": {"host": "127.0.0.1", "port": 17844},
            "output": {
                "root": str(self.output_dir),
                "layout": "project_subdir",
                "history_mode": "latest_plus_history",
                "newline": "lf"
            }
        }
        with open(acbbridge.CONFIG_FILE, 'w') as f:
            json.dump(self.config, f)
            
        acbbridge._config_mtime = 0
            
        self.token = acbbridge.get_token()
        
        # Start server in thread
        self.server = HTTPServer(('127.0.0.1', 17844), acbbridge.ACBBridgeHandler)
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
        req = urllib.request.Request(f"http://127.0.0.1:17844{path}", 
                                     data=json.dumps(data).encode('utf-8'),
                                     headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req) as response:
                return response.status, json.loads(response.read().decode())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read().decode())

    def test_health(self):
        req = urllib.request.Request("http://127.0.0.1:17844/health")
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.status, 200)
            data = json.loads(response.read().decode())
            self.assertTrue(data["ok"])
            
    def test_unauthorized(self):
        status, data = self._post("/v1/audits", {}, {"X-ACB-Token": "bad", "Content-Type": "application/json"})
        self.assertEqual(status, 403)
        
    def test_audit_flow(self):
        # 1. Core
        payload1 = {
            "api_version": 1, "receipt": "rcpt1", "run_id": "run123", "project": "TestProj",
            "wave": "core", "status": "complete", "content": 'TICKETS: 1\n[CORE-001]\nEVIDENCE: x\nDEFECT: y\nREPAIR: z\nVERIFY: a\nCORE_DONE_WHEN: 1'
        }
        status, data = self._post("/v1/audits", payload1)
        self.assertEqual(status, 200)
        self.assertTrue(data["ok"])
        self.assertFalse(data["all3_ready"])
        
        # Check files
        proj_dir = self.output_dir / "TestProj"
        self.assertTrue((proj_dir / "TestProj__01_AUDIT_CORE.md").exists())
        
        # 2. Duplicate Idempotency
        status, data2 = self._post("/v1/audits", payload1)
        self.assertEqual(status, 200)
        self.assertTrue(data2["duplicate"])
        
        # 3. Conflict Idempotency
        payload1_conflict = dict(payload1, content="Diff Content")
        status, data_conf = self._post("/v1/audits", payload1_conflict)
        self.assertEqual(status, 409)
        
        # 4. Second Wave
        payload2 = dict(payload1, wave="second", receipt="rcpt2", content='TICKETS: 1\n[W2-001]\nEVIDENCE: x\nDEFECT: y\nREPAIR: z\nVERIFY: a\nSECOND_WAVE_DONE_WHEN: 1')
        status, data = self._post("/v1/audits", payload2)
        self.assertEqual(status, 200)
        self.assertFalse(data["all3_ready"])
        
        # 5. Performance Wave (completes ALL_3)
        payload3 = dict(payload1, wave="performance", receipt="rcpt3", content='TICKETS: 1\n[PERF-001]\nEVIDENCE: x\nISSUE: y\nOPTIMIZE: z\nGUARDRAIL: a\nVERIFY: b\nPERFORMANCE_DONE_WHEN: 1')
        status, data = self._post("/v1/audits", payload3)
        self.assertEqual(status, 200)
        self.assertTrue(data["all3_ready"])
        
        self.assertTrue((proj_dir / "TestProj__00_AUDIT_ALL_3.md").exists())
        
    def test_path_sanitization(self):
        payload = {
            "api_version": 1, "receipt": "r1", "run_id": "r1", "project": "../BadName\\:?",
            "wave": "core", "status": "complete", "content": "test"
        }
        status, data = self._post("/v1/audits", payload)
        self.assertEqual(status, 200)
        self.assertEqual(data["project"], "_BadName___")

if __name__ == '__main__':
    unittest.main()
