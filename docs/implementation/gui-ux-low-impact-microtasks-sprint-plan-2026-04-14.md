# GUI/UX Low-Impact Microtasks Sprint Plan (2026-04-14)

## Scopo

Estrarre microtask GUI/UX a basso impatto implementativo per uno sprint breve, incrociando:

- desiderata in `docs/notes/desiderata-e-appunti-futuri-sviluppi.md`
- task pending e gap UX operativi in `docs/implement-index.md` e piani UX correlati

Vincolo di selezione: interventi con basso rischio regressione, senza modifiche schema DB e senza refactor architetturali profondi.

## Criteri di selezione low-impact

- impatto prevalente su UI/copy/layout/comportamento client
- backend opzionale o minimale (query gia esistenti o estensioni additive leggere)
- nessuna dipendenza da queue/job engine, nuove primitive infrastrutturali o policy di billing
- testabile con unit/integration/UI smoke in tempi sprint

## Fonti usate per l'estrazione

- `docs/notes/desiderata-e-appunti-futuri-sviluppi.md`
- `docs/implement-index.md`
- `docs/ux/gui-refactor-plan.md`
- `docs/ux/projects-first-navigation-plan.md`

## Esclusioni esplicite (non low-impact)

Le seguenti idee restano fuori da questo sprint per impatto medio/alto:

- batch multistep resiliente server-side e job asincroni persistenti
- selezione modello LLM per singolo step con fallback configurabile
- chaining artifact-to-artifact con contratto input unificato cross-tool
- vista aggregata funnel completa se richiede nuovo identificatore di gruppo e migrazione dati

## Backlog microtask estratto (sprint singolo)

### MT-UX-01 - CTA rilancio da dettaglio artefatto verso generazione con prefill

- Origine: desiderata "Rilancio generazione da dettaglio artefatto".
- Pending correlato: migliorare continuita iterativa del flusso e quick actions su artefatti.
- Deliverable: bottone primario "Rigenera variante" nella pagina dettaglio che apre il tool coerente con query params precompilate dai campi gia disponibili.
- Impatto stimato: basso.
- Dipendenze: mappatura minimale campi prefill per tipologia artefatto gia supportata.
- DoD: il rilancio richiede meno click rispetto al flusso manuale e mantiene ownership/quota invariati.

### MT-UX-02 - CTA secondaria "Usa come base" nella lista storico artefatti

- Origine: desiderata su riduzione frizione di reiterazione.
- Pending correlato: ottimizzazione consultazione/riuso in area artefatti.
- Deliverable: quick action in card elenco storico che indirizza al tool con prefill essenziale.
- Impatto stimato: basso.
- Dipendenze: stessa mappa prefill di MT-UX-01.
- DoD: quick action visibile e funzionante su desktop/mobile con fallback disabilitato se tipologia non supportata.

### MT-UX-03 - Blocco dashboard "Ultimi artefatti generati" (N elementi)

- Origine: desiderata "Vista ultimi artefatti generati in dashboard".
- Pending correlato: dashboard come hub operativo project-first.
- Deliverable: widget dashboard con ultimi N artefatti utente (titolo, tipo, stato, data, link dettaglio).
- Impatto stimato: basso.
- Dipendenze: query gia esistente o estensione additiva leggera lato endpoint/dashboard page.
- DoD: caricamento stabile, stato empty chiaro, nessun leakage campi economici user-facing.

### MT-UX-04 - Mini trend dashboard (sparkline) uso personale 7/30 giorni

- Origine: desiderata trend generazioni con confronto globale vs utente (ridotto a MVP low-impact).
- Pending correlato: visibilita utilizzo e metriche operative.
- Deliverable: grafico minimale solo user-level (serie singola) con selettore periodo 7d/30d.
- Impatto stimato: basso-medio (versione ridotta).
- Dipendenze: dataset aggregato semplice (anche server-side derivato da dati gia disponibili).
- DoD: nessuna metrica globale esposta in questa iterazione; chart leggibile e responsive.

### MT-UX-05 - Microcopy e label IA coerenti su "Progetti/Tools/Storico"

- Origine: pending post projects-first (affinamento copy e micro-interazioni).
- Pending correlato: chiarezza del modello mentale workspace-first.
- Deliverable: revisione label/descrizioni CTA nelle superfici top-level (dashboard, navbar, storico artefatti).
- Impatto stimato: basso.
- Dipendenze: nessuna.
- DoD: lessico uniforme in tutta la shell autenticata, senza cambiare rotte o logiche business.

### MT-UX-06 - Accessibilita sprint checklist: keyboard flow e focus visible

- Origine: checklist finale Sprint 2 ancora pending.
- Pending correlato: hardening WCAG AA su pagine core.
- Deliverable: fix puntuali su tab order, focus ring e controlli interattivi principali.
- Impatto stimato: basso.
- Dipendenze: audit rapido per viewport principali.
- DoD: checklist keyboard flow completata per dashboard, tools, storico, dettaglio artefatto, admin.

