# Improvement Roadmap: LLM Artifact Generation Hub

**Data**: 2026-04-08  
**Basato su**: Architecture Review  
**Orizzonte**: 8 settimane  

---

## Sprint 1: Testing Foundation (Settimana 1-2)

### Obiettivo
Stabilire base di testing con >80% coverage su critical paths.

**Aggiornamento (2026-04-09)**: obiettivo coverage raggiunto su scope corrente (Statements 82.96%, Branches 70.31%, Functions 78.91%, Lines 85.96%). Restano da completare i flussi E2E completi e auth/db real-flow.

### Task 1.1: Unit Tests - Orchestrator & Agents
**Effort**: 8 ore  
**Owner**: Backend Team

```typescript
// tests/unit/orchestrator.test.ts
import { LLMOrchestrator } from '@/lib/llm/orchestrator';
import { ContentAgent } from '@/lib/llm/agents/content';

describe('LLMOrchestrator', () => {
  let orchestrator: LLMOrchestrator;

  beforeEach(() => {
    orchestrator = new LLMOrchestrator();
  });

  describe('getAgent', () => {
    it('should return ContentAgent for content type', () => {
      const agent = orchestrator.getAgent('content');
      expect(agent).toBeInstanceOf(ContentAgent);
    });

    it('should throw for unknown type', () => {
      expect(() => orchestrator.getAgent('unknown' as any)).toThrow(
        'Unknown artifact type: unknown'
      );
    });
  });

  describe('generate', () => {
    it('should validate input before generating', async () => {
      const request = {
        type: 'content' as const,
        model: 'openai/gpt-4-turbo',
        input: {}, // Invalid
      };

      await expect(orchestrator.generate(request)).rejects.toThrow();
    });

    it('should calculate cost correctly', async () => {
      // Mock provider
      const mockProvider = {
        generateText: jest.fn().mockResolvedValue({
          content: 'Generated content',
          inputTokens: 100,
          outputTokens: 200,
        }),
      };

      // Test cost calculation
      const result = await orchestrator.generate({
        type: 'content',
        model: 'openai/gpt-4-turbo',
        input: { topic: 'AI' },
      });

      expect(result.cost).toBeGreaterThan(0);
    });
  });

  describe('generateStream', () => {
    it('should yield tokens progressively', async () => {
      const tokens: string[] = [];

      for await (const chunk of orchestrator.generateStream({
        type: 'content',
        model: 'openai/gpt-4-turbo',
        input: { topic: 'AI' },
      })) {
        tokens.push(chunk.token);
      }

      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});
```

### Task 1.2: Integration Tests - API Routes
**Effort**: 12 ore  
**Owner**: Backend Team

```typescript
// tests/integration/generate-route.test.ts
import { POST } from '@/app/api/artifacts/generate/route';

describe('POST /api/artifacts/generate', () => {
  let mockSession: any;
  let mockUser: any;
  let mockProject: any;

  beforeEach(() => {
    mockSession = { user: { id: 'user_1' } };
    mockUser = {
      id: 'user_1',
      monthlyQuota: 1000,
      monthlyUsed: 500,
      monthlyBudget: 500,
      monthlySpent: 100,
    };
    mockProject = { id: 'proj_1', userId: 'user_1' };
  });

  it('should return 401 without authentication', async () => {
    // Mock auth to return null
    const request = new Request('http://localhost/api/artifacts/generate', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'proj_1',
        type: 'content',
        model: 'openai/gpt-4-turbo',
        input: { topic: 'AI' },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should return 429 when quota exhausted', async () => {
    mockUser.monthlyUsed = mockUser.monthlyQuota;
    // Mock auth and db
    // Verify 429 response
  });

  it('should return 402 when budget exhausted', async () => {
    mockUser.monthlySpent = mockUser.monthlyBudget;
    // Mock auth and db
    // Verify 402 response
  });

  it('should return 403 for unauthorized project access', async () => {
    mockProject.userId = 'other_user';
    // Mock auth and db
    // Verify 403 response
  });

  it('should stream SSE events on success', async () => {
    // Mock auth, db, and provider
    const response = await POST(request);
    
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');
  });
});
```

### Task 1.3: E2E Tests - Critical User Flows
**Effort**: 10 ore  
**Owner**: QA Team

