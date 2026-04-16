---
goal: Aggiungere azioni Copy Text e Download MD/DOCX nella pagina dettaglio artefatto
version: 1.0
date_created: 2026-04-16
last_updated: 2026-04-16
owner: Product Engineering
status: Planned
tags: [feature, artifacts, export, ux]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Questo piano definisce in modo deterministico le modifiche necessarie per introdurre nella pagina dettaglio artefatto tre azioni utente: copia testo negli appunti, download in formato Markdown e download in formato DOCX, mantenendo il comportamento attuale di rendering e sicurezza.

## 1. Requirements & Constraints

- **REQ-001**: La pagina dettaglio artefatto deve esporre un controllo per copiare il testo completo dell output visualizzato.
- **REQ-002**: La pagina dettaglio artefatto deve esporre un controllo per scaricare il contenuto in file `.md`.
- **REQ-003**: La pagina dettaglio artefatto deve esporre un controllo per scaricare il contenuto in file `.docx`.
- **REQ-004**: Le azioni devono usare il contenuto già normalizzato da `formatArtifactContentForDisplay` per garantire coerenza tra vista e export.
- **REQ-005**: I nomi file scaricati devono essere deterministici e includere id artefatto e timestamp ISO compatto.
- **SEC-001**: Nessuna nuova route API deve essere introdotta; le azioni devono operare lato client sui dati già autorizzati dal server component.
- **SEC-002**: Nessun dato sensibile addizionale deve essere serializzato nel payload client oltre a titolo e testo artefatto.
- **CON-001**: La pagina corrente `src/app/artifacts/[id]/page.tsx` è server component; funzionalità browser (`navigator.clipboard`, `Blob`, download link) richiedono un client component dedicato.
- **CON-002**: Le modifiche devono preservare il contratto UI esistente e non alterare flussi di ownership/auth già implementati.
- **GUD-001**: Riutilizzare dipendenze già presenti nel progetto (`docx`) senza introdurre nuove librerie.
- **PAT-001**: Isolare la logica di export in utility pure testabili in `src/lib` e mantenere la view logic minimale.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Definire il layer di export testabile (naming file, contenuto Markdown, conversione DOCX) senza impatti UI.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-001 | Creare `src/lib/artifact-export.ts` con funzione `buildArtifactExportFileName(params)` che produce file name deterministico: `artifact-{artifactId}-{yyyyMMdd-HHmmss}` sanitizzato ASCII. |  |  |
| TASK-002 | Implementare in `src/lib/artifact-export.ts` la funzione `buildArtifactMarkdownDocument(params)` che restituisce stringa Markdown completa con front header minimale (titolo, tipo, modello, stato, date) e corpo `readableOutput.text`. |  |  |
| TASK-003 | Implementare in `src/lib/artifact-export.ts` la funzione async `buildArtifactDocxBlob(params)` usando `docx` (`Document`, `Packer`) per convertire lo stesso contenuto markdown-normalizzato in blob DOCX. |  |  |
| TASK-004 | Creare `tests/unit/artifact-export.test.ts` con copertura su naming deterministico, contenuto markdown e validazione base blob DOCX non vuoto. |  |  |

**Completion Criteria Phase 1**
- CC-001: `src/lib/artifact-export.ts` esporta esattamente 3 funzioni pubbliche (`buildArtifactExportFileName`, `buildArtifactMarkdownDocument`, `buildArtifactDocxBlob`).
- CC-002: `tests/unit/artifact-export.test.ts` passa con almeno 1 test per ciascuna funzione pubblica.

### Implementation Phase 2

- **GOAL-002**: Integrare le azioni utente nella pagina dettaglio artefatto tramite client component accessibile.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-005 | Creare `src/app/artifacts/[id]/ArtifactExportActions.tsx` (client component) con props tipizzate: `artifactId`, `title`, `typeLabel`, `model`, `statusLabel`, `createdAt`, `completedAt`, `contentText`. |  |  |
| TASK-006 | Implementare in `ArtifactExportActions.tsx` handler `handleCopyText` con `navigator.clipboard.writeText(contentText)` e fallback `document.execCommand('copy')` su textarea temporanea per browser non compatibili. |  |  |
| TASK-007 | Implementare in `ArtifactExportActions.tsx` handler `handleDownloadMarkdown` che genera blob `text/markdown;charset=utf-8`, crea anchor temporaneo e forza download con nome da `buildArtifactExportFileName`. |  |  |
| TASK-008 | Implementare in `ArtifactExportActions.tsx` handler async `handleDownloadDocx` che usa `buildArtifactDocxBlob` e forza download `.docx`; aggiungere stato locale `isDocxExporting` per disabilitare il bottone durante generazione. |  |  |
| TASK-009 | Integrare `ArtifactExportActions` in `src/app/artifacts/[id]/page.tsx` nel blocco azioni header vicino a relaunch/project buttons, passando dati derivati da `artifact` e `readableOutput`. |  |  |
| TASK-010 | Definire etichette accessibili stabili: `Copia testo`, `Scarica MD`, `Scarica DOCX`; aggiungere `aria-live="polite"` per feedback esito copia/export. |  |  |

