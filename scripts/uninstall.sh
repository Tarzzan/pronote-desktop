#!/bin/bash
# =============================================================================
# uninstall.sh — Désinstallation complète de Pronote Desktop
# Compatible avec toutes les versions : v1.0.x à v1.5.x
# =============================================================================
# Usage :
#   sudo bash uninstall.sh           # Désinstallation standard (conserve config)
#   sudo bash uninstall.sh --purge   # Désinstallation complète (supprime tout)
#   sudo bash uninstall.sh --help    # Affiche cette aide
# =============================================================================

set -e

# --- Couleurs ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# --- Fonctions d'affichage ---
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()      { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERREUR]${NC} $*"; }
section() { echo -e "\n${BOLD}=== $* ===${NC}"; }

# --- Vérification des droits root ---
if [ "$EUID" -ne 0 ]; then
    error "Ce script doit être exécuté en tant que root."
    echo "  Relancez avec : sudo bash $0 $*"
    exit 1
fi

# --- Traitement des arguments ---
PURGE=false
for arg in "$@"; do
    case "$arg" in
        --purge) PURGE=true ;;
        --help|-h)
            echo ""
            echo "  ${BOLD}Désinstallation de Pronote Desktop${NC}"
            echo ""
            echo "  Usage :"
            echo "    sudo bash uninstall.sh            Désinstallation standard"
            echo "    sudo bash uninstall.sh --purge    Suppression totale (config incluse)"
            echo ""
            echo "  Mode standard  : supprime l'application, conserve /etc/pronote-desktop/"
            echo "  Mode purge     : supprime absolument tout, y compris la configuration"
            echo ""
            exit 0
            ;;
    esac
done

# --- Bannière ---
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       Désinstallation de Pronote Desktop             ║${NC}"
if $PURGE; then
echo -e "${BOLD}║              Mode : PURGE COMPLÈTE                  ║${NC}"
else
echo -e "${BOLD}║              Mode : Standard                        ║${NC}"
fi
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# --- Confirmation ---
if $PURGE; then
    warn "Mode PURGE activé : TOUS les fichiers seront supprimés, y compris la configuration."
else
    info "Mode standard : le dossier /etc/pronote-desktop/ sera conservé."
fi
echo ""
read -r -p "Confirmer la désinstallation ? [o/N] " confirm
if [[ ! "$confirm" =~ ^[oOyY]$ ]]; then
    echo "Annulé."
    exit 0
fi

# =============================================================================
# ÉTAPE 1 — Arrêt et désactivation du service systemd
# =============================================================================
section "Service systemd"

if systemctl is-active --quiet pronote-desktop-api 2>/dev/null; then
    info "Arrêt du service pronote-desktop-api..."
    systemctl stop pronote-desktop-api
    ok "Service arrêté."
else
    info "Le service n'est pas actif."
fi

if systemctl is-enabled --quiet pronote-desktop-api 2>/dev/null; then
    info "Désactivation du service pronote-desktop-api..."
    systemctl disable pronote-desktop-api
    ok "Service désactivé."
fi

# Suppression du fichier de service (toutes les versions)
SERVICE_FILES=(
    "/etc/systemd/system/pronote-desktop-api.service"
    "/lib/systemd/system/pronote-desktop-api.service"
    "/usr/lib/systemd/system/pronote-desktop-api.service"
)
for f in "${SERVICE_FILES[@]}"; do
    if [ -f "$f" ]; then
        rm -f "$f"
        ok "Supprimé : $f"
    fi
done

systemctl daemon-reload 2>/dev/null || true
ok "Daemon systemd rechargé."

# =============================================================================
# ÉTAPE 2 — Désinstallation via dpkg (si installé via paquet)
# =============================================================================
section "Désinstallation du paquet dpkg"

if dpkg -l pronote-desktop 2>/dev/null | grep -q "^ii"; then
    info "Paquet pronote-desktop détecté, désinstallation via dpkg..."
    if $PURGE; then
        dpkg -P pronote-desktop 2>/dev/null || true
        ok "Paquet purgé via dpkg."
    else
        dpkg -r pronote-desktop 2>/dev/null || true
        ok "Paquet désinstallé via dpkg."
    fi
else
    info "Aucun paquet dpkg détecté (installation manuelle ou déjà désinstallé)."
fi

# =============================================================================
# ÉTAPE 3 — Suppression des fichiers applicatifs (toutes versions)
# =============================================================================
section "Fichiers applicatifs"

# Répertoire principal (toutes versions)
APP_DIRS=(
    "/usr/lib/pronote-desktop"
    "/opt/pronote-desktop"                  # v1.3.0 et antérieures
    "/usr/share/pronote-desktop"            # variante possible
)
for d in "${APP_DIRS[@]}"; do
    if [ -d "$d" ]; then
        info "Suppression de $d..."
        rm -rf "$d"
        ok "Supprimé : $d"
    fi
done

