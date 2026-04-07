# Architecture Diagrams: LLM Artifact Generation Hub

**Version**: 1.0  
**Status**: REFERENCE FOR UNDERSTANDING SYSTEM DESIGN  
**Format**: Mermaid.js diagrams  
**Last Updated**: 2026-04-07

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph Browser["🌐 Browser (React 19 + shadcn/ui)"]
        Dashboard["Dashboard"]
        FormUI["Artifact Form"]
        StreamDisplay["Streaming Display"]
        AdminPanel["Admin Panel"]
    end

    subgraph NextJS["⚙️ Next.js 15 Backend"]
        AuthAPI["Auth Routes<br/>/api/auth/*"]
        ArtifactAPI["Artifact Routes<br/>/api/artifacts/*"]
        ProjectAPI["Project Routes<br/>/api/projects/*"]
        AdminAPI["Admin Routes<br/>/api/admin/*"]
        
        Orchestrator["LLM Orchestrator<br/>(Central Controller)"]
        Agents["Agents<br/>Content | SEO | Code"]
        Provider["OpenRouter Provider<br/>(LLM Integration)"]
    end

    subgraph Database["💾 Persistence Layer"]
        PostgreSQL["PostgreSQL 16"]
        Prisma["Prisma ORM<br/>(Type-safe queries)"]
    end

    subgraph External["🌐 External Services"]
        OpenRouter["OpenRouter API<br/>(GPT-4, Claude 3, Mistral)"]
        GoogleOAuth["Google OAuth<br/>(company.com)"]
        Redis["Redis Cache<br/>(Rate limiting)"]
    end

    Browser -->|REST + SSE| NextJS
    NextJS -->|Query/Mutation| Database
    Prisma <-->|ORM| PostgreSQL
    NextJS -->|LLM Requests| Provider
    Provider -->|Streaming| Orchestrator
    Orchestrator -->|Route Request| Agents
    Orchestrator -->|Usage Tracking| PostgreSQL
    Provider -->|API Call| OpenRouter
    AuthAPI -->|Token Validation| GoogleOAuth
    ArtifactAPI -->|Rate Limit Check| Redis

    style Browser fill:#e1f5ff
    style NextJS fill:#f3e5f5
    style Database fill:#fff3e0
    style External fill:#e8f5e9
```

---

## 2. Data Flow: Artifact Generation

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant API as Next.js API
    participant Quota as Rate Limiter
    participant Orchestrator as LLM Orchestrator
    participant Agent as Agent
    participant Provider as OpenRouter Provider
    participant DB as PostgreSQL
    participant Cache as Redis Cache

    User->>API: Generate Artifact Request
    activate API
    
    API->>Quota: Check Monthly Quota
    activate Quota
    Quota->>Cache: Get User Quota Count
    Cache-->>Quota: Current Count
    alt Quota Exceeded
        Quota-->>API: 429 Rate Limited
        API-->>User: Error: Quota Exhausted
    else Quota OK
        Quota->>Cache: Increment Counter
        Cache-->>Quota: OK
        Quota-->>API: Allowed
    end
    deactivate Quota

    API->>DB: Create Artifact (status: generating)
    DB-->>API: Artifact ID

    API->>Orchestrator: generateStream(request)
    activate Orchestrator
    
    Orchestrator->>Agent: validateInput(context)
    Agent-->>Orchestrator: Valid
    
    Orchestrator->>Agent: buildPrompt(context)
    Agent-->>Orchestrator: Prompt String
    
    Orchestrator->>Provider: generateStream(prompt, model)
    activate Provider
    
    loop For Each Token
        Provider->>OpenRouter: Stream Request
        OpenRouter-->>Provider: Token
        Provider-->>Orchestrator: Token
        
        Orchestrator->>Agent: parseResponse(token)
        Agent-->>Orchestrator: Parsed Token
        
        Orchestrator->>API: SSE Event: token
        API-->>User: SSE: token
        
        Orchestrator->>DB: Save partial artifact (every 10 tokens)
        DB-->>Orchestrator: OK
    end
    
    deactivate Provider
    
    Orchestrator->>DB: Update artifact (status: completed)
    DB-->>Orchestrator: OK
    
    Orchestrator-->>API: Stream Complete
    deactivate Orchestrator
    
    API-->>User: SSE: complete event
    deactivate API
```

---

## 3. LLM Module Architecture

