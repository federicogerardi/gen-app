# gen-app — LLM Artifact Generation Hub

A modular web application that lets internal users (MediaBuyers, SEO Specialists) generate professional AI artifacts through dedicated workflows powered by multiple LLM models via OpenRouter.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Features

- 🤖 **Multi-model LLM generation** via [OpenRouter](https://openrouter.ai) (GPT-4 Turbo, Claude 3 Opus, Mistral Large)
- ⚡ **Real-time streaming** responses using Server-Sent Events (SSE)
- 🛠️ **Tool-specific workflows** — Meta Ads and Funnel Pages generation with dedicated prompt templates
- 🔐 **Google OAuth** authentication via NextAuth.js v5 (restricted to company domain)
- 👥 **Per-user quota & budget tracking** with monthly resets
- 🗂️ **Project management** — organise artifacts into projects
- 🛡️ **Admin dashboard** — manage users, view usage, adjust quotas
- 🔒 **Rate limiting** via Upstash Redis
- 📊 **Audit trail** — full quota history and cost tracking per artifact

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 · TypeScript · shadcn/ui v4 · Tailwind CSS |
| **Forms & Validation** | React Hook Form · Zod |
| **Server State** | TanStack Query v5 |
| **Backend** | Next.js 16 (App Router, Route Handlers) |
| **Database** | PostgreSQL 16 · Prisma 7 |
| **Auth** | NextAuth.js v5 · Google OAuth · `@auth/prisma-adapter` |
| **LLM** | OpenRouter (OpenAI-compatible SDK) |
| **Rate Limiting** | `@upstash/ratelimit` · `@upstash/redis` |
| **Testing** | Jest · Testing Library · Playwright |
| **Deployment** | Render.com |

---

## Architecture Overview

```
Browser (React 19 + shadcn/ui)
        │  REST + SSE
        ▼
Next.js 16 Route Handlers
  /api/artifacts/generate
  /api/tools/meta-ads/generate
  /api/tools/funnel-pages/generate
  /api/projects/*  /api/users/*  /api/admin/*
        │
        ▼
LLM Orchestrator + Tool Prompt Layer
  ├── Content Agent
  ├── SEO Agent
  ├── Code Agent
  └── Custom Tool Agents (Meta Ads, Funnel Pages)
        │
        ▼
OpenRouter Provider (multi-model, streaming)
        │
   ┌────┴────────────────────┐
   ▼                         ▼
PostgreSQL + Prisma     NextAuth.js v5
(Users, Projects,       (Google OAuth,
 Artifacts, Quotas)      sessions, CSRF)
```

---

## Getting Started

### Prerequisites

- Node.js 22 LTS
- PostgreSQL 16
- An [OpenRouter](https://openrouter.ai) API key
- A Google OAuth app (Client ID + Secret)
- An [Upstash](https://upstash.com) Redis database

### Installation

```bash
git clone https://github.com/federicogerardi/gen-app.git
cd gen-app
npm install
```

### Environment Variables

Copy the example below into a `.env.local` file at the root of the project and fill in your values:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/genapp

# NextAuth
NEXTAUTH_SECRET=your-secret-min-32-chars   # generate with: openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OpenRouter
OPENROUTER_API_KEY=

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup

```bash
# Apply migrations and generate the Prisma client
npx prisma migrate dev
```

### Running the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── artifacts/          # Artifact CRUD + SSE generation endpoint
│   │   ├── tools/              # Tool-specific generation endpoints
│   │   ├── projects/           # Project management
│   │   ├── users/              # User profile & quota
│   │   ├── admin/              # Admin-only endpoints
│   │   └── auth/               # NextAuth handlers
│   ├── dashboard/              # User dashboard
│   ├── artifacts/              # Artifact detail pages
│   ├── tools/                  # Tool workflow pages (Meta Ads, Funnel Pages)
│   └── admin/                  # Admin panel
├── lib/
│   ├── auth.ts                 # NextAuth configuration
│   ├── db.ts                   # Prisma client singleton
│   ├── rate-limit.ts           # Upstash rate limiter
│   ├── llm/
│   │   ├── orchestrator.ts     # Routes requests to agents/providers
│   │   ├── streaming.ts        # SSE streaming helpers
│   │   ├── providers/          # OpenRouter provider
│   │   └── agents/             # Content, SEO, Code agents (BaseAgent)
│   └── tool-prompts/           # Runtime markdown prompt templates
│       ├── registry.ts
│       ├── loader.ts
│       ├── meta-ads.ts
│       └── funnel-pages.ts
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/                 # Layout components
│   └── hooks/                  # useStreamGeneration, useArtifacts, useQuota
└── types/                      # TypeScript type augmentations (NextAuth, etc.)
prisma/
└── schema.prisma               # Database schema
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type-check without emit |
| `npm run test` | Run Jest unit/integration tests |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:e2e` | Run Playwright end-to-end tests |

---

## Testing

The project uses **Jest** for unit and integration tests and **Playwright** for end-to-end tests.

```bash
# Unit & integration tests
npm run test

# E2E tests (requires a running dev server)
npm run test:e2e
```

Coverage target: **>80%** across all modules.

Key test scenarios:
- Google OAuth login → dashboard redirect
- Artifact generation with SSE streaming
- Admin quota management

---

## Deployment

The app is designed to deploy on [Render.com](https://render.com).

**Build command:**
```bash
npm run build
```

**Pre-deploy command** (runs database migrations):
```bash
npx prisma migrate deploy
```

A GitHub Actions CI pipeline runs lint, typecheck, tests, and build on every push to `main` and on all pull requests. Successful builds on `main` trigger an automatic Render deploy via deploy hook.
