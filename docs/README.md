# Indice Documentazione

Questa cartella contiene la documentazione tecnica e funzionale del progetto, organizzata per aree tematiche e tipologia di contenuto.

## Indice

- [blueprint.md](blueprint.md): Blueprint architetturale e overview del progetto.
- [progetto-overview.md](progetto-overview.md): Descrizione generale e obiettivi del progetto per Stakeholder e Team.
- [implement-index.md](implement-index.md): Indice operativo delle priorità correnti e stato di avanzamento.
- [implement-quality-audit.md](implement-quality-audit.md): Catalogo dei finding quality/security dell'audit globale e razionale della risoluzione.

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
- [feature-audit-remediation-sequenced-1.md](implementation/feature-audit-remediation-sequenced-1.md): Piano esecutivo audit remediation sequenziale (TASK-001..020) — completato PR #19.
- [feature-audit-remediation-sequenced-tracker-1.md](implementation/feature-audit-remediation-sequenced-tracker-1.md): Tracker del track audit remediation — tutti i task completati.
- [feature-prisma-deploy-migrations-1.md](implementation/feature-prisma-deploy-migrations-1.md): Piano esecutivo per deploy deterministico Prisma su Vercel — completato.
- [feature-prisma-deploy-migrations-tracker-1.md](implementation/feature-prisma-deploy-migrations-tracker-1.md): Tracker del deploy migrations track — tutti i task completati.

### review/
- [feature-audit-remediation-closure-2026-04-12.md](review/feature-audit-remediation-closure-2026-04-12.md): Closure report del track audit remediation (PR #19, 2026-04-12).
- [feature-audit-remediation-gap-analysis-2026-04-12.md](review/feature-audit-remediation-gap-analysis-2026-04-12.md): Gap analysis del track audit remediation (2026-04-12).
- [copilot-audit-2026-04-12.md](review/copilot-audit-2026-04-12.md): Report qualità e sicurezza Copilot (12 aprile 2026) — sorgente dei finding del track remediation.

### archive/
- Documenti storici e snapshot superseded (review, roadmap, follow-up PR).

### prompts/
- [README.md](prompts/README.md): Indice e linee guida per i prompt.
- [hl_funnel/](prompts/hl_funnel/): Prompt e strumenti per HL Funnel.
- [meta_ads/](prompts/meta_ads/): Prompt e strumenti per Meta Ads.
- [tools/hl_funnel/](prompts/tools/hl_funnel/): Prompt generator specifici HL Funnel.
- [tools/meta_ads/](prompts/tools/meta_ads/): Prompt generator specifici Meta Ads.

### specifications/
- [api-specifications.md](specifications/api-specifications.md): Specifiche API e contratti.
- [graphic-frameworking-spec.md](specifications/graphic-frameworking-spec.md): Specifica visual frameworking per interventi UI coerenti con shell grafica e template applicato.

### ux/
- [gui-refactor-plan.md](ux/gui-refactor-plan.md): Piano di refactoring GUI.
- [user-spend-visibility-refactor-plan.md](ux/user-spend-visibility-refactor-plan.md): Piano e checklist operativa per centralizzare la spesa nel perimetro admin e rimuoverla dalle viste user.
- [ux-strategy.md](ux/ux-strategy.md): Strategia UX e principi guida.

### Aggiornamenti recenti
- 2026-04-12: aggiunto piano operativo per centralizzare la visibilità della spesa nel perimetro admin e rimuoverla dalle superfici user.
- 2026-04-12: organizzazione documentale — archiviati working doc quality-audit track (feature-quality-audit-resolution-*), rimossa `docs/improvement/` vuota, spostato `copilot-audit` in `docs/review/`, aggiornato indice README.
- 2026-04-12: chiuso il track di remediation audit sequenziale con merge PR #19 su `dev` e pubblicazione report di closure in `docs/review/feature-audit-remediation-closure-2026-04-12.md`.
- 2026-04-11: completato sprint di visual unification delle pagine interne con estensione del concept login.
- 2026-04-11: introdotta specifica operativa di frameworking grafico per standardizzare i futuri interventi UI.
- 2026-04-11: allineata documentazione tool al refactoring Funnel upload-first (upload -> extraction -> generate) e aggiornata parity prompt/runtime.

---

Per ogni sottocartella, consultare il relativo README (se presente) o i file elencati sopra per approfondimenti specifici.