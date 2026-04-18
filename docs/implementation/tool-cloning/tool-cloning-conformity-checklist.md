---
goal: Conformity Checklist - Pre-PR validation and Definition of Done
version: 1.2
date_created: 2026-04-17
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, conformity-checklist, dod, pre-pr]
---

# Conformity Checklist: Definition of Done

Completa TUTTI i seguenti punti prima di mergiare.

---

## Backend (API Route)

- [ ] Route POST `/api/tools/{{TOOL_SLUG}}/generate` exists
- [ ] Sequenza obbligatoria: auth → rate limit → validate → build → stream (ORDINE FISSO)
- [ ] `enforceUsageGuards()` chiamato PRIMA di LLM
- [ ] Zod schema nel file `schemas.ts`
- [ ] Error codes usano enum standard (`UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_ERROR`)
- [ ] Logging via `getRequestLogger()`
- [ ] Test integration coperti (auth, ownership, validation, stream) ✅ 4+ test cases
- [ ] `npm run typecheck` ✅ Zero errors
- [ ] `npm run lint` ✅ Zero errors

---

## Prompt & Builder

- [ ] Sorgente markdown in `src/lib/tool-prompts/prompts/tools/{{TOOL_SLUG}}/generate.md`
- [ ] Builder TypeScript in `src/lib/tool-prompts/{{TOOL_SLUG}}.ts`
- [ ] Template statico tipizzato (NO `fs.readFile` runtime)
- [ ] Interpolazione safe (trim + empty string fallback)
- [ ] Test unit su builder ✅ 3+ test cases
- [ ] Multi-step builders implemented (if applicable)

---

## Frontend UI

- [ ] Page exists: `src/app/tools/{{TOOL_SLUG}}/page.tsx`
- [ ] `page.tsx` è thin wrapper con `<Suspense>`
- [ ] `{{TOOL_TITLE}}ToolContent.tsx` contiene orchestration UI tool-specific
- [ ] Hook/componenti tool-specific separati (`hooks/`, `components/`)
- [ ] Layout usa `<PageShell width="workspace">`
- [ ] Form card: `.app-surface + .app-rise`
- [ ] Select/Textarea: `.app-control`
- [ ] Titolo: `.app-title`
- [ ] File input (if present): native `<input type="file">` OK (tool-pages exception)
- [ ] Output panel: correct styling (not flat white)
- [ ] Pulsante primario disabilitato fino a campi obbligatori
- [ ] SSE parsing client-side ✅ onToken + onError handlers

---

## UX Replicability (CRITICAL)

- [ ] User journey documented in `docs/ux/{{TOOL_SLUG}}-user-journey.md`
  - [ ] 4 journey stages: Entry, Form, Generation, Output
  - [ ] What User Sees/Thinks/Feels for each stage
  
- [ ] UX replication checklist completed: `docs/ux/{{TOOL_SLUG}}-ux-replication-checklist.md`
  - [ ] Navigation & entry point parity
  - [ ] Layout responsiveness all breakpoints
  - [ ] Form component parity (labels, placeholders, styling)
  - [ ] Focus & keyboard navigation
  - [ ] Streaming & real-time UX
  - [ ] Output panel styling
  - [ ] Accessibility baseline (WCAG AA)
  - [ ] Error states & edge cases
  - [ ] Tone & language consistency
  - [ ] Micro-interactions

- [ ] Layout responsive verified
  - [ ] 320px (mobile): 1-col, no horiz scroll
  - [ ] 768px (tablet): 1-col stacked
  - [ ] 1024px (small desktop): 2-col grid 3fr/2fr
  - [ ] 1440px (large): max-width centered

- [ ] Form component parity verified
  - [ ] Labels ABOVE inputs (accessibility pattern)
  - [ ] .app-control classes matching HLF
  - [ ] Placeholder copy helpful & lowercase with "es."
  - [ ] Focus ring visible

