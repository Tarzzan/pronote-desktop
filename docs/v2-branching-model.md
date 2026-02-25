# V2 Branching Model (Fork Strategy)

## Objectif
Isoler l'exploration V2 dans un fork sans impacter la stabilité de la V1 en production.

## Recommandation
Fork V2 **pertinent**. Le coût de séparation est faible et évite:
- contamination du cycle de release V1,
- régressions sur des changements structurants (API, packaging, update flow),
- confusion produit/utilisateur entre stable et expérimental.

## Topologie dépôts
- **upstream (V1)**: `Tarzzan/pronote-desktop`
  - source stable et releases publiques.
- **fork V2**: `Tarzzan/pronote-desktop-v2` (ou fork direct de `pronote-desktop`)
  - espace d'expérimentation.

## Modèle de branches recommandé

### Upstream V1
- `main`: stable de production.
- `hotfix/*`: correctifs urgents V1.
- `release/*`: préparation de release V1.

### Fork V2
- `main-v2`: branche d'intégration V2 (pas de release auto tant que bêta non validée).
- `v2/spike-*`: spikes techniques (ex: API refonte, packaging).
- `v2/feature-*`: lots fonctionnels validés pour intégration.
- `v2/release-*`: stabilisation avant bêta/GA.

## Politique de fusion
- V1 -> V2: autorisée (rebase/merge régulier pour récupérer correctifs de sécurité/stabilité).
- V2 -> V1: interdite par défaut, sauf extraction ciblée de patchs sûrs et indépendants.

## Conventions commits et PR
- Prefixes: `v2(spike):`, `v2(feat):`, `v2(fix):`, `v2(chore):`.
- Chaque PR V2 doit inclure:
  - impact utilisateur,
  - risques,
  - plan de rollback,
  - résultat de smoke tests.

## CI/CD conseillé
- V1: pipeline actuel inchangé.
- V2:
  - build/test sur `main-v2`,
  - artifacts bêta non publiés sur release stable,
  - publication release seulement depuis tags `v2.*`.

## Règles de protection
- Protéger `main` (V1) contre merges V2.
- Exiger CI verte + revue pour `main-v2`.
- Désactiver auto-release de V2 tant que phase bêta non atteinte.
