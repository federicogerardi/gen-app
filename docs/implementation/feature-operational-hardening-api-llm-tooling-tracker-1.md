---
goal: Operational tracker for API/LLM tooling hardening intervention
version: 1.0
date_created: 2026-04-15
last_updated: 2026-04-15
owner: Backend Platform
status: Planned
tags: [process, tracker, api, llm, hardening, reliability, tests]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Questo tracker e il companion operativo di `docs/implementation/feature-operational-hardening-api-llm-tooling-plan-1.md`.
Registra baseline, avanzamento, evidenze e criteri di chiusura del track.

## 1. Tracking Rules

- **TRK-001**: Un task passa a Completed solo con implementazione, test e aggiornamento documentale coerente.
- **TRK-002**: Preservare ordine guard route tool: auth -> validation -> ownership -> usage/rate-limit -> LLM call.
- **TRK-003**: Nessuna modifica breaking al contratto errori API `{ error: { code, message } }`.
- **TRK-004**: Ogni task Completed deve avere almeno una evidenza file-level nella sezione Evidence Register.
- **TRK-005**: Nessuna introduzione di runtime file loading nei path route/tool-prompts.

## 2. Baseline Snapshot (2026-04-15)

Status legend:
- Gap: non implementato o divergente dal piano.
- Partial: implementazione parziale con lacune su test o documentazione.
- Covered: implementato e validato.

### Phase 1 - Pre-stream error boundary hardening

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-001 | Gap | Prompt build in Meta Ads fuori dal perimetro di catch uniforme pre-stream. |
| TASK-002 | Gap | Prompt build in HotLead Funnel fuori dal perimetro di catch uniforme pre-stream. |
| TASK-003 | Partial | Contratto SSE successful stabile, ma non ancora coperto il ramo eccezione pre-stream con envelope standard. |

### Phase 2 - Extraction artifact lifecycle safety

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-004 | Gap | Possibile failure tra `artifact.create` e stream valido senza finalizzazione deterministica garantita su tutti i fault pre-stream. |
| TASK-005 | Gap | Assenza di gate esplicito single-finalize dedicato al ramo failure pre-stream. |
| TASK-006 | Partial | Runbook e terminal state presenti, ma non ancora consolidato il ramo pre-stream error in modo univoco. |

### Phase 3 - Reason taxonomy and API docs alignment

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-007 | Gap | Mapping reason ownership extraction non discriminante tra not found e forbidden. |
| TASK-008 | Gap | Sezione Common Error Codes API non include `CONFLICT` pur essendo usato a runtime. |
| TASK-009 | Gap | Nota review sorgente non ancora aggiornata con progress task-by-task. |

### Phase 4 - Regression test closure

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-010 | Gap | Manca test integration Meta Ads su prompt-builder throw pre-stream. |
| TASK-011 | Gap | Manca test integration HotLead Funnel su prompt-builder throw pre-stream. |
| TASK-012 | Gap | Manca test integration Extraction su failure pre-stream con verifica finalizzazione artifact. |
| TASK-013 | Gap | Validazione finale suite/test/typecheck/build non ancora registrata per questo track. |

## 3. Execution Log

- 2026-04-15: creato tracker operativo e baseline iniziale allineata al piano.
- 2026-04-15: collegato tracker agli indici documentali come attivita pianificata.
- 2026-04-15: hotfix `streamDeadlineMs` applicato a `funnel-pages/generate` dopo conferma root cause da runtime log Vercel (artifact status stuck `generating` su timeout hard 300s). Dettagli: `docs/review/operational-improvement-note-api-llm-tooling-2026-04-15.md § Hotfix Applicato`. Validazione: typecheck + jest target (23/23) + lint PASS.

## 4. Current Phase Status

### Phase 1

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-001 | Planned | 2026-04-15 |
| TASK-002 | Planned | 2026-04-15 |
| TASK-003 | Planned | 2026-04-15 |

### Phase 2

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-004 | Planned | 2026-04-15 |
| TASK-005 | Planned | 2026-04-15 |
| TASK-006 | Planned | 2026-04-15 |

### Phase 3

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-007 | Planned | 2026-04-15 |
| TASK-008 | Planned | 2026-04-15 |
| TASK-009 | Planned | 2026-04-15 |

### Phase 4

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-010 | Planned | 2026-04-15 |
| TASK-011 | Planned | 2026-04-15 |
| TASK-012 | Planned | 2026-04-15 |
| TASK-013 | Planned | 2026-04-15 |

## 5. Evidence Register

- **EVID-001**: piano hardening creato in `docs/implementation/feature-operational-hardening-api-llm-tooling-plan-1.md`.
- **EVID-002**: nota improvement sorgente in `docs/review/operational-improvement-note-api-llm-tooling-2026-04-15.md`.
- **EVID-003**: indice operativo aggiornato in `docs/implement-index.md`.
- **EVID-004**: indice docs aggiornato in `docs/README.md`.
- **EVID-005**: hotfix `streamDeadlineMs` applicato — `src/lib/llm/streaming.ts` + `src/app/api/tools/funnel-pages/generate/route.ts` + test aggiornati. Sezione `§ Hotfix Applicato` in EVID-002. Root cause confermata da log runtime Vercel produzione.

## 6. Exit Criteria

- **EXIT-001**: Tutti i task `TASK-001..TASK-013` marcati Completed con evidenza file-level e data.
- **EXIT-002**: Test integration aggiuntivi su pre-stream failure PASS.
- **EXIT-003**: Validazione complessiva `npm run test`, `npm run typecheck`, `npm run build` PASS.
- **EXIT-004**: Documentazione API e review note allineate allo stato runtime finale.

## 7. Related Documents

- docs/implementation/feature-operational-hardening-api-llm-tooling-plan-1.md
- docs/review/operational-improvement-note-api-llm-tooling-2026-04-15.md
- docs/implement-index.md
- docs/specifications/api-specifications.md