# Script de lancement (toutes versions)
LAUNCHER_FILES=(
    "/usr/bin/pronote-desktop"
    "/usr/local/bin/pronote-desktop"
)
for f in "${LAUNCHER_FILES[@]}"; do
    if [ -f "$f" ]; then
        rm -f "$f"
        ok "Supprimé : $f"
    fi
done

# Entrée dans le menu Applications
DESKTOP_FILES=(
    "/usr/share/applications/pronote-desktop.desktop"
    "/usr/local/share/applications/pronote-desktop.desktop"
    "$HOME/.local/share/applications/pronote-desktop.desktop"
)
for f in "${DESKTOP_FILES[@]}"; do
    if [ -f "$f" ]; then
        rm -f "$f"
        ok "Supprimé : $f"
    fi
done

# Métadonnées AppStream (v1.4.0+)
METAINFO_FILES=(
    "/usr/share/metainfo/fr.pronote.desktop.metainfo.xml"
    "/usr/share/appdata/fr.pronote.desktop.metainfo.xml"
)
for f in "${METAINFO_FILES[@]}"; do
    if [ -f "$f" ]; then
        rm -f "$f"
        ok "Supprimé : $f"
    fi
done

# =============================================================================
# ÉTAPE 4 — Suppression des icônes (toutes versions)
# =============================================================================
section "Icônes"

ICON_SIZES=("16x16" "32x32" "48x48" "128x128" "256x256" "512x512" "scalable")
for size in "${ICON_SIZES[@]}"; do
    icon_path="/usr/share/icons/hicolor/${size}/apps/pronote-desktop.png"
    svg_path="/usr/share/icons/hicolor/${size}/apps/pronote-desktop.svg"
    for f in "$icon_path" "$svg_path"; do
        if [ -f "$f" ]; then
            rm -f "$f"
            ok "Supprimé : $f"
        fi
    done
done

# Mise à jour du cache d'icônes
if command -v gtk-update-icon-cache &>/dev/null; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor 2>/dev/null || true
    ok "Cache d'icônes mis à jour."
fi

# =============================================================================
# ÉTAPE 5 — Suppression de la configuration (mode purge uniquement)
# =============================================================================
section "Configuration"

CONFIG_DIR="/etc/pronote-desktop"
if $PURGE; then
    if [ -d "$CONFIG_DIR" ]; then
        info "Suppression de la configuration $CONFIG_DIR..."
        rm -rf "$CONFIG_DIR"
        ok "Supprimé : $CONFIG_DIR"
    else
        info "Aucun dossier de configuration trouvé."
    fi
else
    if [ -d "$CONFIG_DIR" ]; then
        warn "Conservation de $CONFIG_DIR (utilisez --purge pour supprimer)."
    fi
fi

# =============================================================================
# ÉTAPE 6 — Nettoyage des environnements virtuels Python résiduels
# =============================================================================
section "Environnements virtuels Python résiduels"

VENV_DIRS=(
    "/usr/lib/pronote-desktop/python-env"
    "/usr/lib/pronote-desktop/python-env.bak"
    "/opt/pronote-desktop/python-env"
    "/opt/pronote-desktop/venv"
)
for d in "${VENV_DIRS[@]}"; do
    if [ -d "$d" ]; then
        info "Suppression du venv résiduel $d..."
        rm -rf "$d"
        ok "Supprimé : $d"
    fi
done

# =============================================================================
# ÉTAPE 7 — Nettoyage des fichiers temporaires et logs
# =============================================================================
section "Fichiers temporaires"

TEMP_FILES=(
    "/tmp/pronote-desktop-*.log"
    "/tmp/pronote_api_*.log"
    "/var/log/pronote-desktop.log"
)
for pattern in "${TEMP_FILES[@]}"; do
    for f in $pattern; do
        if [ -f "$f" ]; then
            rm -f "$f"
            ok "Supprimé : $f"
        fi
    done
done

# =============================================================================
# RÉSUMÉ FINAL
# =============================================================================
section "Désinstallation terminée"

echo ""
if $PURGE; then
    ok "Pronote Desktop a été ${BOLD}complètement supprimé${NC} de ce système."
    echo ""
    info "Tous les fichiers suivants ont été supprimés :"
    echo "   /usr/lib/pronote-desktop/    (application + wheels + venv)"
    echo "   /usr/bin/pronote-desktop     (script de lancement)"
    echo "   /etc/systemd/system/pronote-desktop-api.service"
    echo "   /usr/share/applications/pronote-desktop.desktop"
    echo "   /usr/share/icons/hicolor/*/apps/pronote-desktop.*"
    echo "   /usr/share/metainfo/fr.pronote.desktop.metainfo.xml"
    echo "   /etc/pronote-desktop/        (configuration)"
else
    ok "Pronote Desktop a été désinstallé."
    echo ""
    warn "Le dossier de configuration ${BOLD}/etc/pronote-desktop/${NC} a été conservé."
    info "Pour supprimer également la configuration, relancez avec :"
    echo "   sudo bash uninstall.sh --purge"
fi
echo ""
