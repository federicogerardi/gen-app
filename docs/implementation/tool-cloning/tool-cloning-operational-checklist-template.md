---
goal: Checklist operativa minima compilabile per mantenere allineamento con il pattern HLF durante la clonazione di un tool
version: 1.0
date_created: 2026-04-18
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, checklist, template, operations]
---

# Tool Cloning Operational Checklist Template

Usa questa checklist come guardrail operativo minimo durante implementazione e review.

Scopo: evitare deviazioni involontarie dal pattern HLF su route, prompt, upload/extraction, UX, recovery e test.

---

## Istruzioni d'Uso

- Compilala all'inizio del lavoro e aggiornala durante l'implementazione.
- Se un punto non si applica, marca `N/A` e scrivi una nota breve.
- Se un punto richiede una deviazione intenzionale, linka il blueprint tecnico o la decisione associata.

---

## 1. Planning

- [ ] Complexity questionnaire completato
- [ ] Tool tier dichiarato
- [ ] Reference implementation confermata
- [ ] Blueprint tecnico compilato
- [ ] Input, output e numero step confermati
- [ ] Non-goals dichiarati

---

## 2. Backend Route Guardrails

- [ ] `auth()` verificato prima di usare input utente
- [ ] Ownership check presente se la route legge/scrive risorse utente
- [ ] Validazione Zod eseguita prima della logica di business
- [ ] Rate limit eseguito prima della chiamata OpenRouter
- [ ] Errori mappati nel formato standard
- [ ] SSE contract coerente con gli endpoint tool esistenti
- [ ] Nessuna lettura filesystem runtime nel path route

---

## 3. Prompt Layer Guardrails

- [ ] Markdown sorgente salvato sotto `src/lib/tool-prompts/prompts/`
- [ ] Builder runtime tipizzato creato in `src/lib/tool-prompts/`
- [ ] Registry aggiornato con il nuovo tool
- [ ] Placeholder espliciti e stabili
- [ ] Nessun `fs.readFile` runtime nelle route o nel prompt builder
- [ ] Template statici separati se il tool ha piu step o prompt complessi

---

## 4. Upload / Extraction

- [ ] Flusso upload coerente con HLF se il tool usa file input
- [ ] Estrazione riusa pattern esistente dove possibile
- [ ] Mapping dei campi estratti verificato
- [ ] Stato UI per upload ed extraction coperto
- [ ] Errori di extraction mostrati in modo esplicito

---

## 5. Frontend e UX Parity

- [ ] Page structure allineata al framework grafico del progetto
- [ ] State machine UI definita e completa
- [ ] Copy dei CTA coerente con lo step corrente
- [ ] Loading, disabled state e feedback utente gestiti
- [ ] Focus management e keyboard accessibility verificati
- [ ] Responsive mobile verificato sui breakpoint rilevanti
- [ ] Nessuna deviazione UX non documentata

---

## 6. Recovery, Retry e Quota

- [ ] Resume/checkpoint implementato se richiesto
- [ ] Retry con backoff implementato se richiesto
- [ ] Partial failure handling chiarito
- [ ] Quota per step o per run allineata alla specifica
- [ ] Messaggi errore coerenti con la capability disponibile

---

## 7. Testing Minimo

- [ ] Integration test per unauthorized
- [ ] Integration test per validation error
- [ ] Integration test per rate limit
- [ ] Integration test happy path SSE
- [ ] Unit test per prompt builder
- [ ] Test per step sequencing se multi-step
- [ ] E2E workflow principale coperto
- [ ] Test accessibilita o UX parity aggiunti se il tool e complesso

---

## 8. Pre-PR Gate

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run test:e2e` se applicabile
- [ ] Nessun TODO introdotto senza issue collegata
- [ ] Conformity checklist finale completata

---

## 9. Note / Deviazioni Intenzionali

| Area | Deviazione | Motivazione | Approvata da |
|------|------------|-------------|--------------|
| [area] | [delta] | [perche] | [nome] |
| [area] | [delta] | [perche] | [nome] |

---

## 10. Sign-Off

| Ruolo | Nome | Stato |
|------|------|-------|
| Developer | [nome] | [ready/not ready] |
| Reviewer | [nome] | [ready/not ready] |
| Product / Design | [nome] | [ready/not ready] |

La checklist e considerata valida solo se i punti critici sono chiusi o marcati `N/A` con motivazione.