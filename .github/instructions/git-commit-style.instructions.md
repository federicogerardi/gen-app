---
description: "Enforces Conventional Commits format, PR naming, branch naming, squash-and-merge policy, and pre-merge gates. Apply when creating commits, opening PRs, or operating on the git/GitHub workflow."
name: "Git Commit & PR Style"
applyTo: "**"
---

# Git Commit & PR Style Guide

## Commit Messages (Conventional Commits)

Format: `<type>(<scope>): <subject>`

- **type**: `feat` | `fix` | `chore` | `docs` | `refactor` | `test` | `perf` | `ci`
- **scope**: area del codice — es. `ui`, `api`, `auth`, `llm`, `tool-prompts`, `admin`, `db`
- **subject**: imperativo presente, minuscolo, senza punto finale, max 72 caratteri

Esempi validi:
```
feat(ui): extend login visual framework across internal pages
fix(api): enforce ownership check on artifact GET endpoint
chore(deps): upgrade prisma to 7.x
docs(spec): add graphic frameworking specification
```

## Pull Request

- **Titolo PR**: stesso formato del commit principale (`type(scope): subject`)
- **Target branch**: sempre `dev` — mai `main` direttamente
- **Body minimo**: sezione `## Summary` con bullet dei cambiamenti principali
- **Merge strategy obbligatoria**: Squash and Merge
  - Il titolo del commit di squash deve rispettare il formato Conventional Commits
  - Il numero PR nel titolo è opzionale: ometterlo salvo preferenza esplicita del team

## Gate pre-merge

- CI verde (build + typecheck + lint + test)
- 0 conversazioni di review aperte
- Nessun `TODO` introdotto senza issue associata

## Branch naming

`feat/<slug>` | `fix/<slug>` | `chore/<slug>` | `docs/<slug>`

Slug: kebab-case, descrittivo, max 40 caratteri.

Esempi: `feat/quota-dashboard`, `fix/admin-contrast`, `chore/upgrade-prisma-7`
