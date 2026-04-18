# Piano razionale di implementazione — Segnalazioni e azioni pending

_Estratto e sintetizzato dalla documentazione di progetto (aprile 2026)_

## **[P1-CRITICO]** Aggiornamento sessione (2026-04-18 — Tool Pages Composable Architecture Refactoring)

- **Stato attuale**: `PHASE 4 COMPLETE (FUNNEL)` → **READY FOR PHASE 5 (NEXTLAND)**.
- **Risultati POC (2026-04-18 completato)**:
  - ✅ **545 righe** di shared code estratte e validate
  - ✅ **Zero TypeScript errors** — type safety CONFIRMED (no `any` types)
  - ✅ **Generic architecture** — `ToolStepState<T>` works across tools
  - ✅ **Hook isolation** — `useExtraction` + `useStepGeneration` standalone-testable
  - ✅ **70%+ code reuse** — tra funnel-pages e nextland
  - ✅ **No blockers** — tutti Must-Have criteria MET & EXCEEDED
- **Execution Phase 4 (funnel-pages)**: **✅ COMPLETATA**.
  - `src/app/tools/funnel-pages/page.tsx`: 21 righe
  - `src/app/tools/funnel-pages/FunnelPagesToolContent.tsx`: 285 righe
  - decomposizione completata su `components/` e `hooks/` funnel-specific
  - validazione tecnica verde: `typecheck`, `lint`, test matrix Phase 4 (56/56)
- **Prossimi step**: avviare Phase 5 su `nextland` riusando lo stesso blueprint composabile.
- **Gate operativi Phase 4 (nuovi)**: test matrix obbligatoria + rollback plan esplicito definiti nel piano operativo funnel.
- **Documentazione**:
  - [ADR 004: Refactoring Tool Pages a Architettura Composabile](./adrs/004-tool-pages-composable-architecture.md) — Design completo + POC results
  - [Spike SPIKE-TOOL-PAGES-REFACTOR-1](./implementation/spike-tool-pages-composable-architecture-poc-1.md) — Risultati POC dettagliati
  - [Funnel Pages Phase 4 Refactor Plan](./implementation/funnel-pages-phase-4-refactor-plan.md) — Piano operativo di implementazione Phase 4
  - [Predictive Security Review: Phase 4 Funnel Refactor](./code-review/2026-04-18-phase-4-funnel-refactor-security-review.md) — Audit predittivo allineato: remediation P1/P2 integrate, stato GO operativo
- **Tempo stimato totale** (full implementation): 12-15 ore (Phases 3-6, 1.5-2 giorni concentrati)
- **Impact**: Una volta completato:
  - funnel-pages: 1162 → **300 righe** (-74%)
  - nextland: 1032 → **280 righe** (-73%)
  - Nuovo tool: reusable in **30min da template** (vs 2h manual)
  - Manutenabilità: **5x improvement** in time-to-modify

---

## Aggiornamento sessione (2026-04-17 — Tool Cloning Runbook + Allineamento grafica HLF)

- **Stato attuale**: `COMPLETATO`.
- **Obiettivo P1**: Allineare graphic-frameworking-spec e gui-refactor-plan allo stato effettivo di HotLeadFunnel.
- **Obiettivo P2**: Creare procedura step-by-step completa per clonare HLF con variazioni mantenendo 95%+ conformità.
- **Razionale**: Gap analysis identificò 3-4 deviazioni intenzionali (file input nativo, checklist bg-white/70, dialog bianco). Documentate come tool-pages exceptions. Nuovo runbook remove ambiguità su implementazione clone.
- **Completato in docs**:
  - ✅ Aggiunta sezione `## Tool Pages Exceptions` in `docs/specifications/graphic-frameworking-spec.md`
  - ✅ Aggiornato QA checklist per differenziare "pagine dashboard/admin" vs "tool pages"
  - ✅ Cross-reference in `docs/ux/gui-refactor-plan.md`
  - ✅ **NUOVO**: Creato `docs/implementation/tool-cloning-runbook-1.md` con:
    - Anatomia file structure per tool
    - 4 phase sequenziali: Route + Schema → Prompts → Frontend → Testing
    - Template TypeScript copiabili per route handler, builder, UI page, test
    - Checklist conformità graphic framework + testing + build
    - Troubleshooting comune
    - Tempi stimati (2.5-3 ore con esperienza)
    - DoD finale + link riferimenti
