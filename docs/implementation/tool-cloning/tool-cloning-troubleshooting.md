---
goal: Troubleshooting - FAQ e common issues durante tool cloning
version: 1.1
date_created: 2026-04-17
date_updated: 2026-04-17
status: Active
tags: [runbook, tool-cloning, troubleshooting, faq]
---

# Troubleshooting Comune

Problemi frequenti e soluzioni durante il cloning di tool.

---

## Build & Type Checking

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| `npm run build` fallisce con NFT warning | `fs.readFile` nel path route | Sposta runtime fs a build-time template es. `templates.ts` |
| `npm run typecheck` fallisce pre-build | Prisma client non generato | Esegui `npx prisma generate` PRIMA di typecheck |
| `Cannot find module '@/generated/prisma'` | Prisma generate non eseguito | `npx prisma generate` |

---

## Frontend Issues

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| `useSearchParams() should be wrapped in Suspense` | Page.tsx non ha Suspense | Avvolgi content in `<Suspense><{{TOOL_TITLE}}Content /></Suspense>` |
| Input file non mostra focus ring | File input nativo senza styling | OK — tool-pages exception. Verifica browser focus con Tab |
| `.app-control` su select rompe styling | SelectTrigger da Radix | Aggiungi `className="app-control"` su `SelectTrigger` non su `Select` |
| Output not rendering (blank page) | No output state handling | Check SSE payload parsing, ensure `setOutput` called |

---

## Prompt & Builder Issues

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| Template prompt non interpola {{PLACEHOLDER}} | Build-time template statico | Usa `.replace('{{KEY}}', value)` in builder, non nel template |
| Token count too high (>2000) | Prompt too verbose | Trim unnecessary sections, consolidate guardrails |
| Prompt generates off-topic output | Vague rules section | Add specific examples, be explicit about format |

---

## Testing Issues

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| Rate limit test fallisce | Mock `rateLimit()` non corretto | Importa da `@/tests/helpers`, non mock inline |
| E2E test timeout | Slow network or long generation | Increase timeout in playwright.config.ts |
| Stream test fails | SSE parsing error | Debug: log raw stream data before parse |

---

## Runtime Issues

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| "RATE_LIMIT_EXCEEDED" on first request | User quota depleted | Check database quota records, reset if test |
| "UNAUTHORIZED" even with session | Auth middleware issue | Verify `requireAuthenticatedUser()` returns correct session |
| "FORBIDDEN" on valid project | Ownership check failed | Verify `userId` matches `project.userId` in DB |
| Output placeholder visible forever | Stream never completes | Check network tab in DevTools, verify backend route returns stream |

---

## Database Issues

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| `PrismaClient not found` | Import from wrong path | Use `import { PrismaClient } from '@/generated/prisma'` (NOT `@prisma/client`) |
| Migration fails | Schema conflict | Inspect existing migrations, create new migration with `npx prisma migrate dev` |

---

## Getting Help

If you're stuck:

1. Consult relevant reference docs (graphic-frameworking, tool-routes guardrails, tool-prompts pattern)
2. Check [tool-cloning-go-no-go-assessment.md](tool-cloning-go-no-go-assessment.md) for framework gaps
3. Review HLF source code for patterns
4. Contact Architecture Team if classified as COMPLEX or VERY COMPLEX tool

---

## Next Step

Ready to start? Go to **[tool-cloning-overview.md](tool-cloning-overview.md)** for the full roadmap.
