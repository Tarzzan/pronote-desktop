# V2 Spike: Backend Contract CI Workflow

## Objectif
Automatiser l'exécution des tests de contrat backend sur GitHub Actions pour détecter les régressions dès la PR.

## Implémentation

- Ajout du workflow `.github/workflows/backend-contract-tests.yml`.
- Déclencheurs:
  - `push` sur `main`, `develop`, `v2/**`
  - `pull_request` vers `main`, `develop`
- Filtrage par fichiers impactés:
  - `pronote_api.py`
  - `tests/test_backend_contract.py`
  - le workflow lui-même
- Job unique Python 3.12:
  1. setup Python,
  2. installation minimale (`flask`),
  3. exécution `unittest` backend.

## Pourquoi ce design

- Workflow rapide et ciblé (ne rebuild pas Electron).
- Exécutable sans secrets ni accès Pronote.
- Compatible avec la stratégie V2 en branches de spike.

## Validation locale

- `python3 -m unittest discover -s tests -p 'test_backend_contract.py'`
- `npx -y pnpm test:backend-contract`
