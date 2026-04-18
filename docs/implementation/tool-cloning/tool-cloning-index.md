---
goal: Master Index - Navigation hub for entire tool cloning documentation library
version: 1.7
date_created: 2026-04-17
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, index, navigation]
---

# Tool Cloning Runbook: Master Index

Welcome to the comprehensive tool cloning documentation library. This index helps you navigate the atomized runbook modules and find what you need quickly.

---

## ⚠️ Gap Da Colmare Prima Del GO Documentazione

Prima di dichiarare la libreria docs "GO", chiudere questi gap minimi:

- [x] Creare user journey dedicato HLF: `docs/ux/funnel-pages-user-journey.md`
- [x] Creare UX replication checklist dedicata HLF: `docs/ux/funnel-pages-ux-replication-checklist.md`
- [x] Aggiungere E2E UX parity dedicati: `tests/e2e/funnel-pages-ux-parity.spec.ts` (keyboard-only, mobile 375px, zoom 200%, focus visibility)
- [x] Allineare Phase 3.6 all'as-is: rimuovere o correggere il riferimento a `src/app/api/tools/funnel-pages/checkpoint/route.ts` se non presente
- [x] Correggere il link mancante in Phase 3.7: `tool-cloning-phase-3-7-retry-implementation.md` (crearlo o sostituire il riferimento)
- [x] Allineare esempi selectors del runbook UX parity con il markup reale HLF (evitare selectors non presenti)

**GO Criteria**: la documentazione puo essere marcata GO solo quando tutti i checkbox sopra sono completati e verificabili in repository.

---

## 📖 Start Here

**New to tool cloning?** Begin with this 3-document sequence (20 min total):

1. [tool-cloning-overview.md](tool-cloning-overview.md) — **Intro & Roadmap** (5 min)
2. [tool-cloning-prerequisites.md](tool-cloning-prerequisites.md) — **Setup & Access** (10 min)
3. [tool-cloning-complexity-check.md](tool-cloning-complexity-check.md) — **Self-Assessment** (5 min)

**Then jump to the relevant path below based on your complexity tier.**

**For complex or very complex tools**: compile these preparation templates before coding:

- [tool-cloning-blueprint-template.md](tool-cloning-blueprint-template.md) — Technical blueprint file-by-file
- [tool-cloning-operational-checklist-template.md](tool-cloning-operational-checklist-template.md) — Minimal operating checklist during implementation

---

## 🎯 Quick Navigation by Complexity Tier

### 🟢 SIMPLE TOOLS (0 checkmark)

**Estimated Time**: 3-3.5 hours  
**Path**: Prerequisites → Anatomy → Phase 1 → Phase 2 → Phase 3 → Testing → Checklist

| Document | Purpose | Time |
|----------|---------|------|
| [tool-cloning-prerequisites.md](tool-cloning-prerequisites.md) | Setup, access, env vars | 10 min |
| [tool-cloning-anatomy.md](tool-cloning-anatomy.md) | File structure, naming | 15 min |
| [tool-cloning-phase-1-backend.md](tool-cloning-phase-1-backend.md) | Route + Schema | 30 min |
| [tool-cloning-phase-2-prompts.md](tool-cloning-phase-2-prompts.md) | Prompt builder | 45 min |
| [tool-cloning-phase-3-frontend.md](tool-cloning-phase-3-frontend.md) | UI page | 45 min |
| [tool-cloning-phase-3-5-ux-guide.md](tool-cloning-phase-3-5-ux-guide.md) | UX parity, testing | 45 min |
| [tool-cloning-testing-strategy.md](tool-cloning-testing-strategy.md) | Integration, unit, E2E | 30 min |
| [tool-cloning-conformity-checklist.md](tool-cloning-conformity-checklist.md) | DoD validation | 30 min |

---

### 🟡 MODERATE COMPLEXITY (1-2 checkmark)

**Estimated Time**: 4-5 hours  
**Path**: Prerequisites → Anatomy → Complexity Check → Phase 1 → Phase 2 → Phase 2.5 (if extraction) → Phase 3 → Phase 3.5 → Testing → Checklist

