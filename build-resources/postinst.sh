#!/bin/bash
# Post-installation script for pronote-desktop v1.3.1
# Corrige le problème PEP 668 sur Ubuntu 24.04+
set -e
INSTALL_DIR="/usr/lib/pronote-desktop"
VENV_DIR="$INSTALL_DIR/python-env"

echo "Pronote Desktop — Configuration de l'environnement Python..."

# Mettre à jour les bases de données desktop
update-desktop-database /usr/share/applications 2>/dev/null || true
gtk-update-icon-cache /usr/share/icons/hicolor 2>/dev/null || true

# Installer python3-venv si manquant
if ! python3 -m venv --help &>/dev/null 2>&1; then
    echo "Installation de python3-venv..."
    apt-get install -y python3-venv python3-full 2>/dev/null || true
fi

# Créer l'environnement virtuel Python
echo "Creation de l'environnement virtuel Python dans $VENV_DIR..."
python3 -m venv "$VENV_DIR" 2>/dev/null || {
    apt-get install -y python3-full 2>/dev/null || true
    python3 -m venv "$VENV_DIR"
}

# Installer les dépendances Python dans le venv
echo "Installation des dependances (pronotepy, flask, flask-cors)..."
"$VENV_DIR/bin/pip" install --upgrade pip --quiet 2>/dev/null || true
"$VENV_DIR/bin/pip" install pronotepy flask flask-cors --quiet

echo "Pronote Desktop v1.3.1 installe avec succes !"
echo "Lancez l'application depuis le menu Applications > Education"
echo "ou en executant : pronote-desktop"
