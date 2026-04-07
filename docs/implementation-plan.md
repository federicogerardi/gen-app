# Implementation Plan: LLM Artifact Generation Hub

**Version**: 1.0  
**Status**: READY FOR DEVELOPMENT  
**Target Audience**: AI Development Agents  
**Estimated Duration**: 6-8 weeks (part-time)  
**Last Updated**: 2026-04-07

---

## Overview

Detailed phase-by-phase implementation roadmap for building the LLM Artifact Generation Hub. Each phase has:
- **Clear deliverables**
- **Acceptance criteria**
- **Dependencies**
- **Rollback procedures**

---

## Phase 1: Foundation & Infrastructure (Week 1-2)

### Goals
- Setup development environment
- Configure Render.com infrastructure
- Initialize codebase with Next.js + Prisma
- Implement database schema

### Deliverables

#### 1.1 Project Initialization
```bash
# Initialize Next.js 15 + TypeScript
npx create-next-app@latest gen-app --typescript --tailwind --app-router

# Add dependencies
npm install prisma @prisma/client zod next-auth @auth/prisma-adapter @upstash/redis openai

# Initialize Prisma
npx prisma init
```

**Acceptance Criteria**:
- [ ] Next.js 15 app runs locally
- [ ] Tailwind CSS is working
- [ ] TypeScript strict mode enabled
- [ ] .env.local configured with DATABASE_URL

#### 1.2 Database Schema Implementation
- Create `prisma/schema.prisma` with models:
  - User (authentication + quota)
  - Project (artifact container)
  - Artifact (generated content)
  - QuotaHistory (audit trail)
  - Session (NextAuth)

**Acceptance Criteria**:
- [ ] Prisma schema compiles
- [ ] All relationships are correct
- [ ] Migrations run cleanly
- [ ] Shadow database works

#### 1.3 Render.com Setup
1. Create PostgreSQL database on Render
2. Create Node.js service
3. Configure environment variables
4. Setup automatic deployments from GitHub

**Acceptance Criteria**:
- [ ] PostgreSQL running on Render
- [ ] Can connect locally via `DATABASE_URL`
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
│   │   │   ├── projects/route.ts
│   │   │   ├── users/route.ts
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
- [ ] Directory structure created
- [ ] Linting rules configured
- [ ] TypeScript paths configured

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
  adapter: PrismaAdapter(db),
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
      return session;
    },
  },
  trustHost: true, // necessario su Render.com
});

// src/app/api/auth/[...nextauth]/route.ts
export const { GET, POST } = handlers;
```

**Acceptance Criteria**:
- [ ] Google OAuth flow works
- [ ] Email whitelist enforced
- [ ] Sessions persist in database
- [ ] Logout clears session

#### 2.2 Rate Limiting Middleware
```typescript
// src/middleware/rate-limit.ts
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
- [ ] Rate limiting works with Redis
- [ ] Quota resets monthly
- [ ] Returns correct remaining count

#### 2.3 API Base Routes
Create placeholder routes:
- `GET /api/projects` - list projects
- `POST /api/projects` - create project
- `GET /api/artifacts` - list artifacts
- `POST /api/artifacts/generate` - generate artifact (placeholder)

**Acceptance Criteria**:
- [ ] All routes return 200 with mock data
- [ ] Authentication required
- [ ] Rate limiting applied

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
- [ ] BaseAgent is abstract
- [ ] All agents implement interface
- [ ] Type-safe with TypeScript

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
- [ ] Non-stream generation works
- [ ] Stream generation works
- [ ] Error handling implemented

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
- [ ] Routes to correct agent
- [ ] Parses responses correctly
- [ ] Error handling works

#### 3.4 Agent Implementations
Create content, SEO, and code agents with:
- Input validation (Zod schemas)
- Prompt engineering
- Response parsing

