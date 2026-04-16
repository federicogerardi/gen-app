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

### Job batch asincroni persistenti per funnel generation

- Contesto: il flusso step-by-step di generazione funnel puo interrompersi se l'utente cambia pagina o chiude la view durante l'esecuzione; oggi la continuita puo ancora dipendere dalla permanenza nella pagina tool.
- Ipotesi: introdurre job batch asincroni server-side che orchestrino l'intero ciclo multistep (es. optin -> quiz -> vsl), continuino anche se l'utente naviga altrove e siano ripristinabili/monitorabili.
- Impatto atteso: maggiore completion rate del ciclo completo, minori artefatti parziali, maggiore affidabilita operativa e UX piu robusta in presenza di navigazione utente o run lunghi.
- Dipendenze o vincoli noti: stato job persistente, coda job, idempotenza step, gestione retry/failure per step, endpoint di polling o stream di stato, ownership e quota/rate limit enforcement per job.
- Segnali per promuovere a planning: metriche che mostrano drop durante navigazione, definizione chiara del contratto API job-based (submit/status/cancel), validazione impatto su costi e rate limit, conferma requisiti infrastrutturali e piano rollout incrementale con osservabilita.
- Data nota: 2026-04-12.
- Owner proposto: Platform + LLM/Tooling + Product team.

### Vista aggregata artefatti funnel nella pagina dettaglio

- Contesto: gli artefatti funnel vengono mostrati come tre dettagli separati (optin, quiz, vsl), rendendo frammentata la lettura del risultato complessivo.
- Ipotesi: introdurre una vista aggregata nella pagina dettaglio artefatti che raggruppi i tre output funnel correlati in un unico contesto navigabile.
- Impatto atteso: migliore comprensione end-to-end del funnel, minori cambi pagina, revisione e confronto contenuti piu rapidi.
- Dipendenze o vincoli noti: relazione esplicita tra artefatti dello stesso funnel run, strategia di ordinamento/versioning, UI per anteprima combinata senza perdere accesso al dettaglio singolo, impatti su query API e performance.
- Segnali per promuovere a planning: definizione di un identificatore condiviso di gruppo funnel, mock UX validato, stima impatto tecnico su backend e frontend con piano di migrazione non distruttivo.
- Data nota: 2026-04-13.
- Owner proposto: Product + Frontend + Platform team.

### Trend generazioni in dashboard con confronto globale vs utente

- Contesto: nella dashboard esiste ora un trend personale MVP, ma manca ancora una vista comparativa dell'andamento nel tempo tra uso del singolo utente e andamento globale dell'app.
- Ipotesi: introdurre un grafico a linea time-series con due serie sovrapposte: totale generazioni globali dell'app e totale generazioni dell'utente che ha accesso alla dashboard.
- Impatto atteso: maggiore visibilita sull'adozione complessiva, auto-valutazione dell'utilizzo personale rispetto al contesto generale, supporto a decisioni su quota e priorita operative.
- Dipendenze o vincoli noti: definizione finestra temporale e granularita (giorno/settimana), coerenza timezone, policy privacy per esposizione metrica globale, endpoint analytics con filtri sicuri e performance adeguata.
- Segnali per promuovere a planning: allineamento su metriche e definizioni (cosa conta come generazione), bozza UX approvata per chart e filtri periodo, decisione esplicita su policy/privacy della metrica globale, verifica carico query e strategia cache.
- Data nota: 2026-04-13.
- Owner proposto: Product + Analytics + Frontend team.

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

### RAG locale con MCP per ricerca semantica su artefatti e template

