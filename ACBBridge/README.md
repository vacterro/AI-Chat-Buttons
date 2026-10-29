# AI ChatButtons Bridge (ACBBridge)

A local disk bridge for AI ChatButtons on Windows. It saves audit results through a token-authenticated loopback HTTP endpoint. Source tests cover loopback requests and temporary output folders; installation and real browser pairing still need user acceptance.

## Quick Start (First Run)

1. Double-click `INSTALL.cmd`
2. Confirm you see `ACBBridge installed and RUNNING.`
3. Open your own `%LOCALAPPDATA%\ACBBridge\token.txt` privately. Installation never prints the token or changes the clipboard. Treat the token as a credential and keep it out of reports and source control.
4. Open AI ChatButtons Settings in your browser.
5. Enable **Audit Disk Bridge**.
6. Paste the token into the Token field.
7. Press **Check** (if available) or rely on auto-connect.
8. Expected status: `CONNECTED`.
9. Done.

## Commands

- `INSTALL.cmd` - Installs the bridge to your user profile, sets up auto-start, and runs it. Safe to re-run.
- `START.cmd` - Starts the bridge manually.
- `STOP.cmd` - Gracefully shuts down the bridge.
- `STATUS.cmd` - Shows bridge health, PID, and paths.
- `OPEN_OUTPUT.cmd` - Opens your configured audit output folder in Windows Explorer.
- `UNINSTALL.cmd` - Removes the bridge from auto-start and deletes the app. (Add `--purge-local-state` to also delete config and logs. Never deletes audits).

## Configuration

Config is located at:
`%LOCALAPPDATA%\ACBBridge\config.json`

The output folder is set in `output.root`.
An empty root selects `Documents\AI ChatButtons Audits` under your user home. Startup creates that default folder. A configured unavailable root stays unavailable; the bridge returns a retriable error rather than redirecting audits.

If you change the output root, the bridge will immediately pick it up.

## Data Locations

- **App Runtime**: `%LOCALAPPDATA%\ACBBridge\app\`
- **Token**: `%LOCALAPPDATA%\ACBBridge\token.txt`
- **Logs**: `%LOCALAPPDATA%\ACBBridge\logs\`
- **State**: `%LOCALAPPDATA%\ACBBridge\state\`

## Recovery

Runtime uses Python's standard library. For development, install `requirements-dev.txt` and run `python -m pytest ACBBridge/tests` from the repository root. Userscript tests run with `node --test --test-concurrency=1 tests/*.test.js`.

- **Unavailable Drive**: If your configured output drive is disconnected, the bridge stays alive. Audits queue in your browser and retry when the drive reconnects.
- **Config Errors**: If you mess up `config.json`, the bridge ignores the changes and keeps the last valid configuration while logging the error.
- **Shutdown**: STOP requests authenticated graceful shutdown. It never kills a process named by a stale PID file. If the endpoint still responds, investigate before uninstalling.
- **Uninstall**: Runtime/configuration removal refuses linked targets and refuses a target containing the configured audit folder. Default uninstall preserves configuration, token, logs and state; `--purge-local-state` removes those only after these checks.
