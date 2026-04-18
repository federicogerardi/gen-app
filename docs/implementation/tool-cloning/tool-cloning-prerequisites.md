---
goal: Pre-requisiti, setup iniziale, e accesso ai documenti di riferimento
version: 1.2
date_created: 2026-04-17
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, prerequisites, setup]
---

# Pre-requisiti e Setup

Prima di iniziare, verifica che tu abbia accesso a:

---

## Documenti di Riferimento (Leggi in Ordine)

1. **Graphic Frameworking**: [docs/specifications/graphic-frameworking-spec.md](../../specifications/graphic-frameworking-spec.md)
   - Section "Tool Pages Exceptions" per deviazioni intenzionali
   
2. **Tool Routes Guardrails**: [.github/instructions/tool-routes.instructions.md](../../../.github/instructions/tool-routes.instructions.md)
   - Auth → ownership → rate limit ordine obbligatorio
   
3. **Tool Prompts Pattern**: [.github/instructions/tool-prompts.instructions.md](../../../.github/instructions/tool-prompts.instructions.md)
   - Markdown sorgente + template runtime tipizzato
   
4. **API Specifications**: [docs/specifications/api-specifications.md](../../specifications/api-specifications.md#tool-specific-generation)
   - Error codes + SSE contract standard
   
5. **HLF Reference Implementation (modulare)**:
   - [src/app/tools/funnel-pages/page.tsx](../../../src/app/tools/funnel-pages/page.tsx) (thin wrapper)
   - [src/app/tools/funnel-pages/FunnelPagesToolContent.tsx](../../../src/app/tools/funnel-pages/FunnelPagesToolContent.tsx) (main UI container)

---

## File Sorgente di Riferimento da Copiare

- Route handler template: `src/app/api/tools/funnel-pages/generate/route.ts`
- UI wrapper template: `src/app/tools/funnel-pages/page.tsx`
- UI container template: `src/app/tools/funnel-pages/FunnelPagesToolContent.tsx`
- Prompt builder template: `src/lib/tool-prompts/funnel-pages.ts`
- Test template: `tests/integration/funnel-pages-route.test.ts`

---

## Checklist Pre-Clonazione

Prima di leggere i phase successivi, verifica di avere:

- [ ] Accesso al repository gen-app
- [ ] Node.js 20+ installato
- [ ] `npm install` completato con successo
- [ ] `npm run dev` eseguibile senza errori
- [ ] TypeScript knowledge (types, generics, inference)
- [ ] React hooks knowledge (useState, useEffect, Context)
- [ ] Zod schema design experience
- [ ] Next.js 16 API routes knowledge
- [ ] HLF reference code letto almeno una volta
- [ ] Specificazione tool definita (input, output, multi-step sì/no?)

---

## Esecuzione Comandi Base

Durante il lavoro di clonazione, userai:

```bash
# Development
npm run dev              # Start dev server (nextjs)

# Validation
npm run typecheck        # tsc --noEmit (richiede Prisma generated)
npm run lint             # eslint (find issues)
npm run test             # jest (unit + integration)
npm run test:e2e         # playwright (E2E)

# Build
npm run build            # Build produzione (require all env vars)

# Database
npx prisma generate      # ⚠️ Required BEFORE typecheck/build
npx prisma migrate dev   # Create new migration (dev only)
```

**Critical Order** (if modifichi schema database):
```bash
npx prisma generate     # First
npm run typecheck       # Then (requires generated client)
npm run build           # Finally
```

---

## Ambiente e Variabili

Assicurati che `.env.local` contenga:

```
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=sk-...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

Se mancano, contatta il tech lead del progetto.

---

## Struttura di Cartelle Attuale

```
docs/
├── specifications/
│   ├── graphic-frameworking-spec.md       (Design system)
│   ├── api-specifications.md              (API contract)
│   └── ...
├── implementation/
│   └── tool-cloning/                      ← Tu sei qui
│       ├── tool-cloning-overview.md
│       ├── tool-cloning-prerequisites.md  ← Questo file
│       ├── tool-cloning-anatomy.md
│       ├── tool-cloning-complexity-check.md
│       └── [Altri phase files...]
└── ...

src/
├── app/api/tools/
│   └── funnel-pages/
│       ├── generate/route.ts              (Reference impl)
│       └── upload/route.ts                (If applicable)
├── lib/
│   ├── tool-prompts/
│   │   └── funnel-pages.ts                (Reference impl)
│   └── tool-routes/
│       ├── guards.ts
│       ├── schemas.ts
│       └── responses.ts
└── ...
```

---

## Ready to Go?

✅ Se hai completato la checklist, procedi a **[tool-cloning-anatomy.md](tool-cloning-anatomy.md)** per capire la struttura file minima richiesta.
