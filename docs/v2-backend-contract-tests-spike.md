# V2 Spike: Backend Contract Tests

## Objectif
Ajouter une protection anti-régression backend côté `pronote_api.py` sans dépendre d'un serveur Pronote réel.

## Implémentation réalisée

- Ajout d'une suite `unittest` dans `tests/test_backend_contract.py`.
- Injection d'un module `pronotepy` simulé pour rendre les tests déterministes.
- Vérifications de contrat pour:
  - factory adapter (`pronotepy-sync`, `pronotepy-refonte`, valeur invalide),
  - route `/api/health`,
  - garde d'authentification `/api/timetable`,
  - contrat de login succès/échec,
  - sérialisation timetable,
  - sélection de période (`get_selected_period`).
- Ajout du script npm: `pnpm test:backend-contract`.

## Pourquoi cette approche

- Exécutable localement et en CI sans identifiants de démo.
- Détecte rapidement les régressions de contrat JSON des endpoints critiques.
- Compatible avec la trajectoire V2 multi-adapters.

## Validation

- `python3 -m unittest discover -s tests -p 'test_backend_contract.py'`
- `npx -y pnpm test:backend-contract`
- `npx -y pnpm lint`
- `npx -y pnpm exec tsc -b`

## Limites

- Ces tests ne valident pas l'intégration réseau réelle pronotepy.
- Pas encore de snapshots JSON complets sur toutes les routes.

## Prochaines étapes

1. Ajouter des tests de contrat pour `/api/grades`, `/api/averages`, `/api/absences`, `/api/delays`.
2. Ajouter un smoke test d'intégration opt-in avec compte de démo (hors CI public).
3. Publier un workflow CI dédié backend contract tests.
