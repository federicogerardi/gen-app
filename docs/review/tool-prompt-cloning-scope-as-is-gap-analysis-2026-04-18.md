# Tool Prompt Cloning Scope: As-Is Gap Analysis (2026-04-18)

## Scope

Analisi del perimetro documentale `docs/prompts/tools/**` per identificare divergenze rispetto allo stato as-is runtime dei prompt dopo gli improvement su `dev`.

Perimetro file verificato:
- `docs/prompts/tools/hl_funnel/optin-generation-prompt-spec.md`
- `docs/prompts/tools/hl_funnel/quiz-generation-prompt-spec.md`
- `docs/prompts/tools/hl_funnel/vsl-generation-prompt-spec.md`
- `docs/prompts/tools/meta_ads/meta-ads-generation-prompt-spec.md`

## Fonte as-is (source of truth)

- Prompt runtime markdown: `src/lib/tool-prompts/prompts/tools/**`
- Runtime static templates: `src/lib/tool-prompts/templates.ts` + file tool-specific (`*-templates.ts`)
- Indicazione documentale ufficiale: `docs/prompts/README.md` (source of truth runtime in `src/lib/tool-prompts/prompts/**`)

## Executive Summary

- Stato finale: perimetro `docs/prompts/tools/**` riallineato al runtime as-is.
- I file precedentemente divergenti (HL Funnel optin/quiz/vsl) sono stati aggiornati sul contenuto operativo corrente.
- `meta_ads` risulta allineato e confermato.
- `meta_ads` risulta allineato a livello documentale, ma è **fuori dal perimetro runtime** da questa release (decommissionato da `TOOL_PROMPT_REGISTRY`/`templates.ts`). Mantenuto come reference storica/documentale.

## Gap Matrix

| File documentale | Runtime reference | Stato | Gap principali rilevati |
| --- | --- | --- | --- |
| `docs/prompts/tools/hl_funnel/optin-generation-prompt-spec.md` | `src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_optin_generator.md` | Allineato | Gap precedenti chiusi con aggiornamento alla versione runtime corrente |
| `docs/prompts/tools/hl_funnel/quiz-generation-prompt-spec.md` | `src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_quiz_generator.md` | Allineato | Gap precedenti chiusi con aggiornamento delle sezioni output richieste |
| `docs/prompts/tools/hl_funnel/vsl-generation-prompt-spec.md` | `src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_vsl_generator.md` | Allineato | Gap precedenti chiusi con update regole/quality checks runtime |
| `docs/prompts/tools/meta_ads/meta-ads-generation-prompt-spec.md` | `src/lib/tool-prompts/prompts/tools/meta_ads/prompt_generation.md` | Allineato | Nessun gap rilevato |
| `docs/prompts/tools/meta_ads/meta-ads-generation-prompt-spec.md` | `src/lib/tool-prompts/prompts/tools/meta_ads/prompt_generation.md` | **Historical — Out of runtime** | Meta Ads decommissionato in questa release: non incluso in `templates.ts` né nel registry runtime |

## Evidenze sintetiche

- Verifica scope completata su tutti i file in `docs/prompts/tools/**`.
- I marker temporanei di divergenza sono stati rimossi dopo il riallineamento contenutistico.
- Il riferimento operativo resta invariato: source of truth runtime in `src/lib/tool-prompts/prompts/tools/**`.

## Impatto residuo

1. Ridotto il rischio di usare regole prompt obsolete nella clonazione/adattamento tool.
2. Ridotto il rischio di mismatch tra review documentale e comportamento runtime.
3. Resta raccomandato controllo parity periodico per prevenire nuovo drift.

## Azioni applicate nei file

- Riallineamento dei prompt documentali HL Funnel al runtime corrente.
- Rimozione marker temporanei di divergenza usati in fase diagnostica.
- Conferma allineamento Meta Ads.

## Raccomandazione per mantenimento

1. Mantenere `docs/prompts/tools/**` allineato in batch dopo update runtime significativi.
2. Eseguire controllo parity periodico sul perimetro prompt tools.
3. Trattare `src/lib/tool-prompts/prompts/tools/**` come riferimento vincolante in caso di conflitto.

## Decision Status

- Analisi gap completata: SI
- Riallineamento formale contenuti: SI
- Stato sessione: CHIUSO (allineato as-is runtime)
