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

### Rilancio generazione da dettaglio artefatto

- Contesto: dalla pagina dettaglio artefatto manca un percorso rapido per rilanciare una nuova generazione partendo dai dati gia disponibili.
- Ipotesi: valutare due UX alternative: form embedded nella pagina dettaglio oppure CTA verso pagina generazione con campi precompilati (invece di nuovo upload file), con comportamento differenziato tra artefatto di estrazione e artefatti funnel (optin, quiz, vsl).
- Impatto atteso: riduzione del tempo di reiterazione, minore frizione operativa, migliore continuita del flusso di lavoro quando serve rigenerare varianti.
- Dipendenze o vincoli noti: mappatura affidabile dei campi riusabili, gestione dei default e delle override utente, differenze di input tra extraction e funnel, ownership check e quota/rate limit invariati nel rilancio.
- Segnali per promuovere a planning: decisione esplicita su pattern UX (embedded vs redirect prefill), contratto tecnico per prefill per ogni tipologia artefatto, conferma che il rilancio non introduce regressioni sui controlli di sicurezza e billing.
- Data nota: 2026-04-13.
- Owner proposto: Product + Frontend + Tooling team.

### Vista aggregata artefatti funnel nella pagina dettaglio

- Contesto: gli artefatti funnel vengono mostrati come tre dettagli separati (optin, quiz, vsl), rendendo frammentata la lettura del risultato complessivo.
- Ipotesi: introdurre una vista aggregata nella pagina dettaglio artefatti che raggruppi i tre output funnel correlati in un unico contesto navigabile.
- Impatto atteso: migliore comprensione end-to-end del funnel, minori cambi pagina, revisione e confronto contenuti piu rapidi.
- Dipendenze o vincoli noti: relazione esplicita tra artefatti dello stesso funnel run, strategia di ordinamento/versioning, UI per anteprima combinata senza perdere accesso al dettaglio singolo, impatti su query API e performance.
- Segnali per promuovere a planning: definizione di un identificatore condiviso di gruppo funnel, mock UX validato, stima impatto tecnico su backend e frontend con piano di migrazione non distruttivo.
- Data nota: 2026-04-13.
- Owner proposto: Product + Frontend + Platform team.

### Trend generazioni in dashboard con confronto globale vs utente

- Contesto: nella dashboard manca una vista immediata dell'andamento nel tempo delle generazioni, sia a livello app sia a livello del singolo utente autenticato.
- Ipotesi: introdurre un grafico a linea time-series con due serie sovrapposte: totale generazioni globali dell'app e totale generazioni dell'utente che ha accesso alla dashboard.
- Impatto atteso: maggiore visibilita sull'adozione complessiva, auto-valutazione dell'utilizzo personale rispetto al contesto generale, supporto a decisioni su quota e priorita operative.
- Dipendenze o vincoli noti: definizione finestra temporale e granularita (giorno/settimana), coerenza timezone, policy privacy per esposizione metrica globale, endpoint analytics con filtri sicuri e performance adeguata.
- Segnali per promuovere a planning: allineamento su metriche e definizioni (cosa conta come generazione), bozza UX approvata per chart e filtri periodo, verifica carico query e strategia cache.
- Data nota: 2026-04-13.
- Owner proposto: Product + Analytics + Frontend team.

### Vista ultimi artefatti generati in dashboard

- Contesto: la dashboard non mostra in modo diretto gli artefatti piu recenti, costringendo a navigare in sezioni dedicate per recuperare il lavoro appena prodotto.
- Ipotesi: aggiungere un blocco "ultimi artefatti generati" con elenco ordinato per recenza, stato e accesso rapido al dettaglio.
- Impatto atteso: riduzione del tempo di accesso ai contenuti recenti, miglior continuita operativa, maggiore percezione di controllo del flusso di lavoro.
- Dipendenze o vincoli noti: query ottimizzata per ultime N generazioni, filtri coerenti con ownership, gestione stati parziali/falliti, fallback UI in assenza di dati.
- Segnali per promuovere a planning: definizione del set minimo campi mostrati, validazione UX del componente dashboard, verifica performance query e strategia paginazione/limite.
- Data nota: 2026-04-13.
- Owner proposto: Product + Frontend + Platform team.

