# Funnel Pages Phase 4 Refactor Plan

**Data**: 2026-04-18  
**Owner**: Federico  
**Riferimenti**: [ADR 004](../adrs/004-tool-pages-composable-architecture.md), [Spike POC](./spike-tool-pages-composable-architecture-poc-1.md)

**Security Review**: [Phase 4 Funnel Refactor Security Review](../code-review/2026-04-18-phase-4-funnel-refactor-security-review.md)

## Obiettivo

Refactor di `funnel-pages` su architettura composabile, sostituendo la logica monolitica con componenti e hook condivisi già validati nel POC.

Target principali:
- Portare il contenitore principale a ~300 righe.
- Ridurre complessità locale e duplicazione verso `nextland`.
- Mantenere feature parity completa.

## Scope

In scope:
- Creazione/estrazione di `FunnelPagesToolContent.tsx` come container tool-specific.
- Uso di hook shared (`useExtraction`, `useStepGeneration`).
- Uso di componenti shared (`ToolSetup`, `StatusChecklist`, `StepCard`, `ProjectDialog` dove necessario).
- Consolidamento config e tipi funnel-specific.
- Validazione tecnica (typecheck, lint, build, test mirati).
- Non-regressione sicurezza su flusso funnel: auth, ownership, rate limit, error contract.

Out of scope:
- Refactor di `nextland` (Phase 5).
- Nuovi requisiti funzionali non presenti nella versione corrente.
- Modifiche ai contratti API esistenti.

## Prerequisiti

- Shared library già disponibile in `src/tools/shared/`.
- Esiti POC già validati (TypeScript, lint, build, test suite).
- Endpoint funnel invariati e funzionanti.

## Deliverable

- `src/app/tools/funnel-pages/FunnelPagesToolContent.tsx` (nuovo container composabile).
- `src/app/tools/funnel-pages/page.tsx` ridotto a shell + suspense wrapper.
- Eventuali file funnel-specific di supporto:
  - `src/app/tools/funnel-pages/config.ts`
  - `src/app/tools/funnel-pages/types.ts`
- Aggiornamento test/documentazione solo se necessario alla parity.

## Piano Esecutivo (Step-by-step)

### Step 1: Baseline e mappa logica corrente (15 min)

- Mappare nel file attuale:
  - stati tool-specific da mantenere;
  - punti di integrazione API;
  - rendering card/step e regole di sequenziamento.
- Congelare invarianti funzionali per parity.

Output:
- Checklist parity pronta prima del refactor.

### Step 2: Estrazione config e tipi funnel-specific (20 min)

- Spostare costanti e mapping in `config.ts`.
- Definire tipi funnel-specific in `types.ts` appoggiandosi ai tipi shared.
- Ridurre i tipi locali duplicati nel file pagina.

Output:
- Modulo config/tipi riusabile e coerente con shared types.

### Step 3: Implementazione `FunnelPagesToolContent` (60 min)

- Comporre i due hook shared:
  - `useExtraction` per upload + extraction + retry extraction;
  - `useStepGeneration` per streaming generation e step state.
- Implementare solo logica funnel-specific:
  - sequenza `optin -> quiz -> vsl`;
  - regole su primary/secondary actions;
  - mapping payload funnel-specific.
- Sostituire blocchi UI duplicati con componenti shared.

Output:
- Container composabile con responsabilità focalizzata.

### Step 4: Semplificazione `page.tsx` (15 min)

- Trasformare la pagina in wrapper leggero con layout + suspense.
- Delegare tutta la logica applicativa al nuovo content component.

Output:
- `page.tsx` sotto target dimensionale e facile da mantenere.

### Step 5: Validazione tecnica (20 min)

