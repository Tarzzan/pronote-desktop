# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

## [1.7.4] — 2026-02-25

### Corrigé
- **Écran blanc en version packagée** : remplacement conditionnel de `BrowserRouter` par `HashRouter` quand l'application est chargée en `file://` (Electron), ce qui restaure correctement le rendu des routes.
- **API inaccessible en mode `file://`** : correction de la résolution de base URL côté client (`src/lib/pronote/client.ts`) pour utiliser `http://127.0.0.1:5174/api` lorsque `window.location.origin` est invalide (`null`).
- **Reprise en cours de route** : ajout d’un fallback de navigation dans `ErrorBoundary` compatible avec le mode hash (`#/dashboard`) pour éviter un blocage après erreur.
- **Crash Linux au lancement (`chrome-sandbox` / chemin avec espace)** : ajout d’un wrapper `/usr/bin/pronote-desktop` dans `postinst.sh` qui lance Electron avec `--no-sandbox --disable-gpu --ozone-platform=x11`, puis correction de l’entrée `.desktop` pour utiliser ce wrapper.
- **Post-install trompeur** : messages de version `v1.7.0` corrigés vers `v1.7.4` dans le script d’installation Debian.

## [1.7.3] — 2026-02-25

### Amélioré
- **Performance frontend** : migration des pages vers un chargement lazy (`React.lazy` + `Suspense`) dans le routeur principal afin de réduire fortement le bundle initial chargé au démarrage.
- **Build stable post-reprise** : conservation d'un build Vite propre après optimisation (lint, typecheck et build validés hors sandbox).

## [1.7.2] — 2026-02-25

### Corrigé
- **Release GitHub sur tag** : correction du workflow CI pour empêcher `electron-builder` de publier pendant l'étape de build (`--publish never`), ce qui bloquait le job `Build Linux (.deb)` sur les tags et empêchait la création de release.
- **Continuité de reprise** : publication corrective suite à la reprise en cours de route afin de fiabiliser la chaîne de release automatisée.

## [1.7.1] — 2026-02-25

### Corrigé
- **Stabilisation audit/CI** : ajout d'une configuration ESLint v9 (`eslint.config.mjs`) et correction des erreurs bloquantes de lint (imports inutilisés, blocs vides, typage explicite).
- **Cohérence dépôt GitHub** : correction des métadonnées `homepage`, `repository` et `bugs` dans `package.json` pour pointer vers `Tarzzan/pronote-desktop`.
- **Pré-requis outillage** : ajout de `.nvmrc` et du champ `engines` (`Node >= 22.12`, `pnpm >= 10`) pour éviter les écarts entre local et CI.
- **Bug build local documenté et contourné** : déclaration explicite du binding optionnel `@tailwindcss/oxide-linux-x64-gnu` pour traiter l'erreur `Cannot find native binding` rencontrée durant la reprise.

### Documentation
- **Reprise du projet en cours de route** : README aligné avec l'état réel (versions, installation, stack, renvoi vers le changelog complet) afin de clarifier la continuité après les corrections de stabilité.

## [1.7.0] — 2026-02-25

### Corrigé
- **Dépendances Python 3.12** : le script d'installation (`postinst.sh`) est plus robuste. Il détecte la version de Python, utilise `--system-site-packages` pour la compatibilité, et inclut un fallback réseau `pip` si les wheels hors ligne échouent.
- **API hardcodée (`127.0.0.1`)** : l'URL API du client TypeScript (`src/lib/pronote/client.ts`) est désormais relative (`window.location.origin + '/api'`) pour permettre un accès LAN/WAN.
- **UI non servie (404 sur `/`)** : Flask (`pronote_api.py`) sert correctement l'interface React. La configuration Vite (`vite.config.ts`) utilise des chemins d'assets adaptés et le fallback SPA sert les fichiers statiques et `index.html`.
- **Bind backend configurable** : Flask écoute maintenant sur l'hôte défini par `api_host` dans `config.json` (par défaut `127.0.0.1`, mettre `0.0.0.0` pour le réseau).
- **Version UI incohérente** : la version de l'application est injectée au build depuis `package.json` au lieu d'être hardcodée.

