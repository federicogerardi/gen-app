---
goal: Chiusura spike di verifica allineamento della libreria tool-cloning al codice as-is
version: 1.0
date_created: 2026-04-17
date_updated: 2026-04-17
status: Completed
tags: [runbook, tool-cloning, spike, research, closure]
---

# Tool Cloning Runbook: Spike Research Closure (2026-04-17)

## Status

- Spike: COMPLETED
- Completed on: 2026-04-17
- Scope reviewed: runbook tool-cloning + reference source code and tests

---

## Goal

Verificare che la libreria in `docs/implementation/tool-cloning/` sia coerente con lo stato reale del repository e identificare eventuali delta tecnici bloccanti.

---

## Coverage Summary

File runbook verificati:
- `tool-cloning-index.md`
- `tool-cloning-overview.md`
- `tool-cloning-prerequisites.md`
- `tool-cloning-anatomy.md`
- `tool-cloning-complexity-check.md`
- `tool-cloning-phase-1-backend.md`
- `tool-cloning-phase-2-prompts.md`
- `tool-cloning-phase-2-5-extraction.md`
- `tool-cloning-phase-3-frontend.md`
- `tool-cloning-phase-3-5-ux-guide.md`
- `tool-cloning-phase-3-6-checkpoint.md`
- `tool-cloning-phase-3-7-retry.md`
- `tool-cloning-testing-strategy.md`
- `tool-cloning-conformity-checklist.md`

Sorgenti di riferimento verificati:
- `src/app/tools/funnel-pages/page.tsx`
- `tests/e2e/funnel-pages-ux-parity.spec.ts`
- `src/lib/tool-routes/guards.ts`
- `src/lib/llm/streaming.ts`

---

## Findings

1. Libreria runbook sostanzialmente allineata al codice as-is.
2. Tutti i gap marcati nell'index risultano chiusi e verificabili in repository.
3. Selector UX parity confermati nel markup reale HLF (`app-surface`, `app-rise`, `app-control`, `app-title`, `data-primary-action="true"`).
4. Guardrail backend confermati nei riferimenti (`auth`, `ownership`, `rate limit before LLM`, validazione).
5. Delta tecnico individuato e poi corretto: rimozione riferimento a modulo inesistente `@/lib/template-utils` dal template della fase prompt.

---

## Outcome

- Stato complessivo: **GO documentazione** per la libreria tool-cloning.
- Azione di follow-up completata: correzione del template in `tool-cloning-phase-2-prompts.md` per allineamento al pattern reale.

---

## Notes

Questa risorsa consolida la chiusura dello spike come riferimento storico interno alla libreria tool-cloning.
