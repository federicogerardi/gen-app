# Copilot Instructions — LLM Artifact Generation Hub

## Project Overview

Full-stack TypeScript web application that lets internal users (MediaBuyer, SEO Specialist) generate AI artifacts (content, SEO, code) via OpenRouter. 50 internal users, Google OAuth, per-user monthly quota and budget tracking.

**Stack**: Next.js 15 · React 19 · TypeScript · PostgreSQL 16 · Prisma 7 · NextAuth.js v5 · shadcn/ui v4 · Tailwind CSS · TanStack Query v5 · Zod · @upstash/ratelimit · OpenRouter · Render.com

---

## Repository Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── api/
│   │   ├── artifacts/
│   │   │   ├── generate/route.ts      # POST SSE streaming endpoint
│   │   │   └── [id]/route.ts          # GET/PUT/DELETE
│   │   ├── projects/route.ts          # GET/POST
│   │   ├── projects/[id]/route.ts     # GET/PUT/DELETE
│   │   ├── users/
│   │   │   ├── profile/route.ts
│   │   │   └── quota/route.ts
│   │   ├── admin/users/route.ts
│   │   ├── admin/users/[userId]/quota/route.ts
│   │   ├── models/route.ts
│   │   └── auth/[...nextauth]/route.ts
│   ├── dashboard/
│   ├── artifacts/
│   └── admin/
├── lib/
│   ├── auth.ts                        # NextAuth config
│   ├── db.ts                          # Prisma client singleton
│   ├── llm/
│   │   ├── orchestrator.ts
│   │   ├── streaming.ts
│   │   ├── providers/
│   │   │   ├── base.ts                # LLMProvider interface
│   │   │   └── openrouter.ts
│   │   └── agents/
│   │       ├── base.ts                # BaseAgent abstract class
│   │       ├── content.ts
│   │       ├── seo.ts
│   │       └── code.ts
│   └── utils/
├── components/
│   ├── ui/                            # shadcn/ui components
│   ├── layout/
│   └── hooks/
│       ├── useStreamGeneration.ts
│       ├── useArtifacts.ts
│       └── useQuota.ts
prisma/
└── schema.prisma
```

---

## Inizializzazione Progetto

### Setup iniziale
```bash
npx create-next-app@latest gen-app --typescript --tailwind --app-router --src-dir --import-alias "@/*"
cd gen-app
```

### Dipendenze principali
```bash
# Database & Auth
npm install prisma @prisma/client @auth/prisma-adapter next-auth

# Rate limiting
npm install @upstash/ratelimit @upstash/redis

# Validation & Forms
npm install zod react-hook-form @hookform/resolvers

# Data fetching
npm install @tanstack/react-query @tanstack/react-query-devtools

# UI (shadcn/ui v4 usa @base-ui/react)
npm install @base-ui/react
npx shadcn@latest init

# LLM — OpenRouter è compatibile con l'SDK OpenAI
npm install openai

# Dev
npm install -D prisma
npx prisma init
```

### `src/lib/db.ts` — Prisma singleton
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['query'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

---

## Critical Rules & Gotchas

### Next.js 15 — `params` è una Promise
Nei Route Handler con segmenti dinamici, `params` **deve essere `await`ato**:

```typescript
// CORRETTO
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}

// ERRATO — causa errore runtime in Next.js 15
export async function GET(request: Request, { params }) {
  const { id } = params; // ← NON funziona
}
```

### NextAuth.js v5 — Sintassi corretta
```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google'; // NON GoogleProvider
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'database' },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        return (
          profile?.email_verified === true &&
          (user.email?.endsWith('@company.com') ?? false)
        );
      }
      return false;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as any).role ?? 'user';
      return session;
    },
  },
  trustHost: true, // richiesto su Render.com
});

// src/app/api/auth/[...nextauth]/route.ts
export const { GET, POST } = handlers;
```

### NextAuth.js v5 — Type Augmentation (obbligatorio)
```typescript
// src/types/next-auth.d.ts
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }
  interface User {
    role: string;
  }
}
```

### Middleware — Protezione Route
```typescript
// src/middleware.ts
export { auth as middleware } from '@/lib/auth';

