# Prompt Workspace

Questa cartella contiene la copia documentale dei prompt `.md`.

Prompt archiviati in questa cartella:
- `native-login-credentials-google-oauth-implementation-prompt.md`

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

## Checklist operativa anti-drift

Usare questa checklist dopo ogni modifica ai prompt runtime o prima di una PR che tocca `src/lib/tool-prompts/**`.

1. Aggiorna i markdown sorgente in `src/lib/tool-prompts/prompts/**`.
2. Verifica coerenza runtime in `src/lib/tool-prompts/templates.ts` e nei file `*-templates.ts` coinvolti.
3. Esegui il test di parity:
	- `npm test -- --runTestsByPath tests/unit/tool-prompts-parity.test.ts`
4. Sincronizza la copia documentale in `docs/prompts/tools/**` solo dopo il passaggio parity verde.
5. Controlla i delta docs/runtime sul perimetro toccato con confronto diretto (`diff -q` o equivalente).
6. Se trovi divergenze intenzionali temporanee, annotale in un report review con:
	- scope file
	- motivazione
	- owner
	- data target di riallineamento
7. Prima del merge, conferma che `docs/prompts/tools/**` rappresenti lo stato as-is runtime.

Gate minimo consigliato per chiudere la checklist:
- parity test verde
- nessuna divergenza non tracciata tra `docs/prompts/tools/**` e `src/lib/tool-prompts/prompts/tools/**`

Standard output workflow tool (HotLead Funnel + NextLand):
- output format unico: `markdown`
- non usare output JSON raw nei prompt runtime
- mantenere heading/sezioni coerenti con il contratto usato dalla UI



