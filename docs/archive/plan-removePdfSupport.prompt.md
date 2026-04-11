# Plan: Rimozione supporto PDF dall'uploader

Rimozione chirurgica di `application/pdf` da tutti i layer — tipo, validazione, UI, dipendenza — senza toccare DOCX, TXT, MD.

---

**Fase 1 — Core library** `src/lib/document-parser.ts`
1. Togliere `'application/pdf'` da `SupportedMimeType` union type
2. Togliere `'application/pdf'` da array `ALLOWED_MIME_TYPES`
3. Eliminare funzione `ensurePdfNodePolyfills()`
4. Eliminare funzione `extractPdfText()`
5. Eliminare ramo `if (mimeType === 'application/pdf')` in `parseDocument()`
6. Aggiornare JSDoc: "Supports: DOCX, TXT, MD."

**Fase 2 — Frontend** `src/app/tools/funnel-pages/page.tsx` *(parallela con Fase 3)*
7. Togliere `'application/pdf'` dall'array `ALLOWED_MIME_TYPES` locale
8. Togliere `'.pdf'` da `ALLOWED_EXTENSIONS`
9. Aggiornare `accept` dell'input file: togliere `.pdf,application/pdf,`
10. Aggiornare testo UI: "Formati supportati: DOCX, TXT, Markdown."

**Fase 3 — Dipendenza** `package.json` *(parallela con Fase 2)*
11. Rimuovere `"pdfjs-dist"` da dependencies

**Fase 4 — Test unit** *(dipende da Fase 1)*
12. Eliminare `tests/unit/document-parser.test.ts` — file creato interamente per PDF, non ha più ragione di esistere

**Fase 5 — Test integration** *(dipende da Fase 1)*
13. In `tests/integration/funnel-pages-upload-route.test.ts`:
    - Togliere `'application/pdf'` dall'array `ALLOWED_MIME_TYPES` nel mock
    - Eliminare il test case *"returns 200 for a valid PDF upload"*
    - Verificare se il test *"returns 415 when declared mime type does not match detected content"* usa PDF come fixture e aggiornarlo

---

**File NON toccati**
- `src/app/api/tools/funnel-pages/upload/route.ts` — usa `ALLOWED_MIME_TYPES` da lib, nessuna ref PDF diretta
- `src/lib/tool-prompts/funnel-templates.ts` e `funnel-extraction-field-map.ts` — "PDF" in quei file si riferisce al *formato del contenuto promesso* (VSL, PDF, Case Study…), non al file uploader
- `next.config.ts`, `jest.config.js` — puliti

---

**Verifica**
1. `npm run typecheck` — 0 errori TS
2. `npx jest` — suite verde, nessun caso PDF rimasto
3. `npm run build` — build pulita senza pdfjs-dist nel bundle

---

**Decisioni**
- I riferimenti "PDF" in `funnel-templates.ts` / `funnel-extraction-field-map.ts` sono volutamente esclusi: riguardano il concetto di formato di lead magnet, non il parsing file.
- `pdfjs-dist` viene rimossa perché è l'unica dipendenza che causava il bug worker, e con PDF non più supportato non ha più motivo di essere in produzione.
