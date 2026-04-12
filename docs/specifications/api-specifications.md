# API Specifications: LLM Artifact Generation Hub

**Version**: 1.2  
**Status**: IMPLEMENTED SUBSET + OPEN ITEMS  
**Base URL**: `https://<your-vercel-domain>/api` (production from `main`; development/preview from PR flow on `dev`)  
**Authentication**: NextAuth session cookie (browser). Bearer tokens solo per integrazioni server-to-server esplicite.  
**Content-Type**: `application/json` (default), `multipart/form-data` per upload documenti funnel  
**Last Updated**: 2026-04-12

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {
      "field": "specific error info"
    }
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` → 401 (missing/invalid auth)
- `FORBIDDEN` → 403 (insufficient permissions)
- `NOT_FOUND` → 404 (resource doesn't exist)
- `VALIDATION_ERROR` → 400 (invalid input)
- `RATE_LIMIT_EXCEEDED` → 429 (quota exhausted)
- `PAYMENT_REQUIRED` → 402 (monthly budget exceeded)
- `SERVICE_UNAVAILABLE` → 503 (provider temporarily unavailable)
- `INTERNAL_ERROR` → 500 (server error)

---

## Authentication

## Current Implementation Status

Implemented routes in the current codebase:
- `POST /artifacts/generate`
- `POST /tools/meta-ads/generate`
- `POST /tools/extraction/generate`
- `POST /tools/funnel-pages/generate`
- `POST /tools/funnel-pages/upload`
- `GET /artifacts/{id}`
- `PUT /artifacts/{id}`
- `DELETE /artifacts/{id}`
- `GET /projects`
- `POST /projects`
- `GET /projects/{id}`
- `PUT /projects/{id}`
- `DELETE /projects/{id}`
- `GET /users/profile`
- `GET /users/quota`
- `GET /admin/users`
- `PUT /admin/users/{userId}/quota`
- `GET /admin/users/{userId}/audit`
- `GET /admin/metrics`
- `GET /admin/models`
- `POST /admin/models`
- `PUT /admin/models/{modelId}`
- `DELETE /admin/models/{modelId}`
- `GET /models`

Documented but not yet implemented:
- `GET /artifacts` (lista con filtri avanzati server-side e paginazione)

### Model Registry (As-Is)

Il catalogo modelli non e piu hardcoded a livello route validation: e gestito tramite registry DB (`LlmModel`) con CRUD admin.

Comportamento corrente:
- `GET /api/admin/models`: lista completa per gestione amministrativa
- `POST /api/admin/models`: crea nuovo modello
- `PUT /api/admin/models/{modelId}`: aggiorna stato/costi/default
- `DELETE /api/admin/models/{modelId}`: elimina modello non-default
- `GET /api/models`: espone ai client i modelli pubblici attivi

Validazione runtime modello:
- Le route di generazione validano il modello selezionato tramite availability check su registry (`requireAvailableModel`).
- Se il registry DB non contiene righe attive, il sistema mantiene fallback statico controllato per continuita operativa.

### Auth.js Session Endpoint
```
GET /api/auth/session
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "user_123",
    "email": "user@company.com",
    "name": "John Doe",
    "image": "https://..."
  },
  "expires": "2026-04-08T12:34:56Z"
}
```

### Sign Out
```
POST /api/auth/signout
```

**Response** (200 OK):
```json
{ "success": true }
```

---

## Artifacts

## Tool-Specific Generation

### Generate Meta Ads (Streaming)

**Endpoint**:
```
POST /tools/meta-ads/generate
```

**Request** (application/json):
```json
{
  "projectId": "proj_123",
  "model": "openai/gpt-4-turbo",
  "tone": "professional",
  "customerContext": {
    "product": "Programma nutrizione 90 giorni",
    "audience": "Donne 28-45 interessate a fitness",
    "offer": "Call gratuita + piano personalizzato"
  },
  "objective": "lead generation",
  "angle": "problem-solution con social proof"
}
```

Nota compatibilita:
- I campi legacy top-level (`product`, `audience`, `offer`) sono ancora accettati e normalizzati server-side in `customerContext`.

**Response**:
- Stream SSE con eventi standard (`start`, `token`, `complete`, `error`) e metadata additive (`workflowType`, `format`, `sequence`, `progress`, `code`)
- Crea un artifact di tipo `content`
- Formato output workflow: `markdown`

### Upload Funnel Source Document

**Endpoint**:
```
POST /tools/funnel-pages/upload
```

**Request** (`multipart/form-data`):
- `projectId` (string, `cuid`)
- `file` (binary)

Formati supportati:
- PDF (`application/pdf`)
- DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
- TXT (`text/plain`)
- Markdown (`text/markdown`)

Regole principali:
- auth obbligatoria
- ownership check sul `projectId`
- rate limit prima della lettura/parse file
- parsing inline (no storage esterno)

**Response** (200):
```json
{
  "ok": true,
  "data": {
    "text": "contenuto estratto",
    "fileName": "briefing.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 123456
  }
}
```

Errori tipici:
- `400 VALIDATION_ERROR` (multipart o campi mancanti/non validi)
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `413 VALIDATION_ERROR` (file troppo grande)
- `415 VALIDATION_ERROR` (tipo file non supportato)
- `422 VALIDATION_ERROR` (parsing fallito / contenuto vuoto)
- `429 RATE_LIMIT_EXCEEDED`

### Extract Funnel Fields (Streaming)

**Endpoint**:
```
POST /tools/extraction/generate
```

**Request** (application/json):
```json
{
  "projectId": "proj_123",
  "model": "openai/gpt-4-turbo",
  "tone": "professional",
  "rawContent": "testo estratto dal documento",
  "fieldMap": {
    "business_type": {
      "type": "select",
      "required": true,
      "description": "Tipo business"
    }
  },
  "notes": "opzionale"
}
```

**Response**:
- Stream SSE con eventi standard (`start`, `token`, `complete`, `error`)
- Workflow `extraction`
- Output richiesto al modello: JSON (consumato dal client e mappato in `extractedFields`)

### Generate Funnel Pages Step (Streaming)

**Endpoint**:
```
POST /tools/funnel-pages/generate
```

**Request** (application/json)

Il route handler accetta 3 shape compatibili:
- `V1` legacy (`customerContext + promise`)
- `V2` briefing unificato (`briefing`)
- `V3` upload-first (`extractedFields`) — shape raccomandata e usata dalla UI attuale

**Request V3 (raccomandata)**:
```json
{
  "projectId": "proj_123",
  "model": "openai/gpt-4-turbo",
  "tone": "professional",
  "step": "optin",
  "extractedFields": {
    "business_type": "B2B",
    "sector_niche": "Servizi B2B",
    "core_problem": "Lead poco qualificati",
    "funnel_primary_goal": "Aumentare call qualificate"
  },
  "notes": "Vincoli brand..."
}
```

Nota compatibilita:
- I payload legacy V1/V2 restano supportati per backward compatibility.

**Step-specific constraints**:
- `step=optin`: nessun contesto precedente richiesto
- `step=quiz`: richiede `optinOutput`
- `step=vsl`: richiede `optinOutput` e `quizOutput`

**Response**:
- Stream SSE con eventi standard (`start`, `token`, `complete`, `error`) e metadata additive (`workflowType`, `format`, `sequence`, `progress`, `code`)
- Crea un artifact di tipo `content`
- Formato output workflow: `markdown` (per `optin`, `quiz`, `vsl`)

Nota workflow UI Funnel Pages:
1. upload documento (`/tools/funnel-pages/upload`)
2. estrazione campi (`/tools/extraction/generate`)
3. generazione sequenziale `optin -> quiz -> vsl` (`/tools/funnel-pages/generate`)

### Generate Artifact (Streaming)

**Endpoint**:
```
POST /artifacts/generate
```

**Request** (application/json):
```json
{
  "projectId": "proj_123",
  "type": "content",
  "model": "openai/gpt-4-turbo",
  "input": {
    "topic": "Best practices for SaaS onboarding",
    "tone": "professional",
    "length": 1000,
    "outputFormat": "markdown"
  }
}
```

**Response** (200 OK - streaming):
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"type":"start","artifactId":"art_456"}
data: {"type":"token","token":"Great"}
data: {"type":"token","token":" SaaS"}
data: {"type":"complete","tokens":{"input":45,"output":987},"cost":0.031}
```

