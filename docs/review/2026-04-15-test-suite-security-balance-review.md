# Code Review: Test Suite Security vs Delivery Balance
**Ready for Production**: No (for current test strategy ergonomics)
**Critical Issues**: 0

## Priority 1 (Must Fix) ⛔
- Nessuna vulnerabilita critica individuata nel perimetro analizzato.

## Priority 2 (High) ⚠️
- Eccessiva fragilita su test prompt e copy testuale, con alto rischio di blocchi non legati a sicurezza.
  - Evidenze:
    - `tool-prompts-parity` usa confronto byte-to-byte tra markdown sorgente e template runtime: [tests/unit/tool-prompts-parity.test.ts](../../tests/unit/tool-prompts-parity.test.ts#L25).
    - `tool-prompts` contiene molte asserzioni su stringhe letterali prompt: [tests/unit/tool-prompts.test.ts](../../tests/unit/tool-prompts.test.ts#L98), [tests/unit/tool-prompts.test.ts](../../tests/unit/tool-prompts.test.ts#L109), [tests/unit/tool-prompts.test.ts](../../tests/unit/tool-prompts.test.ts#L135), [tests/unit/tool-prompts.test.ts](../../tests/unit/tool-prompts.test.ts#L222).
    - Test UI legati a copy/version label rigida: [tests/unit/Navbar.test.tsx](../../tests/unit/Navbar.test.tsx#L80), [tests/unit/RuntimeInfoProvider.test.tsx](../../tests/unit/RuntimeInfoProvider.test.tsx#L26), [tests/unit/PersonalTrendCard.test.tsx](../../tests/unit/PersonalTrendCard.test.tsx#L21).
  - Impatto sicurezza:
    - Basso impatto diretto su OWASP A01/A03 e policy auth/rate limit.
    - Alto impatto su velocita di delivery (falsi negativi CI).

## Priority 3 (Medium) 📌
- Pipeline CI unica con gate duri su ogni PR (`lint`, `typecheck`, `test`, `build`): [ci.yml](../../.github/workflows/ci.yml#L46), [ci.yml](../../.github/workflows/ci.yml#L47), [ci.yml](../../.github/workflows/ci.yml#L48), [ci.yml](../../.github/workflows/ci.yml#L49).
- In progetto interno (decine di utenti, non pubblico), il costo di rigidita testuale e superiore al beneficio marginale di sicurezza ottenuto da assert copy-level.

## Sicurezza da mantenere invariata
- Test di autenticazione/ruoli/ownership/error-code API sono corretti e ad alto valore:
  - [tests/integration/admin-routes.test.ts](../../tests/integration/admin-routes.test.ts#L60)
  - [tests/integration/artifacts-id-route.test.ts](../../tests/integration/artifacts-id-route.test.ts#L64)
  - [tests/integration/artifacts-generate-route.test.ts](../../tests/integration/artifacts-generate-route.test.ts#L134)

## Recommended Changes
1. Ridurre la rigidita dei test prompt da copy exact a invarianti strutturali.
   - Conservare verifiche su clausole critiche di sicurezza/contratto (es. markdown-only/no code fences/JSON valido).
   - Evitare assert su frasi lunghe non critiche, sostituendo con marker stabili o sezioni obbligatorie.
2. Distinguere due profili test in CI:
   - Gate PR: sicurezza/API/contratti.
   - Gate notturno o pre-release: parity completa prompt e test copy-sensibili.
3. Nei test UI, preferire ruoli/aria/struttura semantica a stringhe letterali complete quando il copy non e requisito.

## Executive Assessment
La suite non appare overengineering sul perimetro sicurezza; lo e invece in aree copy-driven (prompt e UI). Il bilanciamento consigliato e mantenere rigido tutto cio che protegge access control, validazione, ownership, rate limiting e contratti API, mentre si rende meno rigida la verifica di testo descrittivo/UX e wording prompt non critico.

## Execution Update (2026-04-15)
- Stato: remediation iniziale completata su test fragili prompt/UI.
- Interventi applicati:
  - `tests/unit/tool-prompts-parity.test.ts`: parity da confronto esatto a confronto strutturale + guardrail lunghezza.
  - `tests/unit/tool-prompts.test.ts`: asserzioni copy-level selezionate convertite in invarianti token-based.
  - `tests/unit/Navbar.test.tsx`: asserzioni badge runtime convertite da frase completa a invarianti label/version + aria label parziale.
  - `tests/unit/RuntimeInfoProvider.test.tsx`: rimosso confronto testuale completo, mantenuta verifica combinata label/version.
  - `tests/unit/PersonalTrendCard.test.tsx`: enfasi su comportamento (`aria-pressed`, cambio periodo, metrica) invece di copy completo.
  - `tests/unit/ArtifactsClientPage.test.tsx`: verifica ordinamento mantenuta con match action-level e check id nell'accessibile name.
- Outcome atteso:
  - Riduzione falsi negativi CI su micro-varianti copy/format.
  - Nessuna regressione attesa sul perimetro sicurezza, invariato nei test integration.