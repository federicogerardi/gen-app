# API Specifications: LLM Artifact Generation Hub

**Version**: 1.5  
**Status**: IMPLEMENTED SUBSET + OPEN ITEMS  
**Base URL**: `https://<your-vercel-domain>/api` (production from `main`; development/preview from PR flow on `dev`)  
**Authentication**: NextAuth session cookie (browser). Bearer tokens solo per integrazioni server-to-server esplicite.  
**Content-Type**: `application/json` (default), `multipart/form-data` per upload documenti funnel  
**Last Updated**: 2026-04-18

---

## Frontend Build Guardrails (Next.js App Router)

Per prevenire errori CI di prerender su pagine tool (`/tools/*`) e pagine client App Router:

- Se una pagina usa `useSearchParams()`, il componente che invoca l'hook deve essere renderizzato dentro un boundary `Suspense`.
- Pattern raccomandato:
  - `export default function Page() { return <Suspense><PageContent /></Suspense>; }`
  - `function PageContent() { const searchParams = useSearchParams(); ... }`
- Evitare di usare `useSearchParams()` direttamente nel componente `default export` della pagina senza `Suspense`.
- Applicare lo stesso controllo ai nuovi tool client-side prima di aprire PR.

Checklist minima pre-merge (obbligatoria per pagine tool):

1. `npm run test`
2. `npm run build`
3. Verifica manuale GUI locale delle route toccate

Errore tipico prevenuto da questo guardrail:

- `useSearchParams() should be wrapped in a suspense boundary`

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
- `EXTRACTION_FAILED` → 503 (deterministic extraction fallback chain exhausted)
- `INTERNAL_ERROR` → 500 (server error)

---

## Authentication

## Current Implementation Status

Implemented routes in the current codebase:
- `POST /artifacts/generate`
- `GET /artifacts`
- `POST /tools/extraction/generate`
- `POST /tools/funnel-pages/generate`
- `POST /tools/nextland/generate`
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
- `PUT /admin/models/{id}`
- `DELETE /admin/models/{id}`
- `GET /models`

### Model Registry (As-Is)

Il catalogo modelli non e piu hardcoded a livello route validation: e gestito tramite registry DB (`LlmModel`) con CRUD admin.

Comportamento corrente:
- `GET /api/admin/models`: lista completa per gestione amministrativa
- `POST /api/admin/models`: crea nuovo modello
- `PUT /api/admin/models/{id}`: aggiorna stato/costi/default (il param `{id}` è la primary key CUID del DB)
- `DELETE /api/admin/models/{id}`: elimina modello non-default
- `GET /api/models`: espone ai client i modelli pubblici attivi

Validazione runtime modello:
- Le route di generazione validano il modello selezionato tramite availability check su registry (`requireAvailableModel`).
- Se il registry DB non contiene righe attive, il sistema mantiene fallback statico controllato per continuita operativa.

### GET /artifacts — Filtri supportati

Query parameters:
- `projectId` (cuid, opzionale): filtra per progetto; l'utente autenticato deve essere proprietario.
- `status` (`generating` | `completed` | `failed`, opzionale)
- `type` (`content` | `seo` | `code` | `extraction`, opzionale)
- `limit` (1–100, default 20), `offset` (default 0)

### Admin endpoints — Auth behaviour

Gli endpoint `/api/admin/*` usano la guardia `requireAdminUser()`:
- Utente non autenticato (sessione assente) → `401 UNAUTHORIZED`
- Utente autenticato ma senza ruolo `admin` → `403 FORBIDDEN`

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

### Meta Ads Runtime Decommission (as-is)

- L'endpoint `POST /tools/meta-ads/generate` e stato rimosso dal runtime.
- Il perimetro tool standard attivo espone solo `funnel-pages`, `nextland`, `extraction`.
- Gli artifact storici con `workflowType: meta_ads` restano visualizzabili nelle viste artifact/dashboard.

### Upload Funnel Source Document

**Endpoint**:
```
POST /tools/funnel-pages/upload
```

**Request** (`multipart/form-data`):
- `projectId` (string, `cuid`)
- `file` (binary)

Formati supportati:
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
    "fileName": "briefing.docx",
    "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
  "responseMode": "text",
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

