# Checklist de release — Pronote Desktop

À suivre avant chaque publication d'une nouvelle version.

## Avant le build

- [ ] Mettre à jour `version` dans `package.json`
- [ ] Ajouter l'entrée correspondante dans `CHANGELOG.md`
- [ ] Mettre à jour `current_version` dans `docs/manus-config/build-config.json`
- [ ] Mettre à jour la version dans `pronote_api.py` (commentaire en tête de fichier)
- [ ] Mettre à jour la version dans `check-update.sh` (`CURRENT_VERSION=`)
- [ ] Mettre à jour la version dans `DEBIAN/postinst` (echo final)
- [ ] Mettre à jour `<release version="X.Y.Z">` dans `fr.pronote.desktop.metainfo.xml`

## Build du paquet

- [ ] Télécharger les wheels si de nouvelles dépendances ont été ajoutées :
  ```bash
  python3 -m pip download pronotepy flask flask-cors --dest /tmp/wheels
  ```
- [ ] Construire le paquet :
  ```bash
  dpkg-deb --build /tmp/pronote-vXYZ pronote-desktop_X.Y.Z_offline_amd64.deb
  ```
- [ ] Vérifier le paquet :
  ```bash
  dpkg-deb --info pronote-desktop_X.Y.Z_offline_amd64.deb
  dpkg-deb --contents pronote-desktop_X.Y.Z_offline_amd64.deb
  ```

## Tests

- [ ] Tester l'installation sur Ubuntu 22.04 (VM ou container)
- [ ] Tester l'installation sur Ubuntu 24.04 (VM ou container)
- [ ] Vérifier que `pronote-desktop` apparaît dans le menu Applications avec l'icône
- [ ] Vérifier que le service systemd démarre : `systemctl status pronote-desktop-api`
- [ ] Vérifier que l'application s'ouvre dans le navigateur
- [ ] Tester la désinstallation : `sudo dpkg -r pronote-desktop`

## Publication GitHub

- [ ] Créer un token GitHub Fine-grained PAT (voir `github-setup.md`)
- [ ] Configurer le remote git avec le token
- [ ] Committer les changements :
  ```bash
  git add -A
  git commit -m "feat: release vX.Y.Z — description courte"
  ```
- [ ] Créer le tag :
  ```bash
  git tag -a vX.Y.Z -m "Release vX.Y.Z"
  ```
- [ ] Pousser :
  ```bash
  git push origin main
  git push origin vX.Y.Z
  ```
- [ ] Créer la release via l'API GitHub (voir `github-setup.md`)
- [ ] Uploader le `.deb` sur la release
- [ ] Uploader les captures d'écran si nouvelles pages

## Après la release

- [ ] Mettre à jour `MANUS_HANDOFF.md` (Section A — tableau des versions)
- [ ] Mettre à jour `next_version` dans `build-config.json`
- [ ] Vérifier que les liens dans `fr.pronote.desktop.metainfo.xml` pointent vers la bonne release
