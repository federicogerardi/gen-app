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
- Se `dev` non ha nuovi commit oltre `main` → `git reset --hard origin/main` + force push (reset sicuro post-squash).
- Se `dev` ha nuovi commit con contenuto diverso → skip automatico con warning nel log CI (nessun dato perso).

## Gate pre-merge (dev → main)

- CI verde: build + typecheck + lint + test
- 0 conversazioni di review aperte
- Nessun `TODO` introdotto senza issue associata
- Vercel preview check verde

## Riferimenti

- Workflow CI: `.github/workflows/ci.yml`
- Sync workflow: `.github/workflows/sync-dev-after-release.yml`
- Commit conventions: `.github/instructions/git-commit-style.instructions.md`
