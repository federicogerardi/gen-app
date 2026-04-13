# Plan: Refactor 3 file grandi — split per responsabilità

**TL;DR**: I tre file hanno accumulato codice dopo iterazioni successive. Il refactor li divide in moduli più piccoli senza alcun cambiamento comportamentale o API. `templates.ts` da ~1100 righe scende a ~15; `orchestrator.ts` da ~420 a ~120; `page.tsx` perde ~35 righe di codice duplicato.

---

## Phase A — `templates.ts` split
*A1–A3 parallele; A4 dipende da A1–A3*

1. **A1** Crea `src/lib/tool-prompts/meta-ads-templates.ts` — esporta la stringa del template meta-ads
2. **A2** Crea `src/lib/tool-prompts/extraction-templates.ts` — esporta la stringa del template extraction
3. **A3** Crea `src/lib/tool-prompts/funnel-templates.ts` — esporta i 3 template funnel (`optin`, `quiz`, `vsl`, ~350 righe ciascuno — il grosso del file)
4. **A4** Riduce `src/lib/tool-prompts/templates.ts` ad aggregatore (~15 righe): importa da A1/A2/A3, ricostruisce `PROMPT_TEMPLATES`. Tipo esportato invariato: `Record<ToolPromptPath, string>`

---

## Phase B — `orchestrator.ts` split
*Parallela con Phase A*

5. **B1** Crea `src/lib/llm/normalizers.ts` — sposta **tutti** gli helper privati (ora esportati per testabilità):
   - Schemi Zod: `metaAdsVariantSchema`, `metaAdsSchema`, `funnelOptinVariantSchema`, `funnelOptinSchema`, `funnelQuizSchema`
   - Helpers stringa: `normalizeWhitespace`, `normalizeMarkdownWhitespace`, `stripCodeFence`, `looksLikeJson`, `tryParseJson`
   - Formatter: `toReadableJsonFallback`, `formatMetaAdsOutput`, `formatFunnelOptinOutput`, `formatFunnelQuizOutput`, `formatExtractionOutput`
   - Utils input: `extractWorkflowTypeFromInput`
6. **B2** Aggiorna `src/lib/llm/orchestrator.ts` — rimuove i simboli spostati, aggiunge `import` da `./normalizers`. Classe pubblica `LLMOrchestrator` e interfacce (`ArtifactRequest`, `NormalizedArtifactContent`, ecc.) invariate

---

## Phase C — `page.tsx` dedup
*Dipende da nessun'altra phase*

7. **C1** Appende a `src/lib/tool-prompts/funnel-extraction-field-map.ts`: costante `EXTRACTION_SECTION_KEYS` + funzione `normalizeExtractedFields()` — ⚠️ il file **non deve** acquisire `server-only` (già importato da `page.tsx` client component)
8. **C2** Aggiorna `src/app/tools/funnel-pages/page.tsx` — rimuove le definizioni locali (~35 righe), aggiunge `import` da `funnel-extraction-field-map`
9. **C3** Aggiorna `src/app/api/tools/funnel-pages/generate/route.ts` (collaterale non in scope dichiarato, ma necessario per eliminare la duplicazione) — stesso removal + import

---

## Phase D — Tests
*Dipende da B1 e C1*

10. **D1** Crea `tests/unit/llm-normalizers.test.ts` — testa le funzioni ora esportate da `normalizers.ts`:
    - `tryParseJson`: JSON valido, JSON con code-fence, trailing comma repair, slice recovery, null su input non parseable
    - `stripCodeFence`: rimuove fence, passthrough su testo plain
    - `formatMetaAdsOutput`: schema valido → stringa, schema invalido → null
    - `formatFunnelOptinOutput`: varianti + winner → stringa
    - `formatFunnelQuizOutput`: domande + categorie + segmenti
    - `formatExtractionOutput`: fields + missingFields → markdown
11. **D2** Crea `tests/unit/funnel-extraction-field-map.test.ts` — testa `normalizeExtractedFields`:
    - input flat: passthrough
    - input wrappato in `fields`: unwrap
    - chiavi nested in sezione: hoist al livello root
    - chiave root già presente: non sovrascrivere

---

## File rilevanti

| Path | Azione | Δ righe |
|------|--------|---------|
| `src/lib/tool-prompts/templates.ts` | diventa aggregatore | −1085 |
| `src/lib/tool-prompts/meta-ads-templates.ts` | NUOVO | +~45 |
| `src/lib/tool-prompts/extraction-templates.ts` | NUOVO | +~25 |
| `src/lib/tool-prompts/funnel-templates.ts` | NUOVO | +~1070 |
| `src/lib/llm/orchestrator.ts` | rimuove helpers | −~280 |
| `src/lib/llm/normalizers.ts` | NUOVO | +~280 |
| `src/lib/tool-prompts/funnel-extraction-field-map.ts` | append | +~35 |
| `src/app/tools/funnel-pages/page.tsx` | rimuove dupe | −~35 |
| `src/app/api/tools/funnel-pages/generate/route.ts` | rimuove dupe (collaterale) | −~35 |
| `tests/unit/llm-normalizers.test.ts` | NUOVO | +~100 |
| `tests/unit/funnel-extraction-field-map.test.ts` | NUOVO | +~50 |

---

## Verification

1. `npm run typecheck` — zero errori
2. `npm run test` — tutti i test esistenti passano + nuovi test passano
3. `npm run build` — build OK, nessun warning Turbopack su fs-tracing

---

## Decisioni e vincoli

- Nessun cambiamento comportamentale — riorganizzazione pura a livello di file
- Le funzioni in `normalizers.ts` diventano `export` per consentire test diretti (precedentemente private al modulo)
- `funnel-extraction-field-map.ts` **non deve** ricevere `import 'server-only'`
- `route.ts` è modificato come collaterale necessario per la Phase C; la modifica è triviale (add import + delete dupe)
- `parseJsonFromLLMOutput` rimane in `page.tsx` — funzione client-specific, non vale la pena estrarre
