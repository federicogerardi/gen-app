# Copilot Instructions — LLM Artifact Generation Hub

Full-stack TypeScript app per generazione di artifact AI via OpenRouter, con perimetro tool attivo su Meta Ads e Funnel Pages. ~50 utenti interni, Google OAuth, quota/budget mensile per utente.

**Stack**: Next.js 16 · React 19 · TypeScript · PostgreSQL · Prisma 7 · NextAuth v5 · shadcn/ui · Tailwind v4 · TanStack Query v5 · Zod v4 · @upstash/ratelimit · OpenRouter · Vercel

**Stato progetto**: Funzionale in locale, CI/CD passing. Deploy eseguito su Vercel: branch `main` in produzione, branch `dev` come ramo sviluppo per PR. Per metriche di coverage e backlog corrente fare riferimento a `docs/implement-index.md`.
Vedi [`docs/implement-index.md`](../docs/implement-index.md) per le priorità correnti.

---

## Build & Test

```bash
npm run dev             # dev server (Next.js)
npm run build           # build produzione
npm run typecheck       # tsc --noEmit
npm run lint            # eslint
npm run test            # jest (unit + integration)
npm run test:e2e        # playwright

npx prisma generate     # ⚠️ richiede DATABASE_URL; eseguire PRIMA di typecheck
npx prisma migrate dev  # nuova migrazione in dev
npx prisma migrate deploy  # applica migrazioni in produzione
```

---

## Architettura

```
src/
├── app/api/            # Route Handler Next.js (SSE, CRUD, admin)
├── lib/
│   ├── auth.ts         # NextAuth v5 config
│   ├── db.ts           # Prisma singleton (import da @/generated/prisma)
│   └── llm/
│       ├── orchestrator.ts   # Orchestrator → Agent → Provider
│       ├── agents/           # BaseAgent + specialized agents
│       └── providers/        # OpenRouter (openai-compat SDK)
├── lib/tool-prompts/   # Registry + template statici tipizzati (sorgente Markdown versionata)
└── components/hooks/   # useStreamGeneration, useArtifacts, useQuota
```

- LLM pattern: **Orchestrator → Agent → Provider** — vedi [`docs/adrs/001-modular-llm-controller-architecture.md`](../docs/adrs/001-modular-llm-controller-architecture.md)
- Tool-specific endpoints: `/api/tools/meta-ads/generate`, `/api/tools/funnel-pages/generate`
- Schema DB: [`prisma/schema.prisma`](../prisma/schema.prisma)
- Specifiche API: [`docs/specifications/api-specifications.md`](../docs/specifications/api-specifications.md)

### Focus operativo corrente: ottimizzazione tool generation

Per attivita su gestione tool e qualita dei generatori, considerare questi confini come default:
- Route layer (`src/app/api/tools/**`): auth, ownership, rate limit, validazione Zod, mapping errori uniforme.
- Tool prompt layer (`src/lib/tool-prompts/**`): sorgente markdown versionata + template runtime statici tipizzati.
- LLM layer (`src/lib/llm/**`): orchestrazione, agent routing, streaming, cost accounting.

Guardrail specifici:
- Evitare letture filesystem runtime per prompt nelle route (`fs.readFile`): usare `templates.ts` + `loader.ts`.
- Preservare il contratto API errori `{ error: { code, message } }` e codici standard.
- Mantenere il check `rateLimit(userId)` prima di chiamate OpenRouter in ogni endpoint di generazione.
- Allineare i test quando si toccano endpoint/tool prompt (`tests/integration/*-route.test.ts`, `tests/unit/tool-prompts.test.ts`).

Documentazione da linkare (non duplicare):
- Architettura LLM: [`docs/adrs/001-modular-llm-controller-architecture.md`](../docs/adrs/001-modular-llm-controller-architecture.md)
- Streaming SSE: [`docs/adrs/002-streaming-vs-batch-responses.md`](../docs/adrs/002-streaming-vs-batch-responses.md)
- Quota e rate limiting: [`docs/adrs/003-rate-limiting-quota-strategy.md`](../docs/adrs/003-rate-limiting-quota-strategy.md)
- Priorita implementative correnti: [`docs/implement-index.md`](../docs/implement-index.md)

---

## Gotcha critici

