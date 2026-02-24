# MANUS_HANDOFF.md — Pronote Desktop

> **Fichier de passation entre instances Manus.**
> Si tu es une nouvelle instance Manus travaillant sur ce projet, lis ce fichier en premier.
> Il contient tout l'historique, l'état actuel et les prochaines actions à mener.

---

## Section A — Historique des actions menées

### Tableau des versions publiées

| Version | Date | Description | Release GitHub |
|---------|------|-------------|----------------|
| v1.0.1 | 2026-02-24 | Première version publique — interface complète (dashboard, EDT, notes, messagerie, vie scolaire, dark mode, auth QR) | [v1.0.1](https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.0.1) |
| v1.1.0 | 2026-02-24 | API Pronote réelle via `pronotepy`, store Zustand, CI/CD GitHub Actions, script de versioning automatique | [v1.1.0](https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.1.0) |
| v1.2.0 | 2026-02-24 | Backend Flask (`pronote_api.py`), correction CSS critique, ErrorBoundary React, remontée d'erreurs GitHub | [v1.2.0](https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.2.0) |
| v1.3.0 | 2026-02-24 | Bulletins scolaires (RadarChart), compétences, QCM, graphiques (PieChart/BarChart), animations framer-motion | [v1.3.0](https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.3.0) |
| v1.3.1 | 2026-02-24 | **Correction critique** : chemin venv incohérent (`/opt/` vs `/usr/lib/`), compatibilité Ubuntu 24.04+ (PEP 668), paquet offline avec 19 wheels embarqués | [v1.3.1](https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.3.1) |
| v1.4.0 | 2026-02-24 | Icône multi-résolution, service systemd, vérificateur MAJ, AppStream, conffiles, preinst, description enrichie | [v1.4.0](https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.4.0) |

### Problèmes résolus

| Problème | Version | Solution |
|----------|---------|----------|
| Données statiques hardcodées | v1.1.0 | Remplacement par appels réels à l'API Pronote via `pronotepy` |
| CSS écrasé en production | v1.2.0 | Suppression du reset `* { box-sizing }` dans `index.css` |
| `pip install` échoue sur Ubuntu 24.04+ | v1.3.1 | Utilisation d'un venv isolé + `--no-index --find-links` |
| Chemin venv incohérent | v1.3.1 | Unification sur `/usr/lib/pronote-desktop/python-env` |
| Délai de 2s au démarrage | v1.4.0 | Service systemd qui maintient le backend actif en permanence |
| Aucune icône dans le menu | v1.4.0 | Icônes PNG multi-résolution + cache hicolor |

### Décisions d'architecture

- **Architecture choisie** : application web locale (React + Flask) plutôt qu'Electron, pour réduire la taille du paquet (4 Mo vs ~200 Mo)
- **Backend** : serveur Flask Python sur `localhost:5174`, proxy vers l'API Pronote via `pronotepy`
- **Frontend** : React + TypeScript + TailwindCSS, compilé en bundle statique (`dist/`)
- **Distribution** : paquet `.deb` manuel (sans electron-builder) pour un contrôle total sur la structure
- **Offline** : wheels Python embarqués dans `/usr/lib/pronote-desktop/wheels/` pour éviter toute dépendance réseau à l'installation

---

## Section B — État actuel du projet

### Structure du dépôt

```
pronote-desktop/
├── electron/              # Fichiers Electron (non utilisés dans le .deb actuel)
├── src/                   # Code source React/TypeScript
│   ├── components/        # Composants UI (Sidebar, Header, pages...)
│   ├── store/             # Store Zustand (auth, état global)
│   └── api/               # Client API TypeScript (appels vers Flask)
├── dist/                  # Bundle compilé (généré par `vite build`)
│   ├── assets/            # JS + CSS compilés
│   └── index.html
├── build-resources/       # Ressources pour le build .deb
│   ├── postinst.sh        # Script post-installation (référence, pas utilisé directement)
│   ├── postrm.sh          # Script post-désinstallation
│   └── icon.png           # Icône source
├── scripts/               # Scripts utilitaires
│   └── bump-version.cjs   # Incrémentation automatique de version
├── pronote_api.py         # Backend Flask Python (copié dans /usr/lib/pronote-desktop/)
├── package.json           # Version actuelle : 1.4.0
├── CHANGELOG.md           # Historique des versions
├── MANUS_HANDOFF.md       # CE FICHIER — passation entre instances Manus
└── docs/manus-config/     # Fichiers de configuration pour Manus
    ├── build-config.json  # Paramètres de build reproductibles
    ├── release-checklist.md
    └── github-setup.md
```

