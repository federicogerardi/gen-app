# Blueprint: LLM Artifact Generation Hub

**Version**: 1.0  
**Status**: CORE MVP IMPLEMENTED + TOOL MODULARIZATION IN PROGRESS
**Target Audience**: AI Development Agents  
**Last Updated**: 2026-04-08

---

## Executive Summary

A modular web application that allows non-technical users (MediaBuyers, SEO Specialists) to generate professional artifacts through dedicated workflows (Meta Ads and Funnel Pages) using various LLM models via OpenRouter.

**Key Characteristics**:
- Full-stack TypeScript/Node.js
- Streaming LLM responses for superior UX
- Modular tool architecture for extensibility
- PostgreSQL + Prisma for type-safe database
- React 19 + shadcn/ui + Tailwind for beautiful, accessible UI
- Deployed on Render.com

---

## System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (React 19)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ shadcn/ui Components + Tailwind CSS                  │   │
│  │ - Project Dashboard                                   │   │
│  │ - Tool pages (Meta Ads, Funnel Pages)               │   │
│  │ - Artifact Detail read-only con output elaborato    │   │
│  │ - Admin CRUD (users, projects, artifacts)            │   │
│  └────────────────────┬─────────────────────────────────┘   │
└───────────────────────┼────────────────────────────────────┘
                        │ REST + SSE
        ┌───────────────▼────────────────┐
        │  Next.js 16 Route Handlers     │
        │  /api/artifacts/generate       │
        │  /api/tools/meta-ads/generate  │
        │  /api/tools/funnel-pages/generate │
        │  /api/projects/*               │
        │  /api/users/* (admin)          │
        │  /api/auth/*                   │
        └───────────────┬────────────────┘
                        │
        ┌───────────────▼────────────────────────────────┐
        │  Server-Side Components                        │
        │ ┌──────────────────────────────────────────┐   │
        │ │ LLM Orchestrator + Tool Prompt Layer    │   │
        │ │ - Route requests to agents               │   │
        │ │ - Handle streaming responses             │   │
        │ │ - Rate limit & quota check               │   │
        │ │ - Resolve markdown prompt templates      │   │
        │ └──────┬─────────────────────────────────┬─┘   │
        │        │                                 │      │
        │ ┌──────▼────────┬──────────┬────────┬───▼────┐  │
        │ │ Content Agent │ SEO Agent│CodeGen│Custom  │  │
        │ │               │ Agent    │Agent  │Agents  │  │
        │ └──────┬────────┴──────────┴────────┴───┬────┘  │
        │        │                                 │      │
        │ ┌──────▼─────────────────────────────────▼────┐  │
        │ │ OpenRouter Provider                         │  │
        │ │ - Multi-model support (GPT-4, Claude, etc.)│  │
        │ │ - Request formatting                        │  │
        │ │ - Response parsing & streaming              │  │
        │ └─────────────────────────────────────────────┘  │
        └────────────────────┬────────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    ┌───────▼──────┐  ┌───────▼──────┐  ┌───▼───────┐
    │ PostgreSQL   │  │ NextAuth.js  │  │ OpenRouter│
    │ + Prisma ORM │  │ + Google OAuth│ │  API      │
    │              │  │              │  │           │
    │ Users        │  │ Sessions     │  │ LLM Models│
    │ Projects     │  │ CSRF tokens  │  │           │
    │ Artifacts    │  │              │  │           │
    │ Quotas       │  │              │  │           │
    └──────────────┘  └──────────────┘  └───────────┘
```

### Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 19 + TypeScript | Modern hooks, Server Components, type safety |
| **UI Components** | shadcn/ui v4 (Base UI) | Accessible, customizable, beautiful |
| **Styling** | Tailwind CSS | Utility-first, rapid development, consistent |
| **Forms** | React Hook Form + Zod | Type-safe validation, minimal re-renders |
| **State Management** | TanStack Query (React Query) | Server state, caching, background sync |
| **Backend** | Next.js 16 + TypeScript | App Router, Route Handlers, `proxy.ts` protection |
| **Database** | PostgreSQL 16 | ACID compliance, JSON support, stable |
| **ORM** | Prisma 7 + PrismaPg adapter | Type-safe queries with Prisma 7 driver adapter model |
| **Auth** | NextAuth.js v5 + Google OAuth | Secure, session-based, enterprise OAuth |
| **LLM Integration** | OpenRouter SDK | Multi-model, routing, fallbacks |
| **Streaming** | Server-Sent Events (SSE) | Real-time, simple, HTTP/1.1 compatible |
| **Rate Limiting** | @upstash/ratelimit + Redis | Sliding/fixed window, serverless-ready |
| **Deployment** | Render.com | Managed Node.js, PostgreSQL, simple scaling |
| **Monitoring** | Sentry + Render logs | Error tracking, performance monitoring |

---

## Data Models

### User
```typescript
model User {
  id: string                    // Primary key
  email: string                 // Unique, from Google OAuth
  name: string                  // Display name
  
  // Quota system
  monthlyQuota: number          // Requests allowed per month (default: 1000)
  monthlyUsed: number           // Current month usage
  resetDate: Date               // When quota resets
  
  // Budget tracking
  monthlyBudget: Decimal        // USD spending limit
  monthlySpent: Decimal         // Current month spending
  
  // Relationships
  projects: Project[]
  artifacts: Artifact[]
  quotaHistory: QuotaHistory[]
  
  // Metadata
  createdAt: Date
  updatedAt: Date
}
```

### Project
```typescript
model Project {
  id: string
  userId: string                // Owner
  
  name: string                  // User-defined project name
  description: string?
  
  // Relationships
  artifacts: Artifact[]
  
  createdAt: Date
  updatedAt: Date
}
```

### Artifact
```typescript
model Artifact {
  id: string
  userId: string                // Creator
  projectId: string             // Container
  
  type: string                  // 'content' | 'seo' | 'code' | custom...
  model: string                 // 'openai/gpt-4-turbo', 'anthropic/claude-3-opus', etc.
  
  // Input/Output
  input: object                 // JSON input (context, parameters)
  content: string               // Generated artifact
  
  // Processing metadata
  status: string                // 'generating' | 'completed' | 'failed'
  inputTokens: number
  outputTokens: number
  costUSD: Decimal
  
  // Streaming support
  streamedAt: Date?
  completedAt: Date?
  
  createdAt: Date
  updatedAt: Date
}
```

### QuotaHistory
```typescript
model QuotaHistory {
  id: string
  userId: string
  
  requestCount: number          // How many requests
  costUSD: Decimal              // Amount charged
  model: string                 // Which model
  artifactType: string          // Content, SEO, etc.
  status: string                // 'success' | 'error' | 'rate_limited'
  
  createdAt: Date
}
```

---

## Core Modules

### 1. LLM System

#### Orchestrator (Central Controller)
- Routes artifacts to correct agent
- Handles quota/rate limit checks
- Manages streaming vs batch
- Logs all requests

**Responsibility**: Coordination, not business logic

#### Agents (Pluggable Tools)
- `ContentAgent`: Marketing copy, blog posts
- `SEOAgent`: Keyword analysis, meta descriptions
- `CodeAgent`: Code generation, boilerplate
- Custom agents can be added

#### Tool Prompt Layer (Server-only)
- `src/lib/tool-prompts/registry.ts`: registry centralizzato dei template
- `src/lib/tool-prompts/loader.ts`: caricamento/caching dei prompt markdown
- `src/lib/tool-prompts/meta-ads.ts`: builder prompt Meta Ads
- `src/lib/tool-prompts/funnel-pages.ts`: builder prompt Funnel (`optin -> quiz -> vsl`)

**Responsibility**: Tool-specific prompt engineering

#### Provider (LLM Integration)
- Abstracts away OpenRouter specifics
- Handles API communication
- Manages retries and timeouts
- Feeds to orchestrator

**Responsibility**: LLM vendor abstraction

### 2. Authentication & Authorization

- **NextAuth.js v5** handles sessions
- **Google OAuth** enterprise login
- **Email whitelist** enforcement (`email.endsWith('@company.com')`)
- **Database sessions (Prisma adapter)** for server-side revocation and auditability
- **CSRF protection** built-in

### 3. API Layer

```
/api/
├── artifacts/
│   ├── generate          [POST]    → Stream LLM response
│   └── [id]              [GET|DELETE] → Fetch/delete artifact
├── tools/
│   ├── meta-ads/generate    [POST] → Stream Meta Ads dedicated workflow
│   └── funnel-pages/generate [POST] → Stream Funnel step (`optin|quiz|vsl`)
├── projects/
│   ├── route.ts          [GET|POST] → List/create user projects
│   └── [id]              [GET|PUT|DELETE] → Project detail CRUD
├── users/
│   ├── profile           [GET]     → Current user profile
│   └── quota             [GET]     → Current quota/spending
├── admin/
│   └── users/
│       ├── route.ts      [GET]     → List users (admin)
│       └── [userId]/quota [PUT]    → Update quota/budget or reset usage
├── models/route.ts       [GET]     → Supported LLM models
└── auth/[...nextauth]    [GET|POST] → Auth.js handlers
```

### Runtime Notes

- `src/proxy.ts` protects routes and redirects unauthenticated users to `/`
- `src/app/api/auth/[...nextauth]/route.ts` runs on `runtime = 'nodejs'`
- Prisma 7 uses `prisma.config.ts` + `@prisma/adapter-pg`; the datasource URL is no longer kept in `schema.prisma`

### 4. Frontend Architecture

#### Components (shadcn/ui)
- Layout: Sidebar, Header, Main content
- Forms: ArtifactForm (input + parameters)
- UI: Buttons, Dialog, Tabs, Select, NumberInput
- Display: StreamingDisplay (real-time artifact display)

#### Pages
- `/` → Landing
- `/dashboard` → Dashboard con CTA tool dedicate
- `/tools/meta-ads` → Tool Meta Ads
- `/tools/funnel-pages` → Tool Funnel Pages (processo multi-step)
- `/artifacts` → Project artifacts list
- `/artifacts/new` → Generazione rapida legacy
- `/artifacts/[id]` → Edit artifact
- `/admin` → Admin panel (user/quota management)

#### Hooks
- `useStreamGeneration()` → Handle SSE streaming
- `useArtifacts()` → Fetch/manage artifacts (TanStack Query)
- `useQuota()` → Current quota status
- `useAuth()` → Current user + logout

### 5. Database Layer (Prisma)

- Auto-migrations on deploy
- Type-safe queries
- Relationship management
- Hard delete for artifacts/projects in v1 (with ownership checks + audit trail)

---

## API Contracts (JSON)

### Request: Generate Artifact

```json
{
  "projectId": "proj_123",
  "type": "content",
  "model": "openai/gpt-4-turbo",
  "input": {
    "topic": "User onboarding for SaaS",
    "tone": "professional",
    "length": 500,
    "outputFormat": "markdown"
  }
}
```

### Response: Streaming (SSE)

```
data: {"type":"start","artifactId":"art_456"}
data: {"type":"token","token":"Great"}
data: {"type":"token","token":" onboarding"}
data: {"type":"complete","tokens":{"input":45,"output":120},"cost":0.012}
```

### Response: Error

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Monthly quota exhausted",
    "details": {
      "remaining": 0,
      "resetDate": "2026-05-07T00:00:00Z"
    }
  }
}
```

---

## Deployment Architecture

### Environment: Render.com

1. **Build**
   ```bash
   npm run build
   npm run db:migrate:prod
   ```

2. **Runtime**
   - Node.js 22 LTS
   - 512MB RAM starter plan
   - PostgreSQL 16 starter (5GB)
   - Environment variables for secrets

3. **Scaling**
   - Auto-recovery on crash
   - Manual scale if > 100K daily requests
   - Database backups automatic (7-day retention)

### CI/CD (GitHub Actions)

**Workflow**: `.github/workflows/ci.yml`

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

**Key Points**:
- **`npx prisma generate`** must run before `npm run typecheck` (TypeScript needs `@/generated/prisma`)
- **Environment variables** required during build: `OPENAI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Node.js 22 LTS** for stability and compatibility
- **Runs on**: `push` to `main` and all `pull_request` events

---

## Quality Attributes Verification

### ✅ Scalability
- Single Render container sufficient for 50 users
- OpenRouter is infinitely scalable (paid model)
- Redis caching for performance
- Database query optimization through Prisma

### ✅ Reliability
- Retry logic with exponential backoff
- Circuit breaker pattern (graceful degradation)
- Fallback models (GPT-4 → Claude → Mistral)
- Session persistence in PostgreSQL

### ✅ Maintainability
- Type-safe throughout (TypeScript + Prisma)
- Clear module separation (agents, providers, orchestrator)
- Self-documenting with Zod schemas
- Comprehensive error types

### ✅ Security
- Google OAuth enforced
- API rate limiting per user
- CSRF protection (NextAuth)
- Audit logging for all operations
- OpenRouter API key never exposed to frontend

### ✅ Performance
- Streaming responses (real-time UX)
- Server-Side Rendering for fast initial load
- Database query optimization
- Redis caching for frequent models
- CDN-ready (Render supports caching)

### ✅ Cost Efficiency
- ~$150/month base (Render + DB)
- ~$100-500/month LLM costs (OpenRouter)
- No expensive infrastructure
- Auto-billing tied to usage

---

## Accessibility & UX Standards

### WCAG 2.1 AA Compliance
- ✅ Keyboard navigation throughout
- ✅ Screen reader support (semantic HTML, shadcn/ui)
- ✅ 4.5:1 color contrast minimum
- ✅ Focus indicators visible
- ✅ Alt text for images

### User Experience
- Streaming responses show real-time progress
- Fallback UI if streaming fails
- Clear error messages
- Loading skeletons match content layout
- Responsive design (mobile, tablet, desktop)

---

## Responsible AI Checklist

- ✅ **Bias Prevention**: Log all model decisions for audit
- ✅ **Transparency**: Show which model is generating
- ✅ **Explainability**: Artifact generation reasons logged
- ✅ **Privacy**: Minimal data collection, clear retention
- ✅ **Inclusivity**: Accessible UI for all users

---

## Key Decisions (ADRs)

1. **ADR 001**: Modular LLM Controller Architecture
   - Allows new tools as plugins
   - Clear separation of concerns

2. **ADR 002**: Streaming vs Batch Responses
   - Primary: Streaming (better UX)
   - Fallback: Batch (reliability)

3. **ADR 003**: Rate Limiting & Quota Strategy
   - Per-user monthly quotas
   - Cost tracking and budget alerts

---

## Next Steps for Implementation

1. **Phase 1**: Database schema + authentication
2. **Phase 2**: Core API routes + orchestrator
3. **Phase 3**: Frontend UI + streaming consumer
4. **Phase 4**: Agent implementations
5. **Phase 5**: Admin panel
6. **Phase 6**: Testing + deployment

See `implementation-plan.md` for detailed phases.
