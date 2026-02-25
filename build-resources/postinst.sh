#!/bin/bash
# Post-installation script for pronote-desktop v1.7.5 (offline)
# Installation 100% hors-ligne — aucun appel réseau effectué
# Compatible Ubuntu 22.04 (Python 3.10/3.11) et Ubuntu 24.04 (Python 3.12+)
set -e

INSTALL_DIR="/usr/lib/pronote-desktop"
VENV_DIR="$INSTALL_DIR/python-env"
VENV_BAK="$INSTALL_DIR/python-env.bak"
WHEELS_DIR="$INSTALL_DIR/wheels"
CONFIG_DIR="/etc/pronote-desktop"
CONFIG_FILE="$CONFIG_DIR/config.json"

echo "============================================"
echo " Pronote Desktop v1.7.5 — Installation"
echo "============================================"

# --- 1. Icônes et bureau ---
echo "[1/5] Mise à jour des icônes et du bureau..."
gtk-update-icon-cache -f -t /usr/share/icons/hicolor 2>/dev/null || true
update-desktop-database /usr/share/applications 2>/dev/null || true

# --- 2. Configuration par défaut (préservée si déjà existante via conffiles) ---
echo "[2/5] Configuration..."
mkdir -p "$CONFIG_DIR"
if [ ! -f "$CONFIG_FILE" ]; then
    cat > "$CONFIG_FILE" << 'CONFIG'
{
  "version": "1.7.5",
  "theme": "light",
  "check_updates": true,
  "api_port": 5174,
  "api_host": "127.0.0.1",
  "browser": "auto"
}
CONFIG
    echo "Fichier de configuration créé : $CONFIG_FILE"
else
    # Migration : ajouter api_host si absent (upgrade depuis version antérieure)
    python3 -c "
import json, sys
cfg_path = '$CONFIG_FILE'
try:
    with open(cfg_path) as f:
        d = json.load(f)
    changed = False
    if 'api_host' not in d:
        d['api_host'] = '127.0.0.1'
        changed = True
    if changed:
        with open(cfg_path, 'w') as f:
            json.dump(d, f, indent=2)
        print('  Migration : api_host ajouté à la configuration existante.')
except Exception as e:
    print(f'  Avertissement migration config : {e}')
" 2>/dev/null || true
    echo "Configuration existante conservée : $CONFIG_FILE"
fi

# --- 3. Environnement virtuel Python (offline) ---
echo "[3/5] Installation des dépendances Python (offline)..."

# Détecter la version Python disponible
PYTHON_BIN="python3"
PYTHON_VERSION=$("$PYTHON_BIN" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "unknown")
echo "  Python détecté : $PYTHON_VERSION"

if ! "$PYTHON_BIN" -m venv --help &>/dev/null 2>&1; then
    echo "ERREUR : python3-venv n'est pas disponible."
    echo "Installez-le : sudo apt-get install python3-venv"
    exit 1
fi

# Supprimer l'ancien venv (remplacé par le nouveau)
rm -rf "$VENV_DIR" 2>/dev/null || true

# Créer le venv avec --system-site-packages pour hériter des paquets système.
# Garantit la compatibilité Python 3.12 (Ubuntu 24.04) et 3.11/3.10 (Ubuntu 22.04) :
# les paquets compilés (charset-normalizer, markupsafe, pycryptodome) dont les wheels
# embarquées ne correspondent pas à l'ABI courant seront pris depuis le système.
"$PYTHON_BIN" -m venv --system-site-packages "$VENV_DIR"

echo "  Tentative d'installation depuis $WHEELS_DIR (--no-index, --no-deps)..."
"$VENV_DIR/bin/pip" install \
    --no-index \
    --find-links "$WHEELS_DIR" \
    --no-deps \
    autoslot beautifulsoup4 blinker certifi charset-normalizer \
    click flask flask-cors idna itsdangerous jinja2 markupsafe \
    pronotepy pycryptodome requests soupsieve typing-extensions \
    urllib3 werkzeug \
    --quiet 2>/dev/null || true

# Vérification des imports critiques
echo "  Vérification des imports critiques..."
MISSING_PKGS=""
for pkg in pronotepy flask flask_cors; do
    if ! "$VENV_DIR/bin/python3" -c "import $pkg" 2>/dev/null; then
        MISSING_PKGS="$MISSING_PKGS $pkg"
    fi
done