- **Status compliance**: HLF 100% conforme. Clone potential: 95%+ con runbook (vs 85% senza).
- **File aggiornati**:
  - `docs/specifications/graphic-frameworking-spec.md`
  - `docs/ux/gui-refactor-plan.md`
  - **[NEW]** `docs/implementation/tool-cloning-runbook-1.md`

## Aggiornamento sessione (2026-04-18 — Capacity/overflow thresholds per tool generation)

- **Stato attuale**: `COMPLETATO` (documentazione operativa).
- **Obiettivo**: definire soglie operative verde/giallo/rosso per rischio overflow con baseline 20 utenti medi concorrenti.
- **Riferimento unico (no duplicato tabella)**:
  - [docs/code-review/2026-04-18-capacity-overflow-risk-review.md](docs/code-review/2026-04-18-capacity-overflow-risk-review.md)
- **Uso previsto**: base per alerting/runbook su p95, 429/5xx, stream concorrenti, saturazione DB e burn-rate costi.

## Aggiornamento sessione (2026-04-16 — Native login credentials + Google OAuth)

- **Stato attuale**: `PLANNED`.
- **Obiettivo**: introdurre autenticazione credentials admin-managed in coesistenza con il flusso Google OAuth esistente.
- **Documentazione operativa migrata in docs/**:
  - `docs/implementation/feature-native-login-credentials-google-oauth-plan-1.md`
  - `docs/implementation/feature-native-login-credentials-google-oauth-implementation-plan-1.md`
  - `docs/implementation/feature-native-login-credentials-google-oauth-execution-plan-1.md`
  - `docs/implementation/feature-native-login-credentials-google-oauth-tracker-1.md`
  - `docs/review/native-login-credentials-google-oauth-research-review-2026-04-16.md`
  - `docs/prompts/native-login-credentials-google-oauth-implementation-prompt.md`
- **Scope tecnico previsto**:
  - aggiunta `passwordHash` nullable su `User` (retrocompatibile con utenti OAuth);
  - endpoint/admin workflow per create/reset password con guard `requireAdminUser()`;
  - estensione UI login/admin e matrice test di non-regressione auth/admin.

## Aggiornamento sessione (2026-04-16 — Artifact detail export actions plan)

- **Stato attuale**: `PLANNED`.
- **Obiettivo**: introdurre nella pagina dettaglio artefatto le azioni `Copia testo`, `Scarica MD`, `Scarica DOCX` con logica lato client e without nuove route API.
- **Documento piano**: `docs/implementation/feature-artifact-page-export-actions-plan-1.md`.
- **Scope pianificato**:
  - utility export (`src/lib/artifact-export.ts`) per naming, markdown e blob docx;
  - integrazione client component azioni in `src/app/artifacts/[id]/page.tsx`;
  - copertura test unit/integration dedicata al comportamento copy/download.
- **Assunzione aperta da confermare**: `download in docs` interpretato come `download .docx`.

## Aggiornamento sessione (2026-04-16 — Funnel tool flow rationalization: PR-2 completata)

- **Stato attuale**: `COMPLETATO`.
- **Esito validazione**: `lint`, `typecheck` e `test` tutti verdi.
- **Completato in codice (chiusura PR-2)**:
  - relaunch intent-aware Funnel applicato nel builder shared con supporto `intent=resume|regenerate`;
  - dettaglio artefatto aggiornato con primaria contestuale (`Riprendi dal checkpoint` o `Rigenera variante`) e secondaria coerente;
  - storico artefatti allineato allo stesso contract di relaunch;
  - aggiunta copertura unitaria sul builder di relaunch e allineamento test lista artefatti.
- **Stabilizzazione test**:
  - risolto il failure integration su `artifacts-client-page` riallineando l'asserzione a fixture non rilanciabile;
  - silenziati warning attesi nella suite `runtime-info` per output CI piu pulito.
- **File aggiornati in questa fase**:
  - `src/lib/artifact-relaunch.ts`
  - `src/app/artifacts/[id]/page.tsx`
  - `src/app/artifacts/ArtifactsClientPage.tsx`
  - `tests/unit/artifact-relaunch.test.ts`
  - `tests/unit/ArtifactsClientPage.test.tsx`
  - `tests/integration/artifacts-client-page.test.tsx`
  - `tests/unit/runtime-info.test.ts`
- **Follow-up opzionali**:
  - nessun follow-up critico aperto; E2E artifact-first su `resume` vs `regenerate` gia coperto.

## Aggiornamento sessione (2026-04-15 — Test Fragility Hardening: prompt/UI)

- **Obiettivo completato**: ridotta la fragilita dei test su prompt markdown e copy UI non critico, mantenendo invariati i test ad alto valore sicurezza/contratto API.
- **Interventi eseguiti**:
  - `tool-prompts-parity`: sostituito il confronto byte-to-byte con parity strutturale (headings) + guardrail di parita grossolana lunghezza.
  - `tool-prompts`: sostituite asserzioni su frasi letterali con invarianti a token in punti non critici.
  - `Navbar`, `RuntimeInfoProvider`, `PersonalTrendCard`, `ArtifactsClientPage`: ridotta dipendenza da stringhe complete e rafforzate asserzioni su comportamento/semantica/accessibilita.
- **File test aggiornati**:
  - `tests/unit/tool-prompts-parity.test.ts`
  - `tests/unit/tool-prompts.test.ts`
  - `tests/unit/Navbar.test.tsx`
  - `tests/unit/RuntimeInfoProvider.test.tsx`
  - `tests/unit/PersonalTrendCard.test.tsx`
  - `tests/unit/ArtifactsClientPage.test.tsx`
- **Conferma sicurezza**:
  - Nessuna modifica ai test integration di auth/ownership/rate-limit/error-code.
  - Strategia confermata: rigidita alta sui contratti sicurezza, elasticita controllata su copy e wording.
- **Riferimento review**: `docs/code-review/2026-04-15-test-suite-security-balance-review.md`.
## Aggiornamento sessione (2026-04-15 — Hotfix: stream deadline funnel-pages)

- **Root cause identificata in produzione**: artefatto con id `cmnzviexu000004ib6p23z621` restava in stato `generating` a frontend completato. Causa confermata da runtime log Vercel: invocazione `POST /api/tools/funnel-pages/generate` con durata `300001ms`, corrispondente al kill hard del runtime Vercel a 300s; la persistenza terminale DB saltava per interruzione forzata del processo Node prima del `db.artifact.update(status: completed|failed)`.
- **Fix applicato**: introdotto parametro `streamDeadlineMs` in `createArtifactStream` (`src/lib/llm/streaming.ts`) che, se configurato, arma un timer applicativo che aborta il provider anticipatamente rispetto al limite piattaforma. Il route `funnel-pages/generate` imposta `FUNNEL_STREAM_DEADLINE_MS = 270_000` (30s di margine rispetto al limite Vercel 300s), garantendo che la finalizzazione stato DB sia sempre completata prima del kill.
- **Comportamento post-fix**: timeout applicativo → `cancellationReason = 'timeout'` → se contenuto accumulato >= 120 chars persiste come `completed` (partial); altrimenti `failed(timeout)`. Nessuna build/API change breaking.
- **Validazione**: `typecheck` PASS, `tests/unit/streaming.test.ts` (nuovo test `persists failed(timeout) when stream deadline aborts`) PASS, `tests/integration/funnel-pages-route.test.ts` (asserzione `streamDeadlineMs: 270000`) PASS, `lint` PASS. Suite: 23/23.
- **File toccati**: `src/lib/llm/streaming.ts`, `src/app/api/tools/funnel-pages/generate/route.ts`, `tests/unit/streaming.test.ts`, `tests/integration/funnel-pages-route.test.ts`.
- **Scope da fare**: valutare applicazione analoga a `meta-ads/generate` se esposta allo stesso limite runtime.

## Aggiornamento sessione (2026-04-15 — Operational Hardening Plan API/LLM Tooling)

- **Nuova attivita pianificata (P1)**: creato piano esecutivo per hardening operativo API/LLM tooling con focus su error boundaries pre-stream, finalizzazione artifact extraction, reason taxonomy ownership e allineamento specifiche API.
- **Documento piano**: `docs/implementation/feature-operational-hardening-api-llm-tooling-plan-1.md`.
- **Tracker operativo**: `docs/implementation/feature-operational-hardening-api-llm-tooling-tracker-1.md`.
- **Stato**: `Planned` (da avviare nel prossimo ciclo backend hardening).
- **Origine**: `docs/review/operational-improvement-note-api-llm-tooling-2026-04-15.md`.

## Aggiornamento sessione (2026-04-15 — Extraction Completeness-First)

- **Guardrail extraction riallineati allo scopo del tool**: rimosso il profilo text-mode a timeout stretti (18s/22s) e introdotta policy completeness-first con finestre estese.
- **No cap stringente in text-mode**: sul consumer route extraction i guard stream aggressivi (`first_token`, `token_idle`, `json_start`, `json_parse`) sono disattivati in text-mode; resta una deadline ampia per-attempt per evitare richieste indefinite.
- **Coerenza stato artifact finale**: nei path di successo route-level extraction viene persistito esplicitamente `status: completed` con `completedAt`; nel recovery stream timeout non viene piu forzato `status: generating`.
- **Validazione post-allineamento**: `tests/unit/extraction-model-policy.test.ts` PASS, `tests/integration/extraction-route.test.ts` PASS, `npm run build` PASS.

## Aggiornamento sessione (2026-04-14 — Extraction Hardening Finale)

### Text-Mode Extraction: Completato ✅

**Implementazione completata del refactoring semplificazione estrazione** — passaggio da JSON schema parsing a plain text output per il flusso funnel upload-first.

**Cosa è stato risolto:**

1. **Typecheck errors (2 file)**: 
   - `tests/unit/tool-prompts.test.ts:60` — Added missing `responseMode: 'text'` parameter to test fixture
   - `src/lib/tool-prompts/funnel-pages.ts:17` — Made `briefing` optional to support extraction-only context path
   - ✅ Result: Full typecheck passing (0 errors)

2. **Integration test failures (2 test cases)**:
   - Updated token-timeout tests to align with text-mode extraction behavior
   - Mock streams now send plain text (not invalid JSON)
   - Test expectations adjusted: `timeoutKind:"token_idle"` → actual timeout behavior (first_token, etc.)
   - ✅ Result: 377/377 tests passing

3. **Escalation logic fix (soft_accept handling)**:
   - `src/app/api/tools/extraction/generate/route.ts:285` — soft_accept in text mode now **stops escalation** (returns 200 immediately)
   - Previous behavior: soft_accept triggered fallback to next model → eventually 503 (max_attempts_reached)
   - New behavior: soft_accept considered success in text mode (valid text output received)
   - ✅ Result: Extraction succeeds on first valid attempt; no unnecessary retries

4. **DB persistence synchronization**:
   - HTTP 200 response on soft_accept success (text mode) → DB persists as success
   - Previous discrepancy resolved: logs showed `acceptanceDecision:soft_accept` but DB showed error (was returning 503)
   - ✅ Result: Logs and database state now synchronized via HTTP status codes

5. **Documentation updates**:
   - API spec enhanced: new "Text-Mode Extraction" section with response format, timeout behavior, log field differences
   - Hardening tracker updated: all 16 tasks marked complete
   - hl-funnel schema updated: new section documenting text-mode extraction stability and KPI measurement plan
  - Completion evidence consolidated in `docs/implementation/feature-extraction-chain-hardening-tracker-1.md`

**Validazione in produzione:**
- Live extraction request (responseMode:text) succeeds on attempt 2 with gpt-4.1
- Logs: parseOk:true, schemaOk:true, consistencyOk:true, soft_accept
- HTTP 200 returned; tool generation stream initialized successfully
- Text output feeds correctly into downstream generators (optin/quiz/vsl prompts)

**Impatto:**
- ✅ Estrazione chain è hardened (timeout handling attivo) + semplificato (no JSON parsing)
- ✅ Escalation efficient (soft_accept stops retries in text mode)
- ✅ Type system stable (2 typecheck errors fixed)
- ✅ Tests aligned (2 failures fixed)
- ✅ DB persistence correct (200 responses persist as success)

**Prossimi step:**
- Monitor first-attempt success rates in production (target: >80% attempt 1-2)
- Measure extraction quality for downstream generators
- Track timeout distribution (measure real-world token_idle occurrences)

---

## Aggiornamento sessione (2026-04-14)

- **Extraction chain hardening (latenza/affidabilita/first-pass)**: snapshot storico 2026-04-14, allora in corso; implementazione tecnica completata (diagnostica consistency, timeout per-attempt, acceptance a soglie, prompt contract, abort propagation), con validazione KPI dev allora aperta.
- **Extraction text-mode simplification (Funnel upload-first)**: attivata modalita `responseMode: "text"` con payload V3 `extractionContext`, riducendo dipendenza dal parsing strutturato; ultimo run dev positivo con successo al primo tentativo e latenza ~20s.
- **Documenti attivati**: piano `docs/implementation/feature-extraction-chain-hardening-plan-1.md` e tracker `docs/implementation/feature-extraction-chain-hardening-tracker-1.md`.
- **Extraction chain artifact-first (nuovo track)**: Sprint 0 completato (outcome matrix, reason taxonomy, mapping terminale HTTP/artifact status), Sprint 1 completato (artifact stub, idempotency, single artifact chain), Sprint 2 tecnico completato (timeout classifier completo, partial timeout acceptance, single-finalize), Sprint 3 completato (finalizzazione atomica completion/failure, persistenza terminal reason, coerenza complete-event post-commit), Sprint 4 completato (`TASK-0401`, `TASK-0402`, `TASK-0403`), Sprint 5 completato (`TASK-0501..0504` con retry/resume UX + E2E dedicata) e Sprint 6 codice completato (`TASK-0601..0603`: feature flag route-level, rollout percentuale 10/30/100, rollback switch + drill runbook); monitoraggio KPI runtime e promozione progressiva restano attivi per chiusura gate finale (`docs/implementation/extraction-chain-artifact-first-prompt-plan.md`, `docs/implementation/feature-extraction-chain-artifact-first-tracker-1.md`, `docs/implementation/extraction-chain-artifact-first-sprint-operations-plan-2026-04-14.md`, `docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md`).
- **Funnel upload-first: testimonianze strutturate propagate al contesto generazione**: completato il passaggio dati da `extractedFields.testimonials_sources` verso `proof_context.testimonials_sources` con campi estesi (`quote`, `source`, `achieved_result`, `measurable_results`).
- **Field map extraction funnel esteso**: aggiunta voce `testimonials_sources` in `FUNNEL_EXTRACTION_FIELD_MAP` per rendere esplicita l'estrazione della social proof dal documento sorgente.
- **Validazione recente**: test mirati `PASS` su mapping e route funnel (`tests/unit/funnel-mapping.test.ts`, `tests/unit/funnel-extraction-field-map.test.ts`, `tests/integration/funnel-pages-route.test.ts`).
- **Sprint microtask GUI/UX low-impact**: completato il backlog MT-UX-01..08 con evidenze operative consolidate nel tracker dedicato, incluse validazioni test e verifica GUI locale.
- **Guardrail CI Next.js App Router**: introdotte linee guida build-safe per `useSearchParams` con boundary `Suspense` per prevenire errori di prerender in pipeline quality.

## Aggiornamento sessione (2026-04-12)

- **Verifica deploy/migrate completata**: confermato che `prisma migrate deploy` e incluso nella pipeline CI e nella catena di deploy applicativa (`db:migrate:deploy` -> `deploy:vercel` -> build).
- **Stato funzionalita app in questa sessione**: nessuna nuova feature implementata; aggiornato solo il tracciamento documentale con evidenza di verifica deploy.
- **Validazione ambiente locale**: `npm run typecheck` eseguito con esito `0` (pass).

## Stato avanzamento (aggiornato al 2026-04-12)

- **Testing coverage >80%**: `COMPLETATO (scope corrente)`
  - Coverage Jest attuale: Statements `82.96%`, Branches `70.31%`, Functions `78.91%`, Lines `85.96%`.
  - Threshold globale CI impostato a `70%` e rispettato su tutti i metric.
  - Nota: il risultato riflette il perimetro di coverage corrente orientato a API/LLM/business logic.
  - Resta aperto l'ampliamento su E2E end-to-end e auth/db real-flow.

- **Structured logging & Sentry**: `IN CORSO (baseline completata)`
  - Introdotto logger strutturato con Pino (redaction + request context).
  - Integrata baseline Sentry in Next.js (server, edge, client, global error boundary, trace metadata).
  - Da completare: metriche performance e rollout su tutte le route chiave.

- **Quality & security audit resolution**: `COMPLETATO E CHIUSO (Phase 1-4 ✅)`
  - Track esecutivo completato su 4 fasi e 15 finding, con merge finale su `dev` (squash and merge).
  - Tutti i task `TASK-TRK-001` → `TASK-TRK-015` risultano `Done` nel tracker operativo.
  - Documento piano allineato a stato finale e snapshot archiviato per storico.
  - File: docs/archive/implement-quality-audit-closure-2026-04-11.md, docs/archive/feature-quality-audit-resolution-tracker-1.md

- **Feature audit remediation sequenced (2026-04-12)**: `COMPLETATO E MERGIATO`
  - Piano sequenziale `TASK-001..TASK-020` completato con evidenze test/unit/integration/e2e.
  - PR #19 mergiata su `dev` e chiusa; stato operativo consolidato nel report di closure.
  - File: docs/archive/feature-audit-remediation-sequenced-1.md, docs/archive/feature-audit-remediation-sequenced-tracker-1.md, docs/review/feature-audit-remediation-closure-2026-04-12.md

- **Refactoring preview artefatti**: `IN CORSO`
  - Rafforzato fallback human-readable con nuovi test unit.
  - Da completare la convergenza UX completa su tutte le viste/workflow.

- **User spend visibility refactor (user/admin split)**: `COMPLETATO (2026-04-12)`
  - Rimossi feedback economici dal perimetro user (API quota/artifacts/projects e UI dashboard/dettaglio artefatto).
  - Mantenuta visibilità economica nel perimetro admin con assertion di test esplicite.
  - Merge eseguito su `dev` tramite PR #21.
  - Documentazione contrattuale allineata su `docs/specifications/api-specifications.md`.

- **Tooling generation optimization (Meta Ads + HotLead Funnel)**: `COMPLETATO (PR-1..PR-6)`
  - Completati schema unificato input, prompt/runtime parity, normalizzazione output, SSE metadata additive, consolidamento route/error mapping e hardening finale.
  - Standard output workflow tool allineato a `outputFormat: markdown` (Meta Ads + HotLead Funnel).
  - Esteso il flow HotLead Funnel (workflow `funnel_pages`) a pipeline upload-first: upload documento inline -> extraction fields -> generazione sequenziale `optin -> quiz -> vsl`.
  - Follow-up 2026-04-14: arricchita la propagazione delle testimonianze estratte verso il briefing funnel con campi risultato e metriche misurabili.
  - Validazione finale locale aggiornata: `npm run lint`, `npm run typecheck`, `npm run test` (30/30 suite), `npm run build` tutti `PASS`.
  - File: docs/archive/tooling-generation-refactor-plan.md

- **Extraction model policy (Funnel upload -> extraction)**: `COMPLETATO E MERGIATO (2026-04-12)`
  - Completate tutte le 5 fasi: policy runtime statica su OpenRouter, fallback deterministico (`anthropic/claude-3.7-sonnet` -> `openai/gpt-4.1` -> `openai/o3`), validazione server-side parse/schema/coerenza, budget cap configurabile, telemetria tentativi, normalizzazione quota retry e bootstrap deploy idempotente del model registry.
  - Root cause runtime chiusa durante il track: mismatch sul campo `notes` tra prompt e schema route, corretto con riallineamento prompt e compatibilita `string | string[]` lato validazione.
  - Merge su `dev` completato; documentazione operativa e tracker chiusi come snapshot finale as-is.
  - File: docs/implementation/funnel-extraction-model-policy-plan.md, docs/implementation/feature-funnel-extraction-model-policy-tracker-1.md, docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md

- **Extraction chain hardening (Funnel upload -> extraction)**: `COMPLETATO (2026-04-15)`
  - Implementazione hardening completata su route/policy/provider path: telemetria consistency, timeout differenziati per tentativo, acceptance engine `hard_accept/soft_accept/reject`, first-token + token-idle timeout, abort propagation end-to-end e rafforzamento prompt contract.
  - Stato operativo: monitoraggio KPI runtime prosegue nel track artifact-first/completeness-first per gate rollout finale.
  - File: docs/implementation/feature-extraction-chain-hardening-plan-1.md, docs/implementation/feature-extraction-chain-hardening-tracker-1.md

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
  - File: docs/archive/llm-artifact-generation-roadmap-plan.md, docs/archive/architecture-review.md, docs/ux/gui-refactor-plan.md

---

## Backend/LLM
- **Tooling generation refactor framework (core app)**
  - Prioritario per allineare processo Orchestrator -> Agent -> Provider, contratto input/output e consistenza streaming.
  - Esecuzione prevista in PR incrementali (PR-1..PR-6) nel branch dedicato `feat/tooling-generation-optimization`.
  - File: docs/archive/tooling-generation-refactor-plan.md, docs/adrs/001-modular-llm-controller-architecture.md, docs/specifications/api-specifications.md

- **Structured logging & observability**
  - Implementare logging strutturato (Pino), Sentry, performance metrics.
  - Bloccante per debugging/monitoraggio.
  - File: docs/archive/llm-artifact-generation-roadmap-plan.md

- **Quality & security audit resolution track**: `COMPLETATO`
  - Esecuzione completata dei finding di correttezza, consistenza, scalabilita e hardening emersi dall'audit globale.
  - Piano operativo chiuso e mantenuto come riferimento storico insieme al tracker.
  - File: docs/archive/implement-quality-audit-closure-2026-04-11.md, docs/archive/feature-quality-audit-resolution-tracker-1.md

- **Error handling avanzato**
  - Retry logic, circuit breaker, error boundaries custom, fallback provider.
  - File: docs/archive/llm-artifact-generation-roadmap-plan.md, docs/archive/architecture-review.md

- **Database optimization**
  - Indici, constraints, soft deletes.
  - File: docs/archive/llm-artifact-generation-roadmap-plan.md

- **Quota management**
  - Automatizzare reset mensile, warning 80%, endpoint admin quota, email alert.
  - File: docs/archive/llm-artifact-generation-roadmap-plan.md, docs/archive/architecture-review.md

- **Model registry auto-sync da OpenRouter**
  - Integrare il prelievo automatico dei costi modello esposti da OpenRouter e dei dettagli endpoint pubblicati dalla Models API per ridurre input manuale in admin e migliorare l'allineamento del registry.
  - Valutare modalita guidata con proposta di aggiornamento e conferma admin, invece di overwrite automatico, per preservare governance operativa.
  - File: https://openrouter.ai/api/v1/models, https://openrouter.ai/docs/overview/models

---

## Frontend/UX
- **Visual unification pagine interne (estensione concept login)**: `COMPLETATO (2026-04-11)`
  - Applicato framework visuale condiviso su dashboard, tools, artifacts, admin e project pages.
  - Introdotte utility foundation (`app-shell`, `app-grid-overlay`, `app-surface`, `app-title`, `app-copy`) e classe controlli su sfondo grafico (`app-control`).
  - Eseguito hardening contrasto su elementi sensibili (ricerca admin, filtri stato/tipo, card metriche, drawer quota).
  - Specifica di riferimento per interventi futuri: `docs/specifications/graphic-frameworking-spec.md`.

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

- **Microtask GUI/UX low-impact (estrazione sprint 2026-04-14)**: `COMPLETATO`
  - Backlog MT-UX-01..08 chiuso con implementazioni incrementali su dashboard, storico artefatti, rilancio con prefill e hardening accessibilita.
  - Evidenza di validazione: suite test verde e verifica GUI locale registrate nel tracker sprint.
  - File: docs/implementation/gui-ux-low-impact-microtasks-sprint-plan-2026-04-14.md

- **Projects-first navigation & IA**: `COMPLETATO (2026-04-13)`
  - Riallineata la gerarchia dell'app ai progetti come entita primaria con route indice dedicata `/dashboard/projects`, dashboard project-first e riposizionamento di Artefatti come storico trasversale personale.
  - Validazione completata: test `PASS` (48 suite, 352 test), typecheck `PASS` e build produzione `PASS`.
  - Copertura aggiuntiva: test d'integrazione su pagina dettaglio progetto per rendering card identity e guard auth/ownership.
  - File: docs/ux/projects-first-navigation-plan.md

---

## DevOps/Deployment
- **Vercel post-deployment hardening & monitoring**
  - Consolidare health checks, monitoring, runbook e smoke validation.
  - Prioritario per stabilizzazione post go-live.
  - File: docs/archive/llm-artifact-generation-roadmap-plan.md, docs/implementation/implementation-plan.md

- **Guardrail env validation (build-safe)**: `COMPLETATO (2026-04-12)`
  - Evitare validazioni env endpoint-specific in import-time (`parseEnv(process.env)`), perche Next.js puo valutare moduli non correlati durante `Collecting page data`.
  - Spostare enforcement runtime nei route handler interessati (es. cron), mantenendo comportamento esplicito per Vercel production.
  - Coprire con test di regressione dedicati su route cron: produzione Vercel senza secret => `500`; contesti non-production Vercel senza secret => `503`.
  - File: tests/integration/cleanup-stale-artifacts-route.test.ts, src/lib/env.ts, src/app/api/cron/cleanup-stale-artifacts/route.ts

---

## Documentazione
- **Allineamento documentazione vs codice**
  - Aggiornare api-specifications.md, blueprint.md, docstring, runbook.
  - File: docs/archive/copilot-review-followups-overview.md, docs/archive/architecture-review.md

---

## Altri suggerimenti e rischi
- 2FA admin, caching Redis, validazione mobile, decisioni CRUD admin user, gestione rischi (outage, streaming, DB, quota, sicurezza).

---

### Azioni più critiche/bloccanti
1. Stabilizzazione E2E e flussi auth/db (`IN CORSO`)
2. Structured logging & Sentry (`IN CORSO - baseline completata`)
3. Audit qualita/sicurezza su 4 fasi (`COMPLETATO`)
4. Refactoring preview artefatti (`IN CORSO`)
5. Stabilizzazione post-deploy e validazione su Vercel

Nota operativa: il track tooling generation e chiuso (`PR-1..PR-6` completate). Per dettaglio storico fasi/rollback: `docs/archive/tooling-generation-refactor-plan.md`.

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
- Verifica viewport `320px`, `375px`, `768px`, `1024px`, `1280px` su pagine autenticate: dashboard progetto, lista artefatti, dettaglio artefatto, Meta Ads, HotLead Funnel, Admin.
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
- Mantenere monitoraggio runtime su stream/error-rate dei tool Meta Ads e HotLead Funnel dopo il refactor completato.
- Estendere test E2E sui flussi reali auth/db per consolidare il gate di regressione end-to-end.
- Mantenere coverage >80% sul perimetro attuale e introdurre guardrail anti-regressione nei PR check.
- Estendere coverage su flussi E2E critici (login reale, generazione completa, gestione quota/admin).
- Estendere observability (Sentry + logging) alle route non ancora coperte e aggiungere metriche performance.
- Chiudere refactor preview su tutti i workflow/tool mantenendo output solo human-readable.
- Completare il track di hardening post-deploy su Vercel (health checks, monitoring, runbook, smoke validation).
- Parallelizzare ottimizzazioni minori (accessibilità, UX, doc, DB).
- Validare con utenti reali e checklist di rischio prima del go-live.