| Document | Tier | Purpose |
|----------|------|---------|
| [tool-cloning-prerequisites.md](tool-cloning-prerequisites.md) | Base | Setup |
| [tool-cloning-anatomy.md](tool-cloning-anatomy.md) | Base | File structure |
| [tool-cloning-complexity-check.md](tool-cloning-complexity-check.md) | Base | Assessment |
| [tool-cloning-phase-1-backend.md](tool-cloning-phase-1-backend.md) | Base | Route + Schema |
| [tool-cloning-phase-2-prompts.md](tool-cloning-phase-2-prompts.md) | Base | Prompt builder |
| [tool-cloning-phase-2-5-extraction.md](tool-cloning-phase-2-5-extraction.md) | Optional | File upload + extract |
| [tool-cloning-phase-3-frontend.md](tool-cloning-phase-3-frontend.md) | Base | UI page |
| [tool-cloning-phase-3-5-ux-guide.md](tool-cloning-phase-3-5-ux-guide.md) | Base | UX parity |
| [tool-cloning-testing-strategy.md](tool-cloning-testing-strategy.md) | Extended | Testing |
| [tool-cloning-conformity-checklist.md](tool-cloning-conformity-checklist.md) | Base | DoD |

**Note**: Study HLF source code alongside these docs. Case study patterns are essential.

---

### 🔴 COMPLEX TOOLS (3-5 checkmark)

**Estimated Time**: 6-8 hours  
**⚠️ REQUIRED**: Contact Architecture Team before starting

| Document | Tier | Purpose |
|----------|------|---------|
| [tool-cloning-prerequisites.md](tool-cloning-prerequisites.md) | Base | Setup |
| [tool-cloning-anatomy.md](tool-cloning-anatomy.md) | Base | File structure |
| [tool-cloning-complexity-check.md](tool-cloning-complexity-check.md) | Base | Assessment (will show 🔴 COMPLEX) |
| [tool-cloning-go-no-go-assessment.md](tool-cloning-go-no-go-assessment.md) | Base | Read gap analysis section |
| **Architecture Team consultation** | ⚠️ **Required** | Planning advanced patterns |
| [tool-cloning-phase-1-backend.md](tool-cloning-phase-1-backend.md) | Base | Route + Schema |
| [tool-cloning-phase-2-prompts.md](tool-cloning-phase-2-prompts.md) | Base | Prompt builder |
| [tool-cloning-phase-2-5-extraction.md](tool-cloning-phase-2-5-extraction.md) | Required | File upload + extract |
| [tool-cloning-phase-3-frontend.md](tool-cloning-phase-3-frontend.md) | Base | UI page |
| [tool-cloning-phase-3-5-ux-guide.md](tool-cloning-phase-3-5-ux-guide.md) | Required | UX parity |
| [tool-cloning-phase-3-6-checkpoint.md](tool-cloning-phase-3-6-checkpoint.md) | Required | Checkpoint & recovery |
| [tool-cloning-phase-3-7-retry.md](tool-cloning-phase-3-7-retry.md) | Required | Retry with backoff |
| [tool-cloning-testing-strategy.md](tool-cloning-testing-strategy.md) | Extended | Advanced testing |
| [tool-cloning-conformity-checklist.md](tool-cloning-conformity-checklist.md) | Extended | Full DoD |
| [tool-cloning-go-no-go-assessment.md](tool-cloning-go-no-go-assessment.md) | Base | Framework validity confirm |

---

### 🔴 VERY COMPLEX (6+ checkmark)

**Estimated Time**: 8-12+ hours  
**⚠️ BLOCKING**: Contact Architecture Team immediately

- Do NOT proceed without specialized guidance
- May require framework extensions
- Consider if tool should be simplified or slated for later

---

## 📚 Full Document Library

### Orientation & Planning

| Document | Purpose | For |
|----------|---------|-----|
| [tool-cloning-overview.md](tool-cloning-overview.md) | Intro, v1.1 highlights, usage flow | Everyone, first |
| [tool-cloning-prerequisites.md](tool-cloning-prerequisites.md) | Setup, access, env validation | Everyone, early |
| [tool-cloning-anatomy.md](tool-cloning-anatomy.md) | File structure, naming conventions | Everyone, before code |
| [tool-cloning-complexity-check.md](tool-cloning-complexity-check.md) | Self-assessment questionnaire, scoring, tier classification | Everyone, before starting |

