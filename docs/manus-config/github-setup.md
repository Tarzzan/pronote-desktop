# Guide de configuration GitHub — Pronote Desktop

Ce guide explique comment créer un token GitHub et publier une release.
À lire par toute nouvelle instance Manus travaillant sur ce projet.

## Dépôt GitHub

- **URL** : https://github.com/Tarzzan/pronote-desktop
- **Propriétaire** : Tarzzan
- **Branche principale** : `main`

## Créer un token GitHub Fine-grained PAT

1. Ouvrir https://github.com/settings/tokens?type=beta dans le navigateur
2. Cliquer **Generate new token**
3. Remplir :
   - **Token name** : `manus-pronote-desktop-YYYY-MM-DD`
   - **Expiration** : 7 jours (suffisant pour une session de travail)
   - **Repository access** : Only selected repositories → `Tarzzan/pronote-desktop`
4. **Permissions requises** (développer "Repository permissions") :
   - **Contents** : Read and write ← OBLIGATOIRE pour git push
   - **Workflows** : Read and write ← OBLIGATOIRE pour GitHub Actions
   - Toutes les autres : No access
5. Cliquer **Generate token**
6. **Copier le token immédiatement** (affiché une seule fois)

## Configurer git avec le token

```bash
cd /home/ubuntu/pronote-desktop
git remote set-url origin "https://Tarzzan:{TOKEN}@github.com/Tarzzan/pronote-desktop.git"
git remote -v  # Vérifier
```

## Créer une release via l'API GitHub

```bash
TOKEN="{votre_token}"

# 1. Créer la release
RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/Tarzzan/pronote-desktop/releases" \
  -d '{
    "tag_name": "vX.Y.Z",
    "name": "vX.Y.Z — Description courte",
    "body": "## Nouveautés\n\n- ...",
    "draft": false,
    "prerelease": false
  }')

# Extraire l'ID de la release
RELEASE_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
echo "Release ID: $RELEASE_ID"

# 2. Uploader le .deb
curl -s -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/vnd.debian.binary-package" \
  "https://uploads.github.com/repos/Tarzzan/pronote-desktop/releases/${RELEASE_ID}/assets?name=pronote-desktop_X.Y.Z_offline_amd64.deb" \
  --data-binary @pronote-desktop_X.Y.Z_offline_amd64.deb | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print('URL:', d.get('browser_download_url'))"
```

## Lister les releases existantes

```bash
curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/Tarzzan/pronote-desktop/releases" | \
  python3 -c "
import json,sys
for r in json.load(sys.stdin):
    print(f'ID: {r[\"id\"]}, Tag: {r[\"tag_name\"]}, Assets: {len(r[\"assets\"])}')
    for a in r['assets']:
        print(f'  - {a[\"name\"]} ({a[\"size\"]} bytes)')
"
```

## Supprimer un asset existant (pour le remplacer)

```bash
ASSET_ID="{id_de_l_asset}"
curl -s -X DELETE \
  -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/Tarzzan/pronote-desktop/releases/assets/$ASSET_ID"
```

## Notes importantes

- Le token expire — en créer un nouveau à chaque session de travail
- Ne jamais committer le token dans le dépôt
- En cas d'erreur `Validation Failed` lors de l'upload, vérifier qu'un asset du même nom n'existe pas déjà (le supprimer d'abord)
- En cas de `push rejected`, utiliser `--force-with-lease` si le commit a été amendé