```mermaid
graph TD
    subgraph API["API Layer"]
        GenerateRoute["POST /api/artifacts/generate"]
    end

    subgraph Controller["LLM Orchestrator<br/>(Central Controller)"]
        Router["Route by artifact type"]
        QuotaCheck["Check User Quota"]
        RateLimitCheck["Rate Limit Check"]
        StreamHandler["Stream Handler"]
    end

    subgraph Agents["Agent System (Pluggable)"]
        ContentAgent["📝 Content Agent<br/>- Ad copy<br/>- Blog posts<br/>- Email templates"]
        
        SEOAgent["🔍 SEO Agent<br/>- Keyword analysis<br/>- Meta descriptions<br/>- Content optimization"]
        
        CodeAgent["💻 Code Agent<br/>- HTML templates<br/>- Boilerplate<br/>- Code snippets"]
        
        CustomAgent["🔧 Custom Agent<br/>(Extensible)<br/>- New artifact types"]
    end

    subgraph Provider["Provider Layer<br/>(LLM Abstraction)"]
        BaseProvider["BaseProvider Interface<br/>- generateText()<br/>- generateStream()<br/>- checkQuota()"]
        
        OpenRouterProvider["OpenRouter Provider<br/>- Handles API calls<br/>- Retry logic<br/>- Error handling"]
        
        FallbackProvider["Future Provider<br/>(AWS Bedrock,<br/>Anthropic Direct)"]
    end

    subgraph Models["LLM Models"]
        GPT["🟢 GPT-4 Turbo<br/>(Primary)"]
        Claude["🟡 Claude 3 Opus<br/>(Alternative)"]
        Mistral["🔵 Mistral Large<br/>(Fallback)"]
    end

    API -->|artifact type| Router
    Router -->|validate| QuotaCheck
    QuotaCheck -->|check| RateLimitCheck
    
    RateLimitCheck -->|route| ContentAgent
    RateLimitCheck -->|route| SEOAgent
    RateLimitCheck -->|route| CodeAgent
    RateLimitCheck -->|route| CustomAgent
    
    ContentAgent -->|get provider| BaseProvider
    SEOAgent -->|get provider| BaseProvider
    CodeAgent -->|get provider| BaseProvider
    CustomAgent -->|get provider| BaseProvider
    
    BaseProvider -->|implement| OpenRouterProvider
    BaseProvider -->|implement| FallbackProvider
    
    OpenRouterProvider -->|call| GPT
    OpenRouterProvider -->|call| Claude
    OpenRouterProvider -->|call| Mistral
    
    FallbackProvider -->|future| GPT

    style Controller fill:#e1f5ff
    style Agents fill:#f3e5f5
    style Provider fill:#fff3e0
    style Models fill:#e8f5e9
```

---

## 4. User Journey: Generate Artifact

```mermaid
graph TD
    A["User Lands on Dashboard"] -->|Click Generate| B["Modal: Select Tool"]
    B -->|Choose Content| C["Form: Content Parameters"]
    B -->|Choose SEO| D["Form: SEO Parameters"]
    B -->|Choose Code| E["Form: Code Parameters"]
    
    C -->|Fill Topic + Tone| F["Select Model"]
    D -->|Fill Context + Keywords| F
    E -->|Fill Type + Language| F
    
    F -->|Default: GPT-4| G["Confirm & Generate"]
    F -->|Advanced: Claude/Mistral| G
    
    G -->|API Request| H["Check Quota"]
    H -->|OK| I["Create Artifact Record"]
    H -->|Exceeded| J["Show Error: Quota Limit"]
    
    I -->|Start Streaming| K["Streaming Display"]
    K -->|Tokens arrive| L["Update Display Real-time"]
    L -->|Complete| M["Show Full Artifact"]
    
    M -->|Review| N{User Satisfied?}
    N -->|Yes| O["Save & View in Project"]
    N -->|No| P["Edit Content"]
    N -->|No| Q["Regenerate with New Params"]
    
    P -->|Save Changes| R["Update Artifact"]
    Q -->|Generate Again| H
    
    O -->|Add to Project| S["Artifact Saved"]
    S -->|Copy/Export| T["End"]
    T --> U["User Views Dashboard"]

    style A fill:#e1f5ff
    style K fill:#fff3e0
    style M fill:#e8f5e9
    style S fill:#c8e6c9
```

---

## 5. Database Schema Relationships

