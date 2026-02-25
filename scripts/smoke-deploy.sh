#!/usr/bin/env bash
set -euo pipefail

DEB_PATH="${1:-}"
if [[ -z "${DEB_PATH}" || ! -f "${DEB_PATH}" ]]; then
  echo "Usage: $0 /path/to/pronote-desktop_*.deb"
  exit 1
fi

echo "[1/6] Install package"
sudo -n dpkg -i "${DEB_PATH}"

echo "[2/6] Stop previous local processes"
pkill -f "/opt/Pronote Desktop/pronote-desktop" || true
pkill -f "python3 .*pronote_api.py" || true

echo "[3/6] Launch app once"
nohup pronote-desktop >/tmp/pronote-smoke-ui.log 2>&1 &
sleep 3

echo "[4/6] Validate backend health"
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

echo "[5/6] Validate demo login"
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

echo "[6/6] Smoke test passed"
echo "UI log: /tmp/pronote-smoke-ui.log"
