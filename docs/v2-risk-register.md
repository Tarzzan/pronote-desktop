# V2 Risk Register

## Échelle
- Probabilité: Faible / Moyenne / Élevée
- Impact: Faible / Moyen / Élevé / Critique

| ID | Risque | Probabilité | Impact | Signal d'alerte | Mitigation | Owner |
|---|---|---|---|---|---|---|
| R1 | Régression login Pronote (élève/prof/parent) | Moyenne | Critique | hausse erreurs `/api/login` | conserver contrat API V1, tests démo multi-profils | Backend |
| R2 | Incompatibilité refonte `pronotepy` avec endpoints existants | Moyenne | Élevé | structures JSON différentes | couche d'adaptation + tests snapshot payload | Backend |
| R3 | Instabilité Electron au lancement | Faible | Critique | crash au démarrage/renderer gone | conserver flags Linux éprouvés + smoke boot 3 redémarrages | Desktop |
| R4 | Échec update in-app (droits/sudo/pkexec) | Moyenne | Élevé | taux échec install > 10% | fallback manuel explicite + logs actionnables | Desktop |
| R5 | Régression packaging `.deb` | Moyenne | Élevé | install cassée sur Ubuntu 22/24 | job CI packaging dédié + test postinst auto | Release |
| R6 | Désynchronisation V1/V2 | Moyenne | Moyen | correctifs sécurité manquants sur V2 | cadence merge upstream->V2 hebdomadaire | Tech Lead |
| R7 | Dette de migration UI (contrats API non figés) | Élevée | Moyen | hotfix UI fréquents | figer schémas API V2 tôt + typing strict | Frontend |
| R8 | Risque juridique/compliance sur dépendances non officielles | Faible | Élevé | changement conditions tiers | audit licences + documentation disclaimers | Projet |

## Risques prioritaires (Top 3)
1. **R1 Login critique**: bloque toute valeur produit.
2. **R2 Contrat API**: peut casser plusieurs pages simultanément.
3. **R5 Packaging**: empêche adoption utilisateur final.

## Gates de sortie risque
- R1/R2: tests e2e démo passants 3 runs consécutifs.
- R5: installation + lancement + health API validés sur Ubuntu 22.04 et 24.04.
- R4: parcours update in-app validé en succès et en échec contrôlé.