```mermaid
erDiagram
    USER ||--o{ PROJECT : owns
    USER ||--o{ ARTIFACT : creates
    USER ||--o{ QUOTA_HISTORY : has
    PROJECT ||--o{ ARTIFACT : contains
    
    USER {
        string id PK
        string email UK
        string name
        int monthlyQuota
        int monthlyUsed
        decimal monthlyBudget
        decimal monthlySpent
        date resetDate
        timestamp createdAt
        timestamp updatedAt
    }
    
    PROJECT {
        string id PK
        string userId FK
        string name
        string description
        timestamp createdAt
        timestamp updatedAt
    }
    
    ARTIFACT {
        string id PK
        string userId FK
        string projectId FK
        string type
        string model
        object input "JSON"
        string content
        string status
        int inputTokens
        int outputTokens
        decimal costUSD
        timestamp streamedAt
        timestamp completedAt
        timestamp createdAt
        timestamp updatedAt
    }
    
    QUOTA_HISTORY {
        string id PK
        string userId FK
        int requestCount
        decimal costUSD
        string model
        string artifactType
        string status
        timestamp createdAt
    }
```

---

## 6. API Routes & Dependencies

```mermaid
graph LR
    subgraph Public["Public Routes"]
        SignIn["GET /auth/signin"]
        Callback["GET /auth/callback"]
    end
    
    subgraph Protected["Protected Routes<br/>(Auth Required)"]
        Session["GET /auth/session"]
        SignOut["POST /auth/signout"]
        
        Profile["GET /users/profile"]
        Quota["GET /users/quota"]
        
        ListProjects["GET /projects"]
        CreateProject["POST /projects"]
        GetProject["GET /projects/:id"]
        UpdateProject["PUT /projects/:id"]
        DeleteProject["DELETE /projects/:id"]
        
        ListArtifacts["GET /artifacts"]
        GenerateArtifact["POST /artifacts/generate"]
        GetArtifact["GET /artifacts/:id"]
        UpdateArtifact["PUT /artifacts/:id"]
        DeleteArtifact["DELETE /artifacts/:id"]
        
        ListModels["GET /models"]
    end
    
    subgraph Admin["Admin Routes<br/>(Admin Only)"]
        ListUsers["GET /admin/users"]
        UpdateQuota["PUT /admin/users/:id/quota"]
        GetAudit["GET /admin/users/:id/audit"]
        GetMetrics["GET /admin/metrics"]
    end
    
    GoogleOAuth["Google OAuth<br/>Provider"]
    SignIn --> GoogleOAuth
    Callback --> GoogleOAuth
    
    GenerateArtifact -->|Stream| RateLimiter["Rate Limiter<br/>Redis"]
    UpdateQuota -->|Admin Check| RateLimiter
    
    GenerateArtifact -->|Create| DB["PostgreSQL<br/>Artifact"]
    UpdateProject -->|Update| DB
    ListArtifacts -->|Query| DB
    
    style Public fill:#e1f5ff
    style Protected fill:#f3e5f5
    style Admin fill:#ffebee
```

---

## 7. Deployment Architecture (Render.com)

```mermaid
graph TB
    subgraph GitHub["GitHub Repository"]
        code["    Source Code    "]
        workflows["GitHub Actions<br/>Workflows"]
    end
    
    subgraph CI["CI/CD Pipeline"]
        Lint["Lint & Format"]
        Build["Build Next.js"]
        Test["Run Tests"]
        Security["Security Scan"]
        Coverage["Coverage Report"]
    end
    
    subgraph RenderStaging["Render.com (Staging)"]
        StageNode["Node.js 22<br/>CPU: 0.25<br/>RAM: 512MB"]
        StageDB["PostgreSQL 16<br/>5GB Storage<br/>Backups"]
    end
    
    subgraph RenderProd["Render.com (Production)"]
        ProdNode["Node.js 22<br/>CPU: 0.5<br/>RAM: 1GB<br/>Auto-restart"]
        ProdDB["PostgreSQL 16<br/>5GB Storage<br/>Daily Backups"]
        Redis["Redis Cache"]
    end
    
    subgraph Monitoring["Monitoring & Logging"]
        Sentry["Sentry<br/>(Error Tracking)"]
        RenderLogs["Render.com Logs"]
        Metrics["Custom Metrics"]
    end
    
    subgraph External["External Services"]
        OpenRouter["OpenRouter API<br/>(LLM)"]
        GoogleOAuth["Google OAuth<br/>(Auth)"]
    end
    
    GitHub -->|Push| CI
    CI -->|Pass| RenderStaging
    CI -->|Fail| code
    
    RenderStaging -->|Manual Approval| RenderProd
    
    RenderProd -->|API Calls| OpenRouter
    RenderProd -->|Auth| GoogleOAuth
    RenderProd -->|Error Reports| Sentry
    RenderProd -->|Logs| RenderLogs
    
    ProdNode -->|Read/Write| ProdDB
    ProdNode -->|Cache| Redis
    
    workflows -->|Trigger| Lint
    workflows -->|Trigger| Build
    workflows -->|Trigger| Test
    workflows -->|Trigger| Security
    workflows -->|Trigger| Coverage
    
    style RenderProd fill:#c8e6c9
    style RenderStaging fill:#fff9c4
    style CI fill:#e1f5ff
```