Nota modalita risposta:
- `responseMode: "structured"` (default): mantiene percorso JSON strutturato con validazioni parse/schema/consistency.
- `responseMode: "text"` (raccomandata per funnel): restituisce contesto testuale markdown pronto per i prompt downstream, riducendo la fragilita del parsing strutturato.

Policy runtime (as-is):
- Il campo `model` nel payload e accettato per compatibilita/audit ma non decide il modello runtime di extraction.
- La route applica chain deterministica: `anthropic/claude-3.7-sonnet` -> `openai/gpt-4.1` -> `openai/o3`.
- In `responseMode: "text"` la chain operativa usa 3 tentativi completeness-first con timeout estesi (attempt 1 = 120s, attempt 2 = 150s, attempt 3 = 180s).
- Ogni tentativo viene validato server-side con parse JSON + schema (`fields`, `missingFields`, `notes`) + coerenza con `fieldMap`.
- Timeout per-attempt default (structured): tentativo 1 = 90s, tentativo 2 = 120s, tentativo 3 = 150s.
- Early-abort first-token (structured): se non arriva alcun token SSE entro 45s, il tentativo viene classificato come `timeout` e si passa al fallback successivo.
- Early-abort json-start (structured): dopo il primo token non vuoto, se non compare un inizio JSON (`{`) entro 35s, il tentativo viene classificato come `timeout` e si passa al fallback successivo.
- Early-abort json-parse (structured): dopo il primo `{`, se l'output non diventa JSON parseable entro 30s, il tentativo viene classificato come `timeout` e si passa al fallback successivo.
- Early-abort token-idle (structured): dopo il primo token, se lo stream resta inattivo oltre 40s, il tentativo viene classificato come `timeout` e si passa al fallback successivo.
- In `responseMode: "text"` i guard stream aggressivi (`first_token`, `json_start`, `json_parse`, `token_idle`) sono disattivati; resta la deadline per-attempt per evitare richieste indefinite.
- I timeout route-level propagano `AbortSignal` fino a orchestrator/provider: la cancellazione interrompe realmente la richiesta upstream evitando attese prolungate lato provider.
- La coerenza e valutata sui soli campi dichiarati nel `fieldMap`: eventuali chiavi extra restituite dal modello non invalidano automaticamente il tentativo se i campi richiesti risultano coerenti (supporto output parziali).
- Semantica acceptance applicativa:
  - `hard_accept`: campi attesi/missing coerenti con `fieldMap`, nessun overlap.
  - `soft_accept`: segnale strutturato parziale con parse/schema validi e copertura campi critici (`required`) sopra soglia.
  - `reject`: overlap reale, assenza segnale utile, parse/schema invalidi o copertura critica sotto soglia.
- La route emette telemetria diagnostica strutturata per tentativo con campi: `expectedFieldCount`, `knownExtractedCount`, `knownMissingCount`, `overlapCount`, `unknownExtractedSample`, `unknownMissingSample`, `consistencyDecision`, `consistencyDecisionReason`, `acceptanceDecision`, `acceptanceReason`, `criticalCoverage`.
- In `responseMode: "text"`, in caso di timeout con contenuto gia utile (contesto testuale sostanziale), il tentativo puo essere accettato come `soft_accept` per evitare fallback/503 non necessari.
- Il fallback si interrompe al primo tentativo valido oppure a esaurimento della chain di tentativi.
- In caso di esaurimento chain: `{ error: { code: "EXTRACTION_FAILED", message } }` con HTTP 503.

### Extraction Resilience Contract (Sprint 0)

Matrice outcome canonica:
- `completed_full`: tentativo valido con `hard_accept`.
- `completed_partial`: tentativo valido con `soft_accept` (segnale utile ma parziale/degradato).
- `failed_hard`: richiesta non recuperabile nel perimetro route (auth/ownership/validation) oppure chain exhausted senza segnale utile.

Reason taxonomy canonica (route/policy/UI):
- successo pieno: `known_fields_present`
- successo parziale: `critical_coverage_threshold_met`, `no_critical_fields_defined`, `no_known_keys_but_structured_signal`, `partial_useful_output`
- hard-fail: `unauthorized`, `forbidden`, `validation_error`, `no_signal_after_chain_exhausted`

