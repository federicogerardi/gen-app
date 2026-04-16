# Implementation Plan: LLM Artifact Generation Hub

**Version**: 1.0  
**Status**: LOCALLY FUNCTIONAL - CI/CD PASSING - DEPLOYED ON VERCEL (MAIN IN PRODUCTION, DEV FOR PR WORKFLOW) - HARDENING IN PROGRESS  
**Target Audience**: AI Development Agents  
**Estimated Duration**: 6-8 weeks (part-time)  
**Last Updated**: 2026-04-11

---

## Overview

Detailed phase-by-phase implementation roadmap for building the LLM Artifact Generation Hub. Each phase has:
- **Clear deliverables**
- **Acceptance criteria**
- **Dependencies**
- **Rollback procedures**

This document now reflects the real state of the repository as of 2026-04-07.
The checkboxes below indicate whether a capability is implemented in the codebase,
not whether it has already been validated in production.

## Current Implementation Snapshot

Implemented in the current codebase:
- Next.js 16 app scaffold with App Router pages for login, dashboard, projects, artifacts and admin
- NextAuth v5 beta with Google OAuth, Prisma adapter and route protection via `src/proxy.ts`
- Prisma 7 configured with `@prisma/adapter-pg` and generated client output under `src/generated/prisma`
- Local end-to-end auth path validated (Google callback -> DB session -> dashboard) with Neon + Upstash
- LLM module with provider, agents, orchestrator and SSE streaming endpoint
- API routes for artifacts, projects, user profile/quota, admin user quota management, audit and metrics, plus model listing
- Frontend hooks for streaming, artifact list/detail/update and quota fetch
- Dashboard/navbar client-server boundary fixed (`SessionProvider` + client-side `signOut`) and build verified
- Admin dashboard with user quota editing, recent usage activity and metrics overview
- Jest + Playwright scaffolding with passing local unit/integration/e2e smoke tests
- Tool UI modulare con entrypoint dedicati per Meta Ads (`/tools/meta-ads`) e HotLead Funnel (`/tools/funnel-pages`)
- Endpoint tool-specific per generazione (`/api/tools/meta-ads/generate`, `/api/tools/funnel-pages/generate`)
- Prompt architecture centralizzata sotto `src/lib/tool-prompts` con registry + loader e template runtime statici tipizzati (`templates.ts`), derivati da sorgenti markdown versionate

Still pending or partial:
- Post-deploy hardening on Vercel (monitoring/runbook/smoke checks)
- monitoring and ops documentation
- expanded automated coverage and quality gates (coverage >80% reached on current scope; E2E and auth/db real-flow expansion still open)
- responsive/accessibility hardening and final UX polish
- cleanup finale di refusi UX/documentali fuori perimetro MVP

Recently completed (2026-04-08):
- ✅ CI/CD pipeline (GitHub Actions) with lint, typecheck, test, build
- ✅ Prisma 7 setup with correct imports and type annotations
- ✅ All lint errors resolved (6 errors → 0 errors)
- ✅ All typecheck errors resolved
- ✅ Build passing with environment variables configured

Recently completed (2026-04-12):
- ✅ Quality & security audit remediation sequenced (TASK-001..020) merged into dev via PR #19; all 20 tasks completed with full lint/typecheck/unit/integration/e2e evidence.

Recently completed (2026-04-11):
- ✅ Single sprint "Internal Pages Visual Unification" executed across dashboard, tools, artifacts, admin and project pages
- ✅ Shared visual foundations consolidated in app layer (typography variables, shell, surface system, control contrast hardening)
- ✅ Sensitive UI elements on graphic backgrounds hardened (admin search, filters, metric micro-cards, quota drawer controls)
- ✅ Operational visual specification added for future consistent interventions: `docs/specifications/graphic-frameworking-spec.md`

## Phase Status Summary

