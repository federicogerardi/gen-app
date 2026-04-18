---
goal: Phase 3.5 - UX Replicability, User Journey, Design System Parity  
version: 1.1
date_created: 2026-04-17
date_updated: 2026-04-17
status: Active
tags: [runbook, tool-cloning, phase-3-5, ux-replicability, design-system]
---

# Phase 3.5: UX Replicability & Design System Parity

Questa fase è CRITICA: garantisce che il tool clone **senta e si comporti come HLF** dal punto di vista utente. Non è sufficiente replicare il codice — devi replicare l'esperienza.

---

## Step 3.5.1: Estrarre User Journey da HLF

Prima di qualsiasi modifica UI, documenta il journey corrente di HLF:

**File**: `docs/ux/{{TOOL_SLUG}}-user-journey.md`

```markdown
# User Journey: {{TOOL_TITLE}}

## Goal
Utente [ruolo] vuole [task principale] per [outcome finale].

**Esempio per HLF**: 
Marketer di agenzia vuole **generare pagine di funnel ottimizzate** per **capire quali elementi convertono meglio senza dover scrivere codice HTML**.

## Journey Map

### Stage 1: Entry & Orientation (0-30 sec)
**What User Sees**
- Landing su `/tools/{{TOOL_SLUG}}`
- Titolo prominent + descrizione breve (1-2 righe max)
- Tre campi visibili senza scroll

**What User Thinks**: "OK, dove comincio?" | "Quanto tempo ci vuole?"

**What User Feels**: 😐 Neutro, curiosità | 🤔 Incertezza se sono nel posto giusto

---

### Stage 2: Form Completion (30-120 sec)
**What User Does**
- Seleziona progetto da dropdown
- Scrrive topic/descrizione nel textarea
- Seleziona tone/model se opzionale  
- Può resettare form senza perdere sessione

**What User Thinks**: "Capisco cosa servono questi campi?" | "Ho riempito tutto?"

**What User Feels**: 👍 Confidenza se i campi sono chiari | 😕 Frustrazione se label/tooltip assenti

---

### Stage 3: Generation In Progress (Duration of stream)
**What User Does**
- Clicca pulsante "Genera..."
- Pulsante disabilitato + loading spinner
- Vede output comparire in real-time, token per token

**What User Thinks**: "Sta funzionando?" | "Quanto manca?"

**What User Feels**: ⏳ Compreso | 😌 Zen se il flusso è fluido

---

### Stage 4: Output & Action (Post-stream)
**What User Does**
- Legge output generato
- Copia contenuto
- Modifica/rifina manualmente se necessario
- Decide se salvare o scartare

**What User Thinks**: "Va bene questo?" | "Posso riusarlo?"

**What User Feels**: 😊 Soddisfatto | 😕 Deluso se richiede troppe modifiche

### Success Metric
- ✅ User completa form → genera → copia output in **< 3 minuti** senza external help
- ✅ Zero confusion su cosa fare dopo generazione
```

---

## Step 3.5.2: Replicarle Pattern UX (Design System Parity)

**File**: `docs/ux/{{TOOL_SLUG}}-ux-replication-checklist.md`

Crea una checklist che assicura che il clone segue IDENTICAMENTE gli stessi pattern UX di HLF:

