---
goal: User Journey as-is di HotLeadFunnel per validazione replicability
version: 1.0
date_created: 2026-04-17
date_updated: 2026-04-17
status: Active
tags: [ux, user-journey, funnel-pages, hlf, tool-cloning]
---

# User Journey: HotLeadFunnel

## Goal

Marketer interno vuole generare i 3 step funnel (optin, quiz, VSL) a partire da briefing file per ottenere output operativi senza scrivere codice.

## Journey Map

### Stage 1: Entry & Orientation (0-30 sec)

What User Sees

- Landing su /tools/funnel-pages
- Titolo pagina HotLeadFunnel con descrizione breve
- Card Setup con blocchi sequenziali: Progetto, Briefing, Opzioni facoltative
- Stato rapido aperto di default con progressione step

What User Thinks

- Dove comincio
- Mi basta caricare briefing o devo compilare altri campi

What User Feels

- Curiosita iniziale
- Riduzione incertezza grazie alla checklist Stato rapido

### Stage 2: Form Completion (30-120 sec)

What User Does

- Seleziona progetto da dialog
- Carica file briefing (.docx/.txt/.md)
- Se necessario, imposta modello e tono
- Attende upload+estrazione e verifica stato pronto

What User Thinks

- L estrazione sta funzionando
- Posso riprendere da checkpoint se avevo gia iniziato

What User Feels

- Confidenza quando lo stato passa a Estrazione pronta
- Possibile frizione se non e disponibile un progetto o il file e invalido

### Stage 3: Generation In Progress (durata stream)

What User Does

- Avvia generazione funnel
- Osserva avanzamento step (optin, quiz, vsl)
- Legge eventuali retry notice o errori per step

What User Thinks

- Il processo e in corso o bloccato
- Devo riprovare o posso attendere completamento

What User Feels

- Controllo durante progressione step-by-step
- Ansia ridotta grazie a messaggi di retry espliciti

### Stage 4: Output & Action (post-stream)

What User Does

- Legge i 3 output generati
- Apre artefatti specifici
- Decide se rigenerare da zero o avviare nuova generazione

What User Thinks

- Gli output sono pronti per uso operativo
- Se devo iterare, quali azioni secondarie uso

What User Feels

- Soddisfazione se i tre step sono completati
- Chiarezza operativa grazie a CTA primaria e secondarie contestuali

## Success Metrics

- Utente completa setup e avvia generazione senza supporto esterno
- Utente comprende in ogni stato quale azione e disponibile
- Utente recupera progresso tramite resume quando presente checkpoint utile