| Phase | Status | Notes |
|------|--------|-------|
| **1. Foundation & Infrastructure** | Mostly complete | Local scaffold, schema and code structure are in place; Neon DB wiring is validated, Vercel deployment baseline is active |
| **2. Authentication & Backend Infrastructure** | Mostly complete | OAuth + Prisma sessions + Redis rate limiting are wired locally and working; production hardening remains |
| **3. LLM Module Implementation** | Implemented | Provider, agents, orchestrator and model cost handling exist |
| **4. Streaming & API Implementation** | Implemented | SSE generation and full planned artifact/project CRUD surface are in place |
| **5. Frontend Components** | Mostly complete | Main pages and hooks exist; responsive/UX hardening is still open |
| **6. Admin Panel & Advanced Features** | Mostly complete | Metrics and audit activity exist; full admin CRUD remains a product decision |
| **7. Testing & Quality** | Substantially complete | Jest (82.96% statements, 70.31% branches) and Playwright passing; coverage >80% threshold met; security audit closed PR #19; E2E and auth/db real-flow expansion still open |
| **8. Deployment & Monitoring** | Partially complete | CI/CD pipeline (GitHub Actions) implemented and passing; Vercel deployment is active, monitoring/runbook hardening still to do |

---

## Focused Execution Tracks

- Deterministic Prisma deploy migrations
  - Execution plan: docs/implementation/feature-prisma-deploy-migrations-1.md
  - Tracker: docs/implementation/feature-prisma-deploy-migrations-tracker-1.md

- Quality and security audit resolution
  - Source roadmap: docs/archive/implement-quality-audit-closure-2026-04-11.md
  - Execution plan: docs/archive/feature-quality-audit-resolution-1.md
  - Tracker: docs/archive/feature-quality-audit-resolution-tracker-1.md

- Artifact detail export actions
  - Execution plan: docs/implementation/feature-artifact-page-export-actions-plan-1.md
  - Scope: copy text + download markdown + download docx su dettaglio artefatto

---

## Single Sprint Plan: Internal Pages Visual Unification (Login Concept Extension)

### Execution Status (2026-04-11)
- Status: `COMPLETATO`
- Outcome sintetico:
  - foundation visiva applicata in tutte le pagine interne in scope
  - ridotte divergenze tipografiche/layout tra login e aree autenticate
  - introdotto protocollo di continuita tramite specifica frameworking grafico

### Sprint Goal
Estendere in modo coerente il concept grafico gia introdotto nella login alle pagine interne, mantenendo la stessa identita editoriale (tipografia display + body, layering atmosferico, card con profondita morbida, gerarchia informativa chiara) senza regressioni funzionali.

### Design Direction (Vincolante)
- Direzione estetica: editorial-tech caldo e premium, con contrasti morbidi, superfici traslucide leggere e accenti controllati.
- Pattern da preservare dalla login:
  - display font per hero e titoli di sezione
  - body font per contenuti operativi e form
  - sfondo stratificato (gradient mesh + griglia sottile)
  - card con border soft + shadow profonda ma diffusa
  - micro-copy e badge in stile workspace professionale
- Regola di coerenza: tutte le pagine interne devono risultare parte dello stesso prodotto a colpo d'occhio.

### Scope (In)
- Dashboard e sottopagine progetto
- Tool pages (`/tools/meta-ads`, `/tools/funnel-pages`)
- Artifacts listing + detail
- Admin area
- Navbar e shell condivisa

### Scope (Out)
- Refactor backend/API
- Cambi di contratto dati
- Nuove feature di business non UX

### Workstreams

#### WS1 - Foundation Tokens + App Shell
Deliverable:
- Estensione token design in `globals.css` (palette, radius, shadow, spacing, layer opacity)
- Introduzione variabili tipografiche condivise per pagine autenticate
- Restyling coerente di `Navbar` (stato active, dropdown, mobile sheet, contrasto)

Acceptance Criteria:
- Contrasto AA su testo primario e secondario
- Stati hover/focus/active consistenti in desktop e mobile
- Nessuna regressione su navigazione e logout

#### WS2 - Dashboard Experience
Deliverable:
- Hero dashboard riallineato al linguaggio visuale login
- Card "Tool workspace" e "Panoramica account" con nuove superfici, spacing e gerarchia
- Miglioramento ritmo verticale e breakpoints