- Contesto: gli orchestratori e gli agenti LLM del progetto gestiscono molteplici tool-prompt template e artefatti generati storicamente, ma l'accesso al contesto passato e limitato dalla dimensione della finestra di contesto LLM e dalla necessità di letture file manuali o pesanti caricamenti di dati nel prompt. Gli agenti potrebbero beneficiare di accesso efficiente e semantico alla base di knowledge locale (template, artefatti storici, pattern di generazione precedenti). Allo stesso tempo, la memoria di progetto distribuita in docs/ (adrs, implementation, specifications, review ecc.) rappresenta una knowledge base ricchissima ma scarsamente interrogabile semanticamente e facilmente accessibile dagli agenti.
- Ipotesi: implementare un servizio RAG locale (Retrieval-Augmented Generation) basato su embeddings e ChromaDB esposto via MCP, che permetta agli orchestratori LLM e agli agenti di richiedere chunk rilevanti da template e artefatti storici, senza caricamenti massivi e con latenza minimale. Il servizio indexerebbe i markdown dei tool-prompts, una representative sample di artefatti precedenti, e inoltre la memoria di progetto completa contenuta in docs/ per consentire agli agenti di esplorare decisioni architetturali, specifiche API, risultati di audit e migliori pratiche consolidate.
- Impatto atteso: migliore context awareness degli agenti (fondamentale per improvement prompt). minore utilizzo di context window LLM (minori costi), accelerazione nel retrieval di pattern e best practice precedenti, supporto a flussi di raffinamento iterativo dove l'agente accede a generazioni passate per imparare pattern di qualita, miglior onboarding degli agenti con accesso a memoria locale di decision e risultati senza overhead. Inoltre, accesso semantico efficace alla memoria di progetto permette agli agenti di fondare le decisioni su adrs e specifiche consolidate, ridurre drift rispetto a convenzioni documentate e rafforzare coerenza operativa.
- Dipendenze o vincoli noti: architettura MCP server (Python, Node.js, Rust), modello embedding locale (sentence-transformers, ONNX per CPU-only inference). versionamento indice (invalidazione quando template o docs cambiano), sicurezza ownership su artefatti storici (non esporre dati di altri utenti), tuning chunking strategy e similitudine semantica threshold, impatto memoria/storage per vector store. Necessaria strategia di refresh indice quando docs viene aggiornato (es. sync incrementale o rebuilds periodici).
- Segnali per promuovere a planning: proof-of-concept di indexing e query su subset template mini-funnels attuali e su sample ridotto di docs/. misurazione latenza e quality dei risultati semantici per decisioni di raffinamento. definizione schema MCP tool (es. query_artifacts, query_project_memory, update_index), integrazione con orchestratore legacy, piano rollout incrementale senza breaking change. Validazione che retrieval semantico da docs/ sia effettivamente piu utile di file search classica per i casi d'uso target.
- Data nota: 2026-04-16.
- Owner proposto: LLM/Tooling + Platform + Research team.
- Riferimento: https://dev.to/lord_magus/supercharging-my-vs-code-ai-agent-with-local-rag-25n8

### Sistema news/changelog in-app per la dashboard

- Contesto: gli utenti non hanno visibilita sulle novita rilasciate, sugli aggiornamenti in corso o su problemi noti; le comunicazioni avvengono fuori banda (chat, email) e non sono contestuali all'uso dell'app. Manca un canale dedicato e persistente per mantenere gli utenti informati senza interrompere il flusso di lavoro.
- Ipotesi: introdurre un feed di news/changelog visibile nella dashboard, con flusso editoriale separato per ambiente prod e dev, che consenta al team di pubblicare aggiornamenti di release, novita di funzionalita, stati di avanzamento e manutenzioni pianificate direttamente in-app.
- Impatto atteso: maggiore trasparenza verso gli utenti interni, riduzione delle richieste di supporto su funzionalita appena rilasciate, feedback loop piu rapido su nuove feature, possibilita di testare comunicazioni in dev prima di esporle in prod.
- Dipendenze o vincoli noti: modello dati per news item (titolo, corpo, tipo, ambiente, data pubblicazione, autore), interfaccia admin per creazione/pubblicazione/archiviazione news, separazione esplicita prod/dev (es. tramite flag ambiente o endpoint dedicato), gestione stato lettura per utente (badge unread), policy di visibilita per ruolo, eventuale integrazione con CHANGELOG.md esistente come sorgente di verita per release note.
- Segnali per promuovere a planning: definizione dell'UI di inserimento (admin) e di lettura (dashboard), decisione su storage (tabella DB vs file markdown versionato), allineamento su flusso editoriale e responsabilita di pubblicazione, bozza UX del widget in-dashboard approvata.
- Data nota: 2026-04-16.
- Owner proposto: Product + Frontend + Platform team.

## Temi promossi o chiusi

### Rilancio generazione da dettaglio artefatto

- Stato: promosso e completato nello sprint GUI/UX low-impact.
- Riferimenti: [../implementation/gui-ux-low-impact-microtasks-sprint-plan-2026-04-14.md](../implementation/gui-ux-low-impact-microtasks-sprint-plan-2026-04-14.md), [../implement-index.md](../implement-index.md).

### Vista ultimi artefatti generati in dashboard

- Stato: promossa e completata nello sprint GUI/UX low-impact.
- Riferimenti: [../implementation/gui-ux-low-impact-microtasks-sprint-plan-2026-04-14.md](../implementation/gui-ux-low-impact-microtasks-sprint-plan-2026-04-14.md), [../implement-index.md](../implement-index.md).

### Trend personale dashboard 7/30 giorni

- Stato: MVP personale completato; questa nota mantiene aperto solo l'eventuale follow-up sul confronto globale vs utente.
- Riferimenti: [../implementation/gui-ux-low-impact-microtasks-sprint-plan-2026-04-14.md](../implementation/gui-ux-low-impact-microtasks-sprint-plan-2026-04-14.md), [../implement-index.md](../implement-index.md).
