Report di Qualità e Sicurezza — gen-app
📊 Panoramica
Area	Valutazione
Architettura generale	✅ Buona
Sicurezza autenticazione	✅ Solida
Coerenza API	⚠️ Parziale
Qualità del codice	✅ Buona
Testing	⚠️ Sufficiente
Gestione errori	⚠️ Irregolare
Osservabilità	✅ Buona
Dipendenze	✅ Corrette
✅ PUNTI DI FORZA
1. Architettura LLM ben stratificata

Il pattern Orchestrator → Agent → Provider è rispettato con separazione netta. LLMOrchestrator delega a BaseAgent e OpenRouterProvider senza sovrapporre responsabilità. I tool-route handler sono thin (auth → validate → guard → build prompt → stream), con logica di business delegata ai moduli lib.
2. Autenticazione e autorizzazione robuste

    auth() come unica fonte di verità per userId (mai il corpo della richiesta)
    Whitelist di domini email via ALLOWED_EMAIL_DOMAINS con validazione email_verified del profilo Google
    Ownership check sistematico prima di ogni accesso a risorse utente
    Admin check (session.user.role === 'admin') su tutti gli endpoint /api/admin/*
    Sessioni gestite via database (strategy: 'database'), nessun JWT lato client

3. Validazione input pervasiva con Zod

Ogni endpoint valida input con safeParse prima di qualsiasi query Prisma. Gli schema sono centralizzati in tool-routes/schemas.ts. Il binding z.preprocess(normalizeLegacyContext, ...) gestisce retrocompatibilità del payload senza inquinare la business logic.
4. Rate limiting + quota guard atomico

enforceUsageGuards esegue il check quota/budget in una singola transazione Prisma ($transaction) con increment atomico di monthlyUsed. Il rate limit Redis avviene prima del round-trip DB per respingere il burst traffico economicamente.
5. Ambiente validato a startup

env.ts usa Zod per validare e tipizzare tutte le variabili d'ambiente critiche. Il fallback per NODE_ENV === 'test' evita crash nei test senza valori reali.
6. Logging strutturato con redazione automatica

Pino con redact su authorization, cookie, token, accessToken, refreshToken. getRequestLogger propaga requestId, route, userId su ogni log, rendendo il tracing distribuito possibile.
7. Upload file con validazione MIME reale

Il file upload non si affida al Content-Type dichiarato dal client: usa la libreria file-type per rilevare il tipo dal magic bytes del buffer. La funzione isLikelyTextBuffer aggiunge un ulteriore layer per i tipi text/plain/text/markdown che non hanno magic bytes.
8. Stale artifact cleanup con autenticazione cron

L'endpoint cron valida un bearer secret prima di eseguire cleanup. La presenza di VERCEL_CRON_SECRET è verificata a runtime (fail esplicito se mancante).
9. Shared helpers di route uniformi

tool-routes/guards.ts, responses.ts, schemas.ts riducono duplicazione e garantiscono contratto errori uniforme ({ error: { code, message } }) nei tool route più recenti.
⚠️ PUNTI DEBOLI
Sicurezza
[SEC-1] TOCTOU race condition quota check in /api/artifacts/generate

Severità: Media

src/app/api/artifacts/generate/route.ts (ll. 46–78) implementa la propria logica di quota check leggendo l'utente e confrontando monthlyUsed >= monthlyQuota fuori da una transazione. A differenza del guard condiviso enforceUsageGuards() che esegue check + increment atomicamente in $transaction, questa route legge prima e poi — se necessario — non incrementa affatto (non c'è un increment dopo il check). Il risultato è che questa route non aggiorna monthlyUsed, delegando implicitamente a streaming.ts. Ma lo stesso gateway può ricevere due richieste concorrenti che passano entrambe il check (monthlyUsed < monthlyQuota) prima che l'una abbia aggiornato il contatore.
ts

// route.ts — NON atomico
const user = await db.user.findUnique({ where: { id: userId } });
if (user.monthlyUsed >= user.monthlyQuota) { ... } // ← legge snapshot
// ...
// lo streaming.ts incrementa monthlySpent ma NON monthlyUsed

Nel guard condiviso invece:
ts

// guards.ts — atomico ✅
await db.$transaction(async (tx) => {
  const user = await tx.user.findUnique(...);
  if (user.monthlyUsed >= user.monthlyQuota) throw new Error('QUOTA_EXHAUSTED');
  await tx.user.update({ data: { monthlyUsed: { increment: 1 } } });
});

Raccomandazione: refactoring di /api/artifacts/generate per usare enforceUsageGuards() + requireOwnedProject() come i tool routes.
[SEC-2] Variabili Redis non validate in env.ts

Severità: Bassa

src/lib/rate-limit.ts usa Redis.fromEnv() che legge UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN direttamente da process.env, bypassando lo schema Zod validato. Se queste variabili mancano in produzione, l'errore emerge runtime anziché al boot dell'applicazione.
[SEC-3] Codice errore CONFLICT non tipizzato nel contratto API

Severità: Bassa

src/app/api/artifacts/[id]/route.ts (l. 76–80) restituisce { code: 'CONFLICT' } con status 409, ma 'CONFLICT' non è presente nell'union ApiErrorCode in responses.ts. Questo endpoint non usa la funzione apiError() helper (che enforce il tipo), quindi la risposta è fuori contratto e non verificabile staticamente.
[SEC-4] VERCEL_CRON_SECRET opzionale — fail silenzioso in produzione

Severità: Bassa

Il campo è z.string().optional() in env.ts. Se manca, il cron restituisce 500 ("Server misconfiguration") invece di fallire al boot. Idealmente dovrebbe essere required in NODE_ENV === 'production'.
[SEC-5] Nessun security header HTTP

Severità: Media

next.config.ts è essenzialmente vuoto (nessuna configurazione headers()). Non ci sono: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security. Questi header sono particolarmente importanti in un'app che renderizza contenuti generati dall'AI (potenziale XSS da output HTML/Markdown).
Qualità e Coerenza del Codice
[QUA-1] Duplicazione della logica di guard in /api/artifacts/generate

Severità: Media

La route legacy duplica manualmente auth, quota, rate limit e ownership check invece di usare i guard condivisi. Oltre al problema di atomicità sopra, questo crea divergenza: il tool route controlla il rate limit prima del DB (fast-fail), la route legacy lo controlla dopo (due query DB extra in caso di rate limit). Quando la logica guard evolve, questa route rischia di restare indietro.
[QUA-2] Conteggio token inaccurato nel modulo streaming

Severità: Media

In streaming.ts (l. 68): inputTokenCount = Math.ceil((promptOverride ?? JSON.stringify(input)).length / 4) è una stima carattere-based che può essere significativamente errata per contenuti non-ASCII (testo in italiano, emoji). Inoltre outputTokenCount++ viene incrementato per ogni chunk SSE della stream, non per ogni token LLM — a seconda del chunking del provider, questo può sottostimare o sovrastimare il costo contabilizzato. Il costo finale salvato nell'artifact potrebbe essere corretto (se il provider conta bene), ma il costo estimato durante lo streaming (ogni 20 token) è sicuramente inaccurato.
[QUA-3] Stale artifact cleanup: N query invece di updateMany

Severità: Bassa

src/app/api/cron/cleanup-stale-artifacts/route.ts (ll. 47–55) esegue un Promise.all di N db.artifact.update() individuali. Con molti artifact stale, questo è un anti-pattern: db.artifact.updateMany({ where: {...}, data: {...} }) sarebbe equivalente, molto più efficiente e atomico.
ts

// Attuale — N round-trip
const updatePromises = staleArtifacts.map((a) => db.artifact.update(...));
await Promise.all(updatePromises);

// Migliore — 1 query
await db.artifact.updateMany({ where: { status: 'generating', createdAt: { lt: staleThreshold } }, data: { status: 'failed', failureReason: 'stale' } });

[QUA-4] console.error invece del logger strutturato in admin users route

Severità: Bassa

src/app/api/admin/users/route.ts (l. 79): console.error('Admin users list error:', err) bypassa Pino e perde il contesto strutturato (requestId, userId). Tutti gli altri route usano il logger Pino.
[QUA-5] Prompt salvato ridondantemente come input.topic nell'artifact

Severità: Bassa

Nei tool routes (meta-ads, funnel-pages), il prompt completo viene passato come promptOverride e come input.topic nell'artifact (l. 73 di meta-ads/generate/route.ts):
ts

input: { topic: prompt, tone: payload.tone, ... }

Il prompt può essere molto lungo (centinaia di righe). Viene salvato nel campo input (JSON) dell'artifact in modo ridondante, aumentando la dimensione dello storage senza beneficio.
[QUA-6] Segno di obsolescenza: calculateCost deprecated ma ancora in uso

Severità: Bassa

src/lib/llm/costs.ts esporta calculateCost come deprecato (@deprecated Use calculateCostAccurate), ma streaming.ts (ll. 78, 122) la usa ancora. Si tratta solo di un alias ma introduce falsi warning JSDoc.
[QUA-7] extractionFieldDefinitionSchema duplicato

Severità: Bassa

Lo schema extractionFieldDefinitionSchema è definito due volte: in src/lib/llm/agents/extraction.ts (con tipi z.string()) e in src/lib/tool-routes/schemas.ts (con tipi come z.enum([...])). Le definizioni sono leggermente diverse (la route ha un enum esplicito per type, l'agent accetta qualsiasi stringa). Se i tipi ammessi cambiano, c'è rischio di drift.
[QUA-8] funnelPagesRequestSchema come z.union([V1, V2, V3]) — errori di validazione opachi

Severità: Bassa

z.union con tre schema complessi genera messaggi di errore che mostrano fallimenti da tutti e tre gli schema simultaneamente, rendendo difficile il debug quando un payload è malformato. Sarebbe preferibile un z.discriminatedUnion su un campo discriminante esplicito (es. schemaVersion), oppure una validazione con z.superRefine che identifica prima la versione del payload.
[QUA-9] Parsing DOCX con regex su XML grezzo

Severità: Bassa

document-parser.ts analizza il DOCX estraendo testo con sostituzione regex su XML. Questo approccio è fragile con namespace XML non standard, relazioni complesse (es. tabelle annidate, caselle di testo). Non vengono gestite entità HTML come &nbsp;, &apos;. Per robustezza sarebbe preferibile una libreria dedicata (mammoth, docx).
Testing
[TEST-1] Test E2E minimali

Solo tests/e2e/home.spec.ts è presente. Non ci sono smoke test E2E per i flussi critici (generazione artifact, upload documento, admin quota update).
[TEST-2] Coverage threshold al 70%

La soglia globale al 70% è accettabile per un progetto in crescita, ma le esclusioni sono ampie (tutti i componenti UI, auth, db, logger, providers). Le aree escluse includono codice di infrastruttura che merita almeno test di integrazione mocked.
[TEST-3] Nessun test di stress/carico

Non ci sono test che verifichino comportamento sotto rate limit o con stream interrotti. Questo è critico per un'applicazione basata su SSE.
📋 Riepilogo per priorità
ID	Categoria	Descrizione	Priorità
SEC-1	Sicurezza	TOCTOU race condition quota in /api/artifacts/generate	🔴 Alta
SEC-5	Sicurezza	Nessun security header HTTP (CSP, X-Frame-Options, etc.)	🟠 Media
QUA-1	Qualità	/api/artifacts/generate non usa guard condivisi	🟠 Media
QUA-2	Qualità	Conteggio token inaccurato nel modulo streaming	🟠 Media
SEC-2	Sicurezza	Variabili Redis non validate in env.ts	🟡 Bassa
SEC-3	Sicurezza	CONFLICT code fuori contratto ApiErrorCode	🟡 Bassa
SEC-4	Sicurezza	VERCEL_CRON_SECRET opzionale — no fail-fast	🟡 Bassa
QUA-3	Qualità	Stale artifact cleanup: N query invece di updateMany	🟡 Bassa
QUA-4	Qualità	console.error in admin route invece di logger Pino	🟡 Bassa
QUA-5	Qualità	Prompt ridondante in input.topic nell'artifact	🟡 Bassa
QUA-6	Qualità	calculateCost deprecated ancora in uso	🟡 Bassa
QUA-7	Qualità	extractionFieldDefinitionSchema duplicato	🟡 Bassa
QUA-8	Qualità	z.union per funnel schema → errori opachi	🟡 Bassa
QUA-9	Qualità	DOCX parsing fragile via regex su XML	🟡 Bassa
TEST-1	Testing	Test E2E minimali (solo home page)	🟡 Bassa
📌 Conclusione

Il codebase è di buona qualità per un progetto interno con circa 50 utenti. La struttura architetturale è solida, l'autenticazione è corretta, e i tool routes più recenti seguono pattern coerenti e ben astratti. I problemi principali sono:

    Una route legacy (/api/artifacts/generate) che non è stata allineata al pattern di guard condiviso e introduce una race condition di quota
    Assenza di security headers HTTP che è un gap trasversale
    Variabili Redis fuori dallo schema Zod che riducono la robustezza al boot

I punti bassi priorità sono tutti correggibili in modo incrementale e non impattano la stabilità corrente.