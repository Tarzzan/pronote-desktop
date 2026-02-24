# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

---

## [1.4.0] — 2026-02-24

### ✨ Nouveautés

- **Icône personnalisée** : icône multi-résolution (16×16 à 512×512 + SVG scalable) installée dans `/usr/share/icons/hicolor/` — visible dans le menu Applications, le dock et les gestionnaires de fichiers
- **Service systemd** : le backend Flask démarre automatiquement avec le système via `pronote-desktop-api.service`, éliminant le délai de 2 secondes au lancement
- **Vérificateur de mises à jour** : notification non bloquante via `notify-send` si une nouvelle version est disponible sur GitHub
- **Métadonnées AppStream** : fichier `fr.pronote.desktop.metainfo.xml` conforme au standard Freedesktop — description riche, captures d'écran et historique des versions pour les centres d'applications (GNOME Software, KDE Discover)
- **Configuration persistante** : `/etc/pronote-desktop/config.json` préservé lors des mises à jour grâce au mécanisme `conffiles`

### 🔧 Technique

- Script `preinst` : sauvegarde de l'ancien venv lors d'un `upgrade` pour rollback possible
- Script `postrm` : arrêt et suppression propre du service systemd et du venv
- Installation offline conservée : 19 wheels Python embarqués, aucun appel réseau

---

## [1.3.1] — 2026-02-24

### 🐛 Corrections

- **Correction critique Ubuntu 24.04+** : le script d'installation créait un environnement virtuel Python dans `/opt/pronote-desktop` mais le script de lancement cherchait dans `/usr/lib/pronote-desktop`. Les deux chemins sont maintenant cohérents (`/usr/lib/pronote-desktop/python-env`).
- **Compatibilité PEP 668** : les dépendances Python (pronotepy, flask, flask-cors) sont installées dans un environnement virtuel isolé au lieu du système, évitant l'erreur `externally-managed-environment` sur Ubuntu 24.04+.
- **Script de lancement amélioré** : utilise automatiquement le venv si disponible, sinon bascule sur Python système en fallback.

---

## [1.3.0] — 2026-02-24

### ✨ Nouveautés

- **Page Bulletins scolaires** : affichage des résultats par période avec appréciations, graphique de profil (RadarChart) et sélecteur de trimestre/semestre
- **Page Compétences** : grille d'évaluation par référentiel avec niveaux colorés (Maîtrise insuffisante → Très bonne maîtrise)
- **Page QCM interactifs** : exercices à choix multiples avec progression, score final et correction instantanée
- **Graphiques dashboard** : PieChart (répartition des cours de la semaine) et BarChart (devoirs par matière) via `recharts`
- **Animations de page** : transitions fade-in/fade-out avec `framer-motion`
- **Sidebar améliorée** : icônes SVG colorées par catégorie, badges de notification animés, effets de survol

### 📸 Documentation

- Screenshots de toutes les pages intégrés dans le README
- Wiki GitHub créé avec 3 pages : Guide d'installation, Guide utilisateur, Guide développeur
- CHANGELOG mis à jour

### 🔧 Technique

- Ajout de `recharts` et `framer-motion` comme dépendances de production
- Nouvelles routes : `/bulletins`, `/competences/referentiels`, `/qcm`
- Versioning automatique incrémenté à 1.3.0

---

## [1.2.0] — 2026-02-24

### Corrigé
- **Bug critique CSS** : suppression du reset `* { box-sizing: border-box; margin: 0; padding: 0 }` dans `index.css` qui était injecté après les classes Tailwind dans le bundle de production, écrasant tous les paddings et marges. Toutes les pages s'affichent maintenant correctement.
- **Authentification** : correction de la gestion d'état Zustand — le client Pronote ne se perdait plus silencieusement après un rechargement de page.
- **Gestion d'erreurs** : les erreurs réseau affichent maintenant un message clair avec un bouton "Réessayer" au lieu d'un spinner infini.

### Ajouté
- **Backend Python Flask** (`pronote_api.py`) : serveur API local qui fait le pont entre le frontend TypeScript et la bibliothèque pronotepy. Remplace les données statiques hardcodées par de vrais appels à l'API Pronote.
- **ErrorBoundary React** : capture toutes les erreurs non gérées dans les composants React et affiche une interface de récupération avec un bouton "Signaler sur GitHub" qui ouvre une Issue pré-remplie.
- **Remontée d'erreurs Electron** : le processus principal Electron intercepte les crashs non gérés et propose le même mécanisme de signalement.

### Modifié
- Version affichée dans la sidebar et la page de connexion : `v1.1.0` → `v1.2.0`
- `package.json` : version mise à jour à `1.2.0`

---

## [1.1.0] — 2026-02-24

### Corrigé
- **Données statiques** : toutes les méthodes du client API (`getLessons`, `getGrades`, `getHomework`, etc.) retournaient des tableaux hardcodés. Elles effectuent maintenant de vrais appels à l'API Pronote via pronotepy.
- **Authentification fragile** : `clientInstance` était une variable globale non réactive. Remplacé par un store Zustand correctement initialisé avec persistance dans `localStorage`.

### Ajouté
- **GitHub Action CI/CD** (`.github/workflows/build.yml`) : build automatique du `.deb` sur chaque push sur `main`, et création d'une Release GitHub sur chaque tag `v*`.
- **Script de versioning** (`scripts/bump-version.cjs`) : incrémente automatiquement la version patch dans `package.json` et les fichiers source.
- **Gestion d'erreurs réseau** : messages d'erreur explicites (timeout, identifiants incorrects, serveur inaccessible) avec bouton "Réessayer".

### Modifié
- `electron/main.cjs` : ajout de `electron-unhandled` pour la capture des crashs non gérés.
- `electron/preload.cjs` : exposition sécurisée de `shell.openExternal` pour l'ouverture des Issues GitHub.

---

## [1.0.1] — 2026-02-24

### Ajouté
- Première version publique de Pronote Desktop.
- **Tableau de bord** : vue synthétique des cours du jour, devoirs à venir, messages non lus, informations récentes.
- **Emploi du temps** : planning hebdomadaire avec navigation par semaine, affichage des matières, horaires et salles.
- **Notes** : relevé de notes par trimestre avec moyennes, coefficients, maximum et minimum de classe.
- **Cahier de textes** : liste des devoirs avec filtres (Tous / À faire / Faits) et marquage comme fait.
- **Messagerie** : liste des discussions avec lecture du contenu et champ de réponse.
- **Vie scolaire** : liste des absences et retards avec statut de justification.
- **Informations & sondages** : liste des informations de l'établissement avec expansion du contenu.
- **Dark mode** : bascule clair/sombre persistante dans le header.
- **Sidebar responsive** : navigation latérale avec 13 sections et sous-menus dépliables.
- **Authentification QR Code (OTP)** : connexion par QR Code Pronote en plus du login classique.
- **Paquet .deb** : installable sur Ubuntu/Debian via `dpkg -i`.

---

[1.2.0]: https://github.com/Tarzzan/pronote-desktop/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Tarzzan/pronote-desktop/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.0.1