Acceptance Criteria:
- Above-the-fold riconoscibile come stessa famiglia visiva della login
- Nessun overflow o layout break a 320px, 768px, 1024px, 1440px
- KPI leggibili anche in condizioni dense

#### WS3 - Tool Pages (Meta Ads + HotLead Funnel)
Deliverable:
- Layout input/output armonizzato con shell condivisa
- Card form e output con stile unificato, stati loading/error semanticamente chiari
- Badge/status step funnel allineati a scala cromatica unica

Acceptance Criteria:
- Form usability invariata (nessuna frizione aggiunta)
- Streaming output sempre leggibile con long content
- Stati errore immediatamente distinguibili ma non invasivi

#### WS4 - Artifacts Pages
Deliverable:
- Listing artifacts con filtri e card in linguaggio visuale comune
- Detail artifact con tipografia markdown e metadati ben separati
- Azioni principali (apri/elimina/back) con priorita visiva coerente

Acceptance Criteria:
- Scansione veloce della lista (status/type/model/data)
- Markdown leggibile su desktop/mobile con heading/list/code equilibrati
- Nessun ritorno alla preview ridondante rimossa

#### WS5 - Admin Consistency
Deliverable:
- Restyling Admin Client Page in continuita con dashboard
- Evidenza delle metriche baseline e tabelle attivita con migliore leggibilita
- Uniformazione badge e componenti di controllo

Acceptance Criteria:
- Densita informativa alta ma leggibile
- Nessuna perdita di affordance su azioni sensibili (quota update)

#### WS6 - QA, Accessibility, Regression Safety
Deliverable:
- Passaggio completo lint + typecheck + test suites rilevanti
- Smoke test responsive su viewport principali
- Review accessibilita: focus ring, keyboard flow, aria-live gia presenti

Acceptance Criteria:
- `npm run lint` verde
- `npm run typecheck` verde
- Test integration toccati dal restyling verdi
- Nessuna regressione su flussi: login -> dashboard -> tools -> artifacts -> admin

### Sprint Sequencing (Single Sprint)
1. Giorno 1: WS1 (foundation + shell)
2. Giorno 2: WS2 (dashboard)
3. Giorno 3: WS3 (tools pages)
4. Giorno 4: WS4 + WS5 (artifacts + admin)
5. Giorno 5: WS6 hardening, bugfix, QA finale, PR

### Definition of Done
- Coerenza visiva verificata su tutte le pagine interne in scope
- Nessuna regressione funzionale o di accessibilita bloccante
- Quality gates CI verdi
- Documentazione UX aggiornata con screenshot desktop/mobile per aree principali

### Risk & Mitigations
- Rischio: divergenza stilistica tra pagine sviluppate in tempi diversi
  - Mitigazione: token centrali + checklist visiva obbligatoria per PR
- Rischio: regressioni responsive su layout complessi
  - Mitigazione: validazione sistematica su breakpoint e smoke test Playwright
- Rischio: restyling troppo invasivo su componenti critici
  - Mitigazione: approccio incrementale per workstream con rollback rapido per pagina

---

## Phase 1: Foundation & Infrastructure (Week 1-2)

### Goals
- Setup development environment
- Configure Vercel infrastructure and environment promotion flow
- Initialize codebase with Next.js + Prisma
- Implement database schema

### Deliverables

#### 1.1 Project Initialization
```bash
# Initialize Next.js 16 + TypeScript
npx create-next-app@latest gen-app --typescript --tailwind --app-router

# Add dependencies
npm install prisma @prisma/client @prisma/adapter-pg pg zod next-auth@beta @auth/prisma-adapter @upstash/redis openai
npm install -D @types/pg

# Initialize Prisma
npx prisma init
```

**Acceptance Criteria**:
- [x] Next.js 16 app runs locally
- [x] Tailwind CSS is working
- [x] TypeScript strict mode enabled
- [x] .env.local configured with DATABASE_URL

#### 1.2 Database Schema Implementation
- Create `prisma/schema.prisma` with models:
  - User (authentication + quota)
  - Project (artifact container)
  - Artifact (generated content)
  - QuotaHistory (audit trail)
  - Session (NextAuth)

