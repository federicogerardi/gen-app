# GUI Refactoring Plan: UX Moderna e Funzionale

Versione: 1.0  
Data: 2026-04-08  
Input di partenza: [docs/ux-strategy.md](docs/ux-strategy.md)  
Target utenti: SEO Specialist, MediaBuyer

---

## Obiettivo

Rendere la GUI più veloce, chiara e orientata ai task quotidiani del team marketing:

- generare artefatti con tool separati per tipo di lavoro (Content, SEO, Code)
- ridurre il tempo di esecuzione del flusso principale
- aumentare qualità percepita e controllo dell output generato

KPI primari:

- tempo medio per prima generazione completata < 2 minuti
- completamento flusso senza errori > 90%
- riduzione passaggi necessari da dashboard a generazione completata

---

## Job To Be Done operativo

Quando un SEO Specialist o MediaBuyer deve produrre rapidamente varianti di contenuto per campagne, vuole entrare in un tool specializzato per il task corrente, compilare pochi campi chiari e ottenere output modificabile in tempo reale, così da iterare rapidamente senza cambiare contesto.

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

5. Editabilità immediata
- Output modificabile subito dopo lo stream, con salvataggio chiaro.

---

## Nuova architettura di navigazione

### Navigazione primaria

- Dashboard
- Tool Content
- Tool SEO
- Tool Code
- Artefatti
- Progetti
- Admin (solo role admin)

### Routing target

- Dashboard overview: /dashboard
- Tool Content: /tools/content
- Tool SEO: /tools/seo
- Tool Code: /tools/code
- Lista artefatti: /artifacts
- Dettaglio artefatto: /artifacts/[id]

Nota: in fase 1 è possibile mantenere /artifacts/new e usarlo come fallback fino al completamento dei tre tool dedicati.

---

## Refactoring per area UI

### 1) Dashboard

Obiettivo: diventare un hub di scelta task e non una pagina generica.

Interventi:

- Hero con CTA separate: Crea Content, Crea SEO, Crea Code
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

- Content: focus su tono, audience, lunghezza, obiettivo campagna
- SEO: focus su keyword, search intent, formato SERP, meta output
- Code: focus su framework, linguaggio, vincoli tecnici, output format

### 3) Artefatti

Obiettivo: consultazione e riuso più rapidi.

Interventi:

- filtri fissi per tipo, stato, progetto, periodo
- anteprima leggibile in lista
- azioni rapide: duplica input, modifica, elimina
- pagina dettaglio con editor migliorato e metadati in sidebar

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

### Sprint 2: Tool Content e Tool SEO

Deliverable:

- nuove pagine /tools/content e /tools/seo
- form dedicati con opzioni avanzate collapsible
- integrazione con endpoint di generazione esistenti

DoD:

- stream funzionante end to end su entrambi i tool
- salvataggio artefatto coerente con modello dati attuale
- gestione errori quota e validazione chiara lato UI

### Sprint 3: Tool Code e area Artefatti

Deliverable:

- pagina /tools/code
- refactoring lista artefatti con filtri e quick actions
- dettaglio artefatto con editor e metadati migliorati

DoD:

- tempi di accesso e ricerca migliorati
- riuso artefatto possibile in meno click
- copertura test UI minima sui flussi principali

### Sprint 4: Hardening UX e Admin polish

Deliverable:

- refinements accessibilità WCAG AA
- ottimizzazioni responsive
- miglioramenti dashboard admin (ricerca, drawer quota, timeline)

DoD:

- passaggio checklist accessibilità
- nessun blocco critico nei flussi core
- metriche baseline raccolte e confrontabili

---

## Impatti tecnici previsti

Frontend:

- nuove route App Router per i tool dedicati
- refactor di componenti layout condivisi
- revisione hook per supportare preset per tool

Backend:

- nessuna rottura API obbligatoria in prima fase
- opzionale estensione payload input per migliorare preset e metadata

Testing:

- aggiornamento test e2e per i nuovi entry point
- test di regressione su autenticazione, generazione e salvataggio

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
- Adozione dei tool separati (Content vs SEO vs Code)
- Error rate su validazione input e quota

---

## Prossimi passi immediati

1. Validare il piano con il team (SEO + MediaBuyer + admin)
2. Definire wireframe low-fi per dashboard e tre tool
3. Aprire epic e task tecnici per Sprint 1
4. Eseguire implementazione incrementale con rilasci settimanali