### MT-UX-07 - Accessibilita sprint checklist: contrasto e messaggi stato/errore

- Origine: checklist finale Sprint 2 ancora pending.
- Pending correlato: robustezza messaggi `status/alert`.
- Deliverable: allineamento contrasto badge/testi sensibili e verifica annunci accessibili nei form di generazione.
- Impatto stimato: basso.
- Dipendenze: nessuna.
- DoD: passaggio checklist contrasto + annunci coerenti con `role="alert"` / `aria-live` dove necessario.

### MT-UX-08 - Stato run in storico: badge semplificati e ordinamento per recenza

- Origine: desiderata ultimi artefatti + pending ottimizzazione consultazione.
- Pending correlato: scansione piu veloce storico personale.
- Deliverable: semplificazione tassonomia badge stato e ordinamento deterministico by recency.
- Impatto stimato: basso.
- Dipendenze: nessuna (solo UI/data mapping).
- DoD: scansione visiva migliorata senza cambiare i valori di stato canonici lato API.

## Contributo operativo aggiuntivo (ready-to-execute)

### Prioritizzazione pratica (impatto/effort/rischio)

Scala effort:

- XS: <= 0.5 giorno
- S: 1 giorno
- M: 1.5-2 giorni

Valutazione sintetica:

- MT-UX-05: impatto medio, effort XS, rischio basso
- MT-UX-08: impatto medio, effort XS, rischio basso
- MT-UX-01: impatto alto, effort S, rischio basso
- MT-UX-02: impatto medio, effort S, rischio basso
- MT-UX-03: impatto alto, effort S, rischio basso
- MT-UX-06: impatto medio, effort S, rischio basso
- MT-UX-07: impatto medio, effort XS-S, rischio basso
- MT-UX-04: impatto medio, effort M, rischio medio

### Pacchetti sprint consigliati

Pacchetto A (baseline consigliata, 5 microtask):

- MT-UX-05
- MT-UX-08
- MT-UX-01
- MT-UX-03
- MT-UX-06

Pacchetto B (estensione naturale, +2 microtask):

- MT-UX-02
- MT-UX-07

Pacchetto C (stretch goal opzionale):

- MT-UX-04

Motivazione:

- Pacchetto A massimizza valore percepito immediato (iterazione, leggibilita, accessibilita) con rischio minimo.
- Pacchetto B completa il riuso artefatti e chiude l hardening semantico errori/stati.
- Pacchetto C resta opzionale perche il trend chart introduce dipendenza dati e rischio di scope creep.

### Microtask pronti per assegnazione

Per ogni task, usare template operativo uniforme:

- Obiettivo utente: cosa migliora nel flusso reale.
- Delta UI: componenti/pagine toccate.
- Vincoli: ownership, quota, semantica project-first, accessibilita.
- Evidenza test: unit/integration/smoke minimi da aggiornare.

Proposta assegnazione iniziale:

- Frontend-1: MT-UX-05, MT-UX-08, MT-UX-03
- Frontend-2: MT-UX-01, MT-UX-02
- QA/UX: MT-UX-06, MT-UX-07
- Frontend + Platform (solo se capacity): MT-UX-04

### KPI sprint minimi consigliati

- Time-to-rerun da dettaglio artefatto ridotto almeno del 30% (baseline interna pre/post).
- Click medi per avviare una nuova variante da storico <= 2.
- Nessun blocker accessibilita su keyboard flow nelle pagine core in scope.
- Nessuna regressione su route auth/ownership/quota verificate dalla suite toccata.

### Regole anti-scope-creep

- Nessuna nuova route non strettamente necessaria.
- Nessun cambio schema DB.
- Nessun refactor cross-layer fuori dal perimetro GUI/UX dichiarato.
- Se un task supera effort M, split immediato in due microtask e rinvio dello scope eccedente.

## Sequenziamento sprint raccomandato (5 giorni)

1. Giorno 1: MT-UX-05, MT-UX-08 (allineamento copy/semantica e coerenza storico)
2. Giorno 2: MT-UX-01, MT-UX-02 (riuso/prefill da artefatti)
3. Giorno 3: MT-UX-03 (widget ultimi artefatti)
4. Giorno 4: MT-UX-04 (sparkline user-only) + hardening responsive
5. Giorno 5: MT-UX-06, MT-UX-07 + regressione test e polish

## Capacity target suggerita

- Totale microtask: 8
- Target completamento sprint: 6-8 (in base a scope MT-UX-04)
- Scope cut immediato in caso di rischio: rinviare MT-UX-04 mantenendo invariati gli altri 7 microtask

## Gate di chiusura sprint

- nessuna regressione su auth/ownership/quota nei flussi di rilancio
- coerenza UX project-first preservata
- checklist accessibilita Sprint 2 chiusa sui punti dichiarati
- test lint/typecheck e suite toccate in verde