export const config = {
  // Protegge tutte le route tranne auth, assets statici
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
```

### Rate Limiting — usa `@upstash/ratelimit`
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(), // legge UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  limiter: Ratelimit.fixedWindow(1000, '30 d'),
  prefix: 'quota',
});

export async function rateLimit(userId: string) {
  const { success, remaining } = await ratelimit.limit(userId);
  return { allowed: success, remaining };
}
```

### Streaming SSE — usa `fetch`, NON `EventSource`
L'endpoint di generazione è `POST`: `EventSource` non è compatibile (solo GET). Pattern corretto:

```typescript
const response = await fetch('/api/artifacts/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const lines = decoder.decode(value).split('\n');
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = JSON.parse(line.slice(6));
    if (data.type === 'token') { /* append */ }
    else if (data.type === 'complete') { /* save artifact ID */ }
  }
}
```

### shadcn/ui v4 — usa `@base-ui/react`
La v4 ha sostituito Radix UI con `@base-ui/react`. I form usano componenti `Field`, `FieldGroup`, `FieldLabel`, `FieldError`.

```bash
npm install @base-ui/react
npx shadcn@latest add <component>
```

### TanStack Query v5 — `useInfiniteQuery`
`initialPageParam` è obbligatorio in v5:

```typescript
useInfiniteQuery({
  queryKey: ['artifacts', projectId],
  queryFn: ({ pageParam }) => fetchArtifacts(projectId, pageParam),
  initialPageParam: 0, // obbligatorio in v5
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

### Prisma 7 — Breaking Changes & Setup
Prisma 7 introduce un nuovo modello di driver adapter. **Differenze critiche**:

1. **No URL in schema.prisma**: La URL del database va in `prisma.config.ts`, non in `schema.prisma`
   ```prisma
   // ❌ ERRATO in Prisma 7
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   
   // ✅ CORRETTO in Prisma 7
   datasource db {
     provider = "postgresql"
   }
   ```

2. **Generator con output personalizzato**:
   ```prisma
   generator client {
     provider = "prisma-client-js"
     output   = "../src/generated/prisma"
   }
   ```

3. **Import corretto del client**:
   ```typescript
   // ❌ ERRATO
   import { PrismaClient } from '@prisma/client';
   
   // ✅ CORRETTO
   import { PrismaClient } from '@/generated/prisma';
   ```

4. **Decimal import**:
   ```typescript
   // ✅ CORRETTO per Prisma 7
   import { Decimal } from '@prisma/client-runtime-utils';
   ```

5. **Prisma generate richiede DATABASE_URL**:
   ```bash
   # In CI, assicurati che DATABASE_URL sia disponibile
   export DATABASE_URL="postgresql://..."
   npx prisma generate
   ```

6. **Adapter per PostgreSQL**:
   ```typescript
   import { PrismaClient } from '@/generated/prisma';
   import { PrismaPg } from '@prisma/adapter-pg';
   
   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
   const db = new PrismaClient({ adapter });
   ```

### CI/CD — GitHub Actions Setup

**Workflow Configuration** (`.github/workflows/ci.yml`):
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    env:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      UPSTASH_REDIS_REST_URL: ${{ secrets.UPSTASH_REDIS_REST_URL }}
      UPSTASH_REDIS_REST_TOKEN: ${{ secrets.UPSTASH_REDIS_REST_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx prisma generate  # ⚠️ CRITICO: genera client prima di lint/typecheck
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
```

**Punti Critici**:
- **`npx prisma generate` deve eseguirsi prima di `npm run typecheck`**: Altrimenti TypeScript non trova `@/generated/prisma`
- **Variabili d'ambiente nel build**: `OPENAI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` sono richieste durante il build (Next.js esegue il codice server)
- **Node.js 22**: Usa LTS stabile per compatibilità

---

## Database Schema — Prisma

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String?
  image         String?
  emailVerified DateTime?
  role          String         @default("user") // 'user' | 'admin'
  monthlyQuota  Int            @default(1000)
  monthlyUsed   Int            @default(0)
  resetDate     DateTime       @default(now())
  monthlyBudget Decimal        @default(500.00)
  monthlySpent  Decimal        @default(0.00)
  accounts      Account[]
  sessions      Session[]
  projects      Project[]
  artifacts     Artifact[]
  quotaHistory  QuotaHistory[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

// ⚠️ Modelli richiesti da NextAuth PrismaAdapter — NON omettere
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Project {
  id          String     @id @default(cuid())
  userId      String
  user        User       @relation(fields: [userId], references: [id])
  name        String
  description String?
  artifacts   Artifact[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Artifact {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id])
  projectId    String
  project      Project   @relation(fields: [projectId], references: [id])
  type         String    // 'content' | 'seo' | 'code'
  model        String
  input        Json
  content      String    @default("")
  status       String    @default("generating") // 'generating' | 'completed' | 'failed'
  inputTokens  Int       @default(0)
  outputTokens Int       @default(0)
  costUSD      Decimal   @default(0)
  streamedAt   DateTime?
  completedAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model QuotaHistory {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  requestCount Int
  costUSD      Decimal
  model        String
  artifactType String
  status       String   // 'success' | 'error' | 'rate_limited'
  createdAt    DateTime @default(now())
}
```

---

## LLM Architecture (ADR 001)

Pattern Orchestrator → Agent → Provider. Non modificare il core per aggiungere nuovi agenti.

```typescript
// src/lib/llm/agents/base.ts
export abstract class BaseAgent {
  abstract type: 'content' | 'seo' | 'code';
  abstract validateInput(input: unknown): Promise<void>;
  abstract buildPrompt(context: unknown): string;
  abstract parseResponse(response: string): unknown;
}

// src/lib/llm/providers/base.ts
export interface LLMProvider {
  generateText(request: GenerateRequest): Promise<GenerateResponse>;
  generateStream(request: GenerateRequest): AsyncGenerator<StreamChunk>;
}
```

Aggiungere nuovi agent types: creare `src/lib/llm/agents/<name>.ts` estendendo `BaseAgent` e registrarlo nell'orchestrator.

---

## API Conventions

- Tutti gli endpoint richiedono autenticazione — verificare la sessione con `auth()` di NextAuth
- In browser, usare session cookie NextAuth; Bearer token solo per integrazioni server-to-server esplicite
- Errori sempre nel formato `{ "error": { "code": "ERROR_CODE", "message": "..." } }`
- Codici usati: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (400), `RATE_LIMIT_EXCEEDED` (429), `PAYMENT_REQUIRED` (402), `SERVICE_UNAVAILABLE` (503), `INTERNAL_ERROR` (500)
- Validare sempre l'input con Zod prima di interrogare il DB
- Rate limit check con `rateLimit(userId)` prima di ogni chiamata a OpenRouter
- Headers SSE obbligatori: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`

### SSE evento format
```
data: {"type":"start","artifactId":"art_456"}
data: {"type":"token","token":"..."}
data: {"type":"complete","tokens":{"input":45,"output":987},"cost":0.031}
```

---

## Modelli LLM supportati

| ID OpenRouter | Nome | Default |
|---|---|---|
| `openai/gpt-4-turbo` | GPT-4 Turbo | ✅ sì |
| `anthropic/claude-3-opus` | Claude 3 Opus | no |
| `mistralai/mistral-large` | Mistral Large | no (fallback) |

---

## Variabili d'ambiente richieste

```bash
DATABASE_URL=                    # PostgreSQL connection string
NEXTAUTH_SECRET=                 # Secret per NextAuth (min 32 char)
GOOGLE_CLIENT_ID=                # Google OAuth
GOOGLE_CLIENT_SECRET=            # Google OAuth
OPENROUTER_API_KEY=              # OpenRouter API key
UPSTASH_REDIS_REST_URL=          # Upstash Redis
UPSTASH_REDIS_REST_TOKEN=        # Upstash Redis
NEXT_PUBLIC_APP_URL=             # URL pubblico dell'app (es. https://...)
```

---

## Security Checklist

- L'API key di OpenRouter non va mai esposta al frontend — usarla solo in Server Components e Route Handler
- Usare `session.user.id` come `userId` nei Route Handler — non fidarsi mai di `userId` passato nel body
- Validare sempre che l'utente autenticato sia proprietario della risorsa prima di GET/PUT/DELETE
- Gli endpoint `/api/admin/*` verificano che `session.user.role === 'admin'`
- Input sanitizzato con Zod prima di qualsiasi query Prisma

---

## Comandi utili

```bash
npx prisma migrate dev          # crea migrazione e applica in dev
npx prisma migrate deploy       # applica migrazioni in produzione
npx prisma db push              # push schema senza migration (solo dev)
npx prisma studio               # GUI database
npm run dev                     # avvia Next.js in dev
npm run build && npm start      # build produzione
```

---

## Fasi di Sviluppo

| Fase | Obiettivo | Settimana |
|------|-----------|-----------|
| **1** | Foundation: Next.js init, Prisma schema, DB su Render | 1–2 |
| **2** | Auth: NextAuth + Google OAuth, middleware, API base | 2–3 |
| **3** | LLM Module: Orchestrator, agents, OpenRouter provider | 3–4 |
| **4** | Streaming API: SSE endpoint, CRUD artifacts, costi | 4–5 |
| **5** | Frontend: componenti, hooks, pagine dashboard | 5–6 |
| **6** | Admin Panel: gestione utenti, quote, audit | 6–7 |
| **7** | Testing: unit, integration, e2e Playwright (>80%) | 7–8 |
| **8** | Deploy: Render.com, Sentry, CI/CD | 8 |

> Ogni fase è indipendente: completare l'acceptance criteria prima di passare alla successiva.

---

## Testing

### Stack
- **Unit**: Jest + `@testing-library/react`
- **Integration**: Jest + supertest per API routes
- **E2E**: Playwright
- **Coverage target**: >80%

### Pattern — Mock sessione NextAuth
```typescript
import { auth } from '@/lib/auth';
jest.mock('@/lib/auth');
(auth as jest.Mock).mockResolvedValue({
  user: { id: 'user_1', role: 'user' },
});
```

### E2E — Playwright
```bash
npx playwright install
npx playwright test
```

Scenari da coprire:
- Login Google → redirect dashboard
- Generazione artifact (SSE streaming completo)
- Admin: modifica quota utente

---

## Deployment (Render.com)

### Build command
```bash
npm run build
```

### Pre-deploy command (esegue le migrazioni)
```bash
npx prisma migrate deploy
```

### CI/CD — GitHub Actions
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test -- --coverage
  deploy:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render deploy
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK_URL }}
```

