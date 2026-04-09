# GUI Refactoring Plan: UX Moderna e Funzionale

Versione: 1.0  
Data: 2026-04-08  
Input di partenza: [docs/ux-strategy.md](docs/ux-strategy.md)  
Target utenti: SEO Specialist, MediaBuyer

Stato avanzamento implementazione (2026-04-08):

- Sprint 1: completato
- Sprint 2: completato
- Sprint 3: completato
- Sprint 4: completato

---

## Obiettivo

Rendere la GUI più veloce, chiara e orientata ai task quotidiani del team marketing:

- generare artefatti con tool separati per workflow operativo (Meta Ads, Funnel Pages)
- ridurre il tempo di esecuzione del flusso principale
- aumentare qualità percepita e controllo dell output generato

KPI primari:

- tempo medio per prima generazione completata < 2 minuti
- completamento flusso senza errori > 90%
- riduzione passaggi necessari da dashboard a generazione completata

---

## Job To Be Done operativo

Quando un SEO Specialist o MediaBuyer deve produrre rapidamente varianti di contenuto per campagne, vuole entrare in un tool specializzato per il task corrente, compilare pochi campi chiari e ottenere output leggibile e subito riusabile, così da iterare rapidamente senza cambiare contesto.

---

## Principi guida del refactoring

1. Tool separation first
- Ogni tipo di artefatto ha un entry point dedicato e un flusso dedicato.

2. Progressive disclosure
- Campi base sempre visibili, opzioni avanzate apribili a richiesta.

3. Feedback continuo
- Stato generazione sempre evidente: in coda, in corso, completato, errore.

4. Decisioni rapide
- Smart defaults per modello, tono, lunghezza e progetto recente.

5. Leggibilita e riuso immediato
- Output sempre human-readable, con passaggio rapido a nuova generazione quando serve una variante.

---

## Nuova architettura di navigazione

### Navigazione primaria

- Dashboard
- Tool Meta Ads
- Tool Funnel Pages
- Artefatti
- Progetti
- Admin (solo role admin)

### Routing target

- Dashboard overview: /dashboard
- Tool Meta Ads: /tools/meta-ads
- Tool Funnel Pages: /tools/funnel-pages
- Lista artefatti: /artifacts
- Dettaglio artefatto: /artifacts/[id]

Nota: il perimetro tool attivo e supportato include solo `/tools/meta-ads` e `/tools/funnel-pages`.

---

## Refactoring per area UI

### 1) Dashboard

Obiettivo: diventare un hub di scelta task e non una pagina generica.

Interventi:

- Hero con CTA separate: Apri Meta Ads, Apri Funnel Pages
- Sezione Progetti recenti con accesso rapido
- Sezione Artefatti recenti con stato e azioni rapide
- Widget quota e spesa visibile in alto

### 2) Flussi Tool dedicati

Obiettivo: ridurre complessità e aumentare pertinenza campi.

Interventi comuni:

- Step 1: Progetto
- Step 2: Input base specifico per tool
- Step 3: Opzioni avanzate (collapsible)
- Step 4: Generazione streaming con pannello output

Interventi per tool:

- Meta Ads: focus su prodotto, audience, offerta, objective e creative angle
- Funnel Pages: focus su briefing funnel e flusso sequenziale `optin -> quiz -> vsl`

### 3) Artefatti

Obiettivo: consultazione e riuso più rapidi.

Problema UX emerso post-implementazione:

- nelle card lista artefatti l output puo apparire come JSON raw, riducendo leggibilita e velocita decisionale
- il contenuto in preview non distingue chiaramente testo finale vs payload tecnico

Interventi:

- filtri fissi per tipo, stato, progetto, periodo
- anteprima leggibile in lista
- azioni rapide: duplica input, modifica, elimina
- pagina dettaglio read-only con output elaborato human-readable e metadati in sidebar

### Refactoring visualizzazione output card (hotfix UX)

Obiettivo specifico:

- mostrare sempre una preview human-readable nelle card, evitando il rendering diretto di JSON raw

Principi:

1. Content-first rendering
- la card privilegia testo utile all operatore marketing (headline, hook, body, CTA, sezioni principali)

2. Safe fallback
- se il parsing strutturato non e affidabile, mostrare una preview testuale pulita e troncata

3. Progressive disclosure
- payload tecnico non esposto nella UI primaria; dettaglio artefatto orientato a testo elaborato e metadati essenziali

Spec di comportamento in lista artefatti:

1. Pipeline preview lato client
- Step A: tentare parse di `artifact.content` come JSON solo se stringa JSON valida
- Step B: normalizzare in testo leggibile per tipo (`content`, `seo`, `code`)
- Step C: estrarre prime sezioni significative (max 2 blocchi) e applicare clamp
- Step D: fallback a testo plain ripulito se parse/normalizzazione falliscono

