# Indice Documentazione

Questa cartella contiene la documentazione tecnica e funzionale del progetto, organizzata per aree tematiche e tipologia di contenuto.

## Indice

- [blueprint.md](blueprint.md): Blueprint architetturale e overview del progetto.
- [progetto-overview.md](progetto-overview.md): Descrizione generale e obiettivi del progetto per Stakeholder e Team.
- [implement-index.md](implement-index.md): Indice operativo delle priorità correnti e stato di avanzamento.
- [archive/implement-quality-audit-closure-2026-04-11.md](archive/implement-quality-audit-closure-2026-04-11.md): Snapshot storico finale dei finding quality/security dell'audit globale.

### accessibility/
- [accessibility.md](accessibility/accessibility.md): Linee guida e strategie per l’accessibilità.

### adrs/
- [001-modular-llm-controller-architecture.md](adrs/001-modular-llm-controller-architecture.md): ADR 001 — Modular LLM Controller Architecture
- [002-streaming-vs-batch-responses.md](adrs/002-streaming-vs-batch-responses.md): ADR 002 — Streaming vs Batch Responses
- [003-rate-limiting-quota-strategy.md](adrs/003-rate-limiting-quota-strategy.md): ADR 003 — Rate Limiting & Quota Strategy

### diagrams/
- [architecture-diagrams.md](diagrams/architecture-diagrams.md): Diagrammi architetturali e di flusso.

### implementation/
- [implementation-plan.md](implementation/implementation-plan.md): Implementation plan dettagliato.
- [extraction-chain-artifact-first-prompt-plan.md](implementation/extraction-chain-artifact-first-prompt-plan.md): Piano sorgente del track extraction artifact-first (resilience contract, rollout e KPI gate).
- [feature-extraction-chain-artifact-first-tracker-1.md](implementation/feature-extraction-chain-artifact-first-tracker-1.md): Tracker operativo del track extraction artifact-first (stato task e evidence register).
- [extraction-chain-artifact-first-sprint-operations-plan-2026-04-14.md](implementation/extraction-chain-artifact-first-sprint-operations-plan-2026-04-14.md): Layer operativo sprint del track artifact-first.
- [feature-operational-hardening-api-llm-tooling-plan-1.md](implementation/feature-operational-hardening-api-llm-tooling-plan-1.md): Piano esecutivo P1 per hardening operativo API/LLM tooling (pre-stream errors, artifact lifecycle safety, taxonomy, API docs alignment).
- [feature-operational-hardening-api-llm-tooling-tracker-1.md](implementation/feature-operational-hardening-api-llm-tooling-tracker-1.md): Tracker operativo companion del piano P1 con baseline, stato task ed evidenze di chiusura.
- [feature-meta-ads-runtime-decommission-checklist-1.md](implementation/feature-meta-ads-runtime-decommission-checklist-1.md): Checklist tecnica file-per-file e closure del decommission runtime legacy Meta Ads.
- [feature-artifact-page-export-actions-plan-1.md](implementation/feature-artifact-page-export-actions-plan-1.md): Piano esecutivo per azioni pagina artefatto (copy text, download Markdown e DOCX).
- [feature-native-login-credentials-google-oauth-plan-1.md](implementation/feature-native-login-credentials-google-oauth-plan-1.md): Piano di alto livello per introdurre login credenziali mantenendo invariato il flusso Google OAuth.
- [feature-native-login-credentials-google-oauth-implementation-plan-1.md](implementation/feature-native-login-credentials-google-oauth-implementation-plan-1.md): Checklist fasi/task e criteri di successo del track native login.
- [feature-native-login-credentials-google-oauth-execution-plan-1.md](implementation/feature-native-login-credentials-google-oauth-execution-plan-1.md): Piano esecutivo dettagliato con sequenza PR e validazioni.
- [feature-native-login-credentials-google-oauth-tracker-1.md](implementation/feature-native-login-credentials-google-oauth-tracker-1.md): Tracker operativo con stato fasi, gate Go/No-Go e rischi.
- [funnel-pages-phase-4-refactor-plan.md](implementation/funnel-pages-phase-4-refactor-plan.md): Piano operativo Phase 4 per refactor funnel-pages su architettura composabile.
- [tool-pages-phase-6-cleanup-tests-plan-1.md](implementation/tool-pages-phase-6-cleanup-tests-plan-1.md): Piano operativo Phase 6 per cleanup finale, estensione test e consolidamento documentale del refactor composabile.
- [feature-nextland-phase-5-1.md](implementation/feature-nextland-phase-5-1.md): Piano operativo esecutivo Phase 5 NextLand refactor (chiuso con follow-up Phase 6).

