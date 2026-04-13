Audit Inconsistenze Strutturali e Logiche — Gen-App


Classificazione per Gravità e Urgenza


🔴 CRITICO — Bug funzionale attivo, impatta produzione


C1 · Dead code con format divergente in PUT /artifacts/{id}

File: src/app/api/artifacts/[id]/route.ts, righe 81–92

Il blocco di guard sullo status dell'artifact è duplicato verbatim. La prima copia (riga 82) usa apiError() e restituisce già la risposta. La seconda copia (riga 87) usa NextResponse.json() inline con formato parzialmente diverso e non viene mai raggiunta. È dead code che introduce divergenza silenziosa nell'error format e confonde la manutenzione.


C2 · DELETE /projects/{id} fallisce silenziosamente con errore 500 quando il progetto ha artifact

File: prisma/schema.prisma, src/app/api/projects/[id]/route.ts

Nel modello Artifact, la relazione project Project @relation(...) non ha onDelete: Cascade. In PostgreSQL il default è NO ACTION, che blocca la delete a livello DB. La route non gestisce il Prisma error P2014 e restituisce un 500 non strutturato all'utente. Idem per le relazioni User → Project, User → Artifact, User → QuotaHistory (nessuna ha onDelete: Cascade).


🟠 ALTO — Inconsistenza strutturale sistematica, non blocca ma introduce debt e rischio


A1 · stripArtifactCost copiata in 3 file diversi

File: artifacts/route.ts, artifacts/[id]/route.ts, projects/[id]/route.ts

Identica funzione generica copy-pastata 3 volte. Nessun helper condiviso. Qualsiasi cambiamento alla policy di rimozione del costo richiede 3 edit sincronizzati.


A2 · Pattern di autenticazione disomogeneo

File: tutti i route handler

