# MANUS_HANDOFF — Pronote Desktop

> **Fichier de passation pour la prochaine instance Manus.**
> Lire ce fichier en premier avant toute action sur ce projet.

---

## A. État actuel

| Champ | Valeur |
|---|---|
| **Version publiée** | v1.7.0 |
| **Dépôt GitHub** | https://github.com/Tarzzan/pronote-desktop |
| **Dernière release** | https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.7.0 |
| **Type de paquet** | `.deb` offline amd64 (Ubuntu 22.04 / 24.04) |
| **Wheels Python** | 19 wheels CP312 dans `/usr/lib/pronote-desktop/wheels/` |
| **Venv** | `/usr/lib/pronote-desktop/python-env` |
| **Service systemd** | `pronote-desktop-api.service` |
| **Config** | `/etc/pronote-desktop/config.json` |

---

## B. Historique des versions

| Version | Date | Description |
|---|---|---|
| v1.1.0 | 2025 | Version initiale |
| v1.2.0 | 2025 | Amélioration UI |
| v1.3.0 | 2025 | Corrections diverses |
| v1.3.1 | 2026-02 | Fix Ubuntu 24.04 (PEP 668) — premier paquet offline |
| v1.4.0 | 2026-02 | Icône, systemd, AppStream, vérificateur MAJ, conffiles |
| v1.5.0 | 2026-02 | Port configurable, thème persistant, notifications, icône SVG, captures AppStream |
| v1.6.0 | 2026-02 | Page appel présence, Paramètres, Nouveau message, Saisie devoirs, mémorisation identifiants |
| v1.7.0 | 2026-02 | **Correctifs critiques** : wheels CP312, Flask sert le frontend, launcher Chrome --app |

---

## C. Architecture technique

```
/usr/lib/pronote-desktop/
├── assets/          ← Bundle React (JS + CSS, ~1 Mo)
├── wheels/          ← 19 wheels Python CP312
├── index.html       ← Point d'entrée SPA
├── pronote_api.py   ← Serveur Flask (port 5000, configurable)
└── python-env/      ← Venv Python (créé à l'installation)

/usr/bin/pronote-desktop      ← Launcher (Chrome --app > Chromium > xdg-open)
/etc/pronote-desktop/config.json  ← Configuration (port, thème, notifications)
/etc/systemd/system/pronote-desktop-api.service
/usr/share/metainfo/fr.pronote.desktop.metainfo.xml
/usr/share/icons/hicolor/{16,32,48,128,256,512}x*/apps/pronote-desktop.png
/usr/share/icons/hicolor/scalable/apps/pronote-desktop.svg
```

### Routes Flask disponibles (pronote_api.py)

| Route | Méthode | Statut |
|---|---|---|
| `/` | GET | Sert index.html |
| `/assets/<path>` | GET | Sert les assets React |
| `/api/login` | POST | Connexion Pronote |
| `/api/timetable` | GET | Emploi du temps |
| `/api/grades` | GET | Notes |
| `/api/averages` | GET | Moyennes |
| `/api/homework` | GET | Devoirs |
| `/api/absences` | GET | Absences |
| `/api/delays` | GET | Retards |
| `/api/discussions` | GET | Messagerie |
| `/api/informations` | GET | Informations |
| `/api/notify` | POST | Notifications desktop |
| `/api/config` | GET/POST | Configuration |
| `/api/call` | POST | **STUB** — appel présence (non implémenté) |
| `/api/send_message` | POST | **STUB** — envoi message (non implémenté) |

---

## D. Backlog priorisé

### Priorité HAUTE (v1.7.0)

1. **Implémenter `/api/call`** dans `pronote_api.py` — la page frontend `/attendance/call` est prête mais l'endpoint Flask retourne une erreur 501. Nécessite `pronotepy` pour soumettre l'appel.
2. **Implémenter `/api/send_message`** dans `pronote_api.py` — la page `/messaging/new` est prête mais l'envoi ne fonctionne pas.
3. **Page Examens/Contrôles** (`/homework/exams`) — actuellement `PlaceholderPage`.

### Priorité MOYENNE (v1.8.0)

4. **Page Planning devoirs** (`/homework/planning`) — vue calendrier des devoirs.
5. **Page Sanctions** (`/attendance/sanctions`) — liste des punitions/sanctions.
6. **Page Compétences** (`/competencies`) — évaluation par compétences.
7. **Page QCM** (`/qcm`) — quiz interactifs.

### Priorité BASSE (v2.0)

8. **Dépôt APT** sur GitHub Pages pour `apt upgrade` natif.
9. **Support multi-établissements** — switcher de compte dans la sidebar.
10. **Version Flatpak** pour Flathub.

---

## E. Bugs connus

| Bug | Sévérité | Description |
|---|---|---|
| `/api/call` retourne 501 | Haute | Endpoint stub, non implémenté dans pronotepy |
| `/api/send_message` retourne 501 | Haute | Endpoint stub, non implémenté |
| Captures d'écran AppStream générées par IA | Basse | Pas de vraies captures de l'UI réelle |

---

## F. Procédure de build

Voir `docs/manus-config/release-checklist.md` et `docs/manus-config/build-config.json`.

### Commandes essentielles

```bash
# 1. Build frontend
cd /home/ubuntu/pronote-desktop && pnpm build:web

# 2. Télécharger wheels CP312
pip3 download pronotepy flask flask-cors \
  --dest /tmp/wheels-cp312 \
  --python-version 3.12 --platform manylinux2014_x86_64 \
  --only-binary :all: 2>/dev/null || \
pip3 download pronotepy flask flask-cors --dest /tmp/wheels-cp312

# 3. Assembler depuis le .deb précédent
dpkg-deb --fsys-tarfile pronote-desktop_PREV.deb | tar -x -C /tmp/pkg-build/

# 4. Construire
dpkg-deb --build /tmp/pkg-build/ pronote-desktop_VERSION_offline_amd64.deb

# 5. Créer release GitHub
curl -X POST -H "Authorization: Bearer TOKEN" \
  "https://api.github.com/repos/Tarzzan/pronote-desktop/releases" \
  -d '{"tag_name":"vVERSION","name":"vVERSION — Description",...}'

# 6. Uploader le .deb
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @pronote-desktop_VERSION_offline_amd64.deb \
  "https://uploads.github.com/repos/Tarzzan/pronote-desktop/releases/RELEASE_ID/assets?name=..."
```

---

## G. Notes importantes

- Le token GitHub Fine-grained PAT expire rapidement (2 jours). Créer un nouveau token sur https://github.com/settings/personal-access-tokens/new avec permissions **Contents (Read & Write)** et **Workflows** sur le dépôt `pronote-desktop`.
- Le sandbox Manus peut télécharger les wheels CP312 directement avec `pip3 download` — pas besoin de cross-compilation.
- Le paquet `.deb` est construit manuellement (pas avec electron-builder) pour contrôler exactement les chemins.
- `pronote_api.py` sert maintenant le frontend React via `send_from_directory` — Flask est à la fois l'API et le serveur web statique.
