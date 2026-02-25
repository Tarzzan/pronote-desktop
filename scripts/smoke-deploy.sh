#!/usr/bin/env bash
set -euo pipefail

DEB_PATH="${1:-}"
if [[ -z "${DEB_PATH}" || ! -f "${DEB_PATH}" ]]; then
  echo "Usage: $0 /path/to/pronote-desktop_*.deb"
  exit 1
fi

echo "[1/8] Install package"
sudo -n dpkg -i "${DEB_PATH}"

echo "[2/8] Stop previous local processes"
pkill -f "/opt/Pronote Desktop/pronote-desktop" || true
pkill -f "/opt/pronote-desktop/pronote-desktop" || true
pkill -f "/usr/lib/pronote-desktop/pronote-desktop-bin" || true
pkill -f "python3 .*pronote_api.py" || true

launch_and_check() {
  local run_id="$1"
  local hold_seconds="$2"
  local display="${DISPLAY:-:0}"
  local xauth="${XAUTHORITY:-}"
  local log_file="/tmp/pronote-smoke-ui-${run_id}.log"

  if [[ -z "${xauth}" ]]; then
    xauth="$(ls -1 /run/user/$(id -u)/.mutter-Xwaylandauth.* 2>/dev/null | head -n1 || true)"
  fi

  pkill -f "/opt/Pronote Desktop/pronote-desktop" || true
  pkill -f "/opt/pronote-desktop/pronote-desktop" || true
  pkill -f "/usr/lib/pronote-desktop/pronote-desktop-bin" || true
  DISPLAY="${display}" XAUTHORITY="${xauth}" nohup pronote-desktop --disable-gpu >"${log_file}" 2>&1 &
  local ui_pid="$!"
  disown "${ui_pid}" 2>/dev/null || true
  sleep 3

  if ! kill -0 "${ui_pid}" 2>/dev/null; then
    echo "UI crashed before first health window (run=${run_id}, pid=${ui_pid})"
    tail -n 80 "${log_file}" || true
    exit 1
  fi

  sleep "${hold_seconds}"
  if ! kill -0 "${ui_pid}" 2>/dev/null; then
    echo "UI crashed before ${hold_seconds}s (run=${run_id}, pid=${ui_pid})"
    tail -n 80 "${log_file}" || true
    exit 1
  fi
}

echo "[3/8] Launch app (run 1) and keep alive 40s"
launch_and_check "run1" 40

echo "[4/8] Validate backend health"
python3 - << 'PY'
import json, urllib.request, sys
url = "http://127.0.0.1:5174/api/health"
try:
    with urllib.request.urlopen(url, timeout=5) as r:
        data = json.loads(r.read().decode("utf-8"))
    assert data.get("status") == "ok", data
    print("health=ok")
except Exception as e:
    print(f"health=failed: {e}")
    raise
PY

echo "[5/8] Validate demo login"
python3 - << 'PY'
import json, urllib.request
payload = {
    "pronote_url": "https://demo.index-education.net/pronote/professeur.html",
    "username": "demonstration",
    "password": "pronotevs",
}
req = urllib.request.Request(
    "http://127.0.0.1:5174/api/login",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(req, timeout=20) as r:
    data = json.loads(r.read().decode("utf-8"))
assert data.get("success") is True, data
print("demo_login=ok")
PY

echo "[6/8] Restart run 2 and keep alive 10s"
launch_and_check "run2" 10

echo "[7/8] Restart run 3 and keep alive 10s"
launch_and_check "run3" 10

echo "[8/8] Smoke test passed"
echo "UI logs: /tmp/pronote-smoke-ui-run*.log"
