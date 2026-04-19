# Feature Checklist: Meta Ads Runtime Decommission

**Status**: COMPLETED (runtime removed, historical compatibility preserved)  
**Date**: 2026-04-18  
**Owner**: Backend + Frontend + QA

---

## Obiettivo

Rimuovere il runtime legacy del workflow `meta_ads` mantenendo stabilita su:
- tool framework standard (`funnel_pages`, `nextland`, `extraction`)
- visualizzazione storica artifact gia generati
- contratti API e test di sicurezza

---

## Guardrail Operativi

1. Eseguire la rimozione in 2 fasi:
- Fase A: endpoint deprecato con risposta esplicita (410/404) e test aggiornati.
- Fase B: rimozione codice morto (route, prompt builder, template, test dedicati).

2. Non introdurre regressioni sugli artifact storici:
- mantenere fallback label/titoli per artifact con `workflowType: meta_ads` finche non e completata una migrazione dati.

3. Mantenere il contratto error envelope:
- `{ error: { code, message } }`.

---

## Checklist File-Per-File

### 1) Route API legacy

- [ ] `src/app/api/tools/meta-ads/generate/route.ts`
  - Fase A: sostituire handler con risposta `410 GONE` (oppure `404`) con envelope standard.
  - Fase B: eliminare file/route.

### 2) Schemi request tool

- [ ] `src/lib/tool-routes/schemas.ts`
  - Rimuovere `metaAdsRequestSchema` e relativo tipo `MetaAdsRequest` se non piu usati.
  - Verificare assenza import residui.

### 3) Prompt layer legacy

- [ ] `src/lib/tool-prompts/meta-ads.ts`
  - Eliminare builder `buildMetaAdsPrompt`.

- [ ] `src/lib/tool-prompts/meta-ads-templates.ts`
  - Eliminare template runtime statico Meta Ads.

- [ ] `src/lib/tool-prompts/registry.ts`
  - Rimuovere nodo `metaAds` dal registry.
  - Aggiornare union type `ToolPromptPath`.

- [ ] `src/lib/tool-prompts/templates.ts`
  - Rimuovere import/use di `META_ADS_GENERATION_TEMPLATE`.

- [ ] `src/lib/tool-prompts/prompts/tools/meta_ads/prompt_generation.md`
  - Valutare rimozione (se non richiesto storico) o spostamento in `docs/archive/` come reference.

### 4) Workflow typing e mapping

- [ ] `src/lib/types/artifact.ts`
  - Rimuovere `meta_ads` da `TOOL_WORKFLOWS` solo se tutta la pipeline e pronta.
  - In alternativa mantenere temporaneamente per compatibilita storica UI.

- [ ] `src/lib/tool-routes/artifact-type-map.ts`
  - Rimuovere mapping `meta_ads: 'content'` quando `meta_ads` esce dai workflow supportati.

### 5) Normalizzazione output LLM

- [ ] `src/lib/llm/orchestrator.ts`
  - Rimuovere branch `workflowType === 'meta_ads'` in `normalizeOutput`.
  - Verificare fallback per contenuti storici non regressivo.

- [ ] `src/lib/llm/normalizers.ts`
  - Rimuovere schema/formatter Meta Ads (`metaAdsSchema`, `formatMetaAdsOutput`) se non usati altrove.

### 6) Presentation layer artifact storici

- [ ] `src/lib/artifact-preview.ts`
  - Decisione richiesta:
    - Opzione 1 (compatibilita): mantenere label `meta_ads: 'Meta Ads'` per storico.
    - Opzione 2 (hard remove): rimuovere label e usare fallback generic.

- [ ] `src/lib/artifact-card-identity.ts`
  - Decisione richiesta:
    - Opzione 1 (compatibilita): mantenere titolo dedicato Meta Ads per storico.
    - Opzione 2 (hard remove): rimuovere branch `input.workflowType === 'meta_ads'`.

### 7) Route/page tool legacy

- [ ] `src/app/tools/meta-ads/page.tsx`
  - Fase A: mantenere redirect (stato corrente).
  - Fase B: eliminare route page.

### 8) Test integration/unit

- [ ] `tests/integration/meta-ads-route.test.ts`
  - Fase A: aggiornare assert su endpoint deprecato (410/404).
  - Fase B: eliminare suite.

- [ ] `tests/unit/tool-prompts.test.ts`
- [ ] `tests/unit/loader.test.ts`
- [ ] `tests/unit/tool-prompts-parity.test.ts`
  - Aggiornare/ rimuovere casi Meta Ads.

- [ ] `tests/unit/llm-normalizers.test.ts`
- [ ] `tests/unit/llm-orchestrator-normalization.test.ts`
  - Aggiornare test se rimossi parser/formatter Meta Ads.

- [ ] `tests/unit/artifact-preview.test.ts`
- [ ] `tests/unit/artifact-card-identity.test.ts`
- [ ] `tests/integration/artifacts-client-page.test.tsx`
- [ ] `tests/integration/project-detail-page.test.tsx`
- [ ] `tests/unit/ArtifactsClientPage.test.tsx`
  - Aggiornare aspettative su label/titoli se cambia policy storico.

- [ ] `tests/unit/useStreamGeneration.test.ts`
  - Rimuovere riferimenti endpoint `/api/tools/meta-ads/generate`.

### 9) Documentazione (post-rimozione runtime)