---

## 8. Streaming Data Flow (Real-time)

```mermaid
graph LR
    subgraph Client["Browser Client<br/>(React Hook)"]
        EventSource["EventSource<br/>Connection"]
        TokenBuffer["Token Buffer"]
        Display["DOM Update"]
    end
    
    subgraph Server["Next.js Server<br/>(SSE)"]
        Route["POST /api/artifacts/generate"]
        Stream["Stream Generator"]
    end
    
    subgraph LLM["OpenRouter<br/>(Streaming)"]
        Connection["Server Connection"]
        TokenStream["Token Stream"]
    end
    
    subgraph DB["Database<br/>(Periodic Save)"]
        SaveQueue["Save Queue<br/>Every 10 tokens"]
        PostgreSQL["PostgreSQL"]
    end
    
    EventSource -->|Connect| Route
    Route -->|Start Stream| Connection
    
    Connection -->|Open| Stream
    Stream -->|Subscribe| TokenStream
    
    loop Every Token
        TokenStream -->|Token| Stream
        Stream -->|SSE Event| EventSource
        EventSource -->|Parse JSON| TokenBuffer
        TokenBuffer -->|Update| Display
        
        Stream -->|Buffer| SaveQueue
        SaveQueue -->|Batch Save| PostgreSQL
    end
    
    TokenStream -->|EOF| Stream
    Stream -->|Complete Event| EventSource
    EventSource -->|Close| Route
    
    style Client fill:#e1f5ff
    style Server fill:#f3e5f5
    style LLM fill:#fff3e0
    style DB fill:#e8f5e9
```

---

## 9. Authentication & Session Flow

```mermaid
graph TD
    A["User Visits App"] -->|No Session| B["Redirect to Sign In"]
    B -->|Click Login| C["Google OAuth Login"]
    C -->|Approve| D["Google Callback"]
    D -->|Email Check| E{Email<br/>@company.com?}
    
    E -->|No| F["❌ Access Denied"]
    E -->|Yes| G["✓ Create Session"]
    
    G -->|JWT Token| H["Store in Database"]
    H -->|Cookie| I["Set Secure Cookie"]
    
    I -->|Redirect| J["Dashboard"]
    J -->|User Logged In| K["Can Access Protected Routes"]
    
    K -->|Each Request| L["Validate Session<br/>middleware"]
    L -->|Valid| M["Grant Access"]
    L -->|Invalid/Expired| N["Redirect to Login"]
    
    J -->|Click Sign Out| O["Clear Session"]
    O -->|Delete JWT| P["Clear Cookie"]
    P -->|Redirect| B
    
    style F fill:#ffcdd2
    style M fill:#c8e6c9
    style J fill:#e1f5ff
```

---

## 10. Rate Limiting & Quota Strategy

```mermaid
graph TD
    A["User Makes Request"] -->|Extract UserId| B["Get Quota from Cache"]
    
    B -->|Miss| C["Load from DB"]
    C -->|Store in Redis| D["Cache Hit TTL: 30 days"]
    B -->|Hit| D
    
    D -->|Calculate Time Key| E["Monthly Bucket:<br/>2026-04"]
    E -->|Increment Counter| F["Current Count"]
    
    F -->|Compare| G{Count<br/>1000?}
    
    G -->|Yes| H["❌ Quota Exceeded"]
    G -->|No| I["✓ Request Allowed"]
    
    H -->|Return| J["429 Response<br/>Retry-After Header"]
    I -->|Call OpenRouter| K["Estimate Cost"]
    
    K -->|Calculate| L["Tokens × Price"]
    L -->|Add to Monthly| M["monthlySpent += cost"]
    
    M -->|Compare| N{Total<br/>Budget?}
    N -->|Exceeded| O["⚠️ Budget Warning"]
    N -->|OK| P["✓ Proceed"]
    
    O -->|Show User| Q["Monthly budget exceeded"]
    P -->|Track| R["Log in QuotaHistory<br/>for audit"]
    
    R -->|Store| S["PostgreSQL Record<br/>Cost + Model + Status"]
    
    style H fill:#ffcdd2
    style J fill:#ffcdd2
    style P fill:#c8e6c9
    style S fill:#e8f5e9
```