```typescript
// tests/e2e/artifact-generation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Artifact Generation Flow', () => {
  test('user can generate artifact and see streaming output', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.click('text=Accedi con Google');
    // ... complete Google OAuth flow

    // Create project
    await page.click('text=Nuovo progetto');
    await page.fill('input[name="name"]', 'Test Project');
    await page.click('button:has-text("Crea")');

    // Generate artifact
    await page.click('text=Generazione rapida');
    await page.fill('textarea[name="input"]', 'Generate a blog post about AI');
    await page.click('button:has-text("Genera")');

    // Verify streaming
    await expect(page.locator('text=Generating')).toBeVisible();
    await page.waitForTimeout(5000); // Wait for streaming
    await expect(page.locator('text=Completed')).toBeVisible();
  });

  test('user sees error when quota exhausted', async ({ page }) => {
    // ... login and setup
    // Set user quota to 0
    // Try to generate
    await expect(page.locator('text=Monthly quota exhausted')).toBeVisible();
  });
});
```

### Task 1.4: Setup Jest & Playwright
**Effort**: 4 ore  
**Owner**: DevOps

```bash
# Install dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Configure jest.config.js (already exists)
# Configure playwright.config.ts (already exists)

# Add test scripts to package.json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage",
"test:e2e": "playwright test"
```

---

## Sprint 2: Logging & Observability (Settimana 3-4)

### Obiettivo
Implementare structured logging e monitoring per production readiness.

### Task 2.1: Structured Logging
**Effort**: 6 ore  
**Owner**: Backend Team

```typescript
// src/lib/logger.ts
import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

// Usage in orchestrator
logger.info(
  {
    userId,
    artifactType: request.type,
    model: request.model,
  },
  'Artifact generation started'
);

logger.error(
  {
    userId,
    artifactType: request.type,
    error: error.message,
    stack: error.stack,
  },
  'Artifact generation failed'
);
```

### Task 2.2: Performance Metrics
**Effort**: 8 ore  
**Owner**: Backend Team

```typescript
// src/lib/metrics.ts
import { logger } from './logger';

export async function trackGeneration<T>(
  userId: string,
  type: string,
  model: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  try {
    const result = await fn();
    const duration = Date.now() - start;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;

    logger.info(
      {
        userId,
        type,
        model,
        duration,
        memoryDelta,
        status: 'success',
      },
      'Generation completed'
    );

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(
      {
        userId,
        type,
        model,
        duration,
        error: error instanceof Error ? error.message : String(error),
        status: 'failed',
      },
      'Generation failed'
    );
    throw error;
  }
}

// Usage
const result = await trackGeneration(
  userId,
  'content',
  'openai/gpt-4-turbo',
  () => orchestrator.generate(request)
);
```

### Task 2.3: Sentry Integration
**Effort**: 4 ore  
**Owner**: DevOps

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
  });
}

// Usage in route handlers
try {
  // ... generate artifact
} catch (error) {
  Sentry.captureException(error, {
    tags: { userId, artifactType: type },
    extra: { projectId, model },
  });
  throw error;
}
```

### Task 2.4: Health Checks
**Effort**: 3 ore  
**Owner**: Backend Team

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // Check database
    await db.$queryRaw`SELECT 1`;

    // Check Redis (if used)
    // await redis.ping();

    logger.info('Health check passed');
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        // redis: 'ok',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
```

---

## Sprint 3: Error Handling & Resilience (Settimana 5-6)

### Obiettivo
Implementare retry logic, circuit breaker, e error boundaries.

### Task 3.1: Retry Logic
**Effort**: 6 ore  
**Owner**: Backend Team

```typescript
// src/lib/retry.ts
export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on client errors
      if (error instanceof ValidationError || error instanceof AuthError) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = Math.min(
          initialDelayMs * Math.pow(backoffMultiplier, attempt),
          maxDelayMs
        );
        logger.warn(
          { attempt, delay, error: lastError.message },
          'Retrying after delay'
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// Usage
const response = await withRetry(
  () => provider.generateText(request),
  { maxRetries: 3 }
);
```

### Task 3.2: Circuit Breaker
**Effort**: 8 ore  
**Owner**: Backend Team

```typescript
// src/lib/circuit-breaker.ts
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;

  constructor(
    private failureThreshold = 5,
    private successThreshold = 2,
    private timeout = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - (this.lastFailureTime || 0) > this.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.state = CircuitState.CLOSED;
          this.failureCount = 0;
        }
      } else {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitState.OPEN;
      }

      throw error;
    }
  }
}

// Usage
const breaker = new CircuitBreaker();
const response = await breaker.execute(() =>
  provider.generateText(request)
);
```

### Task 3.3: Error Boundaries
**Effort**: 6 ore  
**Owner**: Backend Team

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super('RATE_LIMIT_EXCEEDED', message, 429);
  }
}

export class ProviderError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('SERVICE_UNAVAILABLE', message, 503, details);
  }
}

