# ADR 003: Rate Limiting & User Quota Strategy

**Status**: ACCEPTED  
**Date**: 2026-04-07  
**Deciders**: Architecture Team  
**Affect Scope**: API Security, User Management, Database Schema

## Context

The application:
- Integrates with OpenRouter (external API with rate limits)
- Has 50 internal users with shared quota
- Needs to prevent abuse while allowing legitimate usage
- May have power users vs casual users

### Constraints
- OpenRouter has model-specific rate limits (~100 req/min for most models)
- Costs: Each API call has monetary cost
- Total monthly budget: ~$100-500 for LLM calls
- Need audit trail for billing and compliance

## Decision

Implement **three-tier rate limiting strategy**:

```
┌─────────────────────────────────────────────────────┐
│            User Quota System                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tier 1: User Monthly Quota                        │
│  └─ 1000 req/30 giorni per user                    │
│                                                     │
│  Tier 2: OpenRouter Rate Limit                     │
│  └─ Pass-through (respect provider limits)         │
│                                                     │
│  Tier 3: Cost Budget Tracking                      │
│  └─ Monthly spend per user/org                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Implementation

#### 1. Database Schema for Quotas
```prisma
// prisma/schema.prisma
model User {
  id String @id @default(cuid())
  email String @unique
  name String
  
  // Quota tracking
  monthlyQuota Int @default(1000) // requests/month
  monthlyUsed Int @default(0)
  resetDate DateTime @default(now())
  
  // Cost tracking
  monthlyBudget Decimal @default(500.00) // USD
  monthlySpent Decimal @default(0.00)
  
  artifacts Artifact[]
  quotaHistory QuotaHistory[]
}

model QuotaHistory {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id])
  
  requestCount Int
  costUSD Decimal
  model String
  artifactType String
  status String // 'success' | 'error' | 'rate_limited'
  
  createdAt DateTime @default(now())
}

model Artifact {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id])
  projectId String
  
  type String // 'content' | 'seo' | 'code'
  model String
  status String // 'generating' | 'completed' | 'failed'
  
  inputTokens Int // tracked for cost calculation
  outputTokens Int
  costUSD Decimal
  
  createdAt DateTime @default(now())
}
```

#### 2. Rate Limiting Utility
```typescript
// src/lib/rate-limit.ts
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Usa UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
const redis = Redis.fromEnv();

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(1000, '30 d'),
  prefix: 'quota',
});

export async function rateLimit(userId: string) {
  const { success, remaining } = await ratelimit.limit(userId);
  return { allowed: success, remaining };
}
```

#### 3. Cost Calculation & Tracking
```typescript
// src/lib/llm/cost-calculator.ts
const MODEL_COSTS = {
  'openai/gpt-4-turbo': { input: 0.01, output: 0.03 }, // per 1K tokens
  'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
  'mistralai/mistral-large': { input: 0.008, output: 0.024 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): Decimal {
  const pricing = MODEL_COSTS[model] || MODEL_COSTS['openai/gpt-4-turbo'];
  
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  
  return new Decimal(inputCost + outputCost);
}

export async function trackQuotaUsage(
  userId: string,
  artifactId: string,
  model: string,
  inputTokens: number,
  outputTokens: number
) {
  const cost = calculateCost(model, inputTokens, outputTokens);
  
  // Update artifact with cost
  await prisma.artifact.update({
    where: { id: artifactId },
    data: {
      inputTokens,
      outputTokens,
      costUSD: cost,
    },
  });
  
  // Update user spending
  await prisma.user.update({
    where: { id: userId },
    data: {
      monthlySpent: {
        increment: cost,
      },
    },
  });
  
  // Log for audit trail
  await prisma.quotaHistory.create({
    data: {
      userId,
      requestCount: 1,
      costUSD: cost,
      model,
      artifactType: artifact.type,
      status: 'success',
    },
  });
}
```

#### 4. API Endpoint with Rate Limiting
```typescript
// src/app/api/artifacts/generate/route.ts
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const userId = session.user.id;

  // First check persisted monthly usage / budget on User
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user.monthlyUsed >= user.monthlyQuota) {
    return Response.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Monthly quota exhausted',
        },
      },
      { status: 429 }
    );
  }

  if (user.monthlySpent >= user.monthlyBudget) {
    return Response.json(
      {
        error: {
          code: 'PAYMENT_REQUIRED',
          message: 'Monthly budget exceeded',
        },
      },
      { status: 402 }
    );
  }

  // Then check Redis-based per-user request limit
  const quotaCheck = await rateLimit(userId);
  if (!quotaCheck.allowed) {
    return Response.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
        },
      },
      { status: 429 }
    );
  }
  
  // Proceed with generation...
  const artifact = await generateArtifact(artifactRequest);
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

#### 5. Admin Dashboard Quota Monitoring
```typescript
// src/app/admin/quotas/page.tsx
async function QuotasPage() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { artifacts: true },
      },
    },
  });
  
  return (
    <div>
      <h1>User Quota Dashboard</h1>
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Monthly Used / Quota</th>
            <th>Spent / Budget</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.monthlyUsed} / {user.monthlyQuota}</td>
              <td>${user.monthlySpent} / ${user.monthlyBudget}</td>
              <td>
                {user.monthlyUsed > 0.8 * user.monthlyQuota && '⚠️ Warning'}
                {user.monthlySpent > 0.8 * user.monthlyBudget && '⛔ Budget High'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Consequences

### Positive
- ✅ Prevents abuse and cost overruns
- ✅ Fair sharing among 50 users
- ✅ Audit trail for compliance
- ✅ Budget control at org level
- ✅ Data for future scaling decisions

### Negative
- ⚠️ Complex quota tracking logic
- ⚠️ Redis dependency for rate limiting
- ⚠️ May frustrate power users near quota
- ⚠️ Requires admin oversight

### Mitigation
- Admin panel to adjust quotas per user
- Clear communication about limits
- Batch quota reset option
- Usage notifications before limit

## Validation

- ✅ AI agents can implement quota utility + endpoint checks
- ✅ JSON responses include quota info
- ✅ Clear error codes for rate limit errors
- ✅ Audit trail for billing audits

## Related ADRs
- ADR 001: Modular LLM Controller
- ADR 002: Streaming vs Batch Responses
