---
goal: Auto-classificazione tool per complexity tier (planning + stima tempo)
version: 1.2
date_created: 2026-04-17
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, complexity-check, planning, assessment]
---

# Complexity Assessment Questionnaire

**PRIMA DI INIZIARE A CLONARE**, completa questo questionnaire per auto-classificare il tool e stimare correttamente tempo + ambito.

> ⚠️ Aggiornamento ADR 004 (2026-04-18): per i tool stateful usare il percorso composable completo (Phase 3 + 3.5 + 3.6 + 3.7 + testing esteso), non il vecchio pattern monolitico.

---

## Quick Diagnostic Tool

Rispondi alle seguenti domande con **SI'** o **NO**:

| # | Domanda | SI' | NO | Note |
|---|---------|-----|----|----|
| 1 | Tool ha **multi-step workflow**? (es. optin → quiz → vsl, step1 output → step2 input) | [ ] | [ ] | Multi-step significa output di un passo alimenta il successivo |
| 2 | Tool richiede **preprocessing/estrazione** da file? (es. upload .txt → extract context) | [ ] | [ ] | Deve caricare file e preprocessarlo prima della generazione |
| 3 | Tool ha **state machine UI** con 5+ stati? (es. idle, uploading, extracting, generating, completed) | [ ] | [ ] | Prova a elencare tutti i "phase" UI: se >5, è complex |
| 4 | Tool supporta **resume/checkpoint recovery**? (es. user può ripartire da artifact precedente) | [ ] | [ ] | Salva e ricupera stato tra sessioni |
| 5 | Tool ha **retry logic con backoff**? (es. transient error → attendi e riprova) | [ ] | [ ] | Gestione intelligente di errori temporanei |
| 6 | Tool richiede **accounting/quota per step**? (es. cost tracking variabile per ogni step) | [ ] | [ ] | Non solo costo totale, ma cost per step |
| 7 | Tool ha **custom error recovery UI**? (es. "Riprova step 3?", partial state prefill) | [ ] | [ ] | UX specifica per recupero errore |
| 8 | Tool utilizza **multiple LLM models** in parallelo o sequenziale? (es. model1 step1, model2 step2) | [ ] | [ ] | Orchestrazione multi-model |

---

## Scoring & Classification

**Conta i SI' nella tabella sopra:**

```
0 SI':  🟢 SIMPLE TOOL          Runbook corrente → 3-3.5h
        Esempi: blog post generator, product description tool, meta description tool
        
1-2 SI': 🟡 MODERATE TOOL       Runbook corrente + case study → 4-5h
        Esempi: long-form content with reviewer step, multi-tone variations
        
3-5 SI': 🔴 COMPLEX TOOL        Percorso composable completo → 6-8h
        Esempi: HotLeadFunnel, multi-step sales flows, extraction-based tools
        
6+ SI': 🔴 VERY COMPLEX TOOL    Composable + arch guidance richiesta → 8-12h+
        Esempi: custom agent workflows, dynamic step routing, complex state
```

---

## Self-Assessment Example: HotLeadFunnel

| # | Domanda | Risposta | Evidenza |
|---|---------|----------|----------|
| 1 | Multi-step workflow? | ✅ SI' | optin → quiz → vsl (3 steps sequenziali) |
| 2 | Preprocessing/extraction? | ✅ SI' | upload file → extract business context |
| 3 | State machine UI 5+ stati? | ✅ SI' | idle, uploading, extracting, review, generating, completed, error (7 stati) |
| 4 | Resume/checkpoint recovery? | ✅ SI' | handleResumeFromArtifacts(), prefill da checkpoint |
| 5 | Retry logic con backoff? | ✅ SI' | withRetry wrapper, exponential backoff |
| 6 | Accounting/quota per step? | ⚠️ Parziale | Cost tracking globale, non per step |
| 7 | Custom error recovery UI? | ✅ SI' | "Riprova generazione", prefill step precedenti |
| 8 | Multi-model orchestration? | ❌ NO | Usa GPT-4-turbo per tutti i step |

**Total SI'**: 6.5 / 8 → **🔴 VERY COMPLEX TOOL** → **Composable path + architecture guidance (8-12h)**

---

## How to Use This Assessment

**Step 1**: Completa il questionnaire con il product owner / tech lead  
**Step 2**: Conta i SI'  
**Step 3**: Scegli runbook e tempo di stima appropriato  
**Step 4**: Traccia il link a questa assessment nel PR come proof-of-planning  

**PR Template Excerpt**:
```markdown
## Planning & Assessment

- Tool Complexity Tier: [🟢 Simple / 🟡 Moderate / 🔴 Complex]
- Complexity Assessment: [Link a questo doc sezione risultati]
- Estimated Time: [3-3.5h / 4-5h / 6-8h]
- Runbook Path: [core / core+case / composable completo]
```

---

## Detailed Scoring Breakdown

### 🟢 SIMPLE TOOLS (0 SI')

**Characteristics**:
- Single-endpoint POST generation
- No file upload or preprocessing
- No recovery/checkpoint logic
- Simple binary state (idle vs running)
- No retry with backoff (basic error handling OK)
- Single model, no orchestration