---

### Preparation Templates

| Document | Purpose | When |
|----------|---------|------|
| [tool-cloning-blueprint-template.md](tool-cloning-blueprint-template.md) | Planning file-by-file from a reference implementation | Before implementation of complex tools |
| [tool-cloning-operational-checklist-template.md](tool-cloning-operational-checklist-template.md) | Minimal guardrail checklist to avoid HLF pattern drift | During implementation and review |

---

### Implementation Phases

| Document | Phase | Purpose | When |
|----------|-------|---------|------|
| [tool-cloning-phase-1-backend.md](tool-cloning-phase-1-backend.md) | 1 | Route handler + Zod schema | Always, first phase |
| [tool-cloning-phase-2-prompts.md](tool-cloning-phase-2-prompts.md) | 2 | Prompt builder + markdown | Always, second phase |
| [tool-cloning-phase-2-5-extraction.md](tool-cloning-phase-2-5-extraction.md) | 2.5 | File upload + extraction (optional) | If tool has upload |
| [tool-cloning-phase-3-frontend.md](tool-cloning-phase-3-frontend.md) | 3 | UI page + form | Always, third phase |
| [tool-cloning-phase-3-5-ux-guide.md](tool-cloning-phase-3-5-ux-guide.md) | 3.5 | UX replicability + testing | Always, critical for parity |
| [tool-cloning-phase-3-6-checkpoint.md](tool-cloning-phase-3-6-checkpoint.md) | 3.6 | Checkpoint & recovery (optional) | If tool has recovery |
| [tool-cloning-phase-3-7-retry.md](tool-cloning-phase-3-7-retry.md) | 3.7 | Retry with backoff (optional) | If tool has retry |

---

### Quality & Validation

| Document | Purpose | When |
|----------|---------|------|
| [tool-cloning-testing-strategy.md](tool-cloning-testing-strategy.md) | Integration, unit, E2E testing | After Phase 3 |
| [tool-cloning-conformity-checklist.md](tool-cloning-conformity-checklist.md) | Pre-PR validation, Definition of Done | Before submitting PR |
| [tool-cloning-go-no-go-assessment.md](tool-cloning-go-no-go-assessment.md) | Framework validity analysis | For complex tools, gate decision |

---

### Support & Troubleshooting

| Document | Purpose |
|----------|---------|
| [tool-cloning-troubleshooting.md](tool-cloning-troubleshooting.md) | FAQ, common issues, solutions |

---

### Additional Completed Resources

| Document | Purpose |
|----------|---------|
| [tool-cloning-spike-research-closure-2026-04-17.md](tool-cloning-spike-research-closure-2026-04-17.md) | Spike closure evidence, alignment verification, and final completion status |

---

### Prepared Tool Instances (Templates vuoti)

| Document | Purpose |
|----------|--------|
| [tool-cloning-blueprint-template.md](tool-cloning-blueprint-template.md) | Template vuoto per blueprint tecnico di un nuovo tool clone |
| [tool-cloning-operational-checklist-template.md](tool-cloning-operational-checklist-template.md) | Template vuoto per checklist operativa di un nuovo tool clone |

---

### Implemented Tool Instances (Riferimento demo implementate)

| Document | Tool | Status | Purpose |
|----------|------|--------|---------|
| [tool-cloning-nextland-blueprint.md](tool-cloning-nextland-blueprint.md) | NextLand | Implemented | Blueprint tecnico — riferimento per demo clonate da HLF |
| [tool-cloning-nextland-operational-checklist.md](tool-cloning-nextland-operational-checklist.md) | NextLand | Implemented | Checklist operativa — riferimento per demo clonate da HLF |

---

## 🔧 Framework Optimization Opportunities (Post NextLand Cycle)

Validated after full NextLand cloning cycle completion:

