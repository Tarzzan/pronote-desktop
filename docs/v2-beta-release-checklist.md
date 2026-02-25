# V2 Beta Release Checklist

## 1. Préconditions
- [ ] Branche source: `v2/release-*` issue de `main-v2`.
- [ ] Changelog V2 mis à jour.
- [ ] Version V2 figée (pas de bump automatique non contrôlé).

## 2. Qualité technique
- [ ] `pnpm lint` vert.
- [ ] `tsc -b` vert.
- [ ] Build web OK.
- [ ] Build `.deb` OK.
- [ ] Aucune erreur bloquante dans logs Electron/API.

## 3. Parcours critiques (obligatoires)
- [ ] L'app se lance et reste ouverte >= 40s.
- [ ] Écran de connexion visible et utilisable.
- [ ] Login démo prof fonctionne:
  - URL: `https://demo.index-education.net/pronote/professeur.html`
  - user: `demonstration`
  - pass: `pronotevs`
- [ ] Après login: pas de crash immédiat.
- [ ] Emploi du temps lisible (contraste OK) et sans scintillement permanent.

## 4. Update in-app
- [ ] "Vérifier les mises à jour" fonctionne.
- [ ] Cas "déjà à jour" clair.
- [ ] Cas "version disponible" télécharge + vérifie checksum + installe.
- [ ] Cas erreur droits/réseau propose un message actionnable + fallback manuel.

## 5. Packaging et installation
- [ ] Installation sur machine propre via `.deb`.
- [ ] `postinst` configure correctement venv + backend.
- [ ] Lancement utilisateur standard depuis menu/commande.

## 6. Go/No-Go final
- [ ] 3 redémarrages consécutifs sans crash.
- [ ] Aucun bug critique (P0/P1) ouvert.
- [ ] Rollback documenté (retour release V1 stable).