2. Regole di estrazione preview
- `content`: priorita a campi semantici (es. `headline`, `primaryText`, `cta`, `sections`)
- `seo`: priorita a `title`, `metaDescription`, `keywords` (prime n)
- `code`: mostrare summary tecnica breve (linguaggio + intent), non dump completo

3. Regole visuali card
- titolo progetto sempre visibile
- badge tipo/modello/stato invariati
- preview su 3-4 righe max con ellissi
- micro-label "Anteprima" sopra il testo
- stato `generating`: placeholder testuale dedicato
- stato `failed`: messaggio errore sintetico non tecnico

4. Accessibilita e semantica
- preview con `aria-label` descrittiva per screen reader
- messaggi loading/empty/error con ruoli ARIA coerenti (`status`/`alert`)
- mantenere contrasto AA su testo secondario e badge di stato

5. Non obiettivi
- non introdurre nuovo schema DB
- non esporre JSON tecnico nella lista come UI primaria

Deliverable tecnici:

- utility condivisa di formatting preview (es. `formatArtifactPreview`) con test unit
- integrazione nella card lista artefatti con fallback robusto
- rendering read-only human-readable nella pagina dettaglio artefatto (no editor inline, no JSON raw)
- allineamento copy stato/errore orientato utente business

DoD hotfix preview:

- nessuna card mostra JSON raw come preview primaria
- tempo medio scansione lista migliorato in test qualitativo interno
- regressioni assenti su quick actions (modifica, duplica input, elimina)
- copertura test: parsing JSON valido, JSON invalido, plain text, stato generating, stato failed

### 4) Admin UX

Obiettivo: azioni quota più veloci e meno error-prone.

Interventi:

- tabella utenti con ordinamento e ricerca
- stato quota con indicatori semaforici
- drawer di modifica quota/budget
- audit timeline con filtri minimi

---

## Design System e componenti da consolidare

Componenti da standardizzare:

- AppShell
- TopNav
- ToolSwitcher
- PageHeader
- MetricCard
- ArtifactCard
- FilterBar
- StreamPanel
- EmptyState
- ErrorState

Regole UI:

- griglia responsiva coerente
- gerarchia tipografica stabile su tutte le pagine
- stati hover, focus, disabled uniformi
- copy breve e orientata ad azione

---

## Piano di implementazione (4 sprint)

### Sprint 1: Fondazioni UX e navigazione

Deliverable:

- nuova top navigation con accesso tool separati
- dashboard rifocalizzata su CTA principali
- introduzione componenti shell condivisi

DoD:

- nessun regressione login/dashboard
- tutti i link principali funzionanti
- layout mobile/tablet/desktop stabile

### Sprint 2: Tool Meta Ads e Funnel Pages

Deliverable:

- pagina /tools/meta-ads con endpoint dedicato `/api/tools/meta-ads/generate`
- pagina /tools/funnel-pages con endpoint dedicato `/api/tools/funnel-pages/generate`
- gestione del processo multi-step funnel sul client (optin, quiz, vsl)

DoD:

- stream funzionante end to end su entrambi i tool
- salvataggio artefatto coerente con modello dati attuale
- gestione errori quota e validazione chiara lato UI

### Sprint 3: Consolidamento Tool + area Artefatti

Deliverable:

- consolidamento navigazione del perimetro tool attivo
- refactoring lista artefatti con filtri e quick actions
- dettaglio artefatto read-only con output elaborato e metadati migliorati

DoD:

- tempi di accesso e ricerca migliorati
- riuso artefatto possibile in meno click
- copertura test UI minima sui flussi principali

Stato corrente:

- completato: compatibilita route legacy, lista artefatti con filtri (tipo, stato, progetto, periodo), quick actions (modifica, duplica input, elimina), dettaglio read-only con output human-readable e metadati, copertura test UI minima sui flussi principali
- aggiornamento post-sprint: hotfix UX preview card completato (rimozione JSON raw, formatting semantico, fallback sicuro, integrazione dashboard/progetti)

### Sprint 4: Hardening UX e Admin polish

Deliverable:

- refinements accessibilità WCAG AA
- ottimizzazioni responsive
- miglioramenti dashboard admin (ricerca, drawer quota, timeline)

DoD:

- passaggio checklist accessibilità
- nessun blocco critico nei flussi core
- metriche baseline raccolte e confrontabili

Stato corrente:

- completato: ricerca utenti admin, indicatori quota/budget a semaforo, filtro timeline audit per stato e tipo, drawer gestione quota con supporto tastiera (Esc + focus trap), refinements accessibilita WCAG AA su pagine core (admin e artefatti), metriche baseline strutturate in dashboard admin

