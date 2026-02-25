# V2 Hardening: Build Workflow + Backend Contracts

## Objectif
Rendre le pipeline principal `Build & Release Pronote Desktop` plus strict en validant aussi les contrats backend Python avant packaging.

## Changement appliqué

- Mise à jour de `.github/workflows/build.yml`:
  - le job `lint` devient `Lint, Type Check & Backend Contracts`;
  - ajout de `actions/setup-python@v5` (Python 3.12);
  - installation minimale `flask`;
  - exécution de `python -m unittest discover -s tests -p 'test_backend_contract.py'`.

## Bénéfice

- Une PR vers `main` ne peut plus passer avec un frontend valide mais un backend contractuellement cassé.
- Le build `.deb` dépend désormais explicitement de ce garde-fou backend via `needs: lint`.