// Usage in route handler
try {
  const stream = await createArtifactStream({ ... });
  return new Response(stream, { ... });
} catch (error) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.statusCode }
    );
  }

  logger.error({ error }, 'Unexpected error');
  Sentry.captureException(error);

  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 }
  );
}
```

---

## Sprint 4: Database Optimization (Settimana 7)

### Obiettivo
Aggiungere indici, constraints, e soft deletes.

### Task 4.1: Add Database Indices
**Effort**: 4 ore  
**Owner**: Backend Team

```prisma
// prisma/schema.prisma
model Artifact {
  // ... existing fields ...
  
  @@index([userId, createdAt])
  @@index([projectId])
  @@index([status])
  @@index([workflowType])
}

model QuotaHistory {
  // ... existing fields ...
  
  @@index([userId, createdAt])
  @@index([status])
}

model Project {
  // ... existing fields ...
  
  @@index([userId, createdAt])
}
```

### Task 4.2: Add Constraints
**Effort**: 3 ore  
**Owner**: Backend Team

```prisma
model User {
  // ... existing fields ...
  
  @@check("monthlyUsed <= monthlyQuota")
  @@check("monthlySpent <= monthlyBudget")
}
```

### Task 4.3: Soft Deletes
**Effort**: 5 ore  
**Owner**: Backend Team

```prisma
model Artifact {
  // ... existing fields ...
  deletedAt DateTime?
  
  @@index([deletedAt])
}

// Usage
// Soft delete
await db.artifact.update({
  where: { id },
  data: { deletedAt: new Date() },
});

// Query (exclude deleted)
const artifacts = await db.artifact.findMany({
  where: { deletedAt: null },
});
```

---

## Sprint 5: Production Hardening (Settimana 8)

### Task 5.1: Graceful Shutdown
**Effort**: 2 ore

```typescript
// src/server.ts
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Stop accepting new requests
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connections
  await db.$disconnect();
  logger.info('Database disconnected');

  process.exit(0);
});
```

### Task 5.2: Rate Limit Warnings
**Effort**: 4 ore

```typescript
// src/lib/quota-warnings.ts
export async function checkAndNotifyQuotaWarnings(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const quotaPercent = user.monthlyUsed / user.monthlyQuota;
  const budgetPercent = Number(user.monthlySpent) / Number(user.monthlyBudget);

  if (quotaPercent > 0.8) {
    // Send email warning
    await sendEmail(user.email, 'Quota Warning', `You've used 80% of your monthly quota`);
  }

  if (budgetPercent > 0.8) {
    // Send email warning
    await sendEmail(user.email, 'Budget Warning', `You've spent 80% of your monthly budget`);
  }
}
```

### Task 5.3: Admin Quota Management
**Effort**: 6 ore

```typescript
// src/app/api/admin/users/[userId]/quota/route.ts
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });
  }

  const body = await request.json();
  const schema = z.object({
    monthlyQuota: z.number().int().positive().optional(),
    monthlyBudget: z.number().positive().optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: parsed.data,
  });

  logger.info({ adminId: session.user.id, userId, changes: parsed.data }, 'Quota updated');

  return NextResponse.json(updated);
}
```

---

## Timeline Summary

| Sprint | Settimane | Focus | Effort |
|--------|-----------|-------|--------|
| 1 | 1-2 | Testing Foundation | 34 ore |
| 2 | 3-4 | Logging & Observability | 21 ore |
| 3 | 5-6 | Error Handling & Resilience | 20 ore |
| 4 | 7 | Database Optimization | 12 ore |
| 5 | 8 | Production Hardening | 12 ore |
| **TOTAL** | **8 settimane** | **Production Ready** | **99 ore** |

---

## Success Criteria

- ✅ >80% test coverage on critical paths
- ✅ All errors logged and traceable in Sentry
- ✅ <100ms p95 latency for artifact generation
- ✅ Zero unhandled promise rejections
- ✅ Database queries optimized with indices
- ✅ Graceful degradation on provider failures
- ✅ Admin can manage user quotas
- ✅ Users receive quota warnings at 80%

---

## Dependencies & Risks

### Dependencies
- Sentry account setup (free tier available)
- Pino logger (npm install pino)
- Playwright for E2E tests (already installed)

### Risks
- **Testing**: Mocking external APIs (OpenRouter) can be complex
- **Logging**: High volume of logs in production (implement sampling)
- **Database**: Migrations need careful planning (test in staging first)

---

## Next Steps

1. **Immediate**: Start Sprint 1 (Testing) this week
2. **Week 2**: Complete Sprint 1, begin Sprint 2
3. **Week 4**: All critical items (Testing + Logging) complete
4. **Week 8**: Production ready with all improvements
