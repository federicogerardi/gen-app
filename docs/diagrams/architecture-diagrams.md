# Architecture Diagrams: Tool Scope As-Is (HotLeadFunnel, NextLand)

**Version**: 2.0  
**Status**: AS-IS (operativo)  
**Format**: Mermaid.js diagrams  
**Last Updated**: 2026-04-18

Questo documento rappresenta lo stato as-is corrente per il perimetro tool standard attivo:
- HotLeadFunnel (`/tools/funnel-pages`)
- NextLand (`/tools/nextland`)

Riferimenti canonici:
- [docs/adrs/004-tool-pages-composable-architecture.md](../adrs/004-tool-pages-composable-architecture.md)
- [docs/implement-index.md](../implement-index.md)
- [docs/specifications/api-specifications.md](../specifications/api-specifications.md)

Nota perimetro:
- `meta-ads` rimane route legacy (`/api/tools/meta-ads/generate`) fuori dallo scope tool standard di questi diagrammi.
- La route `POST /api/artifacts/generate` coesiste come entrypoint generico, ma i flussi tool UI qui descritti usano endpoint `/api/tools/*`.

---

## 1. System Overview (Tool Scope)

```mermaid
graph TB
    subgraph Browser["Browser - Authenticated App"]
        ToolPages["Tool Pages\n/tools/funnel-pages\n/tools/nextland"]
        ArtifactDetail["Artifact Detail + Relaunch"]
        SharedUI["Shared Tool UI Components"]
    end

    subgraph NextApp["Next.js 16 App Layer"]
        ToolFrontend["Composable Tool Frontend\npage.tsx + *ToolContent.tsx"]
        ToolRoutes["Tool API Routes\n/api/tools/*"]
        ArtifactsRoutes["Artifact API Routes\n/api/artifacts/*"]
        AuthLayer["NextAuth auth() + guards"]
        LLMCore["LLM Orchestrator/Streaming"]
    end

    subgraph DataLayer["Persistence"]
        Prisma["Prisma 7 Client"]
        Postgres["PostgreSQL"]
        Redis["Upstash Redis\nRate Limit + Counters"]
    end

    subgraph External["External Services"]
        OpenRouter["OpenRouter Models"]
        GoogleOAuth["Google OAuth"]
    end

    ToolPages --> ToolFrontend
    SharedUI --> ToolFrontend
    ArtifactDetail --> ArtifactsRoutes
    ToolFrontend --> ToolRoutes
    ToolRoutes --> AuthLayer
    ArtifactsRoutes --> AuthLayer
    ToolRoutes --> LLMCore
    ArtifactsRoutes --> LLMCore
    LLMCore --> Prisma
    Prisma --> Postgres
    ToolRoutes --> Redis
    ArtifactsRoutes --> Redis
    LLMCore --> OpenRouter
    AuthLayer --> GoogleOAuth
```

---

## 2. Frontend Composable Architecture

```mermaid
graph TD
    subgraph Funnel["/tools/funnel-pages"]
        FPage["page.tsx\nSuspense wrapper"]
        FContent["FunnelPagesToolContent.tsx\ncontainer"]
        FHooks["funnel hooks + shared hooks"]
        FComponents["funnel components + shared components"]
    end

    subgraph NextLand["/tools/nextland"]
        NPage["page.tsx\nSuspense wrapper"]
        NContent["NextLandToolContent.tsx\ncontainer"]
        NHooks["nextland hooks + shared hooks"]
        NComponents["nextland components + shared components"]
    end

    subgraph Shared["src/tools/shared/*"]
        SharedHooks["useExtraction\nuseStepGeneration\nstream parsing/recovery"]
        SharedTypes["ToolStepState<T>\nphase/ui-state types"]
        SharedUISet["ToolSetup\nStatusChecklist\nStepCard\nProjectDialog"]
    end

    FPage --> FContent
    NPage --> NContent
    FContent --> FHooks
    FContent --> FComponents
    NContent --> NHooks
    NContent --> NComponents
    FHooks --> SharedHooks
    NHooks --> SharedHooks
    FComponents --> SharedUISet
    NComponents --> SharedUISet
    FContent --> SharedTypes
    NContent --> SharedTypes
```

---

## 3. Route Topology (As-Is)