**Acceptance Criteria**:
- [ ] Each agent generates valid artifacts
- [ ] Validates input correctly
- [ ] Parses OpenRouter responses

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
export async function POST(request: Request) {
  const { artifactRequest, userId } = await request.json();
  
  // Check rate limit
  const quota = await rateLimit(userId);
  if (!quota.allowed) return rateLimitErrorResponse();
  
  // Create artifact record
  const artifact = await db.artifact.create({
    data: {
      userId,
      type: artifactRequest.type,
      model: artifactRequest.model,
      input: artifactRequest.input,
      status: 'generating',
    },
  });
  
  return new Response(
    createReadableStream(artifact, artifactRequest),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    }
  );
}
```

**Acceptance Criteria**:
- [ ] SSE connection established
- [ ] Tokens stream in real-time
- [ ] Artifact saved to database
- [ ] Final artifact state correct

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
    
    // Periodic saves (every 10 tokens)
    if (tokenCount % 10 === 0) {
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
- [ ] Tokens stream correctly
- [ ] Database updates periodically
- [ ] Final artifact is complete

#### 4.3 CRUD Endpoints
Implement:
- `GET /api/artifacts` - list
- `GET /api/artifacts/[id]` - fetch
- `PUT /api/artifacts/[id]` - update
- `DELETE /api/artifacts/[id]` - delete
- `GET /api/projects` - list
- `POST /api/projects` - create
- etc.

> **⚠️ Next.js 15 Breaking Change**: nei Route Handler con segmenti dinamici, `params` è ora una **Promise** e va `await`ata:
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
- [ ] All CRUD operations work
- [ ] Authorization enforced
- [ ] Responses match spec

#### 4.4 Cost Calculation
Track spending per artifact:
```typescript
export function calculateCost(model: string, tokens: number) {
  const costs = { 'gpt-4-turbo': 0.03, 'claude-3-opus': 0.075 };
  return (tokens / 1000) * costs[model];
}
```

**Acceptance Criteria**:
- [ ] Costs calculated correctly
- [ ] Stored in database
- [ ] Monthly budget tracked

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
- [ ] Components render correctly
- [ ] Props are type-safe
- [ ] Responsive on mobile/tablet/desktop

#### 5.2 Streaming Consumer Hook
```typescript
// src/hooks/useStreamGeneration.ts
export function useStreamGeneration() {
  const [tokens, setTokens] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  async function generateStream(request: ArtifactRequest) {
    setIsStreaming(true);
    const response = await fetch('/api/artifacts/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    for await (const { value } of reader.read()) {
      const chunk = decoder.decode(value);
      const lines = chunk.split('\\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          setTokens(prev => prev + data.token);
        }
      }
    }
    
    setIsStreaming(false);
  }
  
  return { tokens, isStreaming, generateStream };
}
```

**Acceptance Criteria**:
- [ ] Connects to streaming endpoint
- [ ] Receives tokens
- [ ] Updates UI in real-time
- [ ] Handles errors gracefully

#### 5.3 Pages
- `/dashboard` - main interface
- `/artifacts/new` - create artifact
- `/artifacts/[id]` - edit artifact
- `/projects` - manage projects

**Acceptance Criteria**:
- [ ] All pages render
- [ ] Navigation works
- [ ] Authentication required

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
- [ ] Admin can see all users
- [ ] Can adjust quotas
- [ ] Can view audit logs

#### 6.2 User Management
- Create users
- Delete users
- Reset quotas
- View usage history

**Acceptance Criteria**:
- [ ] CRUD operations work
- [ ] Changes reflected instantly

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

#### 7.2 Integration Tests
- API endpoints
- Database operations
- Auth flow

#### 7.3 E2E Tests (Playwright)
- Full artifact generation flow
- Streaming validation
- Error scenarios

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

### Deliverables

#### 8.1 Production Deployment
1. Build Docker image
2. Deploy to Render.com
3. Run smoke tests
4. Monitor for 24 hours

#### 8.2 Monitoring Setup
- Sentry for error tracking
- Render.com logs
- Custom dashboards

#### 8.3 Documentation
- Deployment guide
- Runbook for common issues
- API documentation

**Acceptance Criteria**:
- [ ] App runs on Render.com
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

- [ ] Google Cloud OAuth credentials ready
- [ ] Render.com account created
- [ ] OpenRouter API key obtained
- [ ] Team has Node.js/TypeScript experience
- [ ] GitHub repository created

---

## Sign-Off

- [ ] Product Manager approves plan
- [ ] Tech Lead reviews architecture
- [ ] DevOps validates infrastructure
- [ ] Security team clears approach
