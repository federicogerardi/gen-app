# Piano razionale di implementazione — Segnalazioni e azioni pending

_Estratto e sintetizzato dalla documentazione di progetto (aprile 2026)_

## Stato avanzamento (aggiornato al 2026-04-09)

- **Testing coverage >80%**: `COMPLETATO (scope corrente)`
  - Coverage Jest attuale: Statements `82.96%`, Branches `70.31%`, Functions `78.91%`, Lines `85.96%`.
  - Threshold globale CI impostato a `70%` e rispettato su tutti i metric.
  - Nota: il risultato riflette il perimetro di coverage corrente orientato a API/LLM/business logic.
  - Resta aperto l'ampliamento su E2E end-to-end e auth/db real-flow.

- **Structured logging & Sentry**: `IN CORSO (baseline completata)`
  - Introdotto logger strutturato con Pino (redaction + request context).
  - Integrata baseline Sentry in Next.js (server, edge, client, global error boundary, trace metadata).
  - Da completare: metriche performance e rollout su tutte le route chiave.

- **Refactoring preview artefatti**: `IN CORSO`
  - Rafforzato fallback human-readable con nuovi test unit.
  - Da completare la convergenza UX completa su tutte le viste/workflow.

- **Deploy Vercel**: `COMPLETATO (baseline)`
  - Branch `main` in produzione.
  - Branch `dev` come ramo di sviluppo per PR.
  - Restano in corso hardening post-deploy (health checks, monitoring, runbook, smoke validation).

---

## Testing (CRITICO)
- **Coverage automatica >80% su scope corrente**: `RAGGIUNTA`
  - Consolidare e mantenere il livello raggiunto nelle prossime PR.
- **Espansione test E2E e flussi reali auth/db**: `IN CORSO`
  - Estendere i test su login reale, generazione end-to-end, quota/admin e regression UX preview.
  - File: docs/improvement/improvement-roadmap.md, docs/review/architecture-review.md, docs/ux/gui-refactor-plan.md

---

## Backend/LLM
- **Structured logging & observability**
  - Implementare logging strutturato (Pino), Sentry, performance metrics.
  - Bloccante per debugging/monitoraggio.
  - File: docs/improvement/improvement-roadmap.md

- **Error handling avanzato**
  - Retry logic, circuit breaker, error boundaries custom, fallback provider.
  - File: docs/improvement/improvement-roadmap.md, docs/review/architecture-review.md

- **Database optimization**
  - Indici, constraints, soft deletes.
  - File: docs/improvement/improvement-roadmap.md

- **Quota management**
  - Automatizzare reset mensile, warning 80%, endpoint admin quota, email alert.
  - File: docs/improvement/improvement-roadmap.md, docs/review/architecture-review.md

---

## Frontend/UX
- **Refactoring preview artefatti**
  - Mostrare sempre preview human-readable, evitare JSON raw, fallback robusto.
  - Bloccante per usabilità.
  - File: docs/ux/gui-refactor-plan.md

- **Miglioramento navigazione e layout**
  - Navbar sticky, sidebar persistente, dashboard compatta, azioni rapide.
  - File: docs/ux/gui-refactor-plan.md

- **Accessibilità**
  - Refinements WCAG AA, aria-label, contrasto, focus management.
  - File: docs/ux/gui-refactor-plan.md, docs/accessibility/accessibility.md

- **Admin UX**
  - Migliorare gestione quota/budget, drawer accessibile, audit timeline.
  - File: docs/ux/gui-refactor-plan.md

---

## DevOps/Deployment
- **Vercel post-deployment hardening & monitoring**
  - Consolidare health checks, monitoring, runbook e smoke validation.
  - Prioritario per stabilizzazione post go-live.
  - File: docs/improvement/improvement-roadmap.md, docs/implementation/implementation-plan.md

---

## Documentazione
- **Allineamento documentazione vs codice**
  - Aggiornare api-specifications.md, blueprint.md, docstring, runbook.
  - File: docs/review/copilot-review-followups.md, docs/review/architecture-review.md

---

## Altri suggerimenti e rischi
- 2FA admin, caching Redis, validazione mobile, decisioni CRUD admin user, gestione rischi (outage, streaming, DB, quota, sicurezza).

---

### Azioni più critiche/bloccanti
1. Stabilizzazione E2E e flussi auth/db (`IN CORSO`)
2. Structured logging & Sentry (`IN CORSO - baseline completata`)
3. Refactoring preview artefatti (`IN CORSO`)
4. Stabilizzazione post-deploy e validazione su Vercel

---

**Prossimi step consigliati:**
- Mantenere coverage >80% sul perimetro attuale e introdurre guardrail anti-regressione nei PR check.
- Estendere coverage su flussi E2E critici (login reale, generazione completa, gestione quota/admin).
- Estendere observability (Sentry + logging) alle route non ancora coperte e aggiungere metriche performance.
- Chiudere refactor preview su tutti i workflow/tool mantenendo output solo human-readable.
- Completare il track di hardening post-deploy su Vercel (health checks, monitoring, runbook, smoke validation).
- Parallelizzare ottimizzazioni minori (accessibilità, UX, doc, DB).
- Validare con utenti reali e checklist di rischio prima del go-live.
