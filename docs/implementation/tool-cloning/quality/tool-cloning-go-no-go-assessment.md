---
goal: GO/NO-GO Assessment - Framework validity for tool complexity tiers
version: 1.2
date_created: 2026-04-17
date_updated: 2026-04-18
status: Historical Snapshot
tags: [runbook, tool-cloning, go-no-go-assessment, framework-validity]
---

# GO/NO-GO Assessment: Runbook Framework Validity

**Data Assessment**: 2026-04-17  
**Scope**: Capacità del runbook di guidare clonazione tool **con complessità comparabile o superiore** a HotLeadFunnel

> ⚠️ Nota storica (2026-04-18): questo documento fotografa una valutazione pre-allineamento completo ADR 004.
> Per decisioni correnti usare [tool-cloning-index.md](/docs/implementation/tool-cloning/tool-cloning-index.md), [tool-cloning-complexity-check.md](/docs/implementation/tool-cloning/core/tool-cloning-complexity-check.md) e [docs/adrs/004-tool-pages-composable-architecture.md](/docs/adrs/004-tool-pages-composable-architecture.md).

## Stato Corrente (As-Is)

| Categoria Tool | Applicabilità Runbook Corrente | Decisione Operativa |
|---|---|---|
| **Simple** | ✅ Alta | 🟢 GO |
| **Moderate** | ✅ Alta | 🟢 GO |
| **Complex** | ✅ Supportata con percorso completo | 🟢 GO con guardrail |
| **Very Complex** | ⚠️ Supportata parzialmente | 🟡 GO condizionato a Architecture Team |

---

## Verdict Sintetico

| Categoria Tool | Applicabilità Runbook | GO/NO GO | Tempo Reale |
|---|---|---|---|
| **Simple** (form → POST → output) | ✅ 100% | 🟢 **GO** | 3-3.5h |
| **Moderate** (form + preprocessing) | ⚠️ 60% | 🟡 **CONDITIONAL** | 4-5h |
| **Complex** (multi-step + state machine + recovery) | ❌ 20% | 🔴 **NO GO** | 6-8h |

**HotLeadFunnel Classification**: **Complex** (multi-step optin→quiz→vsl, extraction, state machine, checkpoint)

---

## STRENGTHS (Runbook è Valido Per)

### 1. Backend Pattern Solido ✅
- Sequenza auth → rate limit → validate → build → stream è corretta
- Zod schema approach è robusto e scalabile
- SSE streaming contract è standard
- Error handling è coerente

### 2. UX Replicability Framework ✅
- User journey extraction template è utile
- UX checklist multi-aspetto (form parity, keyboard, accessibility, responsive)
- E2E test patterns (Playwright) sono copiabili
- Accessibility baseline (WCAG AA) è non-negotiable

### 3. Testing Strategy ✅
- Integration tests coprono auth, ownership, validation, stream
- Unit tests su builder sono appropriati
- E2E UX tests validano layout e interazioni

---

## CRITICAL GAPS (NOT COVERED FOR COMPLEX TOOLS)

### A. Multi-Step Orchestration ✗

**Mancanze**:
- Orchestrazione sequenziale (step dependency, output chaining)
- Passaggio di output intermedi tra step
- Partial failure recovery
- State machine per step transitions

**Impatto**: Developer deduce da HLF code senza guidance → **Rischio alto divergence**

---

### B. Preprocessing & Extraction Chain ✗

**Mancanze**:
- File upload route implementation
- Extraction preprocessing pipeline
- Async extraction with partial failure states
- Linking extraction output to generation request

**Impatto**: Tool non supporta file upload+extraction → **Impossibile replicare HLF**

---

### C. Stateful UI Phase Management ✗

**Mancanze**:
- Phase state machine design
- UI state derivation logic
- Primary action resolver (state → CTA)
- Intent-based initialization

**Impatto**: UI diventa "simple form → generate", perde recovery → **UX breaks for power users**

---

### D. Recovery & Checkpoint Logic ✗

**Mancanze**:
- Artifact discovery & recovery logic
- Checkpoint storage & retrieval
- Resume vs Regenerate intent
- State reconstruction

**Impatto**: Tool non supporta resume → **Friction; partial work lost**

---

### E. Retry Strategy with Backoff ⚠️

**Mancanze**:
- Retry decision logic (retryable vs permanent)
- Exponential backoff calculation
- Max retry attempts per step
- User feedback during retry
- Circuit breaker

**Impatto**: Fails on transient network errors → **Reduced reliability**

---

### F. Time Estimate Underestimated ⚠️