- [x] `docs/specifications/api-specifications.md`
  - Rimossa sezione endpoint Meta Ads legacy e aggiunta nota as-is su runtime decommissioned.

- [x] `docs/blueprint.md`
- [x] `docs/progetto-overview.md`
- [x] `docs/implement-index.md`
- [x] `docs/README.md`
  - Rimosse note pending e riallineato stato finale tool framework.

---

## Validazione Minima

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`

Obiettivo: zero regressioni su funnel, nextland, extraction e su pagine artifact/dashboard.

---

## Decisioni Aperte (da chiudere prima della Fase B)

1. Policy storico: mantenere o no label/titoli Meta Ads negli artifact esistenti.
2. Codice risposta endpoint deprecato in Fase A: `410` vs `404`.
3. Destinazione prompt markdown Meta Ads: cancellazione completa vs archivio documentale.

---

## Checklist Esecutiva PR-by-PR

### PR-1 - Deprecazione endpoint runtime (Fase A)

- [ ] Branch: `fix/meta-ads-runtime-phase-a-deprecate-endpoint`
- [ ] Aggiornare `src/app/api/tools/meta-ads/generate/route.ts` con risposta esplicita deprecata (`410` oppure `404`) mantenendo envelope `{ error: { code, message } }`.
- [ ] Aggiornare `tests/integration/meta-ads-route.test.ts` per il nuovo comportamento endpoint deprecato.
- [ ] Verificare che non ci siano regressioni su `funnel_pages`, `nextland`, `extraction`.
- [ ] Eseguire validazione minima:
  - [ ] `npm run lint`
  - [ ] `npm run typecheck`
  - [ ] `npm run test`

### PR-2 - Rimozione runtime legacy e prompt layer (Fase B - Core)

- [ ] Branch: `fix/meta-ads-runtime-phase-b-remove-core`
- [ ] Eliminare route legacy `src/app/api/tools/meta-ads/generate/route.ts`.
- [ ] Rimuovere componenti Meta Ads dal prompt layer:
  - [ ] `src/lib/tool-prompts/meta-ads.ts`
  - [ ] `src/lib/tool-prompts/meta-ads-templates.ts`
  - [ ] aggiornamenti a `src/lib/tool-prompts/registry.ts`
  - [ ] aggiornamenti a `src/lib/tool-prompts/templates.ts`
- [ ] Chiudere decisione su `src/lib/tool-prompts/prompts/tools/meta_ads/prompt_generation.md` (delete o archivio docs).
- [ ] Aggiornare schemi/mapping coinvolti:
  - [ ] `src/lib/tool-routes/schemas.ts`
  - [ ] `src/lib/tool-routes/artifact-type-map.ts`
  - [ ] `src/lib/types/artifact.ts` (solo se compatibile con policy storico scelta)
- [ ] Aggiornare test unit/integration direttamente impattati.
- [ ] Eseguire validazione minima completa:
  - [ ] `npm run lint`
  - [ ] `npm run typecheck`
  - [ ] `npm run test`
  - [ ] `npm run build`

### PR-3 - Normalizzazione output e storico artifact

- [ ] Branch: `fix/meta-ads-runtime-phase-b-historical-compat`
- [ ] Rimuovere branch Meta Ads in normalizzazione output:
  - [ ] `src/lib/llm/orchestrator.ts`
  - [ ] `src/lib/llm/normalizers.ts`
- [ ] Applicare decisione su storico UI:
  - [ ] `src/lib/artifact-preview.ts`
  - [ ] `src/lib/artifact-card-identity.ts`
- [ ] Aggiornare test di presentazione/storico:
  - [ ] `tests/unit/artifact-preview.test.ts`
  - [ ] `tests/unit/artifact-card-identity.test.ts`
  - [ ] test integration artifact/dashboard correlati
- [ ] Eseguire validazione minima:
  - [ ] `npm run lint`
  - [ ] `npm run typecheck`
  - [ ] `npm run test`

### PR-4 - Pulizia finale test e documentazione

- [ ] Branch: `docs/meta-ads-runtime-decommission-closure`
- [x] Rimuovere suite e riferimenti Meta Ads non piu pertinenti.
- [x] Allineare documentazione finale:
  - [x] `docs/specifications/api-specifications.md`
  - [x] `docs/blueprint.md`
  - [x] `docs/progetto-overview.md`
  - [x] `docs/implement-index.md`
  - [x] `docs/README.md`
- [x] Verificare assenza riferimenti runtime Meta Ads in docs attive, mantenendo eventuale storico solo in `docs/archive/`.
- [x] Eseguire validazione finale:
  - [ ] `npm run lint`
  - [x] `npm run typecheck`
  - [x] `npm run test`
  - [ ] `npm run build`

### Gate di chiusura decommission

- [x] Endpoint `/api/tools/meta-ads/generate` non raggiungibile in runtime.
- [x] Nessun import residuo di builder/template Meta Ads nel path runtime.
- [x] Tutte le pipeline tool standard (`funnel_pages`, `nextland`, `extraction`) verdi.
- [x] Storico artifact verificato secondo policy scelta (compatibilita).
- [x] Documentazione as-is aggiornata e coerente.

---

## Esito Decommission (as-is)

- Runtime Meta Ads rimosso: route API, route page, prompt builder e template runtime eliminati.
- Tool framework runtime attivo: `funnel_pages`, `nextland`, `extraction`.
- Compatibilita storica mantenuta per artifact con `workflowType: meta_ads` nelle viste artifact/dashboard.
