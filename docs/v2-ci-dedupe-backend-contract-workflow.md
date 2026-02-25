# V2 CI: Dedupe Backend Contract Workflow

## Objectif
Éviter la duplication des checks backend sur les PR vers `main` maintenant que le workflow principal `build.yml` inclut déjà les tests de contrat backend.

## Changement

- Mise à jour de `.github/workflows/backend-contract-tests.yml`:
  - suppression du trigger `pull_request`;
  - suppression du trigger `push` sur `main`;
  - conservation du trigger `push` sur `develop` et `v2/**`;
  - ajout de `workflow_dispatch` pour exécution manuelle.

## Résultat

- Les PR vers `main` n'affichent plus un check backend dupliqué.
- Les branches de travail V2 et `develop` gardent un feedback backend rapide.