**Runbook claims**: 3-3.5 hours

**Reality per Complex Tools**:

| Phase | Simple | Complex | Delta |
|-------|--------|---------|-------|
| Route + Schema | 30 min | 45 min | +50% |
| Prompt + Builder | 45 min | 60 min | +33% |
| UI Page | 45 min | 120 min | +167% |
| UX + Testing | 60 min | 60 min | — |
| Testing (Adv) | 45 min | 90 min | +100% |
| **Total** | **3-3.5h** | **6-8h** | **+85%** |

---

## Applicability Matrix

| Tool Trait | Coverage | Grade | Go/No Go | Risk |
|---------|---|-----|----|---|
| Simple form → single generation | ✅ Full | A | 🟢 GO | Low |
| Multi-step orchestration | ✗ Not | F | 🔴 NO | 🔴 Critical |
| File upload + preprocessing | ⚠ Partial | D | 🟡 CONDITIONAL | 🔴 Critical |
| Stateful UI (5+ phases) | ✗ Template | F | 🔴 NO | 🔴 Critical |
| Resume/checkpoint | ✗ Not | F | 🔴 NO | ⚠️ High |
| Retry with backoff | ✗ Not | F | 🔴 NO | ⚠️ High |
| Backend auth/rate-limit | ✅ Full | A | 🟢 GO | Low |
| Prompt builder (static) | ✅ Full | A | 🟢 GO | Low |
| E2E UX testing | ✅ Good | B+ | 🟢 GO | Low |
| Accessibility (WCAG AA) | ✅ Full | A | 🟢 GO | Low |

---

## Final Verdict by Complexity Tier (Storico, pre-ADR 004)

### 🟢 GO — Simple Tools (Form-based, single-endpoint, no recovery)

- Applicabilità: 100%
- Tempo realistico: 3-3.5h
- Confidence: Alta
- Action storica: usare il runbook disponibile a quella data

---

### 🟡 CONDITIONAL GO — Moderate Complexity (Preprocessing OR multi-step, not both)

- Applicabilità: 60%
- Tempo realistico: 4-5h
- Confidence: Media
- Action storica: runbook core + case study HLF
- Risk: May need custom guidance on selected features

---

### 🔴 NO GO (Storico) — Complex Tools (Stateful, multi-step, recovery)

- Applicabilità: 20%
- Tempo realistico: 6-8h
- Confidence: Bassa
- Action: **Contact Architecture Team** before starting
- Required: Advanced runbook supplementary guide

---

### 🔴 VERY COMPLEX (6+ questionnaire SI')

- Applicabilità: <10%
- Tempo realistico: 8-12+ hours
- Confidence: Very Low
- Action: **Consult Architecture Team on framework extensions**
- May require specialized patterns

---

## Recommendations

### For Simple Tools
Indicazione storica: usare il runbook disponibile al momento dell'assessment.

### For Moderate Complexity Tools
1. Follow runbook core path (Phase 1, 2, 3)
2. Implement select optional phases (2.5 OR 3.6, not both)
3. Study HLF reference implementation for patterns
4. Budget 4-5h total

### For Complex Tools Like HLF
**Do NOT proceed without architecture guidance.**

Required supplementary guide covering:
- Multi-step orchestrator pattern
- Extraction preprocessing architecture
- UI state machine design & derivation logic
- Checkpoint & recovery strategy
- Retry with backoff implementation
- Advanced testing for state complexity

Nota storica: all'epoca era stata proposta una guida supplementare dedicata ai pattern avanzati.

### For Very Complex Tools
**Contact Architecture Team immediately.**

May require:
- Custom orchestrator patterns
- Advanced checkpoint recovery
- Dynamic routing logic
- Multi-model orchestration strategy
- Custom telemetry/analytics architecture
- Framework extensions

---

## Conclusion

Il runbook è **valido e utile per il 60% dei tool realistici**, ma **insufficiente per tool stateful come HLF**.

Non è un fallimento — è design corretto per mid-complexity scope. Per tools più avanzati, è fondamentale suddividere in runbook separati per complexity tier.

**The framework solves the right problem for its intended scope: simple-to-moderate-complexity tool cloning with UX parity guarantees.**

---

## Next Steps

1. Complete **[tool-cloning-complexity-check.md](/docs/implementation/tool-cloning/core/tool-cloning-complexity-check.md)** to classify your tool
2. Select appropriate path based on tier
3. If COMPLEX/VERY COMPLEX: Contact Architecture Team
4. Proceed with relevant phase sequence