### Changelog
- **Reconstitution** : les entrées manquantes pour `v1.3.1` à `v1.6.1` ont été reconstituées depuis l'historique Git.
- **Processus de mise à jour** : `scripts/bump-version.cjs` met à jour automatiquement les versions dans `package.json`, `pronote_api.py` et `postinst.sh`.

## [1.6.1] — 2026-02-24

### Corrigé
- **Compatibilité Ubuntu 24.04 / Python 3.12** : remplacement des wheels CP311 par des wheels CP312, corrigeant notamment les erreurs `ModuleNotFoundError: No module named 'pronotepy'` et `No matching distribution found for charset-normalizer`.
- **Frontend 404** : Flask sert `index.html` et `/assets/*` avec fallback SPA (`/`, `/<path:path>`) via `send_from_directory`.
- **Launcher navigateur** : priorité à `google-chrome --app=` et `chromium-browser --app=`, fallback `xdg-open`.
- **postinst** : utilisation de `python3 -m venv --system-site-packages` pour compatibilité Python 3.10/3.11/3.12.
- Mise à jour de version dans `pronote_api.py` et `postinst.sh` (`1.5.0` -> `1.6.1`).

## [1.6.0] — 2026-02-24

### Ajouté
- **Page Appel de présence** (`/attendance/call`) : statuts présent/absent/retard/excusé, saisie du retard, actions rapides et statistiques.
- **Page Paramètres** (`/settings`) : configuration du port API, URL Pronote, thème, notifications et mises à jour automatiques.
- **Page Nouveau message** (`/messaging/new`) : composition de messages avec recherche de destinataires.
- **Page Saisie des devoirs** (`/homework/edit`) : formulaire multi-devoirs avec classe, matière, type, échéance et durée estimée.
- **Mémorisation des identifiants** sur la page de connexion.
- **Détection des erreurs réseau** avec message explicite et icône dédiée (WifiOff).
- Liens « Paramètres » et « Nouveau message » ajoutés à la navigation latérale.

### Corrigé
- Version hardcodée dans `client.ts` corrigée (`v1.2.0` -> `v1.6.0`).
- Version affichée sur la page de connexion mise à jour (`v1.5.0` -> `v1.6.0`).

## [1.5.0] — 2026-02-24

### Corrigé
- Cohérence des versions dans les fichiers applicatifs (`pronote_api.py`, Sidebar, LoginPage, ErrorBoundary, PlaceholderPage).
- Correction du dépôt GitHub hardcodé dans ErrorBoundary (`pronote-desktop/pronote-desktop` -> `Tarzzan/pronote-desktop`).
- Correction TypeScript dans BulletinsPage (passage d'un objet `Period` au lieu d'un `string` à `getGrades`).
- Correction TypeScript dans MainLayout (type `Transition` de framer-motion).

### Ajouté
- **Port API configurable** via `/etc/pronote-desktop/config.json`.
- **Persistance du thème** (clair/sombre) en local.
- **Notifications desktop** via `libnotify` (`/api/notify`, POST).
- **Endpoint `/api/config`** : GET pour lire la config, PATCH pour modifier le thème.
- **Icône SVG scalable** pour un affichage haute qualité.
- **Captures d'écran AppStream** pour GNOME Software / KDE Discover.
- Dépendance `libnotify-bin` déclarée dans le paquet.

## [1.4.0] — 2026-02-24

### Ajouté
- **Icône personnalisée** multi-résolution (16x16 à 512x512 + SVG scalable) dans `/usr/share/icons/hicolor/`.
- **Service systemd** (`pronote-desktop-api.service`) pour démarrage automatique du backend.
- **Vérificateur de mises à jour** non bloquant via `notify-send`.
- **Métadonnées AppStream** (`fr.pronote.desktop.metainfo.xml`) pour l'intégration logithèque.
- **Configuration persistante** : `/etc/pronote-desktop/config.json` conservé via `conffiles`.

