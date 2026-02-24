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
| v1.5.0 | 2026-02-24 | Port configurable, thème sombre persistant, notifications desktop, icône SVG scalable, captures AppStream, correction de toutes les versions hardcodées | [v1.5.0](https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.5.0) |
| **v1.6.0** | **2026-02-24** | **Appel de présence, Paramètres, Nouveau message, Saisie devoirs, mémorisation identifiants, correction bugs** | [v1.6.0](https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.6.0) |

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
| Pages placeholder sans fonctionnalité | v1.6.0 | Implémentation de 4 pages clés + amélioration connexion |
| Version hardcodée dans client.ts | v1.6.0 | Corrigée vers v1.6.0 |

### Décisions d'architecture

- **Architecture choisie** : application web locale (React + Flask) plutôt qu'Electron, pour réduire la taille du paquet (19 Mo avec wheels vs ~200 Mo Electron)
- **Backend** : serveur Flask Python sur `localhost:5174` (configurable), proxy vers l'API Pronote via `pronotepy`
- **Frontend** : React + TypeScript + TailwindCSS, compilé en bundle statique (`dist/`)
- **Distribution** : paquet `.deb` manuel (sans electron-builder) pour un contrôle total sur la structure
- **Offline** : wheels Python embarqués dans `/usr/lib/pronote-desktop/wheels/` pour éviter toute dépendance réseau à l'installation

---

## Section B — État actuel du projet (v1.6.0)

### Fonctionnalités implémentées

| Fonctionnalité | État | Détail |
|---|---|---|
| Dashboard | Fonctionnel | Agrégation des données principales |
| Emploi du temps | Fonctionnel | Vue semaine, navigation |
| Notes | Fonctionnel | Moyennes, graphiques, par période |
| Devoirs | Fonctionnel | Liste, filtres par date |
| Saisie des devoirs | **Fonctionnel (v1.6.0)** | Formulaire avec date d'échéance et matière |
| Messagerie | Fonctionnel | Lecture des discussions |
| Nouveau message | **Fonctionnel (v1.6.0)** | Composition avec destinataires (envoi simulé) |
| Absences/Retards | Fonctionnel | Liste avec justification |
| Appel de présence | **Fonctionnel (v1.6.0)** | Formulaire interactif présent/absent/retard (simulé) |
| Informations | Fonctionnel | Actualités de l'établissement |
| Bulletins | Fonctionnel | Par période, RadarChart |
| Compétences | Fonctionnel | Évaluations par compétence |
| QCM | Fonctionnel | Liste des évaluations |
| Paramètres | **Fonctionnel (v1.6.0)** | Interface pour modifier config.json |
| Connexion | **Amélioré (v1.6.0)** | Mémorisation identifiants via localStorage |
| Thème sombre | Fonctionnel | Persisté dans localStorage |
| Notifications desktop | Fonctionnel | Via `notify-send` |
| Port configurable | Fonctionnel | Via `/etc/pronote-desktop/config.json` |
| Service systemd | Fonctionnel | `pronote-desktop-api.service` |
| Vérificateur MAJ | Fonctionnel | `check-update.sh` au démarrage |
| AppStream | Fonctionnel | `fr.pronote.desktop.metainfo.xml` |
| Icône SVG scalable | Fonctionnel | `pronote-desktop.svg` |

### Pages encore en Placeholder

- `/timetable/multi` — Emploi du temps multi-classes
- `/grades/edit` — Saisie des notes
- `/grades/appreciations` — Appréciations
- `/homework/planning` — Planning
- `/homework/exams` — **Examens/Contrôles** ← priorité haute v1.7.0
- `/attendance/sanctions` — Sanctions
- `/students`, `/students/:id` — Gestion élèves
- `/parents` — Communication parents
- `/reports` — Rapports
- `/schedule` — Gestion EDT
- `/resources` — Ressources pédagogiques

### Bugs connus (à corriger en priorité)

| Bug | Criticité | Description |
|-----|-----------|-------------|
| Appel de présence simulé | **Haute** | `AttendanceCallPage.tsx` envoie l'appel mais `/api/call` n'existe pas dans Flask — à implémenter |
| Envoi de message simulé | **Haute** | `NewMessagePage.tsx` simule l'envoi — `/api/send_message` non implémenté dans Flask |
| Race condition démarrage | Faible | Le navigateur peut s'ouvrir avant que Flask soit prêt |
| Pas de reconnexion auto | Moyenne | Session Pronote expirée → reconnexion manuelle requise |

### Structure du dépôt

