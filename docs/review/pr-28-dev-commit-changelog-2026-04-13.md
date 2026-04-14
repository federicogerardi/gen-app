# PR #28 Commit Changelog (dev merge)

## Scope

Dettaglio commit-level della PR #28 mergiata su `dev`, con orientamento alla redazione di documentazione tecnica e release notes interne.

## Commits Included

1. `846e9dc5c32064b7334fcb60d17d504fd917b54b`
- Subject: `chore(release): promote dev to main (#27)`
- Author: `federicogerardi <f.gerardi@gianpaoloantonante.it>`
- Date: `2026-04-13 01:19:04 +0200`
- Shortstat: 31 files changed, 1298 insertions, 1568 deletions
- Notes: commit ampio storico; trattare come contesto di branch.

2. `2b42c324f55ed006714ad8030301291c2f1d1b8f`
- Subject: `fix(api): Sprint 1 — cascade deletes, dead code removal, pricing fallback fix`
- Author: `copilot-swe-agent[bot] <198982749+Copilot@users.noreply.github.com>`
- Date: `2026-04-13 17:39:17 +0000`
- Shortstat: 5 files changed, 33 insertions, 14 deletions
- Notes: fix critici data integrity + cost accounting.

3. `61ff08a30b91ea11e6b328622f1e51d9bcc84fd6`
- Subject: `fix(api): Sprint 2 — shared apiError/stripArtifactCost, requireAdminUser guard, 401 vs 403 fix`
- Author: `copilot-swe-agent[bot] <198982749+Copilot@users.noreply.github.com>`
- Date: `2026-04-13 17:44:39 +0000`
- Shortstat: 17 files changed, 119 insertions, 104 deletions
- Notes: uniformita error contract e governance accesso admin.

4. `bf9f182fc5a9cc245d50376b226f1cb69067eed8`
- Subject: `fix(api): Sprint 3 — artifact indexes, extraction type, modelId→id route rename`
- Author: `copilot-swe-agent[bot] <198982749+Copilot@users.noreply.github.com>`
- Date: `2026-04-13 17:46:16 +0000`
- Shortstat: 5 files changed, 25 insertions, 29 deletions
- Notes: consistenza schema/tipi e contratti route.

5. `24869be94e1b4c4001f3b02275f7efb898a725d1`
- Subject: `fix(api): Sprint 4 — calculateCostAccurate, cron format, logger order, requestId SSE, funnel mapping extraction, guard order`
- Author: `copilot-swe-agent[bot] <198982749+Copilot@users.noreply.github.com>`
- Date: `2026-04-13 17:50:24 +0000`
- Shortstat: 9 files changed, 224 insertions, 211 deletions
- Notes: hardening runtime e pulizia cross-layer.

6. `e0fd84bbb24c32038bfccbc3f2cc9defd9bea4d6`
- Subject: `docs(spec): Sprint 5 — update api-specifications, artifact type comment, admin 401/403 docs`
- Author: `copilot-swe-agent[bot] <198982749+Copilot@users.noreply.github.com>`
- Date: `2026-04-13 17:53:52 +0000`
- Shortstat: 1 file changed, 19 insertions, 7 deletions
- Notes: allineamento spec a stato repository post-remediation.

7. `9bc45ca2ed391bc65de0a3ffdce44e9235becdbf`
- Subject: `feat: config vercel.json per auto-deploy solo su main/dev`
- Author: `Federico Gerardi <federico.gerardi@gmail.com>`
- Date: `2026-04-13 22:35:01 +0200`
- Shortstat: 1 file changed, 10 insertions
- Notes: controllo costi/build minutes con policy deploy branch-based.

## Suggested Documentation Reuse Blocks

- Sezione "Overview intervento": usare sprint 1-5 come macro-capitoli.
- Sezione "Impatto tecnico": separare API contracts, DB schema/migrations, SSE/runtime, docs/spec.
- Sezione "Tracciabilita": mantenere mapping commit SHA -> outcome verificabile.

## Piano Consistency Mapping (magic-copilot)

- `2b42c324...` -> Sprint 1: `C1`, `C2`, `M3`.
- `61ff08a3...` -> Sprint 2: `A1`, `A2`, `A3`, `A4`.
- `bf9f182f...` -> Sprint 3: `A5`, `A7` (via indici), `M5`, `M2`.
- `24869be9...` -> Sprint 4: `M1`, `M4`, `M6`, `B1`, `B2`, `A6`.
- `e0fd84bb...` -> Sprint 5: `M7`.

Commit fuori piano originario `magic-copilot` (ma presenti nella PR):

- `846e9dc5...` -> storico release branch (`#27`).
- `9bc45ca2...` -> configurazione `vercel.json` per auto-deploy solo `main/dev`.

## Command Trace

- `gh pr view 28 --json commits`
- `git show --no-patch <sha>`
- `git show --shortstat --format='' <sha>`
