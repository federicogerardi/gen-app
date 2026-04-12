# Projects-First Navigation Plan

Versione: 1.0  
Data: 2026-04-13  
Ambito: UX / IA / navigazione applicativa  
Stato: Completato

---

## Contesto

Lo stato attuale dell'app espone gli artefatti come sezione primaria nella GUI, mentre il modello mentale reale del prodotto e centrato sui progetti:

- il progetto e il contenitore di lavoro
- gli artefatti sono output generati dentro un progetto
- il feed globale artefatti e una vista trasversale, utile come storico personale ma non come fulcro della navigazione

Questa divergenza genera un disallineamento tra:

- gerarchia informativa
- aspettative utente
- posizionamento delle route esistenti

---

## Obiettivo

Portare la GUI verso un'impostazione projects-first, in cui:

- Progetti diventa l'entita primaria della navigazione
- il dettaglio progetto diventa il punto principale di consultazione degli artefatti
- il feed globale artefatti viene mantenuto, ma riposizionato come storico personale / archivio utente

---

## Decisione UX proposta

### Nuova gerarchia primaria

1. Dashboard
2. Progetti
3. Tools
4. Artefatti
5. Admin

Interpretazione:

- Dashboard = ingresso e riepilogo operativo
- Progetti = workspace principale
- Tools = entry point di generazione
- Artefatti = archivio trasversale secondario
- Admin = perimetro amministrativo separato

---

## Stato as-is verificato

Elementi gia presenti nel codebase:

- Dashboard overview: `/dashboard`
- Creazione progetto: `/dashboard/projects/new`
- Dettaglio progetto: `/dashboard/projects/[id]`
- Lista artefatti globale: `/artifacts`
- Dettaglio artefatto: `/artifacts/[id]`

Gap attuali:

- eventuale affinamento UX copy e micro-interazioni da valutare dopo feedback utenti

---

## Principi guida

1. Workspace-first
- L'utente deve percepire il progetto come contenitore naturale del lavoro.

2. Context over feed
- Gli artefatti devono essere consultati nel contesto del progetto quando possibile.

3. Historical view, not primary view
- Il feed globale artefatti resta utile, ma come storico personale e non come centro del prodotto.

4. Progressive exposure
- Non introdurre subito nuove sezioni pesanti senza una route indice coerente e navigabile.

---

## Piano di avanzamento

### Fase 1 — Riallineamento IA e navigazione primaria

Obiettivo:
- riflettere in GUI la centralita dei progetti

Interventi:

- aggiornare la Navbar per introdurre Progetti come voce primaria
- de-enfatizzare Artefatti nella navigazione top-level
- verificare gli active states e i label delle sezioni

Deliverable:

- Navbar riallineata
- coerenza label/ordine nelle entry principali

### Fase 2 — Introduzione lista progetti dedicata

Obiettivo:
- rendere Progetti una sezione realmente navigabile e non solo un insieme di route sparse

Interventi:

- creare una pagina indice Progetti
- mostrare lista completa dei progetti dell'utente
- includere azioni minime: apri, crea nuovo progetto
- opzionale in seconda battuta: ricerca, ordinamento, stato, count artefatti

Deliverable:

- route lista progetti attiva
- entry point coerente dalla Navbar

### Fase 3 — Riorganizzazione dashboard in chiave project-first

Obiettivo:
- fare della dashboard un hub di accesso rapido ai progetti, non al feed globale artefatti

Interventi:

- aumentare il peso visivo della sezione progetti recenti
- rendere piu esplicita la CTA verso creazione/apertura progetto
- ridurre il ruolo della vista globale artefatti nel primo livello di scansione

Deliverable:

- dashboard con enfasi principale sui progetti
- CTA piu chiare verso il workspace

### Fase 4 — Riposizionamento del feed artefatti

Obiettivo:
- conservare utilita del feed globale senza trattarlo come centro del prodotto

Interventi:

- ridefinire copy e posizionamento di `/artifacts` come storico / archivio personale
- mantenere filtri trasversali per auditing e recupero contenuti
- chiarire in UI che il punto naturale di consultazione e il progetto

Deliverable:

- pagina Artefatti semantizzata come storico
- linguaggio coerente con il nuovo modello mentale

---

## Avanzamento implementazione (2026-04-13)

- Fase 1: completata
	- Navbar riallineata con Progetti come voce primaria e Artefatti riposizionato come Storico.

- Fase 2: completata
	- Introdotta route indice dedicata: `/dashboard/projects` con lista completa progetti e CTA minime (apri/nuovo).

- Fase 3: completata
	- Dashboard riorganizzata in chiave project-first con sezione workspace progetti anticipata e CTA esplicite.

- Fase 4: completata
	- Pagine `/artifacts` e `/artifacts/[id]` semantizzate come storico personale e con ponte esplicito verso il progetto di contesto.
	- Allineata anche la pagina dettaglio progetto con card identity deterministica e copertura d'integrazione dedicata.

Stato validazione:

- Test: `PASS` (48 suite, 352 test) in data 2026-04-13.
- Typecheck TypeScript: `PASS` in data 2026-04-13.
- Build produzione Next.js: `PASS` in data 2026-04-13.

---

## Impatti tecnici attesi

### Basso impatto

- aggiornamento Navbar
- aggiornamento label e priorita visuali
- riallineamento copy e CTA

### Medio impatto

- nuova route indice Progetti
- aggiornamento test su navigazione e rendering
- possibile riallineamento dashboard

### Non richiesto in prima battuta

- modifiche schema DB
- cambi API strutturali
- cambi ownership/auth logic

---

## Rischi

1. Semi-integrazione
- aggiungere Progetti in Navbar senza una vera pagina indice puo generare una UX incompleta.

2. Duplicità informativa
- dashboard, lista progetti e feed artefatti possono sovrapporsi se non si chiarisce il ruolo di ciascuna superficie.

3. Scope creep
- il refactor puo espandersi facilmente da IA/navigation a redesign completo delle pagine.

Mitigazione:

- eseguire il lavoro per fasi
- chiudere prima la gerarchia informativa, poi il polish visivo

---

## Definition of Done

Il track puo considerarsi completato quando:

- Progetti e visibilmente l'entita primaria della navigazione autenticata
- esiste una pagina lista progetti dedicata e coerente
- il dettaglio progetto e la superficie principale per consultare gli artefatti del contesto
- Artefatti globale e posizionato come storico personale, non come centro del prodotto
- test di navigazione e rendering risultano verdi

Stato attuale DoD:

- Criteri UX/IA implementati.
- Criterio di test green validato (`PASS`).

---

## Sequenza raccomandata

1. Navbar e IA primaria
2. Lista Progetti dedicata
3. Dashboard project-first
4. Ridenominazione / riposizionamento Artefatti come storico

---

## Documenti correlati

- docs/ux/gui-refactor-plan.md
- docs/ux/ux-strategy.md
- docs/implement-index.md