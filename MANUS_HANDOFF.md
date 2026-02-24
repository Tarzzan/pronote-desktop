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
| **v1.5.0** | **2026-02-24** | **Port configurable, thème sombre persistant, notifications desktop, icône SVG scalable, captures AppStream, correction de toutes les versions hardcodées** | [v1.5.0](https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.5.0) |

### Problèmes résolus

| Problème | Version | Solution |
|----------|---------|----------|
| Données statiques hardcodées | v1.1.0 | Remplacement par appels réels à l'API Pronote via `pronotepy` |
| CSS écrasé en production | v1.2.0 | Suppression du reset `* { box-sizing }` dans `index.css` |
| `pip install` échoue sur Ubuntu 24.04+ | v1.3.1 | Utilisation d'un venv isolé + `--no-index --find-links` |
| Chemin venv incohérent | v1.3.1 | Unification sur `/usr/lib/pronote-desktop/python-env` |
| Délai de 2s au démarrage | v1.4.0 | Service systemd qui maintient le backend actif en permanence |
| Aucune icône dans le menu | v1.4.0 | Icônes PNG multi-résolution + cache hicolor |
| Versions hardcodées dans les sources | v1.5.0 | Correction dans pronote_api.py, Sidebar, ErrorBoundary, LoginPage, PlaceholderPage |
| Lien GitHub incorrect dans ErrorBoundary | v1.5.0 | Corrigé vers `Tarzzan/pronote-desktop` |
| Thème sombre non persisté | v1.5.0 | Sauvegarde dans localStorage |
| Port Flask non configurable | v1.5.0 | Lecture depuis `/etc/pronote-desktop/config.json` |
| Icône SVG manquante | v1.5.0 | Création de `pronote-desktop.svg` dans `scalable/apps/` |

### Décisions d'architecture

- **Architecture choisie** : application web locale (React + Flask) plutôt qu'Electron, pour réduire la taille du paquet (19 Mo avec wheels vs ~200 Mo Electron)
- **Backend** : serveur Flask Python sur `localhost:5174` (configurable), proxy vers l'API Pronote via `pronotepy`
- **Frontend** : React + TypeScript + TailwindCSS, compilé en bundle statique (`dist/`)
- **Distribution** : paquet `.deb` manuel (sans electron-builder) pour un contrôle total sur la structure
- **Offline** : wheels Python embarqués dans `/usr/lib/pronote-desktop/wheels/` pour éviter toute dépendance réseau à l'installation

---

## Section B — État actuel du projet (v1.5.0)

### Fonctionnalités implémentées

| Fonctionnalité | État | Détail |
|---|---|---|
| Dashboard | Fonctionnel | Agrégation des données principales |
| Emploi du temps | Fonctionnel | Vue semaine, navigation |
| Notes | Fonctionnel | Moyennes, graphiques, par période |
| Devoirs | Fonctionnel | Liste, filtres par date |
| Messagerie | Fonctionnel | Lecture des discussions |
| Absences/Retards | Fonctionnel | Liste avec justification |
| Informations | Fonctionnel | Actualités de l'établissement |
| Bulletins | Fonctionnel | Par période, RadarChart |
| Compétences | Fonctionnel | Évaluations par compétence |
| QCM | Fonctionnel | Liste des évaluations |
| Thème sombre | Fonctionnel | Persisté dans localStorage |
| Notifications desktop | Fonctionnel | Via `notify-send` |
| Port configurable | Fonctionnel | Via `/etc/pronote-desktop/config.json` |
| Service systemd | Fonctionnel | `pronote-desktop-api.service` |
| Vérificateur MAJ | Fonctionnel | `check-update.sh` au démarrage |
| AppStream | Fonctionnel | `fr.pronote.desktop.metainfo.xml` |
| Icône SVG scalable | Fonctionnel | `pronote-desktop.svg` |
| Captures AppStream | Présentes | 3 captures dans `docs/screenshots/` |

### Pages encore en Placeholder (priorité v1.6.0)

- `/timetable/multi` — Emploi du temps multi-classes
- `/grades/edit` — Saisie des notes
- `/grades/appreciations` — Appréciations
- `/homework/edit` — Saisie des devoirs
- `/homework/planning` — Planning
- `/homework/exams` — Examens
- `/attendance/call` — **Appel de présence** ← priorité haute
- `/attendance/sanctions` — Sanctions
- `/messaging/new` — Nouveau message
- `/students`, `/students/:id` — Gestion élèves
- `/parents` — Communication parents
- `/reports` — Rapports
- `/schedule` — Gestion EDT
- `/resources` — Ressources pédagogiques
- `/settings` — **Paramètres** ← priorité haute

### Structure du dépôt