### notes/
- [desiderata-e-appunti-futuri-sviluppi.md](notes/desiderata-e-appunti-futuri-sviluppi.md): Raccolta di idee e appunti preliminari non ancora in planning o refactoring.

### review/
- [feature-audit-remediation-closure-2026-04-12.md](review/feature-audit-remediation-closure-2026-04-12.md): Closure report del track audit remediation (PR #19, 2026-04-12).
- [feature-audit-remediation-gap-analysis-2026-04-12.md](review/feature-audit-remediation-gap-analysis-2026-04-12.md): Gap analysis del track audit remediation (2026-04-12).
- [copilot-audit-2026-04-12.md](review/copilot-audit-2026-04-12.md): Report qualità e sicurezza Copilot (12 aprile 2026) — sorgente dei finding del track remediation.
- [extraction-model-policy-rollout-runbook-2026-04-12.md](review/extraction-model-policy-rollout-runbook-2026-04-12.md): Runbook rollout/rollback e query operative per policy extraction.
- [pr-28-dev-merge-review-2026-04-13.md](review/pr-28-dev-merge-review-2026-04-13.md): Review operativa dell'ultimo merge PR verso `dev` (PR #28), con metadati, scope e sintesi sprint.
- [pr-28-dev-commit-changelog-2026-04-13.md](review/pr-28-dev-commit-changelog-2026-04-13.md): Changelog commit-level della PR #28 con shortstat e note di riuso per documentazione.
- [operational-improvement-note-api-llm-tooling-2026-04-15.md](review/operational-improvement-note-api-llm-tooling-2026-04-15.md): Nota di improvement operativa che origina il piano P1 di hardening API/LLM tooling.
- [native-login-credentials-google-oauth-research-review-2026-04-16.md](review/native-login-credentials-google-oauth-research-review-2026-04-16.md): Ricerca tecnica e decision gate per l'introduzione del login credenziali in coesistenza con Google OAuth.
- [tool-prompt-cloning-scope-as-is-gap-analysis-2026-04-18.md](review/tool-prompt-cloning-scope-as-is-gap-analysis-2026-04-18.md): Gap analysis e closure del riallineamento as-is del perimetro prompt tools rispetto al runtime.
- [2026-04-15-test-suite-security-balance-review.md](review/2026-04-15-test-suite-security-balance-review.md): Valutazione del bilanciamento sicurezza pre-deploy vs delivery e stato remediation iniziale dei test fragili prompt/UI.
- [2026-04-18-capacity-overflow-risk-review.md](review/2026-04-18-capacity-overflow-risk-review.md): Valutazione rischio overflow/capacity con 20 utenti medi concorrenti su pipeline tool generation.
- [2026-04-18-phase-4-funnel-refactor-security-review.md](review/2026-04-18-phase-4-funnel-refactor-security-review.md): Audit predittivo di sicurezza sul piano Phase 4 funnel refactor con remediation P1/P2.
- [2026-04-18-dependency-deprecations-review.md](review/2026-04-18-dependency-deprecations-review.md): Review delle dipendenze deprecate e stima impatto aggiornamento.
- [2026-04-18-main-vs-dev-comparison-report.md](review/2026-04-18-main-vs-dev-comparison-report.md): Confronto diff main vs dev con analisi delta funzionale e rischi di merge.

### archive/
- Documenti storici e snapshot superseded (review, roadmap, follow-up PR).

### prompts/
- [README.md](prompts/README.md): Indice e linee guida per i prompt.
- [native-login-credentials-google-oauth-implementation-prompt.md](prompts/native-login-credentials-google-oauth-implementation-prompt.md): Prompt operativo archiviato per il track native login.
- [tools/hl_funnel/](prompts/tools/hl_funnel/): Prompt generator specifici HL Funnel.
- [tools/meta_ads/](prompts/tools/meta_ads/): Prompt generator Meta Ads mantenuti come reference documentale storico (runtime rimosso).

### specifications/
- [api-specifications.md](specifications/api-specifications.md): Specifiche API e contratti.
- [documentation-filename-naming-spec.md](specifications/documentation-filename-naming-spec.md): Regole operative e pattern canonico per il naming dei file markdown in `docs/`.
- [graphic-frameworking-spec.md](specifications/graphic-frameworking-spec.md): Specifica visual frameworking per interventi UI coerenti con shell grafica e template applicato.
- [git-release-workflow-spec.md](specifications/git-release-workflow-spec.md): Branching policy, strategia squash-merge e sync automatico dev→main post-release.

### ux/
- [gui-refactor-plan.md](ux/gui-refactor-plan.md): Piano di refactoring GUI.
- [projects-first-navigation-plan.md](ux/projects-first-navigation-plan.md): Piano per riallineare la navigazione a una gerarchia projects-first e riposizionare Artefatti come storico personale.
- [user-spend-visibility-refactor-plan.md](ux/user-spend-visibility-refactor-plan.md): Piano e checklist operativa per centralizzare la spesa nel perimetro admin e rimuoverla dalle viste user (completato, merge su `dev`).
- [ux-strategy.md](ux/ux-strategy.md): Strategia UX e principi guida.

### Aggiornamenti recenti
- 2026-04-18: completata rimozione runtime Meta Ads (endpoint + route page + prompt layer runtime) e validazione E2E (`25/25` Playwright).
- 2026-04-18: completato allineamento as-is della documentazione core (`api-specifications`, `blueprint`, `progetto-overview`, `implement-index`) e aggiornato stato decommission in `docs/implementation/feature-meta-ads-runtime-decommission-checklist-1.md`.
- 2026-04-18: completato riallineamento as-is di `docs/prompts/tools/**` al runtime post-ADR con chiusura gap analysis in `docs/review/tool-prompt-cloning-scope-as-is-gap-analysis-2026-04-18.md`.
- 2026-04-18: consolidata documentazione Phase 6 post-validazione finale con evidenza E2E (`25/25` Playwright) e allineamento path test nel piano Phase 5.
- 2026-04-18: avviata Phase 6 del refactor tool-pages composabile con piano operativo dedicato in `docs/implementation/tool-pages-phase-6-cleanup-tests-plan-1.md` e kickoff test su componenti/integration NextLand.
- 2026-04-18: aggiunti piano operativo Phase 4 funnel refactor in `docs/implementation/funnel-pages-phase-4-refactor-plan.md` e audit predittivo sicurezza in `docs/review/2026-04-18-phase-4-funnel-refactor-security-review.md`.
- 2026-04-18: aggiunta review capacity/overflow per scenario 20 utenti medi concorrenti in `docs/review/2026-04-18-capacity-overflow-risk-review.md`.
- 2026-04-16: migrati in `docs/` i documenti fuori scope presenti in `plan/` e `.copilot-tracking/` per il track native login (plan/checklist/execution/tracker/research/prompt) e aggiornato l'indice principale.
- 2026-04-16: collegato al perimetro docs il piano export pagina artefatto in `docs/implementation/feature-artifact-page-export-actions-plan-1.md` e aggiornati gli indici operativi.
- 2026-04-15: archiviati i documenti completati del track audit remediation sequenziale (`feature-audit-remediation-sequenced-1.md`, `feature-audit-remediation-sequenced-tracker-1.md`) in `docs/archive/` e riallineati i riferimenti nei report review/index.
- 2026-04-15: normalizzato naming del piano artifact-first (`plan-extractionChainArtifactFirst.prompt.md` -> `extraction-chain-artifact-first-prompt-plan.md`) con aggiornamento cross-link nel perimetro implementation.
- 2026-04-15: completata remediation iniziale dei test fragili prompt/UI (riduzione assert copy-level, mantenimento test sicurezza/contratti), con report operativo in `docs/review/2026-04-15-test-suite-security-balance-review.md`.
- 2026-04-14: aggiunto guardrail build-safe Next.js App Router in `docs/specifications/api-specifications.md` per evitare errori CI su `useSearchParams` senza boundary `Suspense`.
- 2026-04-14: aggiornate le specifiche funnel/API per il passaggio di testimonianze strutturate (`quote`, `source`, `achieved_result`, `measurable_results`) dal payload extraction al contesto generazione.
- 2026-04-14: introdotto piano operativo microtask GUI/UX low-impact (archiviato post-completamento in `docs/archive/gui-ux-low-impact-microtasks-sprint-plan-2026-04-14.md`).
- 2026-04-13: introdotta specifica canonica per il naming dei file documentazione in `docs/specifications/documentation-filename-naming-spec.md`.
- 2026-04-13: riallineata la linea alta docs (`blueprint`, `progetto-overview`, `api-specifications`) allo stato as-is post PR-28 e introdotti guardrail permanenti di rigore documentale.
- 2026-04-13: verificata e documentata la consistenza tra piano `magic-copilot` (C1..B2) e interventi PR #28 con matrice di tracciabilita nei report review/changelog.
- 2026-04-13: aggiunti report review/changelog dell'ultimo merge PR -> `dev` (PR #28) per tracciabilita interventi e base documentale locale.
- 2026-04-13: validazione finale completata dopo il refactor width policy shared shell: test PASS (48 suite, 352 test), typecheck PASS e build PASS.
- 2026-04-13: estesa la copertura d'integrazione del track projects-first alla pagina dettaglio progetto, con suite completa PASS (48 suite, 352 test).
- 2026-04-13: completata implementazione del track projects-first (fasi 1-4) con validazione completata: test PASS (48 suite, 352 test), typecheck PASS e build PASS.
- 2026-04-13: aggiunto piano UX per riallineare la navigazione a una gerarchia projects-first e riposizionare il feed Artefatti come storico personale.
- 2026-04-12: introdotta area notes con documento dedicato per desiderata e appunti preliminari non ancora in planning.
- 2026-04-12: completata la fase documentale finale del track extraction model policy (spec API aggiornata, implement-index riallineato, runbook rollout/rollback in review).
- 2026-04-12: completato e mergiato su `dev` il refactor di visibilità spesa user/admin split (PR #21), con checklist piano chiusa e stato as-is aggiornato.
- 2026-04-12: aggiunto piano operativo per centralizzare la visibilità della spesa nel perimetro admin e rimuoverla dalle superfici user.
- 2026-04-12: organizzazione documentale — archiviati working doc quality-audit track (feature-quality-audit-resolution-*), rimossa `docs/improvement/` vuota, spostato `copilot-audit` in `docs/review/`, aggiornato indice README.
- 2026-04-12: chiuso il track di remediation audit sequenziale con merge PR #19 su `dev` e pubblicazione report di closure in `docs/review/feature-audit-remediation-closure-2026-04-12.md`.
- 2026-04-11: completato sprint di visual unification delle pagine interne con estensione del concept login.
- 2026-04-11: introdotta specifica operativa di frameworking grafico per standardizzare i futuri interventi UI.
- 2026-04-11: allineata documentazione tool al refactoring Funnel upload-first (upload -> extraction -> generate) e aggiornata parity prompt/runtime.

---

Per ogni sottocartella, consultare il relativo README (se presente) o i file elencati sopra per approfondimenti specifici.