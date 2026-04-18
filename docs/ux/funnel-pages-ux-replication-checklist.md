---
goal: Checklist di replicazione UX as-is per HotLeadFunnel
version: 1.0
date_created: 2026-04-17
date_updated: 2026-04-17
status: Active
tags: [ux, checklist, funnel-pages, parity, tool-cloning]
---

# UX Replication Checklist: HotLeadFunnel

## 1. Navigation & Entry Point

| Aspetto | Expected (HLF) | Stato |
|---|---|---|
| URL path | /tools/funnel-pages | ✅ |
| Page shell | PageShell width workspace | ✅ |
| Entry orientation | Titolo + descrizione + setup card | ✅ |

## 2. Layout Structure & Responsiveness

| Breakpoint | Expected (HLF) | Stato |
|---|---|---|
| 320px | layout stacked 1-col, no horizontal scroll | ✅ |
| 768px | layout stacked 1-col | ✅ |
| 1024px+ | grid 2-col con proporzione 3fr/2fr | ✅ |
| 1440px | workspace centrato con breathing room | ✅ |

## 3. Form Component Parity

| Control | Expected (HLF) | Stato |
|---|---|---|
| Project select | dialog-based project picker | ✅ |
| Briefing input | file input nativo con hint formati | ✅ |
| Model select | select con class app-control | ✅ |
| Tone select | select con class app-control | ✅ |
| Notes | textarea opzionale app-control | ✅ |
| Primary action | pulsante contestuale con data-primary-action | ✅ |

## 4. Focus & Keyboard Navigation

- [x] Tab traversal raggiunge controlli principali
- [x] Focus indicator visibile su elementi focusabili
- [x] Azioni principali attivabili senza mouse

## 5. Streaming & Real-time UX

- [x] Stato processing visibile durante upload/estrazione
- [x] Stato running visibile durante generazione
- [x] Progressione step optin/quiz/vsl con badge stato
- [x] Errori step mostrati in chiaro

## 6. Output Panel Styling

- [x] Card output in app-surface/app-rise
- [x] Container output con whitespace-pre-wrap e scroll interno
- [x] Accesso rapido ad artefatto per step completati

## 7. Accessibility Baseline (WCAG AA)

- [x] Focus visible su controlli principali
- [x] Live regions per feedback stato
- [x] Error messages con ruolo alert
- [x] Touch targets principali >= 44px

## 8. Error States & Edge Cases

- [x] Progetto mancante blocca upload
- [x] Formato file non supportato mostra errore
- [x] Retry extraction disponibile su failure hard
- [x] Resume checkpoint disponibile quando applicabile

## 9. Tone & Language Consistency

- [x] Microcopy operativa in italiano
- [x] Messaggi stato brevi e action-oriented
- [x] CTA primaria coerente con stato corrente

## 10. UX Evidence

- [x] User journey documentato in docs/ux/funnel-pages-user-journey.md
- [x] E2E parity dedicato in tests/e2e/funnel-pages-ux-parity.spec.ts
- [x] Cross-check con runbook phase 3.5 completato
