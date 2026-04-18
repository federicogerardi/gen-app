---
goal: Introduzione, stato versione, e referenze rapide al runbook di clonazione tool
version: 1.3
date_created: 2026-04-17
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, overview, introduction]
---

# Tool Cloning Runbook: Panoramica

**Versione**: 1.3 (As-is modulare ADR 004 allineato)  
**Data creazione**: 2026-04-17  
**Ultimo aggiornamento**: 2026-04-18  
**Scope**: Clonare HotLeadFunnel con variazioni mantenendo **95%+ conformità** a linee guida grafiche, API, prompt, **e replicabilità UX**  
**Audience**: Developer che replicano HLF per nuovo tool con workflow diverso

---

## Novità Storiche in v1.1

**Aggiunto contributo completo sulla UX Replicability** (Phase 3.5):
- ✅ User Journey extraction e documentazione da HLF reference
- ✅ UX Replication Checklist multi-aspetto (layout, form components, accessibility, interactions)
- ✅ Interaction Parity Testing con Playwright E2E
- ✅ UX Consistency Guard Rails (design principles, accessibility, tone, responsive, performance)
- ✅ UX Testing Checklist prima di PR review
- ✅ Expanded DoD (Definition of Done) con dimensione UX

**Beneficio**: Tool clones non solo replicano API/design visivo, ma mantengono **identica esperienza utente** (journey, interazioni, accessibilità, reattività).

**Tempo stimato** aggiornato: 3-3.5 ore (vs 2.5-3 ore) — l'extra 30 minuti è tempo di UX validation che aumenta confidence sulla replicabilità end-to-end.

---

## Come Usare Questo Runbook

Il runbook è suddiviso in moduli atomici, sequenziali:

1. **[tool-cloning-prerequisites.md](/docs/implementation/tool-cloning/core/tool-cloning-prerequisites.md)** — Pre-requisiti, setup iniziale, accesso ai documenti di riferimento
2. **[tool-cloning-anatomy.md](/docs/implementation/tool-cloning/core/tool-cloning-anatomy.md)** — File structure minima richiesta, naming conventions
3. **[tool-cloning-complexity-check.md](/docs/implementation/tool-cloning/core/tool-cloning-complexity-check.md)** — Auto-classificazione tool tier (Simple/Moderate/Complex) e stima tempo
4. **[tool-cloning-phase-1-backend.md](/docs/implementation/tool-cloning/phases/tool-cloning-phase-1-backend.md)** — Phase 1: Route handler + Zod schema
5. **[tool-cloning-phase-2-prompts.md](/docs/implementation/tool-cloning/phases/tool-cloning-phase-2-prompts.md)** — Phase 2: Prompt builder + markdown sorgente
6. **[tool-cloning-phase-2-5-extraction.md](/docs/implementation/tool-cloning/phases/tool-cloning-phase-2-5-extraction.md)** — Phase 2.5 (opzionale): File upload + preprocessing
7. **[tool-cloning-phase-3-frontend.md](/docs/implementation/tool-cloning/phases/tool-cloning-phase-3-frontend.md)** — Phase 3: UI page, state management
8. **[tool-cloning-phase-3-5-ux-guide.md](/docs/implementation/tool-cloning/phases/tool-cloning-phase-3-5-ux-guide.md)** — Phase 3.5: UX replicability, user journey, interaction parity
9. **[tool-cloning-phase-3-6-checkpoint.md](/docs/implementation/tool-cloning/phases/tool-cloning-phase-3-6-checkpoint.md)** — Phase 3.6 (opzionale): Checkpoint & recovery
10. **[tool-cloning-phase-3-7-retry.md](/docs/implementation/tool-cloning/phases/tool-cloning-phase-3-7-retry.md)** — Phase 3.7 (opzionale): Retry con backoff
11. **[tool-cloning-testing-strategy.md](/docs/implementation/tool-cloning/quality/tool-cloning-testing-strategy.md)** — Testing: integration, unit, E2E
12. **[tool-cloning-conformity-checklist.md](/docs/implementation/tool-cloning/quality/tool-cloning-conformity-checklist.md)** — Checklist finale pre-PR, Definition of Done
13. **[tool-cloning-troubleshooting.md](/docs/implementation/tool-cloning/quality/tool-cloning-troubleshooting.md)** — FAQ comuni, error resolution
14. **[tool-cloning-go-no-go-assessment.md](/docs/implementation/tool-cloning/quality/tool-cloning-go-no-go-assessment.md)** — Framework validity analysis, applicability per complexity tier

---

## Flusso Rapido: Quale Documento Leggere?

**Se è la prima volta**: 
1. Leggi **[tool-cloning-prerequisites.md](/docs/implementation/tool-cloning/core/tool-cloning-prerequisites.md)** (10 min)
2. Leggi **[tool-cloning-complexity-check.md](/docs/implementation/tool-cloning/core/tool-cloning-complexity-check.md)** (5 min) — valuta il tuo tool
3. Se il tool è complex o very complex, compila **[tool-cloning-blueprint-template.md](/docs/implementation/tool-cloning/templates/tool-cloning-blueprint-template.md)**
4. Usa **[tool-cloning-operational-checklist-template.md](/docs/implementation/tool-cloning/templates/tool-cloning-operational-checklist-template.md)** come guardrail durante il lavoro
5. Salta ai docs di phase appropriati (vedi "Percorso per Complexity Tier" sotto)