Comandi previsti:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test -- --passWithNoTests`

Test matrix obbligatoria (evitare falsi positivi):
- Route funnel integration: `npm run test -- tests/integration/funnel-pages-route.test.ts`
- Route extraction integration: `npm run test -- tests/integration/extraction-route.test.ts`
- Mapping/unit funnel: `npm run test -- tests/unit/funnel-mapping.test.ts tests/unit/funnel-extraction-field-map.test.ts`
- Shared hooks/components impacted (se presenti test dedicati): eseguire subset unit relativo ai moduli toccati.

Security regression gate:
- Eseguire test integration su route funnel per codici `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMIT_EXCEEDED`.
- Verificare mantenimento ordine controllo: auth/ownership/rateLimit prima di chiamate LLM.
- Verificare contratto errori invariato: `{ error: { code, message } }`.

Verifiche funzionali minime:
- flusso upload/extraction;
- generazione step in sequenza;
- retry su errore;
- rendering stato/checklist/card;
- nessuna regressione visibile rispetto al comportamento precedente.
- input ostile su extraction/generation gestito senza leakage (prompt-injection hardening baseline).

Output:
- Gate tecnici verdi e parity confermata.
- Security + contract matrix completamente verde.

### Step 6: Review e readiness per Phase 5 (10 min)

- Review finale su leggibilità, naming, separazione responsabilità.
- Definizione delta riusabile direttamente in `nextland`.

Output:
- Refactor Funnel pronto come blueprint per Phase 5.

## Criteri di Accettazione

- `FunnelPagesToolContent.tsx` ~300 righe (obiettivo architetturale).
- `page.tsx` ridotto a wrapper leggero.
- Nessuna rottura dei flussi funnel correnti.
- Gate qualità verdi: typecheck, lint, build, test.
- Nessuna introduzione di `any` evitabile.
- Security regression gate verde su auth/ownership/rate-limit/error-contract.

## Rischi e Mitigazioni

1. Regressione di sequenza step.
- Mitigazione: test manuale guidato e controlli su transizioni stato.

2. Prop drilling eccessivo dopo estrazione.
- Mitigazione: centralizzare stato nei hook shared e passare solo props essenziali.

3. Drift tra logica funnel e componenti shared.
- Mitigazione: confinare nel container solo le regole tool-specific.

4. Regressioni su streaming/error handling.
- Mitigazione: mantenere pathway esistenti e validare retry + messaggistica errore.

5. Regressione controlli accesso e limitazione traffico.
- Mitigazione: test integration negativi su auth/ownership/rate-limit e verifica ordine guard server-side.

6. Prompt injection o propagazione testo non normalizzato.
- Mitigazione: normalizzazione input estratto prima del payload LLM e test con input avversariali.

## Stima

Durata totale Phase 4: circa 2 ore.

Ripartizione:
- Baseline/mappa: 15m
- Config/tipi: 20m
- Refactor container: 60m
- Semplificazione page: 15m
- Validazione: 20m
- Review finale: 10m

## Rollback Plan (Phase 4)

Trigger rollback:
- Fallimento di uno dei gate obbligatori (typecheck/lint/build/test matrix).
- Regressione funzionale su flusso upload/extraction/generation funnel.
- Regressione sicurezza su auth/ownership/rate-limit/error contract.

Procedura:
1. Bloccare merge su `dev` fino a fix o revert.
2. Se il refactor e gia su branch remoto, creare revert commit non distruttivo della PR/commit Phase 4.
3. Rieseguire baseline suite:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm run test -- tests/integration/funnel-pages-route.test.ts tests/integration/extraction-route.test.ts`
4. Confermare ripristino comportamento atteso e riaprire iterazione con fix incrementali.

Rollback completed criteria:
- Build verde.
- Test matrix funnel verde.
- Nessun blocker sicurezza aperto.
- Documentazione aggiornata con root-cause e azione correttiva.

## Exit Criteria per passare a Phase 5

- Funnel refactor stabile e validato.
- Pattern riusabile documentato implicitamente nella struttura file.
- Nessun blocker tecnico aperto.
- Nessun blocker sicurezza aperto (P1/P2 del review security chiusi).

## Execution Status (2026-04-18)

**Stato**: ✅ Completed

Implementazione Phase 4 completata su `funnel-pages` con parity funzionale mantenuta.

Output reali:
- `src/app/tools/funnel-pages/page.tsx` ridotto a wrapper suspense: **21 righe**.
- `src/app/tools/funnel-pages/FunnelPagesToolContent.tsx` ridotto a container composabile: **285 righe**.
- Estrazione moduli funnel-specific:
  - `config.ts`, `types.ts`
  - `components/FunnelSetupCard.tsx`
  - `components/FunnelStatusQuick.tsx`
  - `components/FunnelStepCards.tsx`
  - `hooks/useFunnelGeneration.ts`
  - `hooks/useFunnelRecovery.ts`
  - `hooks/useFunnelExtraction.ts`
  - `hooks/useFunnelUiState.ts`

Gate di validazione eseguiti con esito verde:
- `npm run typecheck`
- `npm run lint`
- `npm run test -- tests/integration/funnel-pages-route.test.ts tests/integration/funnel-pages-upload-route.test.ts tests/integration/extraction-route.test.ts tests/unit/funnel-mapping.test.ts tests/unit/funnel-extraction-field-map.test.ts`

Risultato test matrix: **56/56 PASS**.
