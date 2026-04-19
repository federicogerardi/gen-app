---
goal: Phase 3.6 (Opzionale) - Checkpoint e Recovery per tool complessi
version: 1.2
date_created: 2026-04-17
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, phase-3-6, checkpoint, optional]
---

# Phase 3.6: Checkpoint & Recovery (Opzionale)

Questa fase implementa **checkpoint persistence** e **recovery logic** per tool complessi che supportano resume da stato salvato.

**Se il tool NON supporta checkpoint/recovery**, salta questa phase.

---

## Una Nota su Checkpoint

Se il tool ha multi-step orchestration e vuoi supportare "ripartire da dove mi ero interrotto", implementa:

1. **Schema**: Zod schema per structure checkpoint data
2. **Storage Strategy**: route dedicata checkpoint OPPURE riuso endpoint artifacts esistenti
3. **UI Logic**: Prefill form da checkpoint su init
4. **State Derivation**: Deterministic `deriveUIState()` per ricostruire UI state

---

## Reference Documentazione

Per implementazione completa di checkpoint, consulta:

- [src/app/api/artifacts/route.ts](/src/app/api/artifacts/route.ts) (HLF usa artifacts come fonte checkpoint)
- [src/app/tools/funnel-pages/FunnelPagesToolContent.tsx](/src/app/tools/funnel-pages/FunnelPagesToolContent.tsx) (wiring resume intent, prefill e artifact-driven flow)
- [src/app/tools/funnel-pages/hooks/useFunnelRecovery.ts](/src/app/tools/funnel-pages/hooks/useFunnelRecovery.ts) (recovery logic dedicata)
- [tests/e2e/funnel-pages-retry-resume.spec.ts](/tests/e2e/funnel-pages-retry-resume.spec.ts) (coverage resume/checkpoint UI)
- [tool-cloning-go-no-go-assessment.md](/docs/implementation/tool-cloning/quality/tool-cloning-go-no-go-assessment.md) (Gap analysis section su checkpoint)

---

## If Tool è Very Complex (6+ questionnaire SI')

Contatta Architecture Team per guidance specializzato su checkpoint strategy.

---

## Next Step

Se il tool ha transient error scenarios, vai a **[tool-cloning-phase-3-7-retry.md](/docs/implementation/tool-cloning/phases/tool-cloning-phase-3-7-retry.md)**.

Altrimenti, vai a **[tool-cloning-testing-strategy.md](/docs/implementation/tool-cloning/quality/tool-cloning-testing-strategy.md)**.
