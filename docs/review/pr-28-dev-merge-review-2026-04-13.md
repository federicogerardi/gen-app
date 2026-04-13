# PR #28 Merge Review (dev)

## Scope

Questo documento consolida i dati dell'ultimo merge da PR verso `dev`, con focus su metadati merge, perimetro interventi e tracciabilita operativa per documentazione tecnica locale.

## Merge Metadata

- PR: #28
- Title: `fix(api): structural consistency remediation — all 5 sprints`
- Source branch: `copilot/classify-structural-issues`
- Target branch: `dev`
- URL: <https://github.com/federicogerardi/gen-app/pull/28>
- Merged at (UTC): `2026-04-13T20:46:15Z`
- Merge commit (squash): `be68bac1ca90350d82beab5ca6bef3c32620bbe7`

## PR Metrics

- Changed files: 66
- Insertions: 1792
- Deletions: 1997
- Commits included in PR: 7

## Intervention Summary

La PR applica remediation strutturale su 5 sprint:

1. Critical bugs
- Rimozione blocco guard duplicato/non raggiungibile in PUT artifact.
- Cascade delete su FK rilevanti (`Project->Artifact`, `User->Project`, `User->Artifact`, `User->QuotaHistory`) con migrazione dedicata.
- Correzione fallback pricing modelli in runtime per evitare contabilizzazione costi errata.

2. Error handling uniformity
- Centralizzazione serializer cost (`stripArtifactCost`).
- Adozione helper `apiError()` su route projects/artifacts/users.
- Introduzione `requireAdminUser()` con distinzione coerente 401 (no auth) vs 403 (no role).
- Allineamento filtro type artifacts con valore `extraction`.

3. Type/schema consistency
- Nuovi indici su `Artifact.type` e `Artifact.status` con migrazione.
- Allineamento type client `GenerateRequest` a `extraction`.
- Rename route admin models da `[modelId]` a `[id]`.

4. Technical cleanup
- Sostituzione alias deprecated con `calculateCostAccurate`.
- Uniformita formato errori nel cron route.
- Logger inizializzato prima delle query nel route models.
- Uniformita `x-request-id` su endpoint SSE.
- Estrazione helper funnel mapping in modulo dedicato.
- Ownership check anticipato rispetto ai usage guards nei generator route.

5. Documentation
- Aggiornamento specifiche API per endpoint, filtri type, semantica admin 401/403 e rename path params.

## Consistency Check vs Piano Originale (magic-copilot)

### Esito sintetico

- Coerenza generale: `allineata`.
- Item pianificati in `magic-copilot.md`: 17/17 coperti in PR #28.
- Nota A7: il piano prevedeva conversione enum Prisma **oppure** fallback con indici/constraint; e stata adottata la strategia fallback con indici `@@index([type])` e `@@index([status])`.

### Tracciabilita per ID

| ID | Sprint piano | Stato | Evidenza principale |
| --- | --- | --- | --- |
| C1 | 1 | Completato | Commit Sprint 1 (`2b42c324...`) + modifica `artifacts/[id]/route.ts` |
| C2 | 1 | Completato | Commit Sprint 1 (`2b42c324...`) + migrazione `20260413000000_cascade_deletes` |
| M3 | 1 | Completato | Commit Sprint 1 (`2b42c324...`) + update `model-registry.ts` |
| A1 | 2 | Completato | Commit Sprint 2 (`61ff08a3...`) + nuovo helper `lib/api/artifact-serializer.ts` |
| A2 | 2 | Completato | Commit Sprint 2 (`61ff08a3...`) |
| A3 | 2 | Completato | Commit Sprint 2 (`61ff08a3...`) |
| A4 | 2 | Completato | Commit Sprint 2 (`61ff08a3...`) + adozione `requireAdminUser()` |
| A5 | 3 | Completato | Commit Sprint 3 (`bf9f182f...`) + `GET /artifacts` con `extraction` |
| A7 | 3 | Completato (strategia fallback) | Commit Sprint 3 (`bf9f182f...`) + indici `Artifact.type/status` |
| M5 | 3 | Completato | Commit Sprint 3 (`bf9f182f...`) + `useStreamGeneration.ts` |
| M2 | 3 | Completato | Commit Sprint 3 (`bf9f182f...`) + route `admin/models/[id]` |
| M1 | 4 | Completato | Commit Sprint 4 (`24869be9...`) + `calculateCostAccurate` |
| M4 | 4 | Completato | Commit Sprint 4 (`24869be9...`) + cron error contract |
| M6 | 4 | Completato | Commit Sprint 4 (`24869be9...`) + logger init order |
| B1 | 4 | Completato | Commit Sprint 4 (`24869be9...`) + `sseResponse(..., requestId?)` |
| B2 | 4 | Completato | Commit Sprint 4 (`24869be9...`) + `lib/tool-routes/funnel-mapping.ts` |
| A6 | 4 | Completato | Commit Sprint 4 (`24869be9...`) + ownership check pre-usage |
| M7 | 5 | Completato | Commit Sprint 5 (`e0fd84bb...`) + update `api-specifications.md` |

## Scope Delta rispetto al piano originale

Oltre ai 5 sprint di remediation, la PR include due contributi non parte del piano `magic-copilot`:

- `846e9dc5...` (`chore(release): promote dev to main (#27)`): commit storico ampio confluito nel branch sorgente.
- `9bc45ca2...` (`feat: config vercel.json per auto-deploy solo su main/dev`): hardening operativo CI/CD e controllo build minutes.

Questi due commit sono tracciati nel changelog commit-level ma vanno tenuti fuori dalla narrativa di closure dei finding C1..B2.

## Notable Caveat For Documentation

Tra i 7 commit inclusi compare anche un commit di release ampio (`chore(release): promote dev to main (#27)`), quindi nella narrativa conviene separare:

- remediation target specifica della PR #28 (sprint 1-5)
- commit di contesto storico confluito dal branch sorgente

## Data Sources

- `gh pr list --base dev --state merged --limit 1`
- `gh pr view 28 --json number,title,body,commits,files,mergeCommit,mergedAt,url`
- `git show be68bac1ca90350d82beab5ca6bef3c32620bbe7`
