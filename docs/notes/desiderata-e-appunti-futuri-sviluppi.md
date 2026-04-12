# Desiderata e Appunti per Futuri Sviluppi

## Scopo

Questa pagina raccoglie idee, desiderata e note preliminari non ancora trasformati in piano operativo, refactoring o backlog esecutivo.

Usare questo spazio quando un input e utile per orientare le prossime decisioni, ma non e ancora pronto per entrare in `docs/implementation` o in documenti di review.

## Regole di utilizzo

- Inserire solo appunti esplorativi o opportunita future.
- Non inserire task gia pianificati o attivita gia in esecuzione.
- Quando un tema diventa operativo, spostarlo in un documento di planning adeguato e lasciare qui solo un rimando.
- Mantenere note concise, verificabili e orientate alla decisione.

## Template rapido

### Titolo idea

- Contesto: quale problema o opportunita emerge.
- Ipotesi: cosa potrebbe migliorare.
- Impatto atteso: benefici potenziali (prodotto, UX, operativita, costo, rischio).
- Dipendenze o vincoli noti: prerequisiti, rischi, assunzioni.
- Segnali per promuovere a planning: condizioni minime per passare a un piano attivo.
- Data nota: YYYY-MM-DD.
- Owner proposto: team o ruolo che potrebbe approfondire.

## Appunti aperti

### Batch multistep resiliente per funnel generation

- Contesto: il flusso step-by-step di generazione funnel puo interrompersi se l'utente cambia pagina o chiude la view durante l'esecuzione.
- Ipotesi: introdurre una operazione batch server-side che orchestri l'intero ciclo multistep (es. optin -> quiz -> vsl) in modo asincrono e ripristinabile.
- Impatto atteso: maggiore completion rate del ciclo completo, minori artefatti parziali, UX piu robusta in presenza di navigazione utente.
- Dipendenze o vincoli noti: stato job persistente, idempotenza step, gestione retry/failure per step, endpoint di polling o stream di stato, ownership e quota enforcement per job.
- Segnali per promuovere a planning: metriche che mostrano drop durante navigazione, definizione chiara del contratto API job-based, validazione impatto su costi e rate limit.
- Data nota: 2026-04-12.
- Owner proposto: Platform + LLM/Tooling team.