**Response Fields**:
- `artifactId` - ID of created artifact (save for reference)
- `token` - Individual token from LLM
- `tokens` - Total token counts (input, output)
- `cost` - USD amount for this generation
**Error Responses**:

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Input payload invalid |
| 401 | UNAUTHORIZED | Not authenticated |
| 403 | FORBIDDEN | Project belongs to another user |
| 404 | NOT_FOUND | Project not found |
| 429 | RATE_LIMIT_EXCEEDED | Monthly quota exhausted |
| 402 | PAYMENT_REQUIRED | Monthly budget exceeded |
| 503 | SERVICE_UNAVAILABLE | OpenRouter temporarily unavailable |

**Validation Schemas** (Zod):
```typescript
const GenerateRequestSchema = z.object({
  projectId: z.string().cuid(),
  type: z.enum(['content', 'seo', 'code']),
  model: z.enum([
    'openai/gpt-4-turbo',
    'anthropic/claude-3-opus',
    'mistralai/mistral-large',
  ]),
  input: z.record(z.string(), z.unknown()),
});
```

---

### Get Artifact

**Endpoint**:
```
GET /artifacts/{id}
```

**Response** (200 OK):
```json
{
  "artifact": {
    "id": "art_456",
    "projectId": "proj_123",
    "userId": "user_123",
    "type": "content",
    "model": "openai/gpt-4-turbo",
    "content": "Great SaaS onboarding...",
    "input": {
      "topic": "Best practices...",
      "tone": "professional"
    },
    "status": "completed",
    "inputTokens": 45,
    "outputTokens": 987,
    "costUSD": 0.031,
    "createdAt": "2026-04-07T10:30:00Z",
    "completedAt": "2026-04-07T10:30:12Z"
  }
}
```

