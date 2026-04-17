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

## Tool Pages Exceptions

Le pagine tool (`/tools/*`) possono discostarsi dalle regole di base per ragioni di usabilità operativa:

### File Input
- Il nativo `<input type="file">` NON richiede `.app-control`
- Motivazione: input file ha UI browser specializzata; `.app-control` renderebbe la UX meno intuitiva
- Verificare: focus ring nativo deve essere visibile WCAG AA
- Esempio: HotLeadFunnel usa nativo file input senza `.app-control`

### Checklist / Status Containers
- Contenitori di stato e checklist possono usare `bg-white/70` invece di `.app-surface`
- Motivazione: `bg-white/70` crea "depth layer" discernibile dal canvas atmosferico pur restando leggero
- Vincolo: usare `bg-white/70` SOLO in sidebar/status panel, non nel main content
- Esempio: HotLeadFunnel status checklist usa `bg-white/70` px-3 py-2

### Modal / Dialog
- Dialog può usare `bg-white` (opaco) se posizionato sopra overlay
- Motivazione: disambiguare layer modale dal canvas
- Vincolo: applicare `.app-surface` se il dialog non è posizionato fixed/absolute sopra overlay
- Esempio: Project selector dialog usa `bg-white` su Dialog.Content

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

### Pagine dashboard / admin / artifacts
- Tutte le pagine autenticate usano `.app-shell` su main.
- Nessun controllo critico (input/select/textarea) resta senza `.app-control` in zone sensibili.
- Nessuna card metrica resta senza `.app-surface` o `bg-white/*` esplicito.
- Stato focus visibile su input/button ovunque.
- Nessun testo secondario perde leggibilita su overlay atmosferico.

### Tool pages (`/tools/*`) — Eccezioni consentite
- File input può usare nativo `<input type="file">` senza `.app-control`
- Checklist / status sidebar può usare `bg-white/70` invece che `.app-surface`
- Dialog modale può usare `bg-white` opaco se posizionato fixed/absolute
- Select/Textarea devono mantenere `.app-control` (come nel resto dell'app)
- État focus ring nativo deve essere visibile WCAG AA

---

## Related Documents

- docs/implementation/implementation-plan.md
- docs/implement-index.md
- docs/ux/gui-refactor-plan.md
- docs/ux/ux-strategy.md
- docs/accessibility/accessibility.md