- [x] Consolidate shared E2E base mocks into helper modules to reduce duplication and setup drift across tool suites
- [x] Enforce deterministic E2E readiness waits for prerequisite UI state (for example, model availability before upload/extraction)
- [x] Keep prepared tool docs explicitly as-is (implemented vs planned) to avoid mixed-status ambiguity
- [ ] Add a small regression matrix template for clone parity (backend, prompts, UX parity, resume/retry) reusable across future tools
- [ ] Add a compact "targeted vs full gate" evidence table in each prepared tool checklist to standardize closure quality

---

## 🔗 External References (Keep Bookmarked)

| Document | Location | Why |
|----------|----------|-----|
| Graphic Frameworking Spec | [docs/specifications/graphic-frameworking-spec.md](../../specifications/graphic-frameworking-spec.md) | CSS classes, design system |
| Tool Routes Guardrails | [.github/instructions/tool-routes.instructions.md](../../../.github/instructions/tool-routes.instructions.md) | Auth/rate limit pattern |
| Tool Prompts Pattern | [.github/instructions/tool-prompts.instructions.md](../../../.github/instructions/tool-prompts.instructions.md) | Prompt builder strategy |
| API Specifications | [docs/specifications/api-specifications.md](../../specifications/api-specifications.md#tool-specific-generation) | Error codes, SSE contract |
| HLF Reference | [src/app/tools/funnel-pages/page.tsx](../../../src/app/tools/funnel-pages/page.tsx) | Working implementation |
| Accessibility Guidelines | [docs/accessibility/accessibility.md](../../accessibility/accessibility.md) | WCAG AA requirements |
| UX Strategy | [docs/ux/ux-strategy.md](../../ux/ux-strategy.md) | Higher-level design direction |

---

## 🎓 Learning Paths

### Path A: "I have 2 hours, want quick win"
1. Read [tool-cloning-overview.md](tool-cloning-overview.md) (5 min)
2. Skim [tool-cloning-complexity-check.md](tool-cloning-complexity-check.md) (5 min)
3. If SIMPLE: Jump to [tool-cloning-phase-1-backend.md](tool-cloning-phase-1-backend.md)
4. Code for ~1.5 hours
5. Validate with [tool-cloning-conformity-checklist.md](tool-cloning-conformity-checklist.md)

---

### Path B: "I want comprehensive understanding"
Follow the full document sequence in order:
1. Overview → Prerequisites → Anatomy → Complexity Check
2. All Phase documents (in sequence)
3. Testing → Conformity → Go/No-Go

**Expected time**: 2-3 hours reading, then implement.

---

### Path C: "I'm stuck, need help"
1. Check [tool-cloning-troubleshooting.md](tool-cloning-troubleshooting.md)
2. Review [tool-cloning-go-no-go-assessment.md](tool-cloning-go-no-go-assessment.md) gap analysis
3. Consult relevant reference docs (graphic-frameworking, tool-routes, etc.)
4. If still blocked: Contact Architecture Team

---

## 📊 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.6 | 2026-04-18 | Added post-NextLand framework optimization opportunities and aligned prepared instance descriptions to implemented as-is status |
| 1.5 | 2026-04-18 | Added reusable blueprint and operational checklist templates for future tool cloning preparation |
| 1.1 | 2026-04-17 | Added Phase 3.5 UX Replicability, expanded testing, atomized into library |
| 1.0 | 2026-04-10 | Initial monolithic runbook |

---

## 🚀 Ready to Clone?

1. **Assess**: Complete [tool-cloning-complexity-check.md](tool-cloning-complexity-check.md)
2. **Plan**: Select your path from the tiers above
3. **Implement**: Follow the phase sequence for your tier
4. **Validate**: Use [tool-cloning-conformity-checklist.md](tool-cloning-conformity-checklist.md)
5. **Ship**: Submit PR with Conventional Commits format

---

## 📞 Support

- **Questions about a phase?** Read the relevant phase document
- **Stuck on a problem?** See [tool-cloning-troubleshooting.md](tool-cloning-troubleshooting.md)
- **Framework limitations?** Read [tool-cloning-go-no-go-assessment.md](tool-cloning-go-no-go-assessment.md)
- **Complex tool concerns?** Contact Architecture Team

---

**Last Updated**: 2026-04-18  
**Maintainer**: Federico  
**Status**: Production-ready, atomized library