---

## Impatti tecnici previsti

Frontend:

- nuove route App Router per i tool dedicati
- refactor di componenti layout condivisi
- revisione hook per supportare preset per tool
- utilita di normalizzazione preview artefatti riusabile tra lista e widget dashboard

Backend:

- nessuna rottura API obbligatoria in prima fase
- opzionale estensione payload input per migliorare preset e metadata

Testing:

- aggiornamento test e2e per i nuovi entry point
- test di regressione su autenticazione, generazione e salvataggio
- test unit/integration su rendering preview artefatti (structured JSON + fallback)

---

## Rischi e mitigazioni

1. Rischio: frammentazione UX tra tool
- Mitigazione: componenti condivisi e template pagina unico

2. Rischio: regressioni sul flusso di generazione
- Mitigazione: mantenere endpoint invariati nella fase iniziale

3. Rischio: over-design e aumento complessità
- Mitigazione: privilegiare semplicità operativa e dati di utilizzo reali

---

## Metriche di successo post-refactor

- Task completion rate per generazione
- Tempo medio da apertura tool a completamento artefatto
- Numero medio di rigenerazioni per sessione
- Adozione dei tool separati (Meta Ads vs Funnel Pages)
- Error rate su validazione input e quota

---

## Prossimi passi immediati

1. Validare il risultato con SEO + MediaBuyer su dataset reale
2. Misurare qualitativamente il tempo di scansione lista prima/dopo hotfix
3. Valutare estensione del formatter preview anche in export/report interni
4. Consolidare linee guida copy preview nel design system


---

## Analisi critica GUI attuale: suggerimenti, criticità e opportunità

### 1. Architettura generale e layout
- **Viewport**: layout a colonna singola centrata, ottimo per leggibilità ma poco denso su schermi grandi. Opportunità: aumentare densità informativa su desktop.
- **Navbar**: non sticky/fixed, su viewport piccoli la navigazione può perdersi scorrendo. Opportunità: rendere la navbar sticky o introdurre una sidebar persistente.
- **Responsività**: alcune griglie rischiano stacking verticale poco leggibile su mobile. Opportunità: ottimizzare breakpoints e layout mobile-first.

### 2. Gerarchia visiva e flusso
- **Hero/Intro**: molto spazio verticale, spinge contenuti chiave sotto la piega. Opportunità: ridurre altezza hero, portare CTA e widget chiave in alto.
- **Azioni principali**: evitare CTA ridondanti verso flussi non piu presenti nel perimetro MVP.
- **Tool**: cards tool non sempre accessibili, serve scroll. Opportunità: tool switcher persistente (sidebar o topbar).

### 3. Densità informativa e discoverability
- **Quota e budget**: informazioni chiare ma troppo separate. Opportunità: barra compatta orizzontale o widget aggregato.
- **Progetti recenti**: griglia efficace, ma manca vista tabellare/compatta per utenti avanzati. Opportunità: aggiungere toggle lista/griglia.
- **Artefatti**: manca preview rapida in dashboard. Opportunità: mostrare ultimi artefatti direttamente in home con quick actions.

### 4. Accessibilità e usabilità
- **Contrasto**: gradient hero rischia basso contrasto. Opportunità: palette più neutra o gradienti meno saturi.
- **Navigazione**: highlight pagina attiva poco evidente. Opportunità: indicatori visivi più marcati.
- **Azioni rapide**: manca floating action button o barra laterale per azioni frequenti.

### 5. Opportunità di riorganizzazione
- **Sidebar persistente**: su desktop, sidebar fissa con tool, progetti, quota e azioni rapide sempre accessibili.
- **Dashboard compatta**: hero ridotta, azioni principali in alto, quota/budget in barra compatta.
- **Sezione “Prossime azioni”**: evidenziare task suggeriti coerenti con i tool attivi del workspace.
- **Preview artefatti recenti**: mostrare ultimi artefatti in dashboard, con azioni rapide (duplica, modifica, elimina).
- **Mobile-first**: rivedere griglie per evitare stacking verticale eccessivo.

### 6. Consigli pratici
- Navbar sticky/fixed per accesso rapido.
- Sidebar (desktop) con tool e progetti, main content a destra.
- Dashboard a widget: quota, budget, progetti, artefatti come widget drag & drop.
- Azioni rapide sempre visibili (FAB o barra inferiore su mobile).
- Modalità dark/light facilmente accessibile.
- Animazioni micro-interazioni (hover, transizioni, feedback azioni).

---

**Nota:** Questi punti sono da considerare come backlog di miglioramento continuo, da validare con utenti reali e prioritizzare in base a metriche di utilizzo e feedback qualitativo.
