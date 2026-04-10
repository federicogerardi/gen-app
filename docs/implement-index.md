# Piano razionale di implementazione — Segnalazioni e azioni pending

_Estratto e sintetizzato dalla documentazione di progetto (aprile 2026)_

## Stato avanzamento (aggiornato al 2026-04-10)

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

- **Tooling generation optimization (Meta Ads + Funnel Pages)**: `COMPLETATO (PR-1..PR-6)`
  - Completati schema unificato input, prompt/runtime parity, normalizzazione output, SSE metadata additive, consolidamento route/error mapping e hardening finale.
  - Standard output workflow tool allineato a `outputFormat: markdown` (Meta Ads + Funnel Pages).
  - Validazione finale locale: `npm run lint`, `npm run typecheck`, `npm run test` (28/28 suite), `npm run build` tutti `PASS`.
  - File: docs/implementation/tooling-generation-refactor-plan.md

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
  - File: docs/archive/improvement-roadmap.md, docs/archive/architecture-review.md, docs/ux/gui-refactor-plan.md

---

## Backend/LLM
- **Tooling generation refactor framework (core app)**
  - Prioritario per allineare processo Orchestrator -> Agent -> Provider, contratto input/output e consistenza streaming.
  - Esecuzione prevista in PR incrementali (PR-1..PR-6) nel branch dedicato `feat/tooling-generation-optimization`.
  - File: docs/implementation/tooling-generation-refactor-plan.md, docs/adrs/001-modular-llm-controller-architecture.md, docs/specifications/api-specifications.md

- **Structured logging & observability**
  - Implementare logging strutturato (Pino), Sentry, performance metrics.
  - Bloccante per debugging/monitoraggio.
  - File: docs/archive/improvement-roadmap.md

- **Error handling avanzato**
  - Retry logic, circuit breaker, error boundaries custom, fallback provider.
  - File: docs/archive/improvement-roadmap.md, docs/archive/architecture-review.md

- **Database optimization**
  - Indici, constraints, soft deletes.
  - File: docs/archive/improvement-roadmap.md

- **Quota management**
  - Automatizzare reset mensile, warning 80%, endpoint admin quota, email alert.
  - File: docs/archive/improvement-roadmap.md, docs/archive/architecture-review.md

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
  - File: docs/archive/improvement-roadmap.md, docs/implementation/implementation-plan.md

---

## Documentazione
- **Allineamento documentazione vs codice**
  - Aggiornare api-specifications.md, blueprint.md, docstring, runbook.
  - File: docs/archive/copilot-review-followups.md, docs/archive/architecture-review.md

---

## Altri suggerimenti e rischi
- 2FA admin, caching Redis, validazione mobile, decisioni CRUD admin user, gestione rischi (outage, streaming, DB, quota, sicurezza).

---

### Azioni più critiche/bloccanti
1. Stabilizzazione E2E e flussi auth/db (`IN CORSO`)
2. Structured logging & Sentry (`IN CORSO - baseline completata`)
3. Refactoring preview artefatti (`IN CORSO`)
4. Stabilizzazione post-deploy e validazione su Vercel

Nota operativa: il track tooling generation e chiuso (`PR-1..PR-6` completate). Per dettaglio storico fasi/rollback: `docs/implementation/tooling-generation-refactor-plan.md`.

---

## Frontend Improvement Sprint Track

### Sprint 1 — Preview human-readable end-to-end (`COMPLETATO`)
- Scope:
  - Uniformare la visualizzazione output per evitare JSON raw nelle schermate frontend principali.
  - Applicare fallback leggibile durante streaming e a completamento output.
- Risultato:
  - Output della pagina di generazione artefatti allineato al formatter semantico condiviso.
  - Nessuna visualizzazione diretta di payload JSON raw nello stream output utente.

### Sprint 2 — Responsive & Accessibilità (`IN CORSO - hardening core completato`)
- Obiettivi:
  - Validazione completa mobile/tablet/desktop sulle pagine core.
  - Hardening WCAG AA (focus management, contrasto, aria-label, keyboard flow).
- Risultato corrente:
  - Migliorata accessibilità semantica su Navbar, pagine artifacts e form tool core (`htmlFor/id`, `aria-current`, `aria-live`, `role="alert"`).
  - Migliorata usabilità responsive top-level su navigazione e azioni card/page (`sticky nav`, wrapping e CTA full-width su mobile).
  - Introdotto skip-link globale "Salta al contenuto principale" e target focus consistente su pagine core.
  - Aggiunti landmark `main` consistenti nelle pagine core per navigazione assistiva.
  - Validazione tecnica eseguita: lint workspace `PASS` (0 warning, 0 error).
  - Validazione Playwright aggiornata: `PASS` su smoke+accessibilità base+redirect protetti (4/4 test).
  - Resta pending la validazione cross-device completa con checklist finale Sprint 2.