---

### List Artifacts

**Status**: Planned, not implemented in current codebase.

**Endpoint**:
```
GET /artifacts?projectId={projectId}&limit=20&offset=0
```

**Query Parameters**:
- `projectId` - Filter by project
- `status` - Filter by status (generating, completed, failed)
- `type` - Filter by artifact type
- `limit` - Results per page (default: 20, max: 100)
- `offset` - Pagination offset

**Response** (200 OK):
```json
{
  "items": [
    {
      "id": "art_456",
      "type": "content",
      "status": "completed",
      "model": "openai/gpt-4-turbo",
      "costUSD": 0.031,
      "createdAt": "2026-04-07T10:30:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

### Update Artifact

**Status**: Planned, not implemented in current codebase.

**Endpoint**:
```
PUT /artifacts/{id}
```

**Request**:
```json
{
  "content": "Updated content here",
  "notes": "Manual edit by user"
}
```

**Response** (200 OK):
```json
{
  "id": "art_456",
  "content": "Updated content here",
  "updatedAt": "2026-04-07T14:20:00Z"
}
```

---

### Delete Artifact

**Endpoint**:
```
DELETE /artifacts/{id}
```

**Response** (204 No Content):
```
(empty body)
```

---

## Projects

### List Projects

**Endpoint**:
```
GET /projects?limit=20&offset=0
```

**Response** (200 OK):
```json
{
  "projects": [
    {
      "id": "proj_123",
      "name": "Marketing Campaign Q2",
      "description": "All assets for Q2...",
      "_count": { "artifacts": 15 },
      "createdAt": "2026-02-01T00:00:00Z",
      "updatedAt": "2026-04-07T10:00:00Z"
    }
  ]
}
```

---

### Create Project

**Endpoint**:
```
POST /projects
```

**Request**:
```json
{
  "name": "SEO Audit 2026",
  "description": "Comprehensive SEO analysis for website"
}
```

**Response** (201 Created):
```json
{
  "project": {
    "id": "proj_new_789",
    "name": "SEO Audit 2026",
    "description": "Comprehensive SEO analysis...",
    "userId": "user_123",
    "createdAt": "2026-04-07T15:45:00Z"
  }
}
```

---

### Get Project with Artifacts

**Endpoint**:
```
GET /projects/{id}
```

**Response** (200 OK):
```json
{
  "id": "proj_123",
  "name": "Marketing Campaign Q2",
  "description": "All assets for Q2...",
  "artifacts": [
    {
      "id": "art_456",
      "type": "content",
      "status": "completed",
      "createdAt": "2026-04-07T10:30:00Z"
    }
  ],
  "createdAt": "2026-02-01T00:00:00Z"
}
```

---

### Update Project

**Endpoint**:
```
PUT /projects/{id}
```

**Request**:
```json
{
  "name": "Q2 Marketing - Updated",
  "description": "New description"
}
```

**Response** (200 OK):
```json
{
  "id": "proj_123",
  "name": "Q2 Marketing - Updated",
  "description": "New description",
  "updatedAt": "2026-04-07T16:00:00Z"
}
```

---

### Delete Project

**Endpoint**:
```
DELETE /projects/{id}
```

**Note**: Cascades to delete all artifacts

**Response** (204 No Content):
```
(empty body)
```

---

## User Profile & Quota

### Get Current User

**Endpoint**:
```
GET /users/profile
```

**Response** (200 OK):
```json
{
  "id": "user_123",
  "email": "user@company.com",
  "name": "John Doe",
  "monthlyQuota": 1000,
  "monthlyUsed": 245,
  "monthlyBudget": 500,
  "monthlySpent": 124.56,
  "resetDate": "2026-05-07T00:00:00Z"
}
```

---

### Get Current Quota Status

**Endpoint**:
```
GET /users/quota
```

**Response** (200 OK):
```json
{
  "monthlyQuota": 1000,
  "monthlyUsed": 245,
  "percentageUsed": 24.5,
  "remaining": 755,
  "resetDate": "2026-05-07T00:00:00Z",
  "monthlyBudget": 500,
  "monthlySpent": 124.56,
  "percentageBudgetUsed": 24.91,
  "remainingBudget": 375.44,
  "estimatedDaysUntilBudgetExhausted": 8
}
```

---

## Admin Endpoints

> Requires admin role

### List All Users

**Endpoint**:
```
GET /admin/users?limit=50&offset=0
```

**Response** (200 OK):
```json
{
  "items": [
    {
      "id": "user_123",
      "email": "john@company.com",
      "name": "John Doe",
      "monthlyQuota": 1000,
      "monthlyUsed": 245,
      "monthlyBudget": 500,
      "monthlySpent": 124.56,
      "createdAt": "2026-01-15T00:00:00Z"
    }
  ],
  "total": 50
}
```

---

### Update User Quota

**Endpoint**:
```
PUT /admin/users/{userId}/quota
```

**Request**:
```json
{
  "monthlyQuota": 2000,
  "monthlyBudget": 1000,
  "resetDate": "2026-05-01T00:00:00Z"
}
```

**Response** (200 OK):
```json
{
  "id": "user_123",
  "monthlyQuota": 2000,
  "monthlyBudget": 1000,
  "resetDate": "2026-05-01T00:00:00Z"
}
```

---

### Get User Audit Trail

**Endpoint**:
```
GET /admin/users/{userId}/audit?limit=100
```

**Response** (200 OK):
```json
{
  "items": [
    {
      "id": "audit_123",
      "userId": "user_123",
      "action": "artifact_generated",
      "model": "openai/gpt-4-turbo",
      "artifactType": "content",
      "costUSD": 0.031,
      "status": "success",
      "createdAt": "2026-04-07T10:30:00Z"
    }
  ],
  "total": 245
}
```

---

## Model Selection

### List Available Models

**Endpoint**:
```
GET /models
```

**Response** (200 OK):
```json
{
  "models": [
    {
      "id": "openai/gpt-4-turbo",
      "name": "GPT-4 Turbo",
      "provider": "OpenAI",
      "pricing": {
        "inputCost": 0.01,
        "outputCost": 0.03
      },
      "contextWindow": 128000,
      "recommended": true
    },
    {
      "id": "anthropic/claude-3-opus",
      "name": "Claude 3 Opus",
      "provider": "Anthropic",
      "pricing": {
        "inputCost": 0.015,
        "outputCost": 0.075
      },
      "contextWindow": 200000,
      "recommended": false
    }
  ]
}
```

---

## Rate Limiting Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 755
X-RateLimit-Reset: 2026-05-07T00:00:00Z
Retry-After: 3600 (if rate limited)
```