**Completion Criteria Phase 2**
- CC-003: La pagina `src/app/artifacts/[id]/page.tsx` mostra 3 nuovi pulsanti azione in desktop e mobile senza regressioni layout.
- CC-004: Le azioni copy/md/docx funzionano lato browser senza nuove chiamate API.

### Implementation Phase 3

- **GOAL-003**: Garantire qualità, non regressione e validazione end-to-end del comportamento introdotto.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-011 | Creare `tests/integration/artifact-detail-page.test.tsx` per verificare rendering dei nuovi controlli nella pagina `src/app/artifacts/[id]/page.tsx` con sessione valida e ownership corretta. |  |  |
| TASK-012 | Creare `tests/unit/artifact-export-actions.test.tsx` con mock `navigator.clipboard`, `URL.createObjectURL`, `URL.revokeObjectURL`, click su anchor e assert su nomi file `.md` e `.docx`. |  |  |
| TASK-013 | Eseguire `npm run test`, `npm run lint`, `npm run typecheck`; registrare esito in appendice del piano o PR summary. |  |  |
| TASK-014 | Verificare manualmente su viewport mobile e desktop: copy, download md, download docx, disabled state durante export docx. |  |  |

**Completion Criteria Phase 3**
- CC-005: Test unit/integration nuovi e preesistenti passano in locale.
- CC-006: Nessuna regressione su auth/ownership della pagina dettaglio artefatto.

## 3. Alternatives

- **ALT-001**: Implementare export DOCX su endpoint server dedicato. Non scelto perche aumenta superficie API e non necessario con dati gia disponibili nel client.
- **ALT-002**: Generare solo export Markdown e rinviare DOCX. Non scelto perche il requisito utente richiede entrambi i formati nella stessa iterazione.
- **ALT-003**: Copiare HTML renderizzato invece del testo normalizzato. Non scelto perche introduce output non deterministico e dipendente dal renderer.

## 4. Dependencies

- **DEP-001**: `docx` gia presente in `package.json` per generazione file `.docx`.
- **DEP-002**: Componenti UI esistenti `Button` e layout della pagina dettaglio.
- **DEP-003**: Utility `formatArtifactContentForDisplay` in `src/lib/artifact-preview.ts` come sorgente testo canonico.

## 5. Files

- **FILE-001**: `src/app/artifacts/[id]/page.tsx` - integrazione del nuovo client component azioni export.
- **FILE-002**: `src/app/artifacts/[id]/ArtifactExportActions.tsx` - nuova UI client con handler copy/download.
- **FILE-003**: `src/lib/artifact-export.ts` - utility pure per naming, markdown e blob docx.
- **FILE-004**: `tests/unit/artifact-export.test.ts` - test unit utility export.
- **FILE-005**: `tests/unit/artifact-export-actions.test.tsx` - test unit handlers copy/download.
- **FILE-006**: `tests/integration/artifact-detail-page.test.tsx` - test integrazione rendering controlli nella pagina dettaglio.

## 6. Testing

- **TEST-001**: Verificare che `buildArtifactExportFileName` produca slug stabile per id con caratteri non validi.
- **TEST-002**: Verificare che `buildArtifactMarkdownDocument` includa metadati principali e testo completo artefatto.
- **TEST-003**: Verificare che `buildArtifactDocxBlob` produca blob con mime DOCX e size maggiore di zero.
- **TEST-004**: Verificare click su `Copia testo` con successo clipboard e fallback attivo quando clipboard non disponibile.
- **TEST-005**: Verificare click su `Scarica MD` con estensione `.md`, mime corretto e revoca object URL.
- **TEST-006**: Verificare click su `Scarica DOCX` con estensione `.docx`, stato loading e disabilitazione pulsante durante export.
- **TEST-007**: Verificare presenza dei tre controlli nella pagina dettaglio con sessione autenticata e ownership valida.

## 7. Risks & Assumptions

- **RISK-001**: Compatibilita clipboard variabile tra browser e contesti non sicuri (http non localhost).
- **RISK-002**: Conversione markdown-to-docx semplificata puo perdere alcune sfumature di formattazione avanzata.
- **RISK-003**: Regressioni layout nel gruppo azioni header su viewport piccoli.
- **ASSUMPTION-001**: Il requisito "download in docs" corrisponde a download file `.docx`.
- **ASSUMPTION-002**: Il contenuto esportato deve riflettere il testo mostrato in pagina, non il payload raw originale del modello.

## 8. Related Specifications / Further Reading

- docs/adrs/002-streaming-vs-batch-responses.md
- docs/adrs/001-modular-llm-controller-architecture.md
- docs/implement-index.md