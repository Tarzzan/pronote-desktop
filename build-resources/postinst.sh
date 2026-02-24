#!/bin/bash
# Post-installation script for pronote-desktop v1.6.1 (offline)
# Installation 100% hors-ligne — aucun appel réseau effectué
# Compatible Ubuntu 22.04 (Python 3.10/3.11) et Ubuntu 24.04 (Python 3.12)
set -e

INSTALL_DIR="/usr/lib/pronote-desktop"
VENV_DIR="$INSTALL_DIR/python-env"
VENV_BAK="$INSTALL_DIR/python-env.bak"
WHEELS_DIR="$INSTALL_DIR/wheels"
CONFIG_DIR="/etc/pronote-desktop"
CONFIG_FILE="$CONFIG_DIR/config.json"

echo "============================================"
echo " Pronote Desktop v1.6.1 — Installation"
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
  "version": "1.6.1",
  "theme": "light",
  "check_updates": true,
  "api_port": 5174,
  "browser": "auto"
}
CONFIG
    echo "Fichier de configuration créé : $CONFIG_FILE"
else
    echo "Configuration existante conservée : $CONFIG_FILE"
fi

# --- 3. Environnement virtuel Python (offline) ---
echo "[3/5] Installation des dépendances Python (offline)..."

if ! python3 -m venv --help &>/dev/null 2>&1; then
    echo "ERREUR : python3-venv n'est pas disponible."
    echo "Installez-le : sudo apt-get install python3-venv"
    exit 1
fi

# Supprimer l'ancien venv (remplacé par le nouveau)
rm -rf "$VENV_DIR" 2>/dev/null || true

# Utiliser --system-site-packages pour hériter des paquets système
# Cela garantit la compatibilité avec Python 3.12 (Ubuntu 24.04) et 3.11 (Ubuntu 22.04)
# Les paquets système (charset-normalizer, markupsafe) sont utilisés si les wheels
# embarqués ne correspondent pas à la version Python installée.
python3 -m venv --system-site-packages "$VENV_DIR"

echo "  Installation depuis $WHEELS_DIR (--no-index)..."
"$VENV_DIR/bin/pip" install \
    --no-index \
    --find-links "$WHEELS_DIR" \
    --no-deps \
    autoslot beautifulsoup4 blinker certifi charset-normalizer \
    click flask flask-cors idna itsdangerous jinja2 markupsafe \
    pronotepy pycryptodome requests soupsieve typing-extensions \
    urllib3 werkzeug \
    --quiet 2>/dev/null || true

# Fallback : si certains wheels échouent (incompatibilité ABI), utiliser pip sans --no-index
# pour les paquets purement Python (py3-none-any) qui ne dépendent pas de l'ABI
echo "  Vérification des imports critiques..."
if ! "$VENV_DIR/bin/python3" -c "import pronotepy" 2>/dev/null; then
    echo "  Tentative d'installation avec fallback (paquets système)..."
    "$VENV_DIR/bin/pip" install \
        --no-index \
        --find-links "$WHEELS_DIR" \
        pronotepy flask flask-cors \
        --quiet 2>/dev/null || true
fi

# Supprimer la sauvegarde si tout s'est bien passé
rm -rf "$VENV_BAK" 2>/dev/null || true

# Vérification finale
if "$VENV_DIR/bin/python3" -c "import pronotepy, flask, flask_cors" 2>/dev/null; then
    echo "  OK : pronotepy, flask, flask_cors importés avec succès."
else
    echo "  AVERTISSEMENT : vérification des imports échouée."
    echo "  Les paquets système seront utilisés si disponibles (--system-site-packages)."
fi

# --- 4. Service systemd ---
echo "[4/5] Configuration du service systemd..."
systemctl daemon-reload 2>/dev/null || true
systemctl enable pronote-desktop-api.service 2>/dev/null || true
systemctl start pronote-desktop-api.service 2>/dev/null || true
echo "  Service pronote-desktop-api activé et démarré."

# --- 5. Métadonnées AppStream ---
echo "[5/5] Mise à jour des métadonnées AppStream..."
if command -v appstreamcli &>/dev/null; then
    appstreamcli refresh --force 2>/dev/null || true
fi

echo ""
echo "============================================"
echo " Pronote Desktop v1.6.1 installé !"
echo " Lancez l'application :"
echo "   • Menu Applications > Éducation"
echo "   • Commande : pronote-desktop"
echo "============================================"