#### Checklist finale Sprint 2 (pending)
- Verifica viewport `320px`, `375px`, `768px`, `1024px`, `1280px` su pagine autenticate: dashboard progetto, lista artefatti, dettaglio artefatto, Meta Ads, Funnel Pages, Admin.
- Verifica keyboard flow completo (Tab/Shift+Tab/Enter/Escape) su pagine autenticate: filtri, CTA principali e drawer admin.
- Verifica focus visible su controlli interattivi principali e nessuna trap non voluta fuori dal drawer.
- Verifica contrasto testi/badge/stati in condizioni default e hover/focus.
- Verifica messaggistica errori con annunci accessibili (`role="alert"`/`aria-live`) nei flussi di generazione.

### Sprint 3 — Tool Legacy UX Native (`COMPLETATO`)
- Obiettivi:
  - Verifica e consolidamento delle route legacy tool emerse durante lo sviluppo.
  - Rimozione dei refusi non inclusi nel perimetro MVP.
- Risultato:
  - Le route obsolete `/tools/content`, `/tools/seo` e `/tools/code` sono state rimosse dall'app.
  - Rimossi anche i relativi pulsanti GUI e il codice/test collegato non piu coerente con il perimetro prodotto.

### Sprint 4 — Layout & Admin UX Polish (`IN CORSO - core polish completato`)
- Obiettivi:
  - Navbar/sidebar/dashboard polish e azioni rapide.
  - Miglioramento UX admin per quota/budget/audit timeline.
- Risultato corrente:
  - Dashboard resa piu densa e orientata alle azioni con workspace tool allineato al perimetro MVP effettivo.
  - Panoramica account migliorata con indicatori visivi quota/budget e stato residuo.
  - Navbar semplificata e riallineata al perimetro attivo (rimozione shortcut legacy verso route obsolete).
  - Admin UX migliorata su form quota/budget (validazione input, feedback chiari, refresh dati post-save/reset).
  - Timeline attivita resa piu leggibile con badge tipo/modello/stato e pannello riepilogo nel drawer.

### Sprint 5 — E2E UX Regression Guardrails (`IN CORSO - guardrail core completati`)
- Obiettivi:
  - E2E su login reale, generazione end-to-end, quota/admin.
  - Stabilizzazione suite anti-regressione UX come gate PR.
- Risultato corrente:
  - Playwright baseline estesa su smoke/accessibilità base/redirect protetti (`4/4 PASS`).
  - Aggiunti test integration su `AdminQuotaForm` per salvataggio/reset/validazione UX.
  - Suite guardrail Sprint 5 validata localmente sui test aggiunti e sulla baseline Playwright.

### Build warning remediation (2026-04-10) (`COMPLETATO`)
- Rimosso warning Sentry legato a opzione deprecata (`disableLogger`) in configurazione Next.js.
- Aggiunto hook client richiesto per navigazioni (`onRouterTransitionStart`) in instrumentation client.
- Eliminato warning Turbopack/NFT "Encountered unexpected file in NFT list" migrando il caricamento prompt runtime da filesystem a template statici tipizzati.
- Verifica locale: `npm run build` `PASS` senza warning.

---

**Prossimi step consigliati:**
- Mantenere monitoraggio runtime su stream/error-rate dei tool Meta Ads e Funnel Pages dopo il refactor completato.
- Estendere test E2E sui flussi reali auth/db per consolidare il gate di regressione end-to-end.
- Mantenere coverage >80% sul perimetro attuale e introdurre guardrail anti-regressione nei PR check.
- Estendere coverage su flussi E2E critici (login reale, generazione completa, gestione quota/admin).
- Estendere observability (Sentry + logging) alle route non ancora coperte e aggiungere metriche performance.
- Chiudere refactor preview su tutti i workflow/tool mantenendo output solo human-readable.
- Completare il track di hardening post-deploy su Vercel (health checks, monitoring, runbook, smoke validation).
- Parallelizzare ottimizzazioni minori (accessibilità, UX, doc, DB).
- Validare con utenti reali e checklist di rischio prima del go-live.