Mapping terminale centralizzato:
- `completed_full` -> HTTP 200 -> artifact status `completed`
- `completed_partial` -> HTTP 200 -> artifact status `completed`
- `failed_hard` + `unauthorized` -> HTTP 401 -> artifact status `failed`
- `failed_hard` + `forbidden` -> HTTP 403 -> artifact status `failed`
- `failed_hard` + `validation_error` -> HTTP 400 -> artifact status `failed`
- `failed_hard` + `no_signal_after_chain_exhausted` -> HTTP 503 (`EXTRACTION_FAILED`) -> artifact status `failed`

Campi diagnostici terminali (log route extraction):
- `completionOutcome`
- `completionReason`
- `artifactStatus`
- `httpStatus`

**Response**:
- Stream SSE con eventi standard (`start`, `token`, `complete`, `error`)
- Workflow `extraction`
- Output workflow consigliato per HotLead Funnel (workflow `funnel_pages`): testo markdown contestuale (consumato direttamente come `extractionContext` nei prompt downstream)

Nota operativa:
- La route valida internamente i tentativi e poi invia al client gli eventi SSE del tentativo valido; durante retry non e garantito passthrough token live continuo.

### Generate HotLead Funnel Step (Streaming)

**Endpoint**:
```
POST /tools/funnel-pages/generate
```

**Request** (application/json)

Il route handler accetta 3 shape compatibili:
- `V1` legacy (`customerContext + promise`)
- `V2` briefing unificato (`briefing`)
- `V3` upload-first (`extractedFields` oppure `extractionContext`) — shape raccomandata

**Request V3 (raccomandata)**:
```json
{
  "projectId": "proj_123",
  "model": "openai/gpt-4-turbo",
  "tone": "professional",
  "step": "optin",
  "extractionContext": "## Business\nAgenzia B2B...\n\n## Audience\nFounder PMI...\n\n## Offer\n...",
  "notes": "Vincoli brand..."
}
```

Nota compatibilita:
- I payload legacy V1/V2 restano supportati per backward compatibility.

Nota mapping proof context (V3):
- Quando `extractedFields.testimonials_sources` e presente, il mapping server-side verso il briefing funnel popola `proof_context.testimonials_sources` mantenendo i campi `quote`, `source`, `timestamp` e, quando disponibili, `achieved_result`, `measurable_results`.
- Quando `extractionContext` e presente, il route funnel usa direttamente il contesto testuale nei prompt di generazione (senza mapping strutturato intermedio).

**Step-specific constraints**:
- `step=optin`: nessun contesto precedente richiesto
- `step=quiz`: richiede `optinOutput`
- `step=vsl`: richiede `optinOutput` e `quizOutput`

**Response**:
- Stream SSE con eventi standard (`start`, `token`, `complete`, `error`) e metadata additive (`workflowType`, `format`, `sequence`, `progress`, `code`)
- Crea un artifact di tipo `content`
- Formato output workflow: `markdown` (per `optin`, `quiz`, `vsl`)

Nota workflow UI HotLead Funnel:
1. upload documento (`/api/tools/funnel-pages/upload`)
2. estrazione contesto testuale (`/api/tools/extraction/generate` con `responseMode: "text"`)
3. generazione sequenziale `optin -> quiz -> vsl` (`/api/tools/funnel-pages/generate`)

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
    "createdAt": "2026-04-07T10:30:00Z",
    "completedAt": "2026-04-07T10:30:12Z"
  }
}
```

---

### List Artifacts

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

**Endpoint**:
```
PUT /artifacts/{id}
```

**Request**:
```json
{
  "content": "Updated content here"
}
```

**Response** (200 OK):
```json
{
  "artifact": {
    "id": "art_456",
    "content": "Updated content here",
    "updatedAt": "2026-04-07T14:20:00Z"
  }
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
  "project": {
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
  "user": {
    "id": "user_123",
    "email": "user@company.com",
    "name": "John Doe",
    "image": null,
    "role": "user",
    "createdAt": "2026-01-15T00:00:00Z"
  }
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
  "quota": {
    "monthlyQuota": 1000,
    "monthlyUsed": 245,
    "resetDate": "2026-05-07T00:00:00Z"
  }
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