### Commandes de build reproductibles

```bash
# 1. Cloner le dépôt
git clone https://github.com/Tarzzan/pronote-desktop.git
cd pronote-desktop

# 2. Construire le frontend (nécessite Node.js 22 + pnpm)
pnpm install
pnpm build:web   # Génère dist/

# 3. Télécharger les wheels Python (nécessite connexion internet)
mkdir -p /tmp/wheels
python3 -m pip download pronotepy flask flask-cors --dest /tmp/wheels

# 4. Assembler le .deb offline (voir docs/manus-config/build-config.json)
# Structure : voir Section B ci-dessus
# Scripts DEBIAN : voir /tmp/pronote-v140/DEBIAN/ dans le sandbox Manus

# 5. Construire le paquet
dpkg-deb --build /tmp/pronote-v{VERSION} pronote-desktop_{VERSION}_offline_amd64.deb
```

### Token GitHub — Comment le créer

**NE PAS stocker le token ici.** Pour créer un nouveau token :

1. Aller sur https://github.com/settings/tokens?type=beta
2. Cliquer **Generate new token**
3. Sélectionner le dépôt : `Tarzzan/pronote-desktop`
4. Permissions requises :
   - **Contents** : Read and write
   - **Workflows** : Read and write
5. Configurer dans git : `git remote set-url origin "https://Tarzzan:{TOKEN}@github.com/Tarzzan/pronote-desktop.git"`
6. Créer une release : `curl -X POST -H "Authorization: token {TOKEN}" https://api.github.com/repos/Tarzzan/pronote-desktop/releases`

---

## Section C — Backlog priorisé

### Haute priorité

- [ ] **Captures d'écran réelles** : générer des screenshots PNG 1280×800 de chaque page et les uploader sur la release v1.4.0 (référencés dans `fr.pronote.desktop.metainfo.xml`)
- [ ] **SVG scalable** : créer `pronote-desktop.svg` pour `/usr/share/icons/hicolor/scalable/apps/`
- [ ] **Tests d'installation** : tester le `.deb` v1.4.0 sur une VM Ubuntu 22.04 et 24.04 vierge

### Priorité moyenne

- [ ] **Dépôt APT** : héberger un dépôt APT sur GitHub Pages pour `apt upgrade` natif
  - Générer une clé GPG : `gpg --gen-key`
  - Signer le paquet : `dpkg-sig --sign builder pronote-desktop_1.4.0_offline_amd64.deb`
  - Publier `Packages`, `Release`, `InRelease` sur la branche `gh-pages`
- [ ] **Port configurable** : lire `api_port` depuis `/etc/pronote-desktop/config.json` dans `pronote_api.py`
- [ ] **Page de connexion améliorée** : ajouter un champ pour l'URL du serveur Pronote (actuellement hardcodé)
- [ ] **Support macOS** : créer un `.pkg` ou un `.dmg` pour macOS

### Basse priorité / Idées futures

- [ ] **Version Flatpak** : portage pour Flathub (sandbox, mise à jour automatique)
- [ ] **Thème sombre** : le toggle dark mode est présent dans l'UI mais non persisté
- [ ] **Notifications desktop** : alertes pour nouveaux messages ou devoirs via `libnotify`
- [ ] **Raccourci clavier global** : ouvrir/fermer l'application depuis n'importe où

### Bugs connus

| Bug | Criticité | Description |
|-----|-----------|-------------|
| `flask_cors.__version__` deprecation warning | Faible | Warning Flask 3.2 sur `__version__`, non bloquant |
| `pronote_api.py` version hardcodée à 1.2.0 | Faible | Le commentaire en tête de fichier indique v1.2.0, à mettre à jour |
| Icône SVG manquante | Faible | Le dossier `scalable/apps/` est vide, fallback sur PNG 512×512 |

---

## Section D — Fichiers de configuration pour la prochaine instance

Voir le dossier `docs/manus-config/` dans ce dépôt :

- **`build-config.json`** : paramètres de build complets (version, chemins, liste des wheels)
- **`release-checklist.md`** : liste de contrôle à suivre avant chaque release
- **`github-setup.md`** : procédure détaillée de création du token GitHub

---

*Dernière mise à jour : 2026-02-24 par Manus (instance de construction v1.4.0)*
