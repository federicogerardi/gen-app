# Git Release Workflow — Branching & Squash-Merge Policy

## Branch model

| Branch | Ruolo | Accesso diretto |
|--------|-------|-----------------|
| `main` | Produzione (Vercel) | ❌ Solo via PR da `dev` |
| `dev`  | Integrazione continua | ✅ Feature/fix/chore branch |

L'unico percorso verso `main` è: `feature/* → dev → PR → main`.

## Strategia di merge

- **Feature/fix/chore → `dev`**: Squash and Merge (history pulita su dev)
- **`dev` → `main`**: Squash and Merge (un solo commit di release su main)
- Nessun push diretto a `main` — nessuna eccezione.

## Post-release sync automatico

Lo squash-merge comprime N commit in uno su `main`. Senza sincronizzazione, `dev` risulta artificialmente "ahead" di quei N commit anche se il contenuto è identico.

**Soluzione attiva**: GitHub Actions workflow `.github/workflows/sync-dev-after-release.yml`  
Trigger: ogni push su `main`.

Comportamento:
- Permessi espliciti workflow: `contents: write` e `pull-requests: read`, con checkout autenticato via `github.token`.
- Se `dev` punta gia allo stesso SHA di `main` → no-op.
- Se esistono PR aperte con base `dev` → skip automatico per evitare rewrite del branch base durante review attive.
- Se `dev` ha contenuto diverso da `main` (tree hash differente) → skip automatico con diff `--stat` nel log CI (nessun dato perso).
- Solo se il contenuto di `dev` e `main` e identico ma la storia diverge per effetto dello squash-merge → `git reset --hard origin/main` + `git push --force-with-lease origin dev`.

Nota operativa:
- Il workflow elimina il 403 dovuto ai permessi read-only del token di default, ma non bypassa eventuali regole di branch protection che vietano force-push su `dev`. In quel caso il job fallisce con errore esplicito e serve adeguare la policy del branch o rinunciare al reset automatico.

## Gate pre-merge (dev → main)

- CI verde: build + typecheck + lint + test
- 0 conversazioni di review aperte
- Nessun `TODO` introdotto senza issue associata
- Vercel preview check verde

## Regola di collegamento PR

Ogni PR aperta da questo repository deve essere collegata al progetto GitHub condiviso:

- https://github.com/users/federicogerardi/projects/1

La regola vale sia per PR verso `dev` sia per PR `dev` → `main`, cosi il tracking operativo resta allineato nel board di progetto.

## Riferimenti

- Workflow CI: `.github/workflows/ci.yml`
- Sync workflow: `.github/workflows/sync-dev-after-release.yml`
- Commit conventions: `.github/instructions/git-commit-style.instructions.md`
