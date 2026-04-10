# Prompt Workspace

Questa cartella contiene la copia documentale dei prompt `.md`.

Sorgenti editabili:
- `src/lib/tool-prompts/prompts`

Runtime attuale:
- `src/lib/tool-prompts/templates.ts` (template statici tipizzati)

Uso consigliato:
- aggiornare prima i file in `src/lib/tool-prompts/prompts`
- mantenere allineato `src/lib/tool-prompts/templates.ts` ai prompt markdown
- mantenere questa cartella allineata come riferimento documentale

Standard output workflow tool (Meta Ads + Funnel Pages):
- output format unico: `markdown`
- non usare output JSON raw nei prompt runtime
- mantenere heading/sezioni coerenti con il contratto usato dalla UI