```
pronote-desktop/
├── src/                   # Code source React/TypeScript
│   ├── components/        # Composants UI (Sidebar, Header, pages...)
│   ├── store/             # Store Zustand (auth, état global)
│   └── lib/client.ts      # Client API TypeScript
├── dist/                  # Bundle compilé (généré par `pnpm build:web`)
├── build-resources/       # Ressources pour le build .deb
│   ├── postinst.sh        # Script post-installation
│   ├── postrm.sh          # Script post-désinstallation
│   └── icon.png           # Icône source
├── docs/
│   ├── screenshots/       # Captures AppStream (dashboard, timetable, grades)
│   └── manus-config/      # Fichiers de configuration pour Manus
├── pronote_api.py         # Backend Flask Python (v1.5.0)
├── package.json           # Version actuelle : 1.5.0
├── CHANGELOG.md           # Historique des versions
└── MANUS_HANDOFF.md       # CE FICHIER
```

### Commandes de build reproductibles

```bash
# 1. Construire le frontend (nécessite Node.js 22 + pnpm)
cd /home/ubuntu/pronote-desktop
pnpm install && pnpm build:web   # Génère dist/

# 2. Télécharger les wheels Python (si mise à jour des dépendances)
mkdir -p /tmp/wheels
python3 -m pip download pronotepy flask flask-cors \
  --dest /tmp/wheels \
  --platform manylinux_2_17_x86_64 \
  --python-version 3.10 \
  --only-binary=:all:

# 3. Assembler depuis le .deb précédent
dpkg-deb --fsys-tarfile pronote-desktop_1.5.0_offline_amd64.deb | tar -x -C /tmp/pronote-vNEW/
# Mettre à jour les fichiers modifiés
# Recréer les scripts DEBIAN depuis build-resources/

# 4. Construire le paquet
dpkg-deb --build /tmp/pronote-vNEW pronote-desktop_X.X.X_offline_amd64.deb
```

### Token GitHub — Comment le créer

**NE PAS stocker le token ici.** Pour créer un nouveau token :

1. Aller sur https://github.com/settings/tokens?type=beta
2. Cliquer **Generate new token**
3. Sélectionner le dépôt : `Tarzzan/pronote-desktop`
4. Permissions requises :
   - **Contents** : Read and write
   - **Workflows** : Read and write
5. Expiration recommandée : 2 jours (Custom)
6. Configurer dans git : `git remote set-url origin "https://{TOKEN}@github.com/Tarzzan/pronote-desktop.git"`

---

## Section C — Backlog priorisé (v1.6.0)

### Haute priorité

- [ ] **Page Appel de présence** (`/attendance/call`) : formulaire d'appel avec statuts présent/absent/retard, endpoint Flask `/api/attendance/call` (POST)
- [ ] **Page Paramètres** (`/settings`) : interface pour modifier `config.json` (port, thème par défaut, notifications on/off, URL serveur Pronote)
- [ ] **Page de connexion améliorée** : support multi-établissements, mémorisation des identifiants, gestion des erreurs réseau explicites

### Priorité moyenne

- [ ] **Saisie des notes** (`/grades/edit`) : formulaire de saisie avec validation
- [ ] **Saisie des devoirs** (`/homework/edit`) : éditeur avec date d'échéance
- [ ] **Nouveau message** (`/messaging/new`) : composition avec destinataires

### Infrastructure

- [ ] **Dépôt APT** : héberger sur GitHub Pages pour `apt upgrade` natif
  - Générer une clé GPG : `gpg --gen-key`
  - Signer le paquet : `dpkg-sig --sign builder pronote-desktop_X.X.X_offline_amd64.deb`
  - Publier `Packages`, `Release`, `InRelease` sur la branche `gh-pages`
- [ ] **GitHub Actions CI** : workflow `.github/workflows/build.yml` pour construire automatiquement le .deb à chaque tag

### Basse priorité / Idées futures

- [ ] **Support macOS** : `.pkg` ou `.dmg`
- [ ] **Version Flatpak** : portage pour Flathub
- [ ] **Reconnexion automatique** : renouveler la session Pronote expirée sans action utilisateur

### Bugs connus

| Bug | Criticité | Description |
|-----|-----------|-------------|
| Race condition démarrage | Faible | Le navigateur peut s'ouvrir avant que Flask soit prêt |
| Pas de reconnexion auto | Moyenne | Session Pronote expirée → reconnexion manuelle requise |
| Wheels non mis à jour | Faible | Les wheels embarqués datent du build — `pronotepy` peut avoir des MAJ |

---

## Section D — Fichiers de configuration pour la prochaine instance

Voir le dossier `docs/manus-config/` dans ce dépôt :

- **`build-config.json`** : paramètres de build complets (version, chemins, liste des wheels)
- **`release-checklist.md`** : liste de contrôle à suivre avant chaque release
- **`github-setup.md`** : procédure détaillée de création du token GitHub

---

*Dernière mise à jour : 2026-02-24 par Manus (instance de construction v1.5.0)*
