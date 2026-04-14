# gen-app — LLM Artifact Generation Hub

Hub interno per la generazione di contenuti marketing con AI. Permette a MediaBuyer e SEO Specialist di creare copy, varianti e funnel in pochi minuti, partendo da un brief o da un documento esistente.

---

## A cosa serve

gen-app mette a disposizione workflow guidati per generare artefatti di alta qualità direttamente dall'interfaccia web, senza dover scrivere prompt manualmente o gestire account LLM separati.

Ogni artefatto generato viene salvato automaticamente e organizzato in progetti, così è sempre rintracciabile e riutilizzabile.

---

## Accesso

L'app è riservata agli utenti interni. Si accede tramite il proprio account Google aziendale — non è necessaria nessuna registrazione separata.

---

## Tool disponibili

### Meta Ads

Genera varianti complete di annunci pubblicitari a partire da un brief testuale.

**Output prodotto:**
- Hook (apertura dell'annuncio)
- Body copy
- Headline
- Call to action

Utile per creare rapidamente più varianti da testare in A/B, o per iterare su un copy esistente cambiando angoli e messaggi.

---

### Funnel Pages

Genera i testi di un funnel completo in tre step sequenziali, a partire da un documento di riferimento caricato dall'utente (es. brief di prodotto, deck commerciale, trascrizione intervista).

**Pipeline:**
1. **Caricamento documento** — si carica il materiale di riferimento
2. **Estrazione automatica** — l'AI estrae le informazioni chiave (prodotto, target, benefici, angoli di comunicazione)
3. **Generazione sequenziale:**
   - Optin page
   - Quiz (domande di qualificazione)
   - VSL script (Video Sales Letter)

Ogni step è revisionabile prima di procedere al successivo.

---

## Progetti e artefatti

Gli artefatti generati si organizzano in **progetti**. Un progetto raggruppa tutti i materiali relativi a una campagna o iniziativa.

Dal dashboard è possibile:
- Creare e rinominare progetti
- Consultare lo storico degli artefatti generati
- Riaprire e leggere qualsiasi artefatto precedente

---

## Quota e utilizzo

Ogni utente dispone di una **quota mensile di generazioni** (default: 1000/mese). La quota si azzera automaticamente a inizio mese.

Quando la quota è esaurita, non è possibile avviare nuove generazioni fino al reset mensile o fino a quando l'amministratore non aggiorna il limite.

---

## Area Admin

Gli amministratori hanno accesso a un pannello dedicato per:
- Visualizzare e modificare le quote degli utenti
- Consultare le metriche di utilizzo aggregate
- Gestire il catalogo dei modelli LLM disponibili (aggiungere, disabilitare, impostare il modello di default)
- Accedere all'audit trail per utente

---

## Per i developer

### Stack

| Layer | Tecnologia |
|---|---|
| **Frontend** | React 19 · TypeScript · shadcn/ui v4 · Tailwind CSS v4 |
| **Forms & Validazione** | React Hook Form · Zod v4 |
| **Server state** | TanStack Query v5 |
| **Backend** | Next.js 16 (App Router, Route Handlers) |
| **Database** | PostgreSQL 16 · Prisma 7 |
| **Auth** | NextAuth.js v5 · Google OAuth · `@auth/prisma-adapter` |
| **LLM** | OpenRouter (OpenAI-compatible SDK) |
| **Rate limiting** | `@upstash/ratelimit` · `@upstash/redis` |
| **Monitoring** | Sentry · Pino (structured logging) |
| **Test** | Jest · Testing Library · Playwright |
| **Deploy** | Vercel (`main` → produzione, `dev` → PR flow) |

### Setup locale

**Prerequisiti:** Node.js 22 LTS, PostgreSQL 16, chiave API OpenRouter, app Google OAuth, database Upstash Redis.

```bash
git clone https://github.com/federicogerardi/gen-app.git
cd gen-app
npm install
```

Crea un file `.env.local` alla root con le seguenti variabili:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/genapp
NEXTAUTH_SECRET=             # openssl rand -base64 32
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OPENROUTER_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
VERCEL_CRON_SECRET=          # richiesto in produzione
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npx prisma generate          # genera il client Prisma (⚠️ richiede DATABASE_URL)
npx prisma migrate dev       # applica le migrazioni
npm run dev                  # avvia il server di sviluppo
```

### Script disponibili

| Comando | Descrizione |
|---|---|
| `npm run dev` | Server di sviluppo |
| `npm run build` | Build di produzione |
| `npm run typecheck` | Type-check TypeScript senza emit |
| `npm run lint` | ESLint |
| `npm run test` | Test Jest (unit + integration) |
| `npm run test:e2e` | Test Playwright end-to-end |
| `npm run db:migrate:deploy` | Applica migrazioni pending (idempotente) |
| `npm run deploy:vercel` | Migrazioni + build (comando deploy completo) |

### Deploy

Il deploy avviene su Vercel tramite `npm run deploy:vercel`, che esegue `prisma migrate deploy` prima del build. Il branch `main` è il ramo di produzione; le PR vanno aperte su `dev`.

Riferimenti architetturali: [`docs/adrs/`](docs/adrs/), [`docs/specifications/api-specifications.md`](docs/specifications/api-specifications.md).