### Technique
- `preinst` : sauvegarde de l'ancien venv en `upgrade` pour rollback.
- `postrm` : arrêt et suppression propre du service systemd et du venv.
- Installation offline conservée avec wheels Python embarqués.

## [1.3.1] — 2026-02-24

### Corrigé
- **Correction critique Ubuntu 24.04+** : harmonisation du chemin du venv entre installation et lancement (`/usr/lib/pronote-desktop/python-env`).
- **Compatibilité PEP 668** : dépendances Python installées en venv isolé, évitant `externally-managed-environment`.
- **Script de lancement amélioré** : utilisation automatique du venv avec fallback Python système.

## [1.3.0] — 2026-02-24

### Ajouté
- **Page Bulletins scolaires** : résultats par période avec appréciations, graphique de profil (RadarChart) et sélecteur de période.
- **Page Compétences** : grille d'évaluation par référentiel avec niveaux colorés.
- **Page QCM interactifs** : exercices à choix multiples avec progression, score et correction.
- **Graphiques dashboard** : PieChart (cours semaine) et BarChart (devoirs par matière) via `recharts`.
- **Animations de page** : transitions avec `framer-motion`.
- **Sidebar améliorée** : icônes colorées, badges animés, effets de survol.

### Documentation
- Screenshots de toutes les pages intégrés au README.
- Wiki GitHub avec guides d'installation, utilisateur et développeur.
- Changelog mis à jour.

### Technique
- Ajout de `recharts` et `framer-motion` en dépendances de production.
- Nouvelles routes : `/bulletins`, `/competences/referentiels`, `/qcm`.
- Version incrémentée à `1.3.0`.

## [1.2.0] — 2026-02-24

### Corrigé
- **Bug critique CSS** : suppression du reset global qui écrasait paddings/marges en production.
- **Authentification** : correction de la gestion d'état Zustand après rechargement.
- **Gestion d'erreurs** : affichage d'un message clair avec bouton « Réessayer ».

### Ajouté
- **Backend Python Flask** (`pronote_api.py`) : pont entre frontend TypeScript et `pronotepy`.
- **ErrorBoundary React** : capture des erreurs non gérées et interface de récupération avec signalement GitHub.
- **Remontée d'erreurs Electron** : interception des crashs non gérés côté process principal.

### Modifié
- Version affichée dans la sidebar et la connexion : `v1.1.0` -> `v1.2.0`.
- `package.json` : version mise à jour à `1.2.0`.

## [1.1.0] — 2026-02-24

### Corrigé
- **Données statiques** : remplacement des retours hardcodés par de vrais appels Pronote.
- **Authentification fragile** : remplacement d'une variable globale par un store Zustand persistant.

### Ajouté
- **GitHub Action CI/CD** (`.github/workflows/build.yml`) : build `.deb` sur push `main`, release sur tags `v*`.
- **Script de versioning** (`scripts/bump-version.cjs`) : incrément automatique de version.
- **Gestion d'erreurs réseau** : messages explicites et bouton « Réessayer ».

### Modifié
- `electron/main.cjs` : ajout de `electron-unhandled` pour la capture des crashs.
- `electron/preload.cjs` : exposition sécurisée de `shell.openExternal` pour les issues GitHub.

## [1.0.1] — 2026-02-24

### Ajouté
- Première version publique de Pronote Desktop.
- **Tableau de bord** : vue synthétique des cours, devoirs, messages et informations.
- **Emploi du temps** : planning hebdomadaire avec navigation.
- **Notes** : relevé de notes par trimestre.
- **Cahier de textes** : liste des devoirs avec filtres et suivi d'avancement.
- **Messagerie** : lecture et réponse aux discussions.
- **Vie scolaire** : absences/retards et statuts de justification.
- **Informations & sondages** : contenu établissement consultable.
- **Dark mode** : bascule clair/sombre persistante.
- **Sidebar responsive** : navigation latérale avec sous-menus.
