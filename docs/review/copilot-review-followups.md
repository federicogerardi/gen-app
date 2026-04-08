# Copilot Review Follow-ups (PR #1)

Data: 2026-04-08
PR: https://github.com/federicogerardi/gen-app/pull/1

## Stato

- Bloccanti risolti: duplicate input encoding e propagazione effettiva del tone nei prompt tool.
- Test e build locali: verdi dopo le fix bloccanti.
- Questo file elenca solo miglioramenti residui non bloccanti.

## Suggerimenti Non Bloccanti

### 1) Typing React piu robusto su Admin drawer
File: `src/app/admin/AdminClientPage.tsx`

Contesto:
- `handleDrawerKeyDown` usa `React.KeyboardEvent<HTMLElement>`.
- Con alcune configurazioni TS (`react-jsx`) puo essere piu robusto importare esplicitamente il tipo.

Miglioramento suggerito:
- Usare `import type { KeyboardEvent } from 'react'` e tipizzare il parametro con `KeyboardEvent<HTMLElement>`.

Impatto:
- Qualita type-safety e compatibilita configurazioni TS.

### 2) Allineamento documentazione endpoint artifacts
File: `docs/api-specifications.md`

Contesto:
- Il documento indica `GET /artifacts` come non implementato.
- Nel codice esiste gia endpoint con filtri/paginazione base.

Miglioramento suggerito:
- Aggiornare lo stato a implementato.
- Se ci sono gap, esplicitarli come limiti residui (non come endpoint assente).

Impatto:
- Coerenza tra documentazione e stato reale del backend.

### 3) Allineamento blueprint pagina artifact detail
File: `docs/blueprint.md`

Contesto:
- La pagina `/artifacts/[id]` e descritta come edit.
- Il comportamento attuale e read-only (editor rimosso).

Miglioramento suggerito:
- Rinominare in "Artifact detail (read-only)".

Impatto:
- Coerenza UX/architettura e riduzione ambiguita per team.

### 4) Refuso naming in test unitario
File: `tests/unit/artifact-preview.test.ts`

Contesto:
- Nome test con refuso: "estrare preview...".

Miglioramento suggerito:
- Correggere in "estrarre" o "estrae" per leggibilita.

Impatto:
- Migliore chiarezza della suite test.

## Priorita Operativa Consigliata

1. Aggiornamenti docs (`api-specifications.md`, `blueprint.md`).
2. Typing improvement in `AdminClientPage.tsx`.
3. Piccolo polish test naming.

## Note

- Le osservazioni sopra non bloccano il merge funzionale della PR.
- Possono essere gestite in un commit di cleanup post-merge o in una mini PR dedicata.
