import os
import sys
import json
import hashlib
import secrets
import tempfile
import logging
import logging.handlers
import threading
import ctypes
from ctypes import wintypes
import time
from datetime import datetime, timezone
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import re
from urllib.parse import urlparse, parse_qs

# Configuration defaults and paths
LOCAL_APP_DATA = Path(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")))
BASE_DIR = LOCAL_APP_DATA / "ACBBridge"
CONFIG_FILE = BASE_DIR / "config.json"
TOKEN_FILE = BASE_DIR / "token.txt"
PID_FILE = BASE_DIR / "bridge.pid"
LOG_DIR = BASE_DIR / "logs"
STATE_DIR = BASE_DIR / "state" / "runs"

WAVES = {
    "core": {"number": "01", "slug": "AUDIT_CORE"},
    "second": {"number": "02", "slug": "AUDIT_SECOND_WAVE"},
    "performance": {"number": "03", "slug": "AUDIT_PERFORMANCE"}
}

logger = logging.getLogger("ACBBridge")
_config = {}
_config_mtime = 0
_config_lock = threading.Lock()
_server = None
_token_lock = threading.Lock()
_audit_lock = threading.RLock()


def output_root(cfg):
    configured = cfg.get("output", {}).get("root", "")
    return (Path(configured).expanduser() if configured else
            Path.home() / "Documents" / "AI ChatButtons Audits")


def confined_path(root, path):
    root = Path(root).resolve()
    path = Path(path).resolve()
    if path == root or not path.is_relative_to(root):
        raise ValueError("audit destination escapes configured root")
    return path

def setup_logging(cfg):
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOG_DIR / "acbbridge.log"
    log_level = getattr(logging, cfg.get("logging", {}).get("level", "INFO").upper(), logging.INFO)
    max_bytes = cfg.get("logging", {}).get("max_bytes", 1048576)
    backup_count = cfg.get("logging", {}).get("backup_count", 5)

    logger.setLevel(log_level)
    # Clear existing handlers
    if logger.hasHandlers():
        logger.handlers.clear()

    handler = logging.handlers.RotatingFileHandler(
        log_file, maxBytes=max_bytes, backupCount=backup_count, encoding='utf-8'
    )
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

def load_config():
    global _config, _config_mtime
    with _config_lock:
        try:
            if not CONFIG_FILE.exists():
                return
            mtime = CONFIG_FILE.stat().st_mtime
            if mtime > _config_mtime:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    new_config = json.load(f)
                if not isinstance(new_config, dict) or any(
                    key in new_config and not isinstance(new_config[key], dict)
                    for key in ('instance', 'server', 'output', 'naming', 'logging', 'autostart')
                ):
                    raise ValueError("configuration sections must be objects")
                _config = new_config
                _config_mtime = mtime
                logger.info("Configuration loaded/reloaded.")
        except Exception as e:
            logger.error(f"Failed to load config: {e}")

def get_config():
    load_config()
    with _config_lock:
        return _config

def get_token():
    with _token_lock:
        if not TOKEN_FILE.exists():
            TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
            try:
                fd = os.open(TOKEN_FILE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            except FileExistsError:
                pass
            else:
                with os.fdopen(fd, 'w', encoding='utf-8') as stream:
                    stream.write(secrets.token_urlsafe(32))
        token = TOKEN_FILE.read_text(encoding='utf-8').strip()
        if len(token) < 32 or not token.isascii() or any(c.isspace() for c in token):
            raise RuntimeError("Invalid pairing token file; repair it before starting the bridge")
        return token

def write_pid():
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    with open(PID_FILE, 'w', encoding='utf-8') as f:
        f.write(str(os.getpid()))

def remove_pid():
    try:
        if PID_FILE.exists():
            PID_FILE.unlink()
    except Exception:
        pass

def enforce_single_instance(instance_name):
    # Windows single-instance mutex
    mutex_name = f"Global\\ACBBridge_{instance_name}_Mutex"
    kernel32 = ctypes.windll.kernel32
    mutex = kernel32.CreateMutexW(None, False, mutex_name)
    if kernel32.GetLastError() == 183: # ERROR_ALREADY_EXISTS
        return None
    return mutex

def sanitize_project_name(name, max_length=80):
    if not name or not isinstance(name, str):
        return "UNKNOWN_PROJECT"
    # Replace invalid chars
    name = re.sub(r'[<>:"/\\|?*\x00-\x1F]', '_', name)
    name = name.strip(' .')
    if not name:
        return "UNKNOWN_PROJECT"
    # Protect reserved names
    reserved = ["CON", "PRN", "AUX", "NUL"] + [f"COM{i}" for i in range(1, 10)] + [f"LPT{i}" for i in range(1, 10)]
    if name.upper() in reserved:
        name = name + "_"
    return name[:max_length].strip(' .') or "UNKNOWN_PROJECT"

def get_run_state(run_id):
    safe_run_id = re.sub(r'[^a-zA-Z0-9_-]', '', run_id)
    if not safe_run_id:
        return None
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state_file = STATE_DIR / f"{safe_run_id}.json"
    if state_file.exists():
        try:
            with open(state_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "schema_version": 1,
        "run_id": run_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "waves": {}
    }

def save_run_state(run_id, state):
    safe_run_id = re.sub(r'[^a-zA-Z0-9_-]', '', run_id)
    if not safe_run_id:
        return
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state_file = STATE_DIR / f"{safe_run_id}.json"
    atomic_write_json(state_file, state)

def atomic_write_json(filepath, data):
    atomic_write(filepath, json.dumps(data, indent=2), 'lf')

def atomic_write(filepath, content, newline_mode):
    filepath = Path(filepath)
    filepath.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = filepath.parent / f".{filepath.name}.tmp.{os.getpid()}.{secrets.token_hex(4)}"
    try:
        # Open in binary to control newlines exactly
        with open(tmp_path, 'wb') as f:
            if newline_mode == 'crlf':
                content = content.replace('\r\n', '\n').replace('\n', '\r\n')
            elif newline_mode == 'lf':
                content = content.replace('\r\n', '\n')
            
            f.write(content.encode('utf-8'))
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, filepath)
    except Exception as e:
        if tmp_path.exists():
            tmp_path.unlink()
        raise e

def is_valid_host(host_header, cfg):
    if not host_header:
        return False
    return bool(re.fullmatch(r'(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?', host_header, re.I))

class ACBBridgeHandler(BaseHTTPRequestHandler):
    timeout = 10
    def log_message(self, format, *args):
        pass # Handle logging manually

    def send_json(self, status, payload):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-ACB-Token')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()

    def check_auth(self):
        token = self.headers.get('X-ACB-Token')
        if not token or not secrets.compare_digest(token, get_token()):
            self.send_json(403, {"ok": False, "error": {"code": "invalid_auth", "retriable": False}})
            return False
        return True
        
    def do_GET(self):
        cfg = get_config()
        if not is_valid_host(self.headers.get('Host'), cfg):
            self.send_response(400)
            self.end_headers()
            return
            
        parsed = urlparse(self.path)
        if parsed.path == '/health':
            self.send_json(200, {
                "ok": True,
                "service": cfg.get("instance", {}).get("name", "ACBBridge"),
                "version": "1.0.2",
                "api_version": 1
            })
        elif parsed.path == '/v1/status':
            if not self.check_auth():
                return
            
            out_root = output_root(cfg)
            out_exists = out_root.exists()
            out_writable = False
            if out_exists:
                try:
                    test_file = out_root / f".test_{os.getpid()}"
                    test_file.touch()
                    test_file.unlink()
                    out_writable = True
                except:
                    pass
                    
            self.send_json(200, {
                "ok": True,
                "version": "1.0.2",
                "uptime": time.time() - getattr(self.server, 'start_time', time.time()),
                "pid": os.getpid(),
                "output_root": str(out_root),
                "output_exists": out_exists,
                "output_writable": out_writable
            })
        else:
            self.send_json(404, {"ok": False})

    def do_POST(self):
        cfg = get_config()
        if not is_valid_host(self.headers.get('Host'), cfg):
            self.send_response(400)
            self.end_headers()
            return

        if not self.check_auth():
            return
            
        parsed = urlparse(self.path)
        
        if parsed.path == '/v1/shutdown':
            self.send_json(200, {"ok": True})
            logger.info("Shutdown requested via API")
            threading.Thread(target=self.server.shutdown).start()
            return
            
        if parsed.path == '/v1/audits':
            self.handle_audit_post(cfg)
            return

        self.send_json(404, {"ok": False})

    def handle_audit_post(self, cfg):
        # A receipt, its private source cache and the combined run are one writer.
        with _audit_lock:
            self._handle_audit_post(cfg)

    def _handle_audit_post(self, cfg):
        if self.headers.get('Content-Type') != 'application/json':
            self.send_json(415, {"ok": False, "error": {"code": "invalid_request", "retriable": False}})
            return
            
        try:
            content_length = int(self.headers.get('Content-Length', 0))
        except ValueError:
            self.send_json(400, {"ok": False, "error": {"code": "invalid_request", "retriable": False}})
            return
            
        max_bytes = cfg.get("server", {}).get("max_request_bytes", 10485760)
        if content_length <= 0:
            self.send_json(400, {"ok": False, "error": {"code": "invalid_request", "retriable": False}})
            return
        if content_length > max_bytes:
            self.send_json(413, {"ok": False, "error": {"code": "payload_too_large", "retriable": False}})
            return

        try:
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body)
            if not isinstance(data, dict):
                raise ValueError("request must be an object")
        except Exception:
            self.send_json(400, {"ok": False, "error": {"code": "invalid_request", "retriable": False}})
            return

        # Extract fields
        run_id = data.get("run_id")
        project = data.get("project")
        wave = data.get("wave")
        status = data.get("status")
        receipt = data.get("receipt")
        content = data.get("content")

        if not all(isinstance(value, str) and value for value in (run_id, project, wave, receipt, content)):
            self.send_json(400, {"ok": False, "error": {"code": "invalid_request", "message": "Missing required fields", "retriable": False}})
            return

        if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', run_id) or len(receipt) > 256:
            self.send_json(400, {"ok": False, "error": {"code": "invalid_request", "retriable": False}})
            return

        if wave not in WAVES:
            self.send_json(400, {"ok": False, "error": {"code": "unsupported_wave", "retriable": False}})
            return

        if status != "complete":
            self.send_json(400, {"ok": False, "error": {"code": "invalid_request", "message": "Only complete status allowed", "retriable": False}})
            return

        out_root = output_root(cfg)
        if not out_root.exists():
            logger.warning(f"Output root unavailable: {out_root}")
            self.send_json(503, {"ok": False, "error": {"code": "output_unavailable", "retriable": True}})
            return

        # Sanitize and Idempotency
        safe_project = sanitize_project_name(project, cfg.get("naming", {}).get("project_max_length", 80))
        content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
        
        state = get_run_state(run_id)
        if not state:
            state = {"schema_version": 1, "run_id": run_id, "waves": {}}

        if state.get("project") and state["project"] != safe_project:
            self.send_json(409, {"ok": False, "error": {"code": "run_project_conflict", "retriable": False}})
            return
            
        state["project"] = safe_project
        state["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        wave_state = state["waves"].get(wave, {})
        if wave_state.get("receipt") == receipt:
            if wave_state.get("sha256") == content_hash:
                logger.info(f"Duplicate save receipt for run {run_id} wave {wave}")
                self.send_json(200, {
                    "ok": True, "duplicate": True, "run_id": run_id, "project": safe_project, 
                    "wave": wave, "files": wave_state.get("files", []), "all3_ready": state.get("all3_complete", False)
                })
                return
            else:
                logger.warning(f"Receipt conflict for run {run_id} wave {wave}")
                self.send_json(409, {"ok": False, "error": {"code": "receipt_conflict", "retriable": False}})
                return

        # Calculate Paths
        layout = cfg.get("output", {}).get("layout", "project_subdir")
        base_target_dir = out_root / safe_project if layout == "project_subdir" else out_root
        
        history_mode = cfg.get("output", {}).get("history_mode", "latest_plus_history")
        write_latest = history_mode in ["latest_only", "latest_plus_history"]
        write_history = history_mode in ["history_only", "latest_plus_history"]
        
        dt_str = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
        run_dt_str = datetime.fromisoformat(state.get("created_at").replace('Z', '+00:00')).strftime("%Y%m%dT%H%M%S")
        safe_run_suffix = hashlib.sha256(run_id.encode('utf-8')).hexdigest()[:16]
        
        naming = cfg.get("naming", {})
        wave_info = WAVES[wave]
        
        files_written = []
        try:
            if write_latest:
                latest_name = naming.get(f"latest_{wave}", "{project}__{wave_no}_{wave_slug}.md")
                latest_name = latest_name.format(project=safe_project, wave_no=wave_info["number"], wave_slug=wave_info["slug"])
                latest_path = confined_path(out_root, base_target_dir / latest_name)
                atomic_write(latest_path, content, cfg.get("output", {}).get("newline", "lf"))
                files_written.append(str(latest_path.relative_to(out_root)))
                
            if write_history:
                history_name = naming.get("history_wave", "{project}__{wave_no}_{wave_slug}__{datetime}.md")
                history_name = history_name.format(project=safe_project, wave_no=wave_info["number"], wave_slug=wave_info["slug"], datetime=dt_str)
                history_dir = base_target_dir / "_history" / f"{run_dt_str}_{safe_run_suffix}"
                history_path = confined_path(out_root, history_dir / history_name)
                atomic_write(history_path, content, cfg.get("output", {}).get("newline", "lf"))
                files_written.append(str(history_path.relative_to(out_root)))
                
            # Latest output can be overwritten by a later run. ALL_3 reads an
            # immutable per-run private cache rather than that shared pathname.
            cache_path = confined_path(STATE_DIR, STATE_DIR / (run_id + '-' + wave + '.md'))
            atomic_write(cache_path, content, 'lf')
            # Update state
            state["waves"][wave] = {
                "complete": True,
                "sha256": content_hash,
                "receipt": receipt,
                "completed_at": dt_str,
                "files": files_written,
                "content_cache_path": str(cache_path)
            }
            save_run_state(run_id, state)
            logger.info(f"Successfully saved {wave} for run {run_id}")
            
            # Check for ALL_3
            all3_ready = False
            if all(w in state["waves"] for w in WAVES.keys()):
                all3_ready = self.generate_all3(state, base_target_dir, safe_project, cfg, dt_str, run_dt_str, safe_run_suffix, out_root)
                state["all3_complete"] = all3_ready
                save_run_state(run_id, state)
            
            self.send_json(200, {
                "ok": True, "duplicate": False, "run_id": run_id, "project": safe_project,
                "wave": wave, "files": files_written, "all3_ready": all3_ready
            })
            
        except Exception as e:
            logger.error(f"Failed to write audit: {e}", exc_info=True)
            self.send_json(500, {"ok": False, "error": {"code": "atomic_write_failed", "retriable": True}})

    def parse_wave(self, text, wave):
        lines = text.strip().split('\n')
        meta = {}
        for line in lines:
            if line.startswith('TICKETS:'):
                try:
                    meta['tickets'] = int(line.split(':', 1)[1].strip())
                except:
                    return False, None, "Invalid TICKETS"
            elif line.startswith('PROJECT_NAME:'): meta['project_name'] = line.split(':', 1)[1].strip()
            elif line.startswith('TARGET:'): meta['target'] = line.split(':', 1)[1].strip()
            elif line.startswith('BASELINE:'): meta['baseline'] = line.split(':', 1)[1].strip()
            elif line.startswith('CORE_BASELINE:'): meta['core_baseline'] = line.split(':', 1)[1].strip()
            elif line.startswith('PREVIOUS_BASELINE:'): meta['previous_baseline'] = line.split(':', 1)[1].strip()
            elif line.startswith('GIT_CONTEXT:'): meta['git_context'] = line.split(':', 1)[1].strip()
            elif line.startswith('SAIPEN_CONTEXT:'): meta['saipen_context'] = line.split(':', 1)[1].strip()
            elif line.startswith('AUDIT_SCOPE:'): meta['audit_scope'] = line.split(':', 1)[1].strip()
            elif line.startswith('HANDOFF:'): meta['handoff'] = line.split(':', 1)[1].strip()
            elif line.startswith('DATE_TIME:'): meta['date_time'] = line.split(':', 1)[1].strip()
            elif line.startswith('TEST_STATUS:'): meta['test_status'] = line.split(':', 1)[1].strip()
            elif line.startswith('TEST_LIMITATION:'): meta['test_limitation'] = line.split(':', 1)[1].strip()
            elif line.startswith('VERIFIED_INSTEAD:'): meta['verified_instead'] = line.split(':', 1)[1].strip()
            
        if 'tickets' not in meta:
            return False, None, f"Missing TICKETS: N in {wave}"
            
        n = meta['tickets']
        prefix = {'core': 'CORE-', 'second': 'W2-', 'performance': 'PERF-'}[wave]
        done_when = {'core': 'CORE_DONE_WHEN:', 'second': 'SECOND_WAVE_DONE_WHEN:', 'performance': 'PERFORMANCE_DONE_WHEN:'}[wave]
        
        if done_when not in text:
            return False, None, f"Missing {done_when} in {wave}"
            
        if n == 0:
            zero_msg = {'core': 'NO VERIFIED CORE DEFECTS.', 'second': 'NO NEW VERIFIED SECOND-WAVE DEFECTS.', 'performance': 'NO MATERIAL PERFORMANCE/STABILITY FINDINGS.'}[wave]
            if zero_msg not in text:
                return False, None, f"Missing zero defects message in {wave}"
                
        found_tickets = set(int(m) for m in re.findall(rf'\[{prefix}(\d+)\]', text))
        if len(found_tickets) != n:
            return False, None, f"Expected {n} unique {prefix} tickets, found {len(found_tickets)}"
        for i in range(1, n + 1):
            if i not in found_tickets:
                return False, None, f"Missing {prefix}{i:03d}"
                
        if n > 0:
            sections = ['EVIDENCE:', 'DEFECT:', 'REPAIR:', 'VERIFY:'] if wave in ['core', 'second'] else ['EVIDENCE:', 'ISSUE:', 'OPTIMIZE:', 'GUARDRAIL:', 'VERIFY:']
            for section in sections:
                if text.count(section) < n:
                    return False, None, f"Missing {section} in {wave} ticket"
                    
        idx = text.find(f"TICKETS: {n}")
        if idx == -1:
            idx = text.find(f"TICKETS:{n}")
        end_idx = text.find('\n', idx)
        if end_idx == -1: end_idx = len(text)
        
        meta['body'] = text[end_idx:].strip()
        return True, meta, ""

    def generate_all3(self, state, base_target_dir, safe_project, cfg, dt_str, run_dt_str, safe_run_suffix, out_root):
        try:
            texts = {}
            for wave in ["core", "second", "performance"]:
                cache_path = state["waves"][wave].get("content_cache_path")
                if not cache_path or not Path(cache_path).exists():
                    return False
                with open(cache_path, 'r', encoding='utf-8') as f:
                    texts[wave] = f.read()
                    
            parsed = {}
            for wave in ["core", "second", "performance"]:
                is_valid, meta, err = self.parse_wave(texts[wave], wave)
                if not is_valid:
                    logger.warning(f"ALL_3 integrity error for {state['run_id']} ({wave}): {err}")
                    state["all3_integrity_error"] = err
                    return False
                parsed[wave] = meta
                
            state.pop("all3_integrity_error", None)
            fmt = cfg.get("output", {}).get("all3_format", "compact_v1")
            
            combined = []
            if fmt == "compact_v1":
                combined.append(f"# {safe_project} — Audit Handoff\n")
                combined.append(f"RUN_ID: {state['run_id']}")
                combined.append(f"GENERATED_AT: {datetime.now().isoformat()}")
                
                c_meta = parsed['core']
                combined.append(f"PROJECT_NAME: {c_meta.get('project_name', safe_project)}")
                combined.append(f"TARGET: {c_meta.get('target', '')}")
                baseline = c_meta.get('baseline', '')
                combined.append(f"BASELINE: {baseline}")
                combined.append(f"GIT_CONTEXT: {c_meta.get('git_context', '')}")
                combined.append(f"SAIPEN_CONTEXT: {c_meta.get('saipen_context', '')}")
                combined.append(f"HANDOFF: {c_meta.get('handoff', 'IMPLEMENTATION_AGENT')}")
                combined.append(f"WAVES: 3")
                total = sum(p['tickets'] for p in parsed.values())
                combined.append(f"TOTAL_TICKETS: {total}\n")
                
                for wave in ["core", "second", "performance"]:
                    wmeta = parsed[wave]
                    wave_info = WAVES[wave]
                    combined.append(f"## {wave_info['number']} — {wave_info['slug'].replace('_', ' ')}")
                    combined.append(f"DATE_TIME: {wmeta.get('date_time', '')}")
                    combined.append(f"AUDIT_SCOPE: {wmeta.get('audit_scope', '')}")
                    if 'test_status' in wmeta:
                        combined.append(f"TEST_STATUS: {wmeta['test_status']}")
                    if 'test_limitation' in wmeta:
                        combined.append(f"TEST_LIMITATION: {wmeta['test_limitation']}")
                    if 'verified_instead' in wmeta:
                        combined.append(f"VERIFIED_INSTEAD: {wmeta['verified_instead']}")
                    combined.append(f"STATUS: {wave_info['slug']}: COMPLETE")
                    combined.append(f"TICKETS: {wmeta['tickets']}\n")
                    
                    if wave != 'core':
                        delta = []
                        if 'baseline' in wmeta and wmeta['baseline'] != baseline:
                            delta.append(f"- BASELINE: {wmeta['baseline']}")
                        if 'core_baseline' in wmeta and wmeta['core_baseline'] and wmeta['core_baseline'] != baseline:
                            delta.append(f"- CORE_BASELINE: {wmeta['core_baseline']}")
                        if 'previous_baseline' in wmeta and wmeta['previous_baseline'] and wmeta['previous_baseline'] != baseline:
                            delta.append(f"- PREVIOUS_BASELINE: {wmeta['previous_baseline']}")
                        if 'git_context' in wmeta and wmeta['git_context'] != c_meta.get('git_context'):
                            delta.append(f"- GIT_CONTEXT: {wmeta['git_context']}")
                        if 'saipen_context' in wmeta and wmeta['saipen_context'] != c_meta.get('saipen_context'):
                            delta.append(f"- SAIPEN_CONTEXT: {wmeta['saipen_context']}")
                            
                        if delta:
                            combined.append("CONTEXT_DELTA:")
                            combined.extend(delta)
                            combined.append("")
                            
                    combined.append(wmeta['body'])
                    combined.append("")
            else: # verbatim_sections
                combined.append(f"# {safe_project} — Audit Handoff\n")
                combined.append(f"RUN_ID: {state['run_id']}")
                combined.append(f"GENERATED_AT: {datetime.now().isoformat()}\n")
                for wave in ["core", "second", "performance"]:
                    wave_info = WAVES[wave]
                    combined.append("=" * 60)
                    combined.append(f"{wave_info['number']} — {wave_info['slug'].replace('_', ' ')}")
                    combined.append("=" * 60 + "\n")
                    combined.append(texts[wave] + "\n")
                    
            content = "\n".join(combined).strip() + "\n"
            
            history_mode = cfg.get("output", {}).get("history_mode", "latest_plus_history")
            write_latest = history_mode in ["latest_only", "latest_plus_history"]
            write_history = history_mode in ["history_only", "latest_plus_history"]
            naming = cfg.get("naming", {})
            
            if write_latest:
                latest_name = naming.get("latest_all3", "{project}__00_AUDIT_ALL_3.md").format(project=safe_project)
                atomic_write(confined_path(out_root, base_target_dir / latest_name), content, cfg.get("output", {}).get("newline", "lf"))
                
            if write_history:
                history_name = naming.get("history_all3", "{project}__00_AUDIT_ALL_3__{datetime}.md").format(project=safe_project, datetime=dt_str)
                history_dir = base_target_dir / "_history" / f"{run_dt_str}_{safe_run_suffix}"
                atomic_write(confined_path(out_root, history_dir / history_name), content, cfg.get("output", {}).get("newline", "lf"))
                
            logger.info(f"Successfully generated ALL_3 for run {state['run_id']}")
            return True
        except Exception as e:
            logger.error(f"Failed to generate ALL_3: {e}", exc_info=True)
            return False

def run_server():
    global _server
    cfg = get_config()
    setup_logging(cfg)
    
    # Ensure token exists
    get_token()

    # The redistributable default is a new per-user folder. A configured
    # unavailable drive remains unavailable, rather than silently moving data.
    if not cfg.get("output", {}).get("root"):
        output_root(cfg).mkdir(parents=True, exist_ok=True)
    
    host = cfg.get("server", {}).get("host", "127.0.0.1")
    port = cfg.get("server", {}).get("port", 17843)
    
    if host not in ["127.0.0.1", "localhost", "[::1]"]:
        logger.error("Invalid bind host in config. Must be loopback.")
        sys.exit(1)
        
    _server = ThreadingHTTPServer((host, port), ACBBridgeHandler)
    _server.start_time = time.time()
    
    write_pid()
    logger.info(f"Starting ACBBridge on http://{host}:{port}")
    try:
        _server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        remove_pid()
        logger.info("ACBBridge shutdown.")

def main():
    if not CONFIG_FILE.exists():
        # Will be created by install script usually, or use defaults
        pass
        
    cfg = get_config()
    instance_name = cfg.get("instance", {}).get("name", "ACBBridge")
    
    mutex = enforce_single_instance(instance_name)
    if not mutex:
        print(f"ACBBridge is already running.")
        sys.exit(0)
        
    run_server()

if __name__ == '__main__':
    main()
