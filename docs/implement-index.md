# Piano razionale di implementazione — Segnalazioni e azioni pending

_Estratto e sintetizzato dalla documentazione di progetto (aprile 2026)_

---

## Testing (CRITICO/BLOCCANTE)
- **Testing coverage >80%** (unit, integration, E2E)
  - Bloccante per produzione.
  - Aggiornare/espandere test su orchestrator, agent, API, flussi E2E (login, generazione, quota, admin, preview artefatti).
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
- **Render.com deployment & monitoring**
  - Completare deploy, health checks, monitoring, runbook.
  - Bloccante per go-live.
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
1. Testing coverage >80%
2. Structured logging & Sentry
3. Refactoring preview artefatti
4. Completamento deploy e validazione su Render

---

**Prossimi step consigliati:**
- Prioritizzare testing, logging, preview artefatti e deploy.
- Parallelizzare ottimizzazioni minori (accessibilità, UX, doc, DB).
- Validare con utenti reali e checklist di rischio prima del go-live.