---

## 11. Component Hierarchy (shadcn/ui)

```mermaid
graph TD
    App["App Layout"]
    
    App -->|Header| Header["Header<br/>- Logo<br/>- User Menu<br/>- Quota Badge"]
    App -->|Sidebar| Sidebar["Sidebar<br/>- Nav Links<br/>- Projects List<br/>- New Project Button"]
    App -->|Main| Main["Main Content"]
    
    Main -->|Route: /| Dashboard["Dashboard Page<br/>- Recent Projects<br/>- Recent Artifacts<br/>- Quick Stats"]
    Main -->|Route: /artifacts/new| GenerateForm["Generate Form<br/>- Tool Selector<br/>- Input Form<br/>- Model Picker<br/>- Advanced Options"]
    Main -->|Route: /artifacts/:id| ArtifactView["Artifact View<br/>- Streaming Display<br/>- Edit Tools<br/>- Export Options"]
    Main -->|Route: /projects/:id| ProjectView["Project View<br/>- Artifact List<br/>- Filter Controls<br/>- Bulk Actions"]
    Main -->|Route: /admin| AdminDash["Admin Dashboard<br/>- User List<br/>- Quota Manager<br/>- Audit Log"]
    
    GenerateForm -->|Components|SelectTool["Select Component<br/>-Content<br/>-SEO<br/>-Code"]
    GenerateForm -->|Components| Input["Input Component<br/>-Textarea<br/>-Text fields"]
    GenerateForm -->|Components| Button["Button Component<br/>-Primary Generate<br/>-Cancel"]
    
    ArtifactView -->|Components| StreamDisplay["Streaming Display<br/>- Real-time tokens<br/>- Progress indicator"]
    ArtifactView -->|Components| Buttons["Button Group<br/>-Copy<br/>-Edit<br/>-Regenerate<br/>-Delete"]
    
    AdminDash -->|Components| Table["Data Table<br/>-Users<br/>-Quotas<br/>-Spending"]
    AdminDash -->|Components| Modal["Dialog<br/>-Edit Quota<br/>-View Audit"]
    
    style App fill:#e1f5ff
    style Dashboard fill:#f3e5f5
    style GenerateForm fill:#fff3e0
    style ArtifactView fill:#e8f5e9
    style AdminDash fill:#ffebee
```

---

## 12. Error Handling & Fallback Strategy

```mermaid
graph TD
    A["Generate Request"] -->|LLM Call| B["OpenRouter API"]
    
    B -->|Success| C["✓ Stream Tokens"]
    B -->|Timeout > 30s| D["⏱️ Timeout Error"]
    B -->|Rate Limited| E["⛔ Rate Limit Error"]
    B -->|Service Down| F["🔴 Service Unavailable"]
    
    D -->|Try Fallback| G["Switch to Claude 3"]
    E -->|Fallback| H["Queue Request<br/>Retry Later"]
    F -->|Fallback| G
    
    G -->|Success| I["✓ Stream from Claude"]
    G -->|Fails| J["Try Tertiary: Mistral"]
    
    J -->|Success| K["✓ Stream from Mistral"]
    J -->|All Fail| L["❌ Graceful Degradation"]
    
    L -->|Show User| M["Modal: 'Models temporarily unavailable<br/>Try again in 5 minutes'"]
    M -->|Save State| N["Partial artifact saved<br/>Resume later"]
    N -->|Option| O["✓ Retry"]
    N -->|Option| P["✓ Cancel"]
    
    C -->|Save| Q["PostgreSQL<br/>status: completed"]
    I -->|Save| Q
    K -->|Save| Q
    
    L -->|Save| R["PostgreSQL<br/>status: failed"]
    
    style C fill:#c8e6c9
    style I fill:#c8e6c9
    style K fill:#c8e6c9
    style L fill:#ffcdd2
    style R fill:#ffcdd2
```

---

Questi diagrammi coprono:
- ✅ System architecture overview
- ✅ Data flow end-to-end
- ✅ LLM module structure
- ✅ User journeys
- ✅ Database relationships
- ✅ API routes
- ✅ Deployment pipeline
- ✅ Streaming details
- ✅ Authentication
- ✅ Rate limiting
- ✅ Component hierarchy
- ✅ Error handling

**Tip**: Renderizza questi diagrammi con [Mermaid Live Editor](https://mermaid.live/) per visualizzazione interattiva!
