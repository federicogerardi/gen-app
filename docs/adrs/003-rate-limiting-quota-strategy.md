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
│  Tier 1: IP/Global Rate Limit                      │
│  └─ 1000 req/day per user                          │
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

#### 2. Rate Limiting Middleware
```typescript
// src/middleware/rate-limit.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export async function rateLimitMiddleware(
  request: Request,
  userId: string
): Promise<{ allowed: boolean; remaining: number; reset: Date }> {
  const key = `quota:${userId}:${getMonthKey()}`;
  const dailyKey = `daily:${userId}:${getDayKey()}`;
  
  // Check daily limit (sliding window)
  const dailyCount = await redis.incr(dailyKey);
  if (dailyCount === 1) {
    await redis.expire(dailyKey, 86400); // 24 hours
  }
  
  if (dailyCount > 100) { // 100 requests per day
    return {
      allowed: false,
      remaining: 0,
      reset: new Date(Date.now() + 86400000),
    };
  }
  
  // Check monthly limit
  const monthlyCount = await redis.incr(key);
  if (monthlyCount === 1) {
    await redis.expire(key, 2592000); // 30 days
  }
  
  const remaining = 1000 - monthlyCount; // 1000 /month
  
  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      reset: getMonthResetDate(),
    };
  }
  
  return {
    allowed: true,
    remaining,
    reset: getMonthResetDate(),
  };
}

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getDayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
```

#### 3. Cost Calculation & Tracking
```typescript
// src/lib/llm/cost-calculator.ts
const MODEL_COSTS = {
  'openai/gpt-4-turbo': { input: 0.01, output: 0.03 }, // per 1K tokens
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'mistral/mistral-large': { input: 0.008, output: 0.024 },
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
import { rateLimitMiddleware } from '@/middleware/rate-limit';

export async function POST(request: Request) {
  const { artifactRequest, userId } = await request.json();
  
  // Check rate limit
  const quotaCheck = await rateLimitMiddleware(request, userId);
  
  if (!quotaCheck.allowed) {
    return Response.json(
      {
        error: 'Rate limit exceeded',
        remaining: quotaCheck.remaining,
        resetDate: quotaCheck.reset,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((quotaCheck.reset.getTime() - Date.now()) / 1000)),
        },
      }
    );
  }
  
  // Check budget
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const estimatedCost = estimateCost(artifactRequest.model);
  
  if (user.monthlySpent + estimatedCost > user.monthlyBudget) {
    return Response.json(
      {
        error: 'Monthly budget exceeded',
        monthlySpent: user.monthlySpent,
        monthlyBudget: user.monthlyBudget,
      },
      { status: 402 } // Payment Required
    );
  }
  
  // Proceed with generation...
  const artifact = await generateArtifact(artifactRequest);
  
  return Response.json({
    artifactId: artifact.id,
    quotaRemaining: quotaCheck.remaining - 1,
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

- ✅ AI agents can implement quota middleware
- ✅ JSON responses include quota info
- ✅ Clear error codes for rate limit errors
- ✅ Audit trail for billing audits

## Related ADRs
- ADR 001: Modular LLM Controller
- ADR 002: Streaming vs Batch Responses
