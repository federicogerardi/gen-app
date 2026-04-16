# Prompt Workspace

Questa cartella contiene la copia documentale dei prompt `.md`.

Sorgenti editabili:
- `src/lib/tool-prompts/prompts`

Runtime attuale:
- `src/lib/tool-prompts/templates.ts` (template statici tipizzati)

Parita e source of truth:
- source of truth runtime: `src/lib/tool-prompts/prompts/**`
- test di parity: `tests/unit/tool-prompts-parity.test.ts`
- questa cartella `docs/prompts/**` e una copia documentale e puo essere aggiornata in batch

Uso consigliato:
- aggiornare prima i file in `src/lib/tool-prompts/prompts`
- mantenere allineato `src/lib/tool-prompts/templates.ts` ai prompt markdown
- eseguire `npm test -- --runTestsByPath tests/unit/tool-prompts-parity.test.ts` dopo ogni modifica ai prompt
- mantenere questa cartella allineata come riferimento documentale

Standard output workflow tool (Meta Ads + HotLead Funnel):
- output format unico: `markdown`
- non usare output JSON raw nei prompt runtime
- mantenere heading/sezioni coerenti con il contratto usato dalla UI