**Acceptance Criteria**:
- [x] Prisma schema compiles
- [x] All relationships are correct
- [x] Database schema sync runs on a real database (`prisma db push` on Neon)
- [ ] Shadow database works

#### 1.3 Vercel Setup
1. Configure Vercel project and environments
2. Configure environment variables
3. Setup automatic production deployment from `main`
4. Keep `dev` as development branch for PR workflow

**Acceptance Criteria**:
- [x] Hosting deployment active on Vercel (`main` production)
- [x] Can connect locally via a real `DATABASE_URL`
- [ ] GitHub Actions connected
- [ ] Staging environment mirrors production

#### 1.4 Code Structure
```
gen-app/
├── src/
│   ├── lib/
│   │   ├── llm/
│   │   │   ├── orchestrator.ts
│   │   │   ├── providers/
│   │   │   │   ├── base.ts
│   │   │   │   └── openrouter.ts
│   │   │   └── agents/
│   │   │       ├── base.ts
│   │   │       ├── content.ts
│   │   │       ├── seo.ts
│   │   │       └── code.ts
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   └── utils/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── api/
│   │   │   ├── artifacts/
│   │   │   │   ├── generate/route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── projects/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── users/
│   │   │   │   ├── profile/route.ts
│   │   │   │   └── quota/route.ts
│   │   │   ├── admin/users/
│   │   │   │   ├── route.ts
│   │   │   │   └── [userId]/quota/route.ts
│   │   │   ├── models/route.ts
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── dashboard/
│   │   ├── artifacts/
│   │   └── admin/
│   └── components/
│       ├── ui/
│       ├── layout/
│       └── hooks/
├── prisma/
│   └── schema.prisma
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

**Acceptance Criteria**:
- [x] Directory structure created
- [x] Linting rules configured
- [x] TypeScript paths configured

### Rollback Procedure
- Delete Render databases
- Revert to previous GitHub branch
- Clear environment variables

---

## Phase 2: Authentication & Backend Infrastructure (Week 2-3)

### Goals
- Implement NextAuth.js + Google OAuth
- Create API structure
- Implement rate limiting

### Deliverables

#### 2.1 NextAuth.js Setup
```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google'; // v5: named import cambiato
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'database', // esplicito con Prisma adapter
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Solo account Google verificati con dominio aziendale
      if (account?.provider === 'google') {
        return (
          profile?.email_verified === true &&
          (user.email?.endsWith('@company.com') ?? false)
        );
      }
      return false;
    },
    async session({ session, user }) {
      // Espone l'id utente lato client
      session.user.id = user.id;
      session.user.role = (user as { role?: string }).role ?? 'user';
      return session;
    },
  },
  trustHost: true, // necessario su hosting dietro proxy (Render/Vercel)
});

// src/app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs';
export const { GET, POST } = handlers;
```

**Acceptance Criteria**:
- [x] Google OAuth flow works with real credentials
- [x] Email whitelist enforced in code
- [x] Sessions persist in database via Prisma adapter configuration
- [x] Logout flow implemented

#### 2.2 Rate Limiting Utility
```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Legge UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN dall'env
// Fixed window su 30 giorni = quota mensile di 1000 req/utente
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(1000, '30 d'),
  prefix: 'quota',
});