**Se conosci il framework**:
- Vai diretto a **[tool-cloning-complexity-check.md](/docs/implementation/tool-cloning/core/tool-cloning-complexity-check.md)** per auto-classificare
- Se il tool è complesso, compila prima il blueprint template e poi seleziona i phase doc appropriati

---

## Percorso per Complexity Tier

### 🟢 Simple Tools (0 checkmark nel questionnaire)
**Tempo**: 3-3.5 ore  
**Path**: Prerequisites → Anatomy → Phase 1, 2 → Phase 3 → Testing → Conformity Checklist

**Esempi**: Blog post generator, product description, meta description, single-input → single-output flows

### 🟡 Moderate Tools (1-2 checkmark)
**Tempo**: 4-5 ore  
**Path**: Prerequisites → Anatomy → Complexity Check → Phase 1, 2, (2.5 if needed) → Phase 3, 3.5 → Testing → Conformity Checklist

**Esempi**: Long-form content con reviewer step, multi-tone variations, preprocessing semplice

### 🔴 Complex Tools (3-5 checkmark)
**Tempo**: 6-8 ore  
**Path**: TUTTI i phase (1-3) + Phase 2.5, 3.5, 3.6, 3.7 + Advanced Testing → Conformity Checklist → GO/NO-GO Assessment

**Esempi**: HotLeadFunnel, multi-step sales flows, extraction-based tools, state machine UI

### 🔴 Very Complex Tools (6+ checkmark)
**Tempo**: 8-12+ ore  
**Path**: Consulta Architecture Team — potrebbe richiedere extensions al framework

---

## Struttura Generale del Runbook

```
Fase Setup (Prerequisites + Anatomy)
  ↓
Phase 1: Backend (Route + Schema)
  ↓
Phase 2: Prompts (Builder + Markdown sorgente)
  ↓
Phase 2.5: Extraction (Opzionale se file upload)
  ↓
Phase 3: Frontend (UI Page)
  ↓
Phase 3.5: UX Replicability (User journey, checklist, E2E)
  ↓
Phase 3.6: Checkpoint (Opzionale se recovery needed)
  ↓
Phase 3.7: Retry (Opzionale se backoff needed)
  ↓
Testing (Integration, Unit, E2E)
  ↓
Conformity Checklist (DoD)
  ↓
GO/NO GO Assessment (per complex tools)
```

---

## Principi Fondamentali

1. **As-is Prima del Legacy** — Il runbook segue l'architettura composable corrente (ADR 004): `page.tsx` wrapper + `ToolContent` + hooks/componenti dedicati.
2. **Sequenziale Obbligatorio** — Completa le phase nell'ordine: 1 → 2 → 3 → Testing
3. **Complexity-First** — Classifica il tool PRIMA di partire. La stima tempo dipende da questa auto-assessment.
4. **UX è Conformità** — Non basta API corretto; UX deve replicare HLF identicamente (layout, interazioni, accessibility, tone).
5. **Atomic Documentation** — Ogni file copre una fase coerente, testabile, con prerequisiti chiari.

---

## Reference Rapide

| Documento | Scopo | Link |
|-----------|-------|------|
| Graphic Framework | CSS classes obbligatorie | [docs/specifications/graphic-frameworking-spec.md](/docs/specifications/graphic-frameworking-spec.md) |
| Tool Routes | Pattern auth/rate limit | [.github/instructions/tool-routes.instructions.md](/.github/instructions/tool-routes.instructions.md) |
| Tool Prompts | Template strategy | [.github/instructions/tool-prompts.instructions.md](/.github/instructions/tool-prompts.instructions.md) |
| API Specs | Error codes + SSE | [docs/specifications/api-specifications.md](/docs/specifications/api-specifications.md#tool-specific-generation) |
| HLF Reference (wrapper) | Entry page | [src/app/tools/funnel-pages/page.tsx](/src/app/tools/funnel-pages/page.tsx) |
| HLF Reference (main UI) | Container e orchestration UI | [src/app/tools/funnel-pages/FunnelPagesToolContent.tsx](/src/app/tools/funnel-pages/FunnelPagesToolContent.tsx) |
| Blueprint Template | Piano tecnico file-by-file | [tool-cloning-blueprint-template.md](/docs/implementation/tool-cloning/templates/tool-cloning-blueprint-template.md) |
| Operational Checklist Template | Guardrail minimo implementativo | [tool-cloning-operational-checklist-template.md](/docs/implementation/tool-cloning/templates/tool-cloning-operational-checklist-template.md) |
| UX Strategy | Higher-level design direction | [docs/ux/ux-strategy.md](/docs/ux/ux-strategy.md) |
| Accessibility | WCAG AA requirements | [docs/accessibility/accessibility.md](/docs/accessibility/accessibility.md) |

---

## Next Step

👉 Leggi **[tool-cloning-prerequisites.md](/docs/implementation/tool-cloning/core/tool-cloning-prerequisites.md)** per iniziare.
