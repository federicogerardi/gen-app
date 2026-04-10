# Graphic Frameworking Specification

Version: 1.0  
Status: Active  
Last Updated: 2026-04-11  
Owner: Frontend/UX

---

## Purpose

Definire regole operative e riusabili per interventi UI su pagine con shell grafica del prodotto, mantenendo coerenza con il template applicato nel restyling login + pagine interne.

Questa specifica e vincolante per i futuri interventi visuali su:
- dashboard
- tools pages
- artifacts pages
- admin area
- pagine progetto
- navbar e shell condivisa

---

## Visual Direction Baseline

Direzione da preservare:
- stile editorial-tech caldo
- contrasto morbido ma leggibile
- layering atmosferico (radial + grid overlay)
- superfici semi-opache con depth controllata
- gerarchia tipografica display/body consistente

Obiettivo percepito:
- esperienza premium e professionale
- elevata leggibilita in contesto operativo denso
- continuita immediata tra login e aree autenticate

---

## Required Foundations

### 1. Typography

Usare sempre:
- display font variabile condivisa: `--font-brand-display`
- body font variabile condivisa: `--font-brand-body`

Regole:
- titoli page/section: classe `app-title`
- copy, form, tabelle, pannelli operativi: classe `app-copy`

### 2. Shell e atmosfera

Per le pagine autenticate usare:
- `app-shell` sul contenitore principale
- `app-grid-overlay` come layer non interattivo

Vincoli:
- overlay sempre `pointer-events-none`
- nessun background flat pieno per pagine principali

### 3. Surfaces

Per card e pannelli primari usare `app-surface`.

Comportamento atteso:
- bordo soft
- sfondo semitrasparente
- blur lieve
- shadow diffusa e non aggressiva

---

## Controls on Graphic Background

### Mandatory Control Class

Su input/select/textarea in pagine con shell grafica applicare sempre `app-control`.

Motivazione:
- evita perdita di contrasto su layer atmosferici
- rende coerenti stati hover/focus
- elimina aree trasparenti non leggibili

### Required States

`app-control` deve garantire:
- placeholder leggibile
- hover con incremento opacita superficie
- focus-visible con ring esplicito
- stato open (select trigger) percepibile

### Sensitive Zones

Controlli in queste aree sono sempre critici:
- barre filtri
- campo ricerca admin
- pannelli metriche con testo secondario
- drawer/modali amministrative

---

## Component Mapping Rules

### Cards and Metrics

- metriche KPI: usare `app-surface`
- micro-card testuali (dl/div metriche): usare sfondo esplicito `bg-white/*` + bordo soft
- evitare blocchi solo border su sfondo grafico

### Filter Bars

- trigger select: `app-control`
- input ricerca: `app-control`
- label sempre visibili, non affidarsi al solo placeholder

### Stream/Output Panels

- output text/markdown su surface dedicata con background separato dal canvas
- mantenere leggibilita long-form (line-height adeguata + wrap)

---

## Accessibility Constraints

Minimi obbligatori:
- contrasto WCAG AA su testo primario e secondario
- focus ring visibile su tutti i controlli interattivi
- keyboard flow completo (Tab/Shift+Tab/Escape su drawer)
- messaggi dinamici con `aria-live`/`role` coerenti

Anti-pattern da evitare:
- controllo trasparente su sfondo complesso
- placeholder troppo tenue
- stato attivo distinguibile solo dal colore

---

## Change Protocol for Future UI Work

Per ogni intervento visuale nuovo o di refactor:
1. Applicare le classi foundation (`app-shell`, `app-grid-overlay`, `app-surface`, `app-title`, `app-copy`, `app-control`) dove pertinenti.
2. Verificare i controlli in zone sensibili.
3. Eseguire validazione tecnica minima:
   - `npm run lint`
   - `npm run typecheck`
4. Eseguire validazione visiva minima:
   - viewport 320, 768, 1024, 1440
   - check hover/focus/open su input/select/textarea
5. Documentare delta UX nei documenti di tracking (implement-index + piano UX).

---

## QA Checklist (Quick)

- Tutte le pagine autenticate usano shell coerente.
- Nessun controllo critico resta senza `app-control` su sfondo grafico.
- Nessuna card metrica resta senza sfondo esplicito.
- Stato focus visibile ovunque.
- Nessun testo secondario perde leggibilita su overlay.

---

## Related Documents

- docs/implementation/implementation-plan.md
- docs/implement-index.md
- docs/ux/gui-refactor-plan.md
- docs/ux/ux-strategy.md
- docs/accessibility/accessibility.md