**Estimated Time**: 3-3.5 hours  
**Example Tools**: Blog generator, product description, email subject lines, meta descriptions

**Runbook Path**:
1. Prerequisites & Anatomy
2. Phase 1: Route + Schema
3. Phase 2: Prompt builder
4. Phase 3: Frontend UI
5. Testing (basic)
6. Conformity Checklist

---

### 🟡 MODERATE TOOLS (1-2 SI')

**Characteristics**:
- Either preprocessing OR multi-step (not both)
- Extract context from simple file upload OR sequential steps with limited dependencies
- Basic recovery or toast-based error state
- Moderate state complexity (4-5 UI states)
- Optional: transaction-level retry

**Estimated Time**: 4-5 hours  
**Example Tools**: Content generator with tone variations, email sequence with multi-variant steps, simple extraction-based tools

**Runbook Path**:
1. Prerequisites & Anatomy
2. Phase 1: Route + Schema
3. Phase 2: Prompt builder
4. **Phase 2.5 or Phase 3.6** (pick one: extraction OR checkpoint)
5. Phase 3: Frontend UI + UX replicability
6. Testing (integration + basic E2E)
7. Conformity Checklist

**Case Study Recommended**: Study HLF reference code for patterns, but only implement subset applicable to your tool

---

### 🔴 COMPLEX TOOLS (3-5 SI')

**Characteristics**:
- Multi-step orchestration (2-3 steps with output chaining)
- File extraction + preprocessing required
- State machine UI with 5+ distinct phases
- Checkpoint & recovery for partial failures
- Retry with exponential backoff
- Per-step accounting or complex model routing

**Estimated Time**: 6-8 hours  
**Example Tools**: HotLeadFunnel, multi-step sales funnel generators, knowledge base extractors

**Runbook Path**:
1. Prerequisites & Anatomy
2. Complexity Assessment ← You are here
3. Phase 1: Route + Schema
4. Phase 2: Prompt builder
5. **Phase 2.5: File extraction** (required)
6. Phase 3: Frontend UI
7. **Phase 3.5: UX Replicability** (required)
8. **Phase 3.6: Checkpoint** (required)
9. **Phase 3.7: Retry** (required)
10. Testing (full: integration, unit, E2E, recovery scenarios)
11. Conformity Checklist
12. GO/NO-GO Assessment

**Reference Required**: Study HotLeadFunnel source code extensively before starting

---

### 🔴 VERY COMPLEX TOOLS (6+ SI')

**Characteristics**:
- Dynamic step routing (steps chosen at runtime based on context)
- Multi-model orchestration (different models for different steps)
- Advanced error recovery with UI-driven recovery path
- Extensive checkpoint/state management across sessions
- Custom analytics or feature flags per step
- Possible parallel execution of independent steps

**Estimated Time**: 8-12+ hours  
**Recommendation**: **Consult Architecture Team** — may need framework extensions or custom patterns

**⚠️ WARNING**: Standard runbook insufficient. Requires specialized guidance on:
- Dynamic routing logic
- Multi-model orchestration patterns
- Advanced checkpoint recovery
- Analytics integration architecture
- Testing strategy for state explosion

---

## Advanced: Custom Tool Type Classification

Se il tuo tool non rientra bene nelle 3 categorie, usa questa matrice:

| Trait | Impact on Scope | Score |
|-------|---|---|
| Multi-step orchestration | +50% time | 1 point |
| File upload + extraction | +30% time | 1 point |
| Stateful UI (5+ phases) | +40% time | 1 point |
| Recovery/checkpoint logic | +25% time | 1 point |
| Retry with backoff | +20% time | 1 point |
| Custom error recovery UI | +15% time | 1 point |

**Formula**: 
```
Base Time = 3.5h
Adjusted Time = Base Time + (Traits Found × ~35% avg impact)

Example: Multi-step (+50%) + extraction (+30%) + state machine (+40%) + checkpoint (+25%)
= 3.5h + ((50+30+40+25) / 100 × 3.5) 
= 3.5h + 5.25h 
= ~8.75h → Classify as COMPLEX or VERY COMPLEX
```

---

## Next Steps

- **If 🟢 SIMPLE** (0 SI'): 
  → Jump to **[tool-cloning-phase-1-backend.md](tool-cloning-phase-1-backend.md)**
  
- **If 🟡 MODERATE** (1-2 SI'): 
  → Review **[tool-cloning-phase-1-backend.md](tool-cloning-phase-1-backend.md)** and applicable optional phases
  
- **If 🔴 COMPLEX** (3-5 SI'): 
  → Follow full path: Phase 1 → Phase 2 → Phase 2.5 → Phase 3 → Phase 3.5 → Phase 3.6 → Phase 3.7 → Testing
  
- **If 🔴 VERY COMPLEX** (6+ SI'): 
  → Contact Architecture Team for guidance before starting

---

**Save Your Assessment**: Copy this questionnaire and save your responses in a doc/PR comment for team reference.
