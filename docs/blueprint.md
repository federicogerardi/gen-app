# Blueprint: LLM Artifact Generation Hub

**Version**: 1.0  
**Status**: READY FOR IMPLEMENTATION  
**Target Audience**: AI Development Agents  
**Last Updated**: 2026-04-07

---

## Executive Summary

A modular web application that allows non-technical users (MediaBuyers, SEO Specialists) to generate professional artifacts (content, SEO analysis, code) using various LLM models via OpenRouter. 

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
│  │ - Artifact Generator (type selector)                 │   │
│  │ - Artifact Editor with Real-time Streaming           │   │
│  │ - Admin CRUD (users, projects, artifacts)            │   │
│  └────────────────────┬─────────────────────────────────┘   │
└───────────────────────┼────────────────────────────────────┘
                        │ REST + SSE
        ┌───────────────▼────────────────┐
        │  Next.js 15 API Routes         │
        │  /api/artifacts/generate       │
        │  /api/projects/*               │
        │  /api/users/* (admin)          │
        │  /api/auth/*                   │
        └───────────────┬────────────────┘
                        │
        ┌───────────────▼────────────────────────────────┐
        │  Server-Side Components                        │
        │ ┌──────────────────────────────────────────┐   │
        │ │ LLM Orchestrator                         │   │
        │ │ - Route requests to agents               │   │
        │ │ - Handle streaming/batch                 │   │
        │ │ - Rate limit & quota check               │   │
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
| **Backend** | Next.js 15 + TypeScript | Full-stack, edge functions, API routes |
| **Database** | PostgreSQL 16 | ACID compliance, JSON support, stable |
| **ORM** | Prisma | Type-safe, auto-migration, great DX |
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
│   ├── generate          [POST] → Stream LLM response
│   ├── [id]              [GET]  → Fetch artifact
│   ├── [id]              [PUT]  → Update artifact
│   └── [id]              [DELETE] → Delete artifact
├── projects/
│   ├── index             [GET]  → List user projects
│   ├── create            [POST]  → Create project
│   ├── [id]              [GET]  → Get project + artifacts
│   ├── [id]              [PUT]  → Update project
│   └── [id]              [DELETE] → Delete project
├── users/
│   ├── profile           [GET]  → Current user
│   ├── quota             [GET]  → Current quota/spending
│   └── admin/
│       ├── users         [GET]  → List all users (admin)
│       ├── users         [POST] → Create user
│       ├── users/[id]    [PUT]  → Update quota/budget
│       └── users/[id]    [DELETE] → Delete user
└── auth/
    ├── signin            [GET]  → OAuth flow
    ├── callback          [GET]  → OAuth callback
    └── signout           [POST] → Sign out
```

### 4. Frontend Architecture

#### Components (shadcn/ui)
- Layout: Sidebar, Header, Main content
- Forms: ArtifactForm (input + parameters)
- UI: Buttons, Dialog, Tabs, Select, NumberInput
- Display: StreamingDisplay (real-time artifact display)

#### Pages
- `/` → Landing/Dashboard
- `/artifacts` → Project artifacts list
- `/artifacts/new` → Create new artifact
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

```yaml
on: [push]
jobs:
  test:
    - lint
    - type check
    - unit tests
    - integration tests
  deploy:
    - build Docker image
    - push to Render
    - smoke tests
```

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
