# V2: Extended Pronotepy Flows

## Objectif
Activer des capacités `pronotepy` supplémentaires déjà disponibles dans la librairie (messagerie active, devoirs marqués faits, contenu de cours, menus, export iCal) et les exposer proprement via l'API backend.

## Endpoints ajoutés

- `PATCH /api/homework/<homework_id>/done`
- `GET /api/lessons/<lesson_id>/content`
- `GET /api/recipients`
- `POST /api/discussions/new`
- `POST /api/discussions/<discussion_id>/reply`
- `PATCH /api/discussions/<discussion_id>/status`
- `DELETE /api/discussions/<discussion_id>`
- `PATCH /api/informations/<information_id>/read`
- `GET /api/menus`
- `GET /api/export/ical`

## Backend

- Extension du contrat `PronoteBackendAdapter`.
- Implémentation dans `PronotepySyncAdapter` (et donc héritée par l'adapter refonte).
- Gestion robuste des cas non supportés côté instance Pronote.

## Frontend branché

- `HomeworkPage`: persistance backend du toggle fait/non fait.
- `InformationsPage`: marquage lu côté backend.
- `MessagingPage`: envoi de réponse backend + marquage lu backend + bouton vers nouvelle discussion.
- `NewMessagePage`: destinataires réels via API + création de discussion réelle (fin des destinataires de démo hardcodés).

## Validation

- `python3 -m unittest discover -s tests -p 'test_backend_contract.py'` -> 35 OK
- `python3 -m py_compile pronote_api.py` -> OK
- `pnpm lint` -> OK
- `tsc -b` -> OK