### Next.js 16 — `params` è una Promise
```typescript
// ✅ CORRETTO
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

### Prisma 7 — import dal client generato
```typescript
import { PrismaClient } from '@/generated/prisma';  // ✅
// import { PrismaClient } from '@prisma/client';   // ❌
```
Il client viene generato in `src/generated/prisma/`. Ignorato da git: eseguire `npx prisma generate` in ogni ambiente fresco.

### NextAuth v5 — API e adattatori
- Usa `auth()` (non `getServerSession`)
- Provider: `import Google from 'next-auth/providers/google'` (non `GoogleProvider`)
- Type augmentation obbligatorio: `src/types/next-auth.d.ts`
- `trustHost: true` richiesto in hosting dietro proxy (es. Render/Vercel)

### SSE streaming — usa `fetch`, non `EventSource`
L'endpoint `/api/artifacts/generate` è POST. `EventSource` supporta solo GET.
Usa `fetch` + `response.body.getReader()`. Vedi [`docs/adrs/002-streaming-vs-batch-responses.md`](../docs/adrs/002-streaming-vs-batch-responses.md).

### Zod v4 — `z.record` richiede 2 argomenti
```typescript
z.record(z.string(), z.unknown())  // ✅ — z.record(z.unknown()) ❌ in v4
```

### CI/CD — ordine step critico
`npx prisma generate` deve precedere `npm run typecheck` e `npm run build`.
Variabili d'ambiente richieste nel build: `OPENROUTER_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

### GitHub CLI PR body — evitare warning shell
Quando si crea una PR con testo multilinea/markdown, evitare `--body "..."` con backtick nel contenuto: in shell i backtick possono attivare command substitution e generare warning tipo `command not found`.

Preferire una di queste modalita:
- `--body-file <file.md>`
- `--body-file -` con heredoc a delimitatore quotato singolarmente
- `--editor` per scrivere titolo/body senza escaping shell

Esempio robusto:
```bash
cat <<'EOF' | gh pr create --base dev --head <branch> --title "<titolo>" --body-file -
## Summary
- voce 1
- voce 2
EOF
```

### Tool prompts runtime — evitare file tracing ampio in build
Il runtime prompt deve usare template statici tipizzati (`src/lib/tool-prompts/templates.ts`) e non letture filesystem dinamiche nel path di esecuzione delle route.

Linea guida:
- sorgente editabile prompt in `src/lib/tool-prompts/prompts/**/*.md`
- runtime in `src/lib/tool-prompts/templates.ts` + `src/lib/tool-prompts/loader.ts`
- evitare `fs.readFile` dinamico nelle route graph per non innescare warning Turbopack/NFT (tracing involontario dell'intero progetto)

---

## Convenzioni API

- Autenticazione: verifica `session.user.id` con `auth()` da NextAuth — non fidarsi di `userId` nel body
- Ownership check obbligatorio su GET/PUT/DELETE: l'utente autenticato deve essere proprietario della risorsa
- Endpoint `/api/admin/*` richiedono `session.user.role === 'admin'`
- Errori: `{ error: { code: "ERROR_CODE", message: "..." } }` (codici: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMIT_EXCEEDED`, `PAYMENT_REQUIRED`, `INTERNAL_ERROR`)
- Validare sempre input con Zod prima di query Prisma
- Rate limit check (`rateLimit(userId)`) prima di ogni chiamata a OpenRouter

---

## Priorità correnti

Le priorità operative sono mantenute in modo centralizzato in `docs/implement-index.md`.
Evitare di duplicare in questo file liste temporanee o snapshot di backlog.

---

## Vincoli Qualità e Branching (OBBLIGATORI)

- Non lavorare mai su codice nel branch `main`.
- Lavorare solo su branch `dev` o su branch di feature/chore/fix derivati.
- Flusso obbligatorio: aggiornamento rami -> Pull Request -> review -> approvazione -> merge.
- Pubblicare modifiche direttamente su `main` è un errore grave.
- Priorità assoluta: stabilità dell'ambiente di produzione su Vercel.
- Tutte le modifiche devono essere validate con code review e testing su branch non di produzione prima di qualsiasi merge su `main`.
- Copilot agisce come garante di questo metodo e non deve eseguire comandi in contraddizione con queste regole.