Le route tools/* e artifacts/generate usano il guard requireAuthenticatedUser() da lib/tool-routes/guards.ts. Le route artifacts/, projects/, users/, admin/*, models/ usano auth() direttamente con NextResponse.json inline. Metà della codebase bypassa il layer condiviso.


A3 · Pattern di errori disomogeneo — apiError() vs NextResponse.json() inline

File: tutti i route handler non-tool

Le route tools/* usano apiError() da lib/tool-routes/responses.ts. Le route projects/, artifacts/, users/, admin/*, models/ costruiscono { error: { code, message } } inline ripetendo la stessa struttura decine di volte. Qualsiasi modifica al contratto errori richiede un refactor su ≥12 file.


A4 · Tutti gli endpoint admin rispondono 403 per utenti non autenticati (dovrebbe essere 401)

File: tutti i file in src/app/api/admin/

La condizione !session?.user?.id || session.user.role !== 'admin' restituisce sempre 403 FORBIDDEN. Secondo la spec API (UNAUTHORIZED → 401, FORBIDDEN → 403), un utente non autenticato dovrebbe ricevere 401, non 403. Il frontend non può distinguere i due casi.


A5 · Il filtro type in GET /artifacts esclude extraction

File: src/app/api/artifacts/route.ts, riga 9

z.enum(['content', 'seo', 'code']) — manca 'extraction'. Il tipo extraction esiste in ArtifactType e viene prodotto dal tool extraction, ma non è filtrabile dalla lista artifact. Gli artifact di tipo extraction esistono nel DB ma non possono essere filtrati dall'API.


A6 · Ordine dei guard inconsistente tra le route tool

File: tools/meta-ads/generate, tools/funnel-pages/generate vs tools/extraction/generate


    meta-ads/funnel: requireAvailableModel → enforceUsageGuards → requireOwnedProject

    extraction: requireOwnedProject → [per attempt: requireAvailableModel → enforceUsageGuards]

    L'ownership check su extraction avviene prima di qualsiasi consumo quota, che è più corretto logicamente — ma la discrepanza rende i pattern non intercambiabili e difficili da audire.



A7 · Artifact.type e Artifact.status sono String liberi nel DB, non enum Prisma

File: prisma/schema.prisma, righe 83, 88

Il commento documenta i valori attesi (// 'content' | 'seo' | 'code') ma il DB non li enforça. I tipi validi sono definiti solo in src/lib/types/artifact.ts a livello applicativo. Un bug o un seed errato può inserire valori non gestiti senza errore DB.


🟡 MEDIO — Incoerenze non bloccanti, risk di regression o confusion


M1 · calculateCost deprecated ancora usato nell'orchestrator

File: src/lib/llm/orchestrator.ts, riga 99

calculateCostAccurate è il nome canonical (deprecation già documentata in costs.ts), ma l'orchestrator usa ancora l'alias deprecated calculateCost.


M2 · Il param path si chiama modelId ma è la primary key CUID

File: src/app/api/admin/models/[modelId]/route.ts

Il path /admin/models/[modelId] suggerisce l'uso del business key modelId (es. openai/gpt-4-turbo), ma le query usano where: { id: modelId } (primary key CUID del DB). Per modificare un modello è necessario conoscere il CUID, non il model ID. È confuso per il client e non allineato alla semantica REST.


M3 · getModelPricingForRuntime usa il pricing del DEFAULT_MODEL come fallback universale

File: src/lib/llm/model-registry.ts, righe 102–106

Se un modello non è trovato nel DB (es. anthropic/claude-3.7-sonnet usato dall'extraction policy), il fallback è sempre il pricing di openai/gpt-4-turbo. Il costo calcolato per l'extraction (che usa modelli non presenti in DEFAULT_MODELS) sarà quindi errato, corrompendo monthlySpent e costUSD nell'artifact.


M4 · Cron route ha error format non conforme al contratto API

File: src/app/api/cron/cleanup-stale-artifacts/route.ts, righe 19, 24

Gli errori di misconfiguration restituiscono { error: 'stringa'} invece di { error: { code, message } }. Bassa priorità perché è un endpoint interno, ma rompe la consistenza.


M5 · useStreamGeneration — GenerateRequest.type non include 'extraction'

File: src/components/hooks/useStreamGeneration.ts, riga 21

type: 'content' | 'seo' | 'code' — manca 'extraction'. Il hook bypassa questo limite accettando anche Record<string, unknown>, ma il typing esplicito è fuorviante e non supporta il tool extraction in modo type-safe.


M6 · models/route.ts inizializza il logger dopo le query DB

File: src/app/api/models/route.ts, righe 12–21

Il logger viene creato DOPO Promise.all([listPublicModels(), getModelPricingStaleness()]). Se le query fallissero, non ci sarebbe contesto di log. Pattern inconsistente con tutti gli altri handler che inizializzano il logger all'inizio.


M7 · API spec documenta GET /artifacts come "non ancora implementato" ma esiste

File: docs/specifications/api-specifications.md

La sezione "Documented but not yet implemented" elenca GET /artifacts, ma il file src/app/api/artifacts/route.ts esiste ed è funzionante. La spec è obsoleta e crea confusione su cosa è disponibile.


🟢 BASSO — Pulizia, nessun impatto funzionale


B1 · SSE response artifacts/generate include x-request-id, sseResponse() helper no

File: artifacts/generate/route.ts vs lib/tool-routes/responses.ts

L'endpoint legacy genera la Response SSE manualmente con header x-request-id. Gli endpoint tool usano sseResponse() che non lo include. Il header di correlazione non è uniforme.


B2 · ~100 righe di helper functions inline nel route funnel-pages/generate

File: src/app/api/tools/funnel-pages/generate/route.ts, righe 35–215

asNonEmptyString, asBoolean, asDesiredClusterCount, asClusterProfiles, etc. sono helper di mapping specifici per la normalizzazione dell'extraction output, ma vivono inline nel route handler. Difficile testare isolatamente.


Piano Sprint Ragionato


Sprint 1 — Stabilità critica (Bug + DB integrity)

Obiettivo: eliminare i bug attivi che possono causare 500 e corrompere dati.


    C2 — Cascade delete: aggiungere onDelete: Cascade alle relazioni Project → Artifact, User → Project, User → Artifact, User → QuotaHistory nello schema Prisma + migrazione. In alternativa, gestire il Prisma P2014 nella route delete con delete cascade manuale in transazione + risposta 409 documentata.

    C1 — Dead code PUT artifacts: rimuovere il blocco duplicato (righe 87–92) da artifacts/[id]/route.ts.

    M3 — Pricing fallback errato: aggiornare getModelPricingForRuntime per fare fallback al pricing del modello richiesto tra i DEFAULT_MODELS se presente, o loggare un warning esplicito quando il fallback è inevitabilmente impreciso (es. claude-3.7-sonnet → usare un fallback documentato, non il pricing di gpt-4-turbo).


Test: aggiornare i test di projects-id-route per coprire delete con artifact e il caso di fallback pricing.


Sprint 2 — Uniformazione error handling e auth pattern

Obiettivo: portare tutte le route al pattern condiviso apiError() + requireAuthenticatedUser().


    A2 + A3 — Routes non-tool: migrare artifacts/route.ts, projects/route.ts, projects/[id]/route.ts, users/profile/route.ts, users/quota/route.ts a usare apiError() da lib/tool-routes/responses.ts e opzionalmente requireAuthenticatedUser().

    A4 — Admin 401 vs 403: nelle route admin, distinguere il caso non autenticato (401 UNAUTHORIZED) da quello non autorizzato (403 FORBIDDEN). Può essere centralizzato in un helper requireAdmin() coerente che l'admin routes già usa parzialmente (admin/models lo fa) ma in modo inconsistente.

    A1 — stripArtifactCost: estrarre la funzione in un helper condiviso (es. lib/api/artifact-serializer.ts) e importarla nei 3 file.


Test: aggiornare i test di integrazione artifacts-route, projects-route, projects-id-route, admin-routes, admin-user-routes.


Sprint 3 — Consistenza tipi e schema

Obiettivo: allineare tutti i layer (DB, tipi TS, API, hook) sugli stessi valori possibili.


    A5 — Filtro type artifacts: aggiungere 'extraction' all'enum nel querySchema di GET /artifacts. Verificare che il frontend non si aspetti valori hardcoded.

    A7 — Enum Prisma per Artifact: valutare la conversione di Artifact.type e Artifact.status da String a enum Prisma. Se la conversione è troppo impattante, aggiungere almeno un @@index su type e status per query performance, e un constraint via checkConstraint Prisma se supportato.

    M5 — GenerateRequest type extraction: aggiungere 'extraction' a GenerateRequest.type in useStreamGeneration.ts o passare al tipo ArtifactType importato.

    M2 — Admin models route path semantics: rinominare il param path da [modelId] a [id] per riflettere che è la primary key, oppure cambiare le lookup da where: { id } a where: { modelId } (che è un campo @unique) per rendere l'API REST semanticamente corretta.



Sprint 4 — Pulizia tecnica e deprecazioni

Obiettivo: eliminare warning tecnici, alias deprecated e inconsistenze minori.


    M1 — orchestrator usa calculateCost: sostituire con calculateCostAccurate in orchestrator.ts.

    M4 — Cron error format: allineare i messaggi di errore della route cron al contratto { error: { code, message } }.

    M6 — Logger init order in models route: spostare l'init del logger prima delle query DB.

    B1 — x-request-id in sseResponse(): aggiungere supporto opzionale per x-request-id al helper sseResponse(requestId?: string) e propagarlo da tutti gli endpoint SSE.

    B2 — Helper funnel-pages inline: estrarre le funzioni di normalizzazione da funnel-pages/generate/route.ts in un modulo dedicato (es. lib/tool-routes/funnel-mapping.ts) e aggiungere unit test isolati.

    A6 — Ordine guard tool routes: allineare l'ordine (auth → parse → model check → ownership → usage guards) su tutte e 3 le route tool, documentando la motivazione della differenza extraction se intenzionale.



Sprint 5 — Allineamento documentazione

Obiettivo: eliminare il drift tra spec e codice reale.


    M7 — API spec aggiornamento: rimuovere GET /artifacts da "not yet implemented", documentare il filtro type con tutti i valori incluso extraction, documentare il comportamento admin 401/403 atteso post-Sprint 2.

    Artifact.type commento schema: aggiornare il commento in prisma/schema.prisma da // 'content' | 'seo' | 'code' per includere 'extraction'.

    implement-index.md housekeeping: rimuovere le sezioni chiuse (COMPLETATO) o archiviarle, mantenere solo lo stato operativo corrente leggibile.



Riepilogo priorità

ID	Gravità	Sprint	Effort
C2 (cascade delete)	🔴 CRITICO	1	M
C1 (dead code PUT)	🔴 CRITICO	1	XS
M3 (pricing fallback)	🔴 CRITICO	1	S
A1 (stripArtifactCost dup)	🟠 ALTO	2	S
A2+A3 (auth+error pattern)	🟠 ALTO	2	M
A4 (admin 401 vs 403)	🟠 ALTO	2	S
A5 (extraction filter)	🟠 ALTO	3	XS
A7 (enum Prisma)	🟠 ALTO	3	M
A6 (guard order)	🟠 ALTO	4	S
M1 (calculateCost deprecated)	🟡 MEDIO	4	XS
M2 (modelId vs id)	🟡 MEDIO	3	S
M4 (cron error format)	🟡 MEDIO	4	XS
M5 (hook type)	🟡 MEDIO	3	XS
M6 (logger order)	🟡 MEDIO	4	XS
M7 (spec drift)	🟡 MEDIO	5	S
B1 (x-request-id SSE)	🟢 BASSO	4	XS
B2 (helper inline)	🟢 BASSO	4	S