```mermaid
graph LR
    subgraph ToolRoutes["Tool Endpoints Used by Tool UI"]
        FU["POST /api/tools/funnel-pages/upload"]
        FE["POST /api/tools/extraction/generate"]
        FG["POST /api/tools/funnel-pages/generate"]
        NU["POST /api/tools/nextland/upload"]
        NG["POST /api/tools/nextland/generate"]
    end

    subgraph GenericRoutes["Generic Artifact Routes (coexisting)"]
        AG["POST /api/artifacts/generate"]
        AID["GET/DELETE /api/artifacts/:id"]
        ALIST["GET /api/artifacts"]
    end

    subgraph Guards["Shared Route Guards"]
        Auth["requireAuthenticatedUser()"]
        Own["requireOwnedProject()"]
        Model["requireAvailableModel()"]
        Usage["enforceUsageGuards()"]
    end

    FG --> Auth --> Own --> Model --> Usage
    NG --> Auth --> Own --> Model --> Usage
    FE --> Auth --> Own --> Model --> Usage
    AG --> Auth --> Own --> Model --> Usage
    FU --> Auth
    NU --> Auth
```

---

## 4. User Journey: HotLeadFunnel (Upload-First)

```mermaid
graph TD
    A["Open /tools/funnel-pages"] --> B["Upload source file"]
    B --> C["POST /api/tools/funnel-pages/upload"]
    C --> D["Extract text payload"]
    D --> E["POST /api/tools/extraction/generate\nresponseMode=text"]
    E --> F["Review extraction context"]
    F --> G["Generate optin"]
    G --> H["POST /api/tools/funnel-pages/generate step=optin"]
    H --> I["Generate quiz"]
    I --> J["POST /api/tools/funnel-pages/generate step=quiz"]
    J --> K["Generate vsl"]
    K --> L["POST /api/tools/funnel-pages/generate step=vsl"]
    L --> M["Artifact completed + relaunch available"]
```

---

## 5. User Journey: NextLand (2-Step)

```mermaid
graph TD
    A["Open /tools/nextland"] --> B["Upload source file"]
    B --> C["POST /api/tools/nextland/upload"]
    C --> D["Extract text payload"]
    D --> E["POST /api/tools/extraction/generate\nresponseMode=text"]
    E --> F["Review extraction context"]
    F --> G["Generate landing"]
    G --> H["POST /api/tools/nextland/generate step=landing"]
    H --> I["Generate thank-you"]
    I --> J["POST /api/tools/nextland/generate step=thank_you"]
    J --> K["Artifact completed + relaunch available"]
```

---

## 6. Step Generation Sequence (Tool Route)

```mermaid
sequenceDiagram
    participant UI as Tool UI
    participant Route as /api/tools/*/generate
    participant Guards as Shared Guards
    participant Prompt as Tool Prompt Builder
    participant Stream as createArtifactStream
    participant LLM as OpenRouter
    participant DB as PostgreSQL

    UI->>Route: POST generate(step, model, projectId, payload)
    Route->>Guards: auth + ownership + model + usage
    Guards-->>Route: allowed
    Route->>Prompt: build prompt by step/workflow
    Prompt-->>Route: promptOverride
    Route->>Stream: createArtifactStream(...)
    Stream->>LLM: streaming request

    loop token stream
        LLM-->>Stream: token chunk
        Stream-->>UI: SSE data chunk
        Stream->>DB: periodic save + accounting
    end

    Stream->>DB: terminal status completed/failed
    Stream-->>Route: stream complete
    Route-->>UI: SSE terminal event
```

---

## 7. Deployment and Branch Flow (As Operated)

```mermaid
graph TB
    Dev["dev branch"] --> PR["PR -> review"]
    PR --> Main["merge to main"]
    Main --> Vercel["Vercel Production Deploy"]

    subgraph Gates["Pre-merge gates"]
        TSC["typecheck"]
        LINT["lint"]
        TEST["unit + integration + e2e"]
        BUILD["build"]
    end

    PR --> TSC
    PR --> LINT
    PR --> TEST
    PR --> BUILD
```

---

## 8. Data Model Focus (Tool Generation)

```mermaid
erDiagram
    USER ||--o{ PROJECT : owns
    USER ||--o{ ARTIFACT : creates
    PROJECT ||--o{ ARTIFACT : contains
    USER ||--o{ QUOTA_HISTORY : tracked_by

    USER {
        string id PK
        string email
        int monthlyQuota
        int monthlyUsed
        decimal monthlySpent
    }

    PROJECT {
        string id PK
        string userId FK
        string name
    }

    ARTIFACT {
        string id PK
        string userId FK
        string projectId FK
        string workflowType
        string model
        string status
        string content
        int inputTokens
        int outputTokens
        decimal costUSD
    }

    QUOTA_HISTORY {
        string id PK
        string userId FK
        string workflowType
        string model
        decimal costUSD
        string status
    }
```

---

Copertura di questi diagrammi:
- Architettura runtime per tool standard attivi
- Pattern frontend composable (ADR 004)
- Route topology reale per upload/extraction/generation
- User journey separati HotLeadFunnel e NextLand
- Sequenza streaming con guard condivisi
- Flow di deploy coerente con branch policy operativa