```
pronote-desktop/
├── src/
│   ├── App.tsx                    # Routes React (React Router)
│   ├── lib/
│   │   ├── pronote-client.ts      # Client API (appels vers Flask)
│   │   └── store.ts               # Store Zustand (auth, user)
│   └── pages/
│       ├── AttendanceCallPage.tsx  # Appel de présence (v1.6.0)
│       ├── SettingsPage.tsx        # Paramètres (v1.6.0)
│       ├── NewMessagePage.tsx      # Nouveau message (v1.6.0)
│       ├── HomeworkEditPage.tsx    # Saisie devoirs (v1.6.0)
│       └── LoginPage.tsx           # Connexion améliorée (v1.6.0)
├── pronote_api.py                 # Backend Flask Python (v1.6.0)
├── build-resources/
│   ├── postinst.sh               # Script d'installation (venv Python)
│   └── icons/                    # Icônes PNG multi-résolution + SVG
├── scripts/
│   └── uninstall.sh              # Script de désinstallation complet
├── docs/
│   ├── screenshots/              # Captures AppStream
│   └── manus-config/
│       ├── build-config.json     # Config de build pour Manus
│       ├── release-checklist.md  # Checklist avant release
│       └── github-setup.md       # Guide création token GitHub
└── MANUS_HANDOFF.md              # CE FICHIER
```

---

## Section C — Backlog priorisé (v1.7.0)

### Haute priorité — À faire en premier

1. **Implémenter `/api/call` dans `pronote_api.py`** : endpoint POST pour saisir l'appel de présence via `pronotepy`. La page frontend `AttendanceCallPage.tsx` est prête, il manque juste le backend.

2. **Implémenter `/api/send_message` dans `pronote_api.py`** : endpoint POST pour envoyer un message via `pronotepy`. La page `NewMessagePage.tsx` est prête.

3. **Page Examens/Contrôles** (`/homework/exams`) : calendrier des contrôles avec matière, date, coefficient. Endpoint Flask : `/api/exams`.

4. **Page Compétences détaillée** (`/bulletins/competences`) : tableau des compétences par matière avec niveaux A/B/C/D.

### Priorité moyenne

5. **Dépôt APT** sur GitHub Pages pour `apt upgrade` natif
6. **Page Appréciations** (`/grades/appreciations`) — saisie des appréciations par matière
7. **Page Vie scolaire** (`/bulletins/vie-scolaire`) — comportement, travail, assiduité
8. **Reconnexion automatique** — renouveler la session Pronote expirée sans action utilisateur

### Infrastructure

9. **GitHub Actions CI** : workflow `.github/workflows/build.yml` pour construire automatiquement le .deb à chaque tag

### Basse priorité

10. **Support macOS** — `.pkg` ou `.dmg`
11. **Version Flatpak** — portage pour Flathub

---

## Section D — Procédures techniques

### Créer un token GitHub (nécessaire à chaque session)

1. Aller sur https://github.com/settings/tokens?type=beta
2. Cliquer **Generate new token**
3. Sélectionner le dépôt : `Tarzzan/pronote-desktop`
4. Permissions requises : **Contents** (Read and write) + **Workflows** (Read and write)
5. Expiration : 2 jours (Custom)
6. Configurer dans git : `git remote set-url origin "https://x-access-token:{TOKEN}@github.com/Tarzzan/pronote-desktop.git"`

### Commandes de build reproductibles

```bash
# 1. Construire le frontend
cd /home/ubuntu/pronote-desktop
pnpm build:web   # Génère dist/

# 2. Assembler depuis le .deb précédent
dpkg-deb --fsys-tarfile pronote-desktop_PREV_offline_amd64.deb | tar -x -C /tmp/pronote-vNEW/
# Mettre à jour les fichiers modifiés dans /tmp/pronote-vNEW/
# Extraire les scripts DEBIAN du .deb précédent et mettre à jour la version

# 3. Construire le paquet
dpkg-deb --build /tmp/pronote-vNEW pronote-desktop_X.Y.Z_offline_amd64.deb
```

### Créer une release GitHub

```bash
TOKEN="github_pat_..."

# Créer la release
RELEASE_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/Tarzzan/pronote-desktop/releases" \
  --data "{\"tag_name\":\"vX.Y.Z\",\"name\":\"vX.Y.Z — Description\",\"body\":\"Notes de release\",\"draft\":false}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Uploader le .deb
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/vnd.debian.binary-package" \
  --data-binary @pronote-desktop_X.Y.Z_offline_amd64.deb \
  "https://uploads.github.com/repos/Tarzzan/pronote-desktop/releases/${RELEASE_ID}/assets?name=pronote-desktop_X.Y.Z_offline_amd64.deb"
```

---

## Section E — Fichiers de configuration pour la prochaine instance

Voir le dossier `docs/manus-config/` dans ce dépôt :

- **`build-config.json`** : paramètres de build complets (version, chemins, liste des wheels)
- **`release-checklist.md`** : liste de contrôle à suivre avant chaque release
- **`github-setup.md`** : procédure détaillée de création du token GitHub

---

*Dernière mise à jour : 2026-02-24 par Manus (instance de construction v1.6.0)*