- [ ] Accessibility baseline met (WCAG AA)
  - [ ] 4.5:1 contrast minimum on all text
  - [ ] Focus ring visible on Tab navigation
  - [ ] All functions keyboard-accessible
  - [ ] Screen reader support (labels associated)
  - [ ] Text resizable to 200% without layout collapse

- [ ] Interaction parity verified
  - [ ] Button disabled during stream
  - [ ] "In generazione..." loading state text
  - [ ] Output appare token-by-token
  - [ ] Error alerts visible & clear

- [ ] UX Testing completed
  - [ ] Test 1: Happy path (form → generate → copy) ✅
  - [ ] Test 2: Keyboard-only (no mouse) ✅
  - [ ] Test 3: Browser zoom 200% ✅
  - [ ] Test 4: Empty form → error ✅
  - [ ] Test 5: Screen reader (NVDA/VoiceOver) ✅
  - [ ] Test 6: Slow network (DevTools throttle) ✅
  - [ ] Test 7: Mobile 375px ✅
  - [ ] Test 8: Focus ring visibility ✅

- [ ] E2E UX parity tests pass ✅ `tests/e2e/{{TOOL_SLUG}}-ux-parity.spec.ts`

---

## Testing

- [ ] Integration tests ✅ `npm run test` passes
  - [ ] Auth enforcement
  - [ ] Project ownership
  - [ ] Input validation
  - [ ] Stream generation
  
- [ ] Unit tests ✅ prompt builder, edge cases
  
- [ ] E2E tests ✅ user workflow, responsive, accessibility

---

## Build & Deploy

- [ ] `npm run typecheck` ✅
- [ ] `npm run lint` ✅
- [ ] `npm run test` ✅
- [ ] `npm run test:e2e` ✅
- [ ] `npm run build` ✅ (requires all env vars)

---

## Documentation

- [ ] PR title: Conventional Commits format
  - Format: `feat(tool-{{TOOL_SLUG}}): generazione {{TOOL_TITLE}} con streaming`
  
- [ ] PR body includes:
  - [ ] Descrizione breve del tool
  - [ ] Link to docs di riferimento (graphic-frameworking, tool-routes, tool-prompts)
  - [ ] Graphic framework exceptions (if any)
  - [ ] Complexity tier and assessment score
  - [ ] UX replicability confirmation
  - [ ] Test coverage summary
  
- [ ] Zero `TODO` introdotti senza issue associata
- [ ] All comments removed (except //* for exceptional cases)

---

## Code Review Gates

✅ **Pre-submission**: Developer ensures:
- All checklist items complete
- CI/CD pipeline green
- UX sign-off from team
- Zero deviations from graphic framework

✅ **Review phase**: Reviewer validates:
- Spec conformity (auth/rate limit/validate sequence)
- UX parity (layout, interactions, accessibility)
- Test coverage (integration + unit + E2E)
- Code quality (linting, typing, no warnings)

✅ **Approval**: Marketing/Tech Lead confirms:
- Tool ready for production
- User-ready documentation present
- Team sign-off: "Behavior feels identical to HLF"

---

## Final Sign-Off

**Tool Ready to Merge When**:

```
✅ All checklist items complete
✅ CI/CD pipeline green
✅ Code review approved
✅ UX sign-off complete
✅ Zero TODOs without issue
✅ All tests passing
✅ Browser manual test: form → generate → output ✅ works
✅ Manual team sign-off: "Behavior feels identical to HLF" ✅

Status: Ready to Merge 🚀
```

---

## Before Closing Issue

1. Merge PR to `dev` branch (via Squash-and-Merge)
2. Verify PR title becomes commit message (Conventional Commits format)
3. Close associated issue with reference to PR
4. Update [docs/implement-index.md](../../implement-index.md) with completion status

---

## Next Step

If all items complete, repository manager will schedule:
- Merge to `dev` ✅
- QA validation on staging ✅
- Release notes ✅
- Deploy to production ✅
