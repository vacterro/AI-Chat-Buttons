"""Real loopback/file regressions; no operator profiles, desktop or daemon launch."""
import json
import importlib.util
import os
import sys
import threading
import urllib.error
import urllib.request
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import acbbridge as bridge
if os.environ.get('ACB_BRIDGE_SUBJECT'):
    spec = importlib.util.spec_from_file_location('acbbridge_control', os.environ['ACB_BRIDGE_SUBJECT'])
    bridge = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bridge)


@pytest.fixture
def fixture(tmp_path, monkeypatch):
    for name, suffix in {'BASE_DIR': '', 'CONFIG_FILE': 'config.json', 'TOKEN_FILE': 'token.txt',
                         'STATE_DIR': 'state/runs', 'LOG_DIR': 'logs', 'PID_FILE': 'bridge.pid'}.items():
        monkeypatch.setattr(bridge, name, tmp_path / suffix)
    output = tmp_path / 'audits'
    output.mkdir()
    config = {'server': {'host': '127.0.0.1', 'port': 0},
              'output': {'root': str(output), 'layout': 'project_subdir', 'history_mode': 'latest_only'}}
    monkeypatch.setattr(bridge, '_config', config)
    monkeypatch.setattr(bridge, '_config_mtime', 0)
    token = bridge.get_token()
    server = bridge.ThreadingHTTPServer(('127.0.0.1', 0), bridge.ACBBridgeHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield server, config, output, token
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)


def post(fixture, payload):
    server, _, _, token = fixture
    request = urllib.request.Request('http://127.0.0.1:' + str(server.server_port) + '/v1/audits',
        data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json', 'X-ACB-Token': token})
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, json.load(error)


def payload(run='run-A', project='Project', wave='core', marker='original-A'):
    prefix, done = {'core': ('CORE', 'CORE'), 'second': ('W2', 'SECOND_WAVE'),
                    'performance': ('PERF', 'PERFORMANCE')}[wave]
    body = ('ISSUE: x\nOPTIMIZE: y\nGUARDRAIL: z\n' if wave == 'performance'
            else 'DEFECT: x\nREPAIR: y\n')
    return {'run_id': run, 'project': project, 'wave': wave, 'status': 'complete',
        'receipt': run + '-' + wave, 'content': 'TICKETS: 1\n[' + prefix + '-001]\nEVIDENCE: '
        + marker + '\n' + body + 'VERIFY: z\n' + done + '_DONE_WHEN: finished'}


def test_security_review_rejects_malformed_payload(fixture):
    assert post(fixture, [1, 2])[0] == 400
    assert post(fixture, {**payload(), 'content': {'not': 'text'}})[0] == 400


def test_security_review_run_ids_cannot_alias(fixture):
    assert post(fixture, payload(run='run/one'))[0] == 400
    assert post(fixture, payload(run='runone'))[0] == 200


def test_security_review_run_is_bound_to_project(fixture):
    assert post(fixture, payload())[0] == 200
    assert post(fixture, payload(project='Other', wave='second'))[0] == 409


def test_security_review_latest_only_does_not_mix_runs(fixture):
    assert post(fixture, payload())[0] == 200
    assert post(fixture, payload(run='run-B', marker='different-B'))[0] == 200
    assert post(fixture, payload(wave='second'))[0] == 200
    status, response = post(fixture, payload(wave='performance'))
    assert status == 200 and response['all3_ready']
    text = (fixture[2] / 'Project/Project__00_AUDIT_ALL_3.md').read_text()
    assert 'original-A' in text and 'different-B' not in text


def test_security_review_rejects_path_escape(fixture):
    fixture[1]['naming'] = {'latest_core': '../../outside.md'}
    assert post(fixture, payload())[0] >= 400
    assert not (fixture[2].parent / 'outside.md').exists()


def test_security_review_empty_token_refuses(monkeypatch, tmp_path):
    monkeypatch.setattr(bridge, 'TOKEN_FILE', tmp_path / 'token.txt')
    bridge.TOKEN_FILE.write_bytes(b'')
    with pytest.raises(RuntimeError, match='token'):
        bridge.get_token()


def test_security_review_host_header_is_exact():
    config = {'server': {'host': '127.0.0.1'}}
    assert bridge.is_valid_host('127.0.0.1:17843', config)
    assert not bridge.is_valid_host('127.0.0.1:17843@evil.example', config)


@pytest.mark.parametrize('invalid', [[], None, {'output': []}, {'server': None}])
def test_security_review_bad_config_retains_last_valid(tmp_path, monkeypatch, invalid):
    config = {'output': {'root': 'approved-destination'}}
    monkeypatch.setattr(bridge, '_config', config)
    monkeypatch.setattr(bridge, '_config_mtime', 0)
    monkeypatch.setattr(bridge, 'CONFIG_FILE', tmp_path / 'config.json')
    bridge.CONFIG_FILE.write_text(json.dumps(invalid))
    assert bridge.get_config() == config


@pytest.mark.parametrize('configured', [False, True])
def test_security_review_startup_creates_only_default_output(tmp_path, monkeypatch, configured):
    config = {'output': {'root': str(tmp_path / 'unavailable' / 'audits') if configured else ''}}
    monkeypatch.setattr(bridge.Path, 'home', lambda: tmp_path / 'profile')
    monkeypatch.setattr(bridge, 'get_config', lambda: config)
    monkeypatch.setattr(bridge, 'setup_logging', lambda cfg: None)
    monkeypatch.setattr(bridge, 'get_token', lambda: 'fixture-token-not-real')
    monkeypatch.setattr(bridge, 'write_pid', lambda: None)
    monkeypatch.setattr(bridge, 'remove_pid', lambda: None)
    class StubServer:
        def __init__(self, *args): pass
        def serve_forever(self): pass
    monkeypatch.setattr(bridge, 'ThreadingHTTPServer', StubServer)
    bridge.run_server()
    destination = Path(config['output']['root']) if configured else tmp_path / 'profile/Documents/AI ChatButtons Audits'
    assert destination.exists() is (not configured)