### Esecuzione batch asincrona delle generazioni svincolata dalla pagina tool

- Contesto: oggi la continuita della generazione puo dipendere dalla permanenza dell'utente nella pagina del tool, con rischio di interruzione percepita o perdita di controllo quando cambia view.
- Ipotesi: introdurre job batch asincroni server-side che continuino anche se l'utente naviga altrove, con stato persistito e possibilita di monitoraggio da dashboard o area job.
- Impatto atteso: maggiore affidabilita operativa, meno abbandoni durante run lunghi, UX piu robusta e adatta a cicli multi-step.
- Dipendenze o vincoli noti: coda job persistente, idempotenza e retry per step, tracciamento stato/progress, notifica completamento, enforcement ownership/quota/rate limit durante tutta l'esecuzione.
- Segnali per promuovere a planning: definizione contratto API job-based (submit/status/cancel), conferma requisiti infrastrutturali e costi, piano rollout incrementale con osservabilita.
- Data nota: 2026-04-13.
- Owner proposto: Platform + LLM/Tooling + Product team.
- Nota priorita: alta importanza, da portare a pianificazione attiva il prima possibile.

### Selezione modello LLM per singolo step del funnel con default e fallback

- Contesto: gli step generativi del funnel (es. optin, quiz, vsl) possono avere esigenze diverse di qualita, costo e latenza, ma oggi la configurazione modello non e necessariamente differenziata per step.
- Ipotesi: permettere all'utente di scegliere il modello LLM per ciascuno step, mantenendo default e fallback configurabili nei setting del tool per garantire continuita operativa.
- Impatto atteso: maggiore controllo qualitativo per step, ottimizzazione costo/performance, riduzione failure percepite grazie a fallback automatico.
- Dipendenze o vincoli noti: matrice compatibilita modelli per capability richieste, policy di fallback deterministica, validazione permessi/piano quota, tracciamento modello effettivamente usato nei metadati artifact.
- Segnali per promuovere a planning: definizione UX/settings per mapping step->modello, strategia fallback condivisa con team LLM, test di regressione su orchestrazione/costi e coerenza reporting.
- Data nota: 2026-04-14.
- Owner proposto: LLM/Tooling + Product + Platform team.

### Artefatti come input nei generatori (artifact-to-artifact chaining)

- Contesto: i generatori accettano oggi file upload come sorgente, ma l'utente spesso dispone gia di un artefatto equivalente creato in precedenza che non dovrebbe essere necessario ricaricare.
- Ipotesi: affiancare al file upload la possibilita di selezionare un artefatto esistente come input del generatore; in prospettiva, costruire a livello infrastrutturale un contratto di input unificato che consenta a qualsiasi tool di ricevere l'output tipizzato di un altro tool.
- Impatto atteso: eliminazione di upload ridondanti, riutilizzo del lavoro gia fatto, abilitazione di flussi concatenati (es. estrazione -> optin -> quiz -> vsl) senza attrito, maggiore coerenza dei dati in ingresso.
- Dipendenze o vincoli noti: ownership check sull'artefatto selezionato, tipizzazione compatibile tra output sorgente e input destinazione, versionamento artefatto, invalidazione/refresh se l'artefatto sorgente viene aggiornato, impatto sui form UI esistenti e sull'orchestratore.
- Segnali per promuovere a planning: definizione del contratto input unificato (file vs artifact ref), mappa compatibilita tipologie output->input per ogni tool attivo, piano incrementale di adozione senza breaking change sui form esistenti.
- Data nota: 2026-04-14.
- Owner proposto: Platform + LLM/Tooling + Frontend + Product team.