---

## Streaming Implementation Details

### Streaming via fetch + ReadableStream

> **Nota**: l'endpoint di generazione è `POST`, quindi non è compatibile con `EventSource` (solo GET). Si usa `fetch` con `response.body.getReader()`.

Frontend implementation:
```typescript
async function streamArtifact(request: ArtifactRequest) {
  const response = await fetch('/api/artifacts/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok || !response.body) {
    throw new Error('Stream non disponibile');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = JSON.parse(line.slice(6));

      if (data.type === 'token') {
        displayContent += data.token;
      } else if (data.type === 'complete') {
        console.log('Artifact ID:', data.artifactId);
      }
    }
  }
}

// Variante tool-specific:
// /api/tools/meta-ads/generate
// /api/tools/funnel-pages/generate
```

Nota: al momento non esiste un endpoint `batch=true` dedicato; il fallback applicativo va gestito lato UI.

---

## Examples

### Example 1: Generate Content Artifact

```bash
curl -X POST https://<your-vercel-domain>/api/artifacts/generate \
  -H "Cookie: next-auth.session-token=<session_cookie>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_123",
    "type": "content",
    "model": "openai/gpt-4-turbo",
    "input": {
      "topic": "AI in marketing",
      "tone": "educational",
      "length": 1500
    }
  }'
```

### Example 2: List User Projects

```bash
curl -X GET 'https://<your-vercel-domain>/api/projects' \
  -H "Cookie: next-auth.session-token=<session_cookie>"
```

### Example 3: Admin - Update User Quota

```bash
curl -X PUT https://<your-vercel-domain>/api/admin/users/user_123/quota \
  -H "Cookie: next-auth.session-token=<admin_session_cookie>" \
  -H "Content-Type: application/json" \
  -d '{
    "monthlyQuota": 2000,
    "monthlyBudget": 1000
  }'
```

---

## Pagination

Pagination is planned in the public API design, but the current codebase returns full result sets for implemented list endpoints such as `GET /projects` and `GET /admin/users`.

---

## Versioning

Current API version: `v1`

Future versions will use:
```
GET /v2/artifacts
```

Older versions will remain supported for 6 months.