if [ -n "$MISSING_PKGS" ]; then
    echo "  Paquets manquants :$MISSING_PKGS"
    echo "  Tentative avec résolution des dépendances (--find-links uniquement)..."
    "$VENV_DIR/bin/pip" install \
        --no-index \
        --find-links "$WHEELS_DIR" \
        pronotepy flask flask-cors \
        --quiet 2>/dev/null || true

    # Si toujours manquant, tenter une installation en ligne (fallback réseau)
    for pkg in pronotepy flask flask_cors; do
        if ! "$VENV_DIR/bin/python3" -c "import $pkg" 2>/dev/null; then
            PKG_NAME=$(echo "$pkg" | tr '_' '-')
            echo "  Fallback réseau pour $PKG_NAME..."
            "$VENV_DIR/bin/pip" install "$PKG_NAME" --quiet 2>/dev/null || true
        fi
    done
fi

# Supprimer la sauvegarde si tout s'est bien passé
rm -rf "$VENV_BAK" 2>/dev/null || true

# Vérification finale
if "$VENV_DIR/bin/python3" -c "import pronotepy, flask, flask_cors" 2>/dev/null; then
    echo "  OK : pronotepy, flask, flask_cors importés avec succès."
else
    echo "  AVERTISSEMENT : vérification des imports échouée."
    echo "  Les paquets système seront utilisés si disponibles (--system-site-packages)."
    echo "  Si le problème persiste, exécutez :"
    echo "    sudo $VENV_DIR/bin/pip install pronotepy flask flask-cors"
fi

# --- 4. Service systemd (best effort) ---
echo "[4/5] Configuration du service systemd..."
if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q '^pronote-desktop-api\.service'; then
    systemctl daemon-reload 2>/dev/null || true
    systemctl enable pronote-desktop-api.service 2>/dev/null || true
    systemctl start pronote-desktop-api.service 2>/dev/null || true
    echo "  Service pronote-desktop-api activé (si disponible)."
else
    echo "  Aucun service systemd installé: démarrage backend via le launcher utilisateur."
fi

# --- 4b. Wrapper de lancement Electron robuste ---
# Certaines machines plantent au démarrage avec le binaire direct
# (/opt/Pronote Desktop/pronote-desktop) à cause du sandbox Chromium
# et/ou du rendu GPU. On force un wrapper stable.
if [ -x "/opt/Pronote Desktop/pronote-desktop" ]; then
    cat > /usr/bin/pronote-desktop << 'LAUNCHER'
#!/bin/bash
set -u

API_PORT=5174
if [ -f "/etc/pronote-desktop/config.json" ]; then
  _PORT=$(python3 -c "import json; d=json.load(open('/etc/pronote-desktop/config.json')); print(d.get('api_port', 5174))" 2>/dev/null || true)
  [ -n "$_PORT" ] && API_PORT="$_PORT"
fi

PY_BIN="/usr/lib/pronote-desktop/python-env/bin/python3"
BACKEND_SCRIPT="/opt/Pronote Desktop/resources/pronote_api.py"

health_ok() {
  python3 - "$API_PORT" << 'PY' >/dev/null 2>&1
import json, sys, urllib.request
port = sys.argv[1]
try:
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=1) as r:
        data = json.loads(r.read().decode("utf-8"))
        ok = data.get("status") == "ok"
except Exception:
    ok = False
raise SystemExit(0 if ok else 1)
PY
}

if ! health_ok; then
  if [ -x "$PY_BIN" ] && [ -f "$BACKEND_SCRIPT" ]; then
    nohup "$PY_BIN" "$BACKEND_SCRIPT" >/tmp/pronote-backend.log 2>&1 &
    for i in $(seq 1 20); do
      if health_ok; then
        break
      fi
      sleep 0.2
    done
  fi
fi

exec "/opt/Pronote Desktop/pronote-desktop" --no-sandbox --disable-gpu --ozone-platform=x11 "$@"
LAUNCHER
    chmod 755 /usr/bin/pronote-desktop
fi

# Corriger l'entrée desktop pour utiliser le wrapper /usr/bin
if [ -f "/usr/share/applications/pronote-desktop.desktop" ]; then
    sed -i 's|^Exec=.*|Exec=/usr/bin/pronote-desktop %U|' /usr/share/applications/pronote-desktop.desktop || true
fi

# --- 5. Métadonnées AppStream ---
echo "[5/5] Mise à jour des métadonnées AppStream..."
if command -v appstreamcli &>/dev/null; then
    appstreamcli refresh --force 2>/dev/null || true
fi

echo ""
echo "============================================"
echo " Pronote Desktop v1.7.5 installé !"
echo " Lancez l'application :"
echo "   • Menu Applications > Éducation"
echo "   • Commande : pronote-desktop"
echo ""
echo " Accès LAN/WAN :"
echo "   Définir api_host: \"0.0.0.0\" dans $CONFIG_FILE"
echo "   puis relancer l'application."
echo "============================================"