export async function rateLimit(userId: string) {
  const { success, remaining } = await ratelimit.limit(userId);
  return { allowed: success, remaining };
}
```

**Acceptance Criteria**:
- [x] Rate limiting works with real Redis credentials
- [x] Quota resets monthly in code design
- [x] Returns remaining count

#### 2.3 API Base Routes
Implemented routes in this phase area:
- `GET /api/artifacts` - list artifacts
- `GET /api/projects` - list projects
- `POST /api/projects` - create project
- `GET|PUT|DELETE /api/projects/[id]` - project CRUD
- `POST /api/artifacts/generate` - generate artifact via SSE
- `GET|PUT|DELETE /api/artifacts/[id]` - artifact detail/update/delete
- `GET /api/users/profile` - current user profile
- `GET /api/users/quota` - current quota
- `GET /api/admin/users` - admin user list
- `PUT /api/admin/users/[userId]/quota` - admin quota updates
- `GET /api/admin/users/[userId]/audit` - admin usage history
- `GET /api/admin/metrics` - admin metrics overview
- `GET /api/models` - supported models

**Acceptance Criteria**:
- [x] Real routes exist (not placeholders)
- [x] Authentication required
- [x] Rate limiting applied to artifact generation

### Rollback Procedure
- Revert auth configuration
- Reset NextAuth database records
- Clear session cookies

---

## Phase 3: LLM Module Implementation (Week 3-4)

### Goals
- Implement LLM orchestrator
- Create agent system
- Integrate OpenRouter

### Deliverables

#### 3.1 Base Agent Interface
```typescript
// src/lib/llm/agents/base.ts
export abstract class BaseAgent {
  abstract type: 'content' | 'seo' | 'code';
  abstract validateInput(input: unknown): Promise<void>;
  abstract buildPrompt(context: any): string;
  abstract parseResponse(response: string): any;
  
  async execute(context: any) {
    await this.validateInput(context);
    const prompt = this.buildPrompt(context);
    return { prompt };
  }
}
```

**Acceptance Criteria**:
- [x] BaseAgent is abstract
- [x] All agents implement interface
- [x] Type-safe with TypeScript

#### 3.2 OpenRouter Provider
```typescript
// src/lib/llm/providers/openrouter.ts
export class OpenRouterProvider {
  async generateText(request: GenerateRequest) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: 'user', content: request.prompt }],
      }),
    });
    
    return response.json();
  }
  
  async *generateStream(request: GenerateRequest) {
    // Stream implementation
  }
}
```

**Acceptance Criteria**:
- [x] Non-stream generation works
- [x] Stream generation works
- [x] Error handling implemented

#### 3.3 LLM Orchestrator
```typescript
// src/lib/llm/orchestrator.ts
export class LLMOrchestrator {
  private agents = new Map<string, BaseAgent>();
  