```markdown
# UX Replication Checklist: {{TOOL_TITLE}}

## 1. Navigation & Entry Point
| Aspetto | HLF | Clone | Status |
|---------|-----|-------|--------|
| URL Path | `/tools/funnel-pages` | `/tools/{{TOOL_SLUG}}` | ✅ |
| Page Shell | `<PageShell width="workspace">` | Identico | ✅ |
| Breadcrumb | "Tools > Funnel Pages" | "Tools > {{TOOL_TITLE}}" | ✅ |

## 2. Layout Structure & Responsiveness
| Breakpoint | HLF | Clone | Notes |
|---|---|---|---|
| 320px | Stacked 1-col | Stacked 1-col | Same |
| 768px | Single col | Single col | Same |
| 1024px+ | 2-col grid 3fr 2fr | 2-col grid 3fr 2fr | Same |
| 1440px | Max 1440px centered | Max 1440px centered | Same |

## 3. Form Component Parity
| Control | HLF | Clone | Status |
|---------|-----|-------|--------|
| Project Select | Radix dropdown, `.app-control` | Identico | ✅ |
| Textarea | `rows={4}`, `.app-control` | Identico | ✅ |
| Tone Select | Enum options, `.app-control` | Identico | ✅ |
| Button | Disabilitato durante stream | Identico | ✅ |

## 4. Focus & Keyboard Navigation
- [x] Tab order: left-right, top-bottom
- [x] Focus ring: 2px outline, brand color
- [x] Screen reader: announces labels clearly
- [x] All interactions keyboard-accessible

## 5. Streaming & Real-time UX
- [x] Button disabilitato durante stream
- [x] "In generazione..." testo
- [x] Output appare token-by-token
- [x] Error alert visibile

## 6. Output Panel Styling
- [x] `.app-surface` card, rounded-2xl
- [x] Semi-transparent white background
- [x] `.text-xs whitespace-pre-wrap` for output
- [x] Copiabile senza lock-in

## 7. Accessibility (WCAG AA)
- [x] 4.5:1 contrast minimum
- [x] Focus visible on all controls
- [x] Keyboard complete (Tab, Enter, Escape)
- [x] Screen reader support
- [x] 200% text resize without breakage

## 8. Error States & Edge Cases
- [x] Empty form → "Completa campi obbligatori"
- [x] Invalid input → Zod validation error
- [x] Network error → Alert with message
- [x] Rate limited → "RATE_LIMIT_EXCEEDED"
- [x] Button disabled until completion

## 9. Tone & Language Consistency
- [x] Button label: "Genera [cosa]" (Italian, imperative)
- [x] Placeholder: "es. [example]" (lowercase, helpful)
- [x] Loading: "In generazione..." (ellipsis)
- [x] Error: "Errore: [reason]" (technical but friendly)
- [x] Help text: max 1 line, ~60 char

## 10. Mobile & Responsive Guarantee
- [x] No horizontal scroll at 320px
- [x] Touch targets ≥ 44px height
- [x] Form 1-col at ≤768px
- [x] 2-col layout starts at 1024px
- [x] Breathing room at 1440px
```

---

## Step 3.5.3: Interaction Parity Testing (Playwright E2E)

**File**: `tests/e2e/{{TOOL_SLUG}}-ux-parity.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('UX Parity: {{TOOL_TITLE}} vs HLF Reference', () => {
  test('Form layout matches 2-column responsive pattern', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/tools/{{TOOL_SLUG}}');

    // Verifica presenza blocco setup + blocco output/steps nel layout desktop.
    await expect(page.getByRole('heading', { name: 'Setup' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Step 1/i })).toBeVisible();
  });

  test('Focus ring visible on all inputs (keyboard navigation)', async ({ page }) => {
    await page.goto('/tools/{{TOOL_SLUG}}');
    
    await page.keyboard.press('Tab');
    let focused = await page.locator(':focus');
    expect(await focused.evaluate(el => getComputedStyle(el).outline)).not.toBe('none');
  });

  test('Button disabled during stream generation', async ({ page }) => {
    await page.goto('/tools/{{TOOL_SLUG}}');

    // HLF usa pulsante primario con data attribute stabile.
    const primaryAction = page.locator('[data-primary-action="true"]');
    await expect(primaryAction).toBeDisabled();

    // Dopo setup completo, il pulsante diventa cliccabile e torna disabled durante la generazione.
    // Il testo reale dipende dallo stato: "Avvia generazione funnel" -> "Generazione in corso..."
  });
});
```

---

## UX Testing Checklist (Before PR)

Completa prima di submittare code review:

| Test | Pass? | Notes |
|------|-------|-------|
| Happy path (form → generate → copy) | [ ] | Mobile + desktop both? |
| Keyboard-only (no mouse) | [ ] | Tab through all, Enter to submit? |
| Browser zoom 200% | [ ] | Text readable, no overlap? |
| Empty form submit → error | [ ] | Message clear? |
| Screen reader test | [ ] | NVDA/VoiceOver? |
| Slow network (DevTools throttle) | [ ] | UX handles latency? |
| Mobile 375px width | [ ] | No horizontal scroll? |
| Focus ring visibility | [ ] | Can see outline on Tab? |

**Sign-off Template**:
```
## UX Sign-Off ✅

**Tester**: [Your Name]
**Date**: YYYY-MM-DD
**Tool**: {{TOOL_TITLE}}

All 8 tests pass ✅
Behavior feels identical to HLF ✅
Ready for Code Review: YES ✅
```

---

## Reference Documentazione

- **Graphic Framework**: [docs/specifications/graphic-frameworking-spec.md](../../specifications/graphic-frameworking-spec.md)
- **Accessibility Guidelines**: [docs/accessibility/accessibility.md](../../accessibility/accessibility.md)
- **UX Strategy**: [docs/ux/ux-strategy.md](../../ux/ux-strategy.md)

---

## Next Steps

- If tool has checkpoint recovery: go to **[tool-cloning-phase-3-6-checkpoint.md](tool-cloning-phase-3-6-checkpoint.md)**
- If tool needs retry logic: go to **[tool-cloning-phase-3-7-retry.md](tool-cloning-phase-3-7-retry.md)**
- Otherwise: go to **[tool-cloning-testing-strategy.md](tool-cloning-testing-strategy.md)**
