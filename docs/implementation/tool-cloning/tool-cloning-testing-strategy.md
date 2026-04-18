---
goal: Testing Strategy - integration, unit, E2E, and recovery scenarios
version: 1.3
date_created: 2026-04-17
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, testing, integration, unit, e2e]
---

# Testing Strategy

Questa phase copre test integration, unit, e E2E per validare il tool clone.

> ⚠️ **Aggiornato il 2026-04-18** — Con l'architettura composable (ADR 004), le unit test includono ora le suite dei custom hooks (`use{{TOOL_TITLE}}Generation`, `use{{TOOL_TITLE}}Recovery`, `use{{TOOL_TITLE}}Extraction`, `use{{TOOL_TITLE}}UiState`) e dei componenti tool-specific. Reference: `tests/unit/` per HLF e NextLand.

---

## Test Structure

```
tests/
├── integration/
│   ├── {{TOOL_SLUG}}-route.test.ts               [POST handler: auth, ownership, rate limit, SSE, validation]
│   └── [{{TOOL_SLUG}}-extraction.test.ts]         [Upload + extraction se applicable]
├── unit/
│   ├── {{TOOL_SLUG}}.test.ts                      [Prompt builder: placeholder, sanitization, step branching]
│   ├── use{{TOOL_TITLE}}Generation.test.ts         [Hook generation: stream, retry, step sequencing, error]
│   ├── use{{TOOL_TITLE}}Recovery.test.ts           [Hook recovery: resume candidate, checkpoint parse]
│   ├── use{{TOOL_TITLE}}Extraction.test.ts         [Hook extraction: upload, lifecycle state — se applicable]
│   ├── use{{TOOL_TITLE}}UiState.test.ts            [Hook uiState: derivazione da phase/steps/intent]
│   └── tools/{{TOOL_SLUG}}/
│       ├── {{TOOL_SLUG}}-setup-card.test.tsx       [Componente SetupCard: render, form bindings]
│       └── {{TOOL_SLUG}}-step-cards.test.tsx       [Componente StepCards: stati, CTA, output]
└── e2e/
    └── {{TOOL_SLUG}}-ux-parity.spec.ts             [User workflow + keyboard, mobile, focus parity]
```

---

## Integration Tests (Minimum Requirements)

**File**: `tests/integration/{{TOOL_SLUG}}-route.test.ts`

Must cover:

```typescript
describe('POST /api/tools/{{TOOL_SLUG}}/generate', () => {
  // Test 1: Auth enforcement
  test('denies unauthorized requests', async () => {
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  // Test 2: Ownership check
  test('denies access to projects not owned by user', async () => {
    // ... setup with foreign projectId
    expect(res.status).toBe(403);
  });

  // Test 3: Validation
  test('rejects invalid input schema', async () => {
    // ... submit malformed body
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // Test 4: Rate limit
  test('enforces rate limit', async () => {
    // ... mock enforceUsageGuards to fail
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  // Test 5: Happy path stream
  test('returns SSE stream on success', async () => {
    // ... submit valid request
    expect(res.headers['content-type']).toContain('text/event-stream');
    // ... parse stream events
  });
});
```

---

## Unit Tests (Minimum Requirements)

**File**: `tests/unit/{{TOOL_SLUG}}.test.ts`

Must cover:

```typescript
describe('build{{TOOL_TITLE}}Prompt', () => {
  // Test 1: Basic interpolation
  test('replaces placeholders correctly', async () => {
    const input = { topic: 'AI', tone: 'professional' };
    const result = await build{{TOOL_TITLE}}Prompt(input);
    expect(result.content).toContain('AI');
    expect(result.tokens).toBeGreaterThan(0);
  });

  // Test 2: Sanitization
  test('sanitizes user input (trim, escape)', async () => {
    const input = { topic: '   malicious<script>  ', tone: 'professional' };
    const result = await build{{TOOL_TITLE}}Prompt(input);
    expect(result.content).not.toContain('<script>');
  });

  // Test 3: Fallback on missing input
  test('uses fallback for optional fields', async () => {
    const input = { topic: 'Topic' }; // missing tone
    const result = await build{{TOOL_TITLE}}Prompt(input);
    expect(result.content).toContain('professional'); // fallback value
  });
});
```

---

## E2E UX Tests (Recommended)

**File**: `tests/e2e/{{TOOL_SLUG}}-ux-parity.spec.ts`

Must cover:

```typescript
describe('{{TOOL_TITLE}} E2E Workflow', () => {
  // Test 1: Happy path
  test('complete user flow: form → generate → output', async ({ page }) => {
    await page.goto('/tools/{{TOOL_SLUG}}');
    
    // Fill form
    await page.fill('input[placeholder*="project"]', 'test-proj');
    await page.fill('textarea', 'test input');
    await page.click('button:has-text("Genera")');
    
    // Wait for output
    await page.waitForTimeout(5000);
    const output = await page.textContent('[data-test="output"]');
    expect(output?.length).toBeGreaterThan(0);
  });

  // Test 2: Mobile responsive
  test('responsive layout at 375px width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/tools/{{TOOL_SLUG}}');
    
    // No horizontal scroll
    const body = await page.locator('body');
    const viewport = await page.viewportSize();
    const bodyBox = await body.boundingBox();
    expect((bodyBox?.width ?? 0) <= (viewport?.width ?? 0)).toBe(true);
  });

  // Test 3: Keyboard nav
  test('all controls accessible via keyboard', async ({ page }) => {
    await page.goto('/tools/{{TOOL_SLUG}}');
    
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus');
      expect(focused).toBeDefined();
    }
  });
});
```

---

## E2E Stability Patterns (Validated)

Per minimizzare flaky test durante i cicli di cloning completi:

- Centralizzare mock base condivisi in helper riusabili, invece di duplicare setup in ogni spec.
- Attendere esplicitamente lo stato di readiness UI prima delle azioni critiche (es. modello disponibile prima di upload/extraction).
- Riusare fixture e assertion parity tra tool sorgente e tool clonato quando condividono la stessa architettura.

Reference pattern:

- `tests/e2e/helpers/tool-base-mocks.ts`

Esempio sintetico:

```typescript
import { installToolBaseMocks } from './helpers/tool-base-mocks';

test.beforeEach(async ({ page }) => {
  await installToolBaseMocks(page);
  await page.goto('/tools/{{TOOL_SLUG}}');

  // Aspetta readiness del modello per evitare race in extraction/retry flow
  await expect(page.getByRole('combobox', { name: /modello/i })).toContainText('openai/gpt-4o-mini');
});
```

Quando disponibili, eseguire anche subset mirati prima del full run:

```bash
npx playwright test tests/e2e/{{TOOL_SLUG}}-retry-resume.spec.ts tests/e2e/{{TOOL_SLUG}}-ux-parity.spec.ts
```

---

## Run Tests

```bash
# Unit + Integration
npm run test

# E2E only
npm run test:e2e

# All
npm run test && npm run test:e2e
```

---

## Next Step

Procedi a **[tool-cloning-conformity-checklist.md](tool-cloning-conformity-checklist.md)** per la checklist pre-PR finale.
