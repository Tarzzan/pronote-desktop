#!/bin/bash
# Pronote Desktop v1.6.1 — Script de lancement
INSTALL_DIR="/usr/lib/pronote-desktop"
VENV_DIR="$INSTALL_DIR/python-env"
API_PORT=5174

# Lire le port depuis la config si disponible
if [ -f "/etc/pronote-desktop/config.json" ]; then
    _PORT=$(python3 -c "import json; d=json.load(open('/etc/pronote-desktop/config.json')); print(d.get('api_port', 5174))" 2>/dev/null)
    [ -n "$_PORT" ] && API_PORT="$_PORT"
fi

# Vérifier la mise à jour en arrière-plan (non bloquant)
if [ -f "$INSTALL_DIR/check-update.sh" ]; then
    bash "$INSTALL_DIR/check-update.sh" &
fi

# Vérifier si le backend est déjà actif via systemd
if systemctl is-active --quiet pronote-desktop-api.service 2>/dev/null; then
    : # Backend géré par systemd — ouverture directe du navigateur
else
    # Démarrage manuel du backend (fallback si systemd non disponible)
    if [ -f "$VENV_DIR/bin/python3" ]; then
        cd "$INSTALL_DIR"
        "$VENV_DIR/bin/python3" pronote_api.py &
    else
        cd "$INSTALL_DIR"
        python3 pronote_api.py &
    fi
    API_PID=$!
    # Attendre que le backend soit prêt (max 5s)
    for i in $(seq 1 10); do
        if curl -s --max-time 1 "http://localhost:${API_PORT}/api/health" &>/dev/null; then
            break
        fi
        sleep 0.5
    done
fi

# Ouvrir l'application dans un navigateur (mode app si Chrome/Chromium disponible)
if command -v google-chrome >/dev/null 2>&1; then
    google-chrome --app="http://localhost:${API_PORT}" \
        --window-size=1280,800 \
        --no-first-run \
        --no-default-browser-check \
        >/dev/null 2>&1 &
elif command -v chromium-browser >/dev/null 2>&1; then
    chromium-browser --app="http://localhost:${API_PORT}" \
        --window-size=1280,800 \
        --no-first-run \
        --no-default-browser-check \
        >/dev/null 2>&1 &
elif command -v chromium >/dev/null 2>&1; then
    chromium --app="http://localhost:${API_PORT}" \
        --window-size=1280,800 \
        --no-first-run \
        >/dev/null 2>&1 &
else
    # Fallback : navigateur par défaut du système
    xdg-open "http://localhost:${API_PORT}" 2>/dev/null || \
    sensible-browser "http://localhost:${API_PORT}" 2>/dev/null || \
    x-www-browser "http://localhost:${API_PORT}" 2>/dev/null || \
    firefox "http://localhost:${API_PORT}" 2>/dev/null || \
    true
fi

# Si démarrage manuel, attendre la fin du backend
if [ -n "$API_PID" ]; then
    wait $API_PID 2>/dev/null || true
fi