  async generate(request: ArtifactRequest) {
    const agent = this.agents.get(request.type);
    const prompt = agent.buildPrompt(request.input);
    
    const response = await this.provider.generateText({
      model: request.model,
      prompt,
    });
    
    return agent.parseResponse(response);
  }
}
```

**Acceptance Criteria**:
- [x] Routes to correct agent
- [x] Parses responses correctly
- [x] Error handling works

#### 3.4 Agent Implementations
Create content, SEO, and code agents with:
- Input validation (Zod schemas)
- Prompt engineering
- Response parsing

**Acceptance Criteria**:
- [x] Each agent generates valid artifacts
- [x] Validates input correctly
- [x] Parses OpenRouter responses

### Rollback Procedure
- Revert to previous provider
- Clear OpenRouter credentials
- Disable agent endpoints

---

## Phase 4: Streaming & API Implementation (Week 4-5)

### Goals
- Implement Server-Sent Events (SSE) streaming
- Create artifact generation endpoint
- Save artifacts to database

### Deliverables

#### 4.1 Streaming Response Handler
```typescript
// src/app/api/artifacts/generate/route.ts
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedErrorResponse();

  const body = await request.json();
  const userId = session.user.id;
  
  // Check rate limit
  const quota = await rateLimit(userId);
  if (!quota.allowed) return rateLimitErrorResponse();
  
  // Create artifact record
  const artifact = await db.artifact.create({
    data: {
      userId,
      type: body.type,
      model: body.model,
      input: body.input,
      status: 'generating',
    },
  });
  
  return new Response(
    createReadableStream(artifact, body),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );
}
```

> **Security note**: non leggere mai `userId` dal body. Usare sempre `session.user.id` lato server.

**Acceptance Criteria**:
- [x] SSE connection established
- [x] Tokens stream in real-time
- [x] Artifact saved to database
- [x] Final artifact state correct

#### 4.2 Stream Chunk Processing
```typescript
// src/lib/llm/streaming.ts
export async function* createReadableStream(
  artifact: any,
  request: ArtifactRequest
) {
  const orchestrator = new LLMOrchestrator();
  const stream = await orchestrator.generateStream(request);
  
  let fullContent = '';
  let tokenCount = 0;
  
  for await (const token of stream) {
    fullContent += token;
    tokenCount++;
    
    yield `data: ${JSON.stringify({
      token,
      tokenCount,
      artifactId: artifact.id,
    })}\n\n`;
    
    // Periodic saves (every 20 tokens)
    if (tokenCount % 20 === 0) {
      await db.artifact.update({
        where: { id: artifact.id },
        data: { content: fullContent },
      });
    }
  }
  
  // Final update
  await db.artifact.update({
    where: { id: artifact.id },
    data: {
      content: fullContent,
      status: 'completed',
      outputTokens: tokenCount,
      completedAt: new Date(),
    },
  });
}
```

**Acceptance Criteria**:
- [x] Tokens stream correctly
- [x] Database updates periodically
- [x] Final artifact is complete

#### 4.3 CRUD Endpoints
Implemented:
- `GET /api/artifacts/[id]` - fetch
- `DELETE /api/artifacts/[id]` - delete
- `GET /api/projects` - list
- `POST /api/projects` - create
- `GET|PUT|DELETE /api/projects/[id]` - project detail CRUD
- `GET /api/users/profile` - current user profile
- `GET /api/users/quota` - current quota
- `GET /api/admin/users` - list users (admin)
- `PUT /api/admin/users/[userId]/quota` - update admin quota
- `GET /api/models` - supported models

> **⚠️ Next.js 16 Note**: nei Route Handler con segmenti dinamici, `params` è una **Promise** e va `await`ata:
> ```typescript
> // src/app/api/artifacts/[id]/route.ts
> export async function GET(
>   request: Request,
>   { params }: { params: Promise<{ id: string }> }
> ) {
>   const { id } = await params; // ← await obbligatorio
>   ...
> }
> ```

**Acceptance Criteria**:
- [x] All planned CRUD operations work
- [x] Authorization enforced
- [x] Implemented responses match current code

#### 4.4 Cost Calculation
Track spending per artifact:
```typescript
export function calculateCost(model: string, inputTokens: number, outputTokens: number) {
  const costs = {
    'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
    'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
    'mistralai/mistral-large': { input: 0.008, output: 0.024 },
  };
  const pricing = costs[model] ?? costs['openai/gpt-4-turbo'];
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}
```

**Acceptance Criteria**:
- [x] Costs calculated correctly
- [x] Stored in database
- [x] Monthly budget tracked

### Rollback Procedure
- Disable streaming endpoint
- Revert to batch mode
- Clear artifact records

---

## Phase 5: Frontend Components (Week 5-6)

### Goals
- Create React components
- Implement streaming consumer
- Build dashboard

### Deliverables

#### 5.1 Core Components
- `ProjectCard` - display project
- `ArtifactForm` - input for generation
- `StreamingDisplay` - real-time artifact display
- `QuotaStatus` - show current quota

**Acceptance Criteria**:
- [x] Components render correctly
- [x] Props are type-safe
- [ ] Responsive on mobile/tablet/desktop fully validated

#### 5.2 Streaming Consumer Hook
```typescript
// src/components/hooks/useStreamGeneration.ts
export function useStreamGeneration() {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  async function generate(request: ArtifactRequest) {
    setIsStreaming(true);
    setContent('');
    const response = await fetch('/api/artifacts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) {
      setIsStreaming(false);
      throw new Error('Stream not available');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'start') setArtifactId(data.artifactId ?? null);
          if (data.type === 'token') setContent(prev => prev + data.token);
          if (data.type === 'error') setError(data.message ?? 'Unknown error');
        }
      }
    }
    
    setIsStreaming(false);
  }
  
  return { content, isStreaming, artifactId, error, generate };
}
```

**Acceptance Criteria**:
- [x] Connects to streaming endpoint
- [x] Receives tokens
- [x] Updates UI in real-time
- [x] Handles errors gracefully

#### 5.3 Pages
- `/dashboard` - main interface
- `/artifacts` - artifact list
- `/artifacts/[id]` - artifact detail
- `/dashboard/projects/new` - create project
- `/dashboard/projects/[id]` - project detail
- `/admin` - admin user management

**Acceptance Criteria**:
- [x] All implemented pages render
- [x] Navigation works
- [x] Authentication required

### Rollback Procedure
- Revert component changes
- Clear cache
- Reload page fresh

---

## Phase 6: Admin Panel & Advanced Features (Week 6-7)

### Goals
- Implement admin dashboard
- User/quota management
- Advanced features

### Deliverables

#### 6.1 Admin Dashboard
- User listing with quota/spending
- Edit user quotas
- View all artifacts
- System metrics

**Acceptance Criteria**:
- [x] Admin can see all users
- [x] Can adjust quotas
- [x] Can view audit logs / recent usage activity

#### 6.2 User Management
- Create users
- Delete users
- Reset quotas
- View usage history

**Acceptance Criteria**:
- [ ] CRUD operations work
- [x] Quota changes reflected instantly
- [x] Usage history visible

### Rollback Procedure
- Revert admin routes
- Clear admin access

---

## Phase 7: Testing & Quality (Week 7-8)

### Goals
- Comprehensive test coverage
- Performance optimization
- Security audit

### Deliverables

#### 7.1 Unit Tests
- Agent validation
- Cost calculation
- Rate limiting

**Status**: basic scaffolding present; cost calculation covered, agent/rate-limit tests still to expand.

#### 7.2 Integration Tests
- API endpoints
- Database operations
- Auth flow

**Status**: coverage target raggiunto su scope corrente (Statements 82.96%, Branches 70.31%, Functions 78.91%, Lines 85.96%); DB/auth real-flow ed E2E completi da espandere.

#### 7.3 E2E Tests (Playwright)
- Full artifact generation flow
- Streaming validation
- Error scenarios

**Status**: smoke test for homepage/login CTA passes locally; authenticated and generation flows still to expand.

#### 7.4 Performance
- Load testing
- Query optimization
- Caching validation

#### 7.5 Security
- OWASP top 10 review
- Input validation
- API key protection

**Acceptance Criteria**:
- [ ] >80% test coverage
- [x] >80% test coverage (scope corrente)
- [ ] No security vulnerabilities
- [ ] Performance meets targets

### Rollback Procedure
- Revert changes
- Run regression tests

---

## Phase 8: Deployment & Monitoring (Week 8)

### Goals
- Deploy to production
- Setup monitoring
- Documentation
- CI/CD pipeline

### Deliverables

#### 8.1 CI/CD Pipeline (GitHub Actions)
**Status**: ✅ IMPLEMENTED

Workflow: `.github/workflows/ci.yml`
- Runs on: `push` to `main` and all `pull_request` events
- Steps:
  1. Checkout code
  2. Setup Node.js 22 LTS
  3. Install dependencies (`npm ci`)
  4. Generate Prisma client (`npx prisma generate`) ⚠️ CRITICAL
  5. Lint (`npm run lint`)
  6. Type check (`npm run typecheck`)
  7. Unit tests (`npm run test`)
  8. Build (`npm run build`)

**Environment Variables** (required in CI):
- `OPENAI_API_KEY` (from secrets)
- `UPSTASH_REDIS_REST_URL` (from secrets)
- `UPSTASH_REDIS_REST_TOKEN` (from secrets)

**Key Points**:
- `npx prisma generate` must run before typecheck (TypeScript needs `@/generated/prisma`)
- All environment variables must be available during build (Next.js executes server code)
- Node.js 22 LTS for stability

#### 8.2 Production Deployment
1. Build Docker image (via Render)
2. Deploy to Vercel production (`main`) and validate PR workflow on `dev`
3. Run smoke tests
4. Monitor for 24 hours

#### 8.3 Monitoring Setup
- Sentry for error tracking
- Vercel logs
- Custom dashboards

#### 8.4 Documentation
- Deployment guide
- Runbook for common issues
- API documentation

**Acceptance Criteria**:
- [x] CI/CD pipeline working (all tests passing)
- [x] App runs on Vercel production (`main`)
- [ ] No errors in first 24 hours
- [ ] Team trained on operations

---

## Rollback Summary

| Phase | Rollback Command |
|-------|------------------|
| **1-2** | `git revert <commit>` + manual DB reset |
| **3-4** | `git revert` + clear artifact records |
| **5-6** | `git revert` + clear cache |
| **7-8** | `git revert` + redeploy previous |

**Critical**: Always maintain database backups before deployment.

---

## Success Criteria

- [ ] All phases completed on schedule
- [ ] Zero critical bugs in production
- [ ] 50 users can generate artifacts
- [ ] Streaming works reliably
- [ ] Cost tracking accurate
- [ ] Admin features functional
- [ ] Team can operate independently

---

## Remaining Execution Order

To complete the plan from the current state, execute the remaining work in this order:

1. **Expand automated coverage**
  - Add Jest + integration tests for API/auth/LLM utilities
  - Add Playwright for login, project creation, generation and admin quota flows
  - Reach the target coverage threshold

2. **Deployment and operations**
  - Harden existing Vercel deployment
  - Add monitoring/logging
  - Write runbook and smoke-test checklist

3. **Product decisions outside core scaffold**
  - Decide whether admin user create/delete belongs in MVP
  - Decide whether system metrics need a dedicated page beyond the current overview
  - Validate mobile responsiveness and UX polish before production release

---

## Frontend Improvement Sprint Sequence

1. **Sprint 1 (completed)**
  - Enforce human-readable artifact output in frontend preview surfaces.
  - Remove direct raw JSON visualization in user-facing output areas.

2. **Sprint 2 (in progress - core hardening completed)**
  - Complete responsive validation on mobile/tablet/desktop.
  - Accessibility hardening to consistent WCAG AA behavior.
  - Current delta: core pages improved with label/input associations, live regions, error semantics, skip-link global, and consistent `main` landmarks.
  - Mobile UX delta: key CTA/actions aligned to full-width behavior on small screens.
  - Validation delta: lint pass completed (non-blocking warnings only in unrelated tests).
  - Playwright delta: smoke/accessibility base/protected-route redirects validated (4/4 passing).

3. **Sprint 3 (completed)**
  - Remove obsolete legacy tool routes (`/tools/content`, `/tools/seo`, `/tools/code`) from the app surface.
  - Outcome: buttons, routes and related obsolete code/tests removed to keep the MVP toolset aligned with Meta Ads and HotLead Funnel only.

4. **Sprint 4 (in progress - core polish completed)**
  - Navigation/layout polish (navbar, sidebar, dashboard density) and admin UX refinements.
  - Current delta: dashboard quick-actions expanded, navbar quick action added, admin quota/budget UX hardened, activity timeline readability improved.

5. **Sprint 5 (in progress - guardrail core completed)**
  - E2E UX regression guardrails on auth, generation, artifacts, and admin quota workflows.
  - Current delta: Playwright smoke/accessibility redirect coverage expanded; integration guardrails added for AdminQuotaForm.
  - Validation delta: dedicated Sprint 5 suites passing locally alongside 4/4 Playwright baseline.

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| OpenRouter outage | Medium | High | Fallback models configured |
| Streaming connection loss | Low | Medium | Auto-retry, save partial |
| Database corruption | Low | Critical | Automatic backups |
| Rate limit exhaustion | Medium | Medium | Clear quota management |
| Security vulnerability | Low | Critical | Regular audits |

---

## Dependencies & Prerequisites

- [x] Google Cloud OAuth credentials ready
- [x] Vercel project configured
- [x] OpenRouter API key obtained and configured
- [ ] Team has Node.js/TypeScript experience
- [x] GitHub repository created

---

## Sign-Off

- [ ] Product Manager approves plan
- [ ] Tech Lead reviews architecture
- [ ] DevOps validates infrastructure
- [ ] Security team clears approach
