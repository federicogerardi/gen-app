# Funnel Tool Flow Rationalization Plan

Versione: 1.4  
Data: 2026-04-16  
Ambito: UX + GUI + flow operativo del tool HotLead Funnel  
Stato: Completato

---

## Obiettivo

Razionalizzare la scansione del tool HotLead Funnel per ridurre frizione, ambiguita delle CTA e click ridondanti nei percorsi:

- nuova generazione
- ripresa da checkpoint
- rigenerazione da pagina dettaglio artefatto

Obiettivo operativo: arrivare a job in esecuzione con il minor numero di azioni e con una sola CTA primaria coerente con lo stato.

---

## Problemi as-is (input utente)

1. Le azioni realmente obbligatorie (progetto + upload file) non sono il primo focus del flusso.
2. Parametri secondari (modello, tipo voce) hanno peso visivo e cognitivo eccessivo.
3. CTA introdotte in tempi diversi (es. riprendi checkpoint) non seguono una gerarchia unica.
4. Il percorso da dettaglio artefatto verso rigenerazione richiede click superflui nel form.
5. L'intent utente non viene interpretato automaticamente in modo consistente tra entry point.

---

## Gap tecnici as-is verificati (codebase)

1. Upload bloccato anche dal modello.
- Situazione corrente: il caricamento file richiede sia progetto che modello.
- Delta richiesto: upload abilitato con solo progetto selezionato.

2. CTA recovery concorrenti nel form funnel.
- Situazione corrente: possono comparire in parallelo CTA di recovery e CTA di rilancio.
- Delta richiesto: action panel unico con una sola primaria per stato.

3. Intent da dettaglio artefatto non risolto in state machine esplicita.
- Situazione corrente: esiste prefill da storico, ma la risoluzione intent non e centralizzata.
- Delta richiesto: resolver unico `intent -> uiState -> CTA`.

---

## JTBD

Quando devo creare o rilanciare rapidamente un funnel per un progetto, voglio trovare subito le azioni obbligatorie, entrare nel percorso corretto senza pulsanti ambigui e avviare il job senza passaggi ripetitivi, cosi posso produrre output utili in pochi minuti.

---

## Principi UX vincolanti

1. Required-first
- Progetto e upload file sono sempre la prima sezione visuale e comportamentale.

2. One-primary-action
- In ogni stato esiste una sola CTA primaria.

3. Context-aware intent
- L'interfaccia interpreta l'intent (`new`, `resume`, `regenerate`) in base alla provenienza e allo stato.

4. Zero redundant clicks
- Se i dati sono gia precompilati da artefatto, non devono esserci click di "riattivazione" nel form.

5. Progressive disclosure
- Opzioni avanzate (modello, tipo voce) restano secondarie e collassabili.

---

## Nuovo modello di flusso

### Entry point supportati

1. Tool HotLead Funnel (creazione nuova)
2. Pagina dettaglio artefatto (rigenera)
3. Pagina dettaglio artefatto o tool (riprendi da checkpoint)

### Ordine visivo obbligatorio nel form

1. Sezione A (primaria): Progetto + Upload
2. Sezione B (secondaria): Impostazioni avanzate (collapsible)
3. Sezione C (azioni): Action panel contestuale con CTA primaria unica

---

## State Machine UX (single source of truth)

| Stato | Condizione | CTA primaria | CTA secondaria |
|---|---|---|---|
| draft-empty | manca progetto o file | Completa dati obbligatori | Nessuna |
| draft-ready | required completi | Genera ora | Modifica avanzate |
| running | job in esecuzione | Vai al progresso job | Annulla job (se supportato) |
| paused-with-checkpoint | checkpoint valido disponibile | Riprendi dal checkpoint | Rigenera da zero |
| resume-needs-briefing | step recuperati ma manca extraction context riusabile | Carica nuovo briefing | Riprendi da checkpoint |
| failed-no-checkpoint | job fallito senza checkpoint | Rigenera da zero | Apri dettagli errore |
| completed | job completato | Apri artefatto | Rigenera variante |
| prefilled-regenerate | arrivo da artefatto con prefill valido | Rigenera ora | Modifica avanzate |

Regola: non mostrare due CTA primarie concorrenti nello stesso stato.

---

## Matrice decisionale UI (resolver deterministico)

Input minimi del resolver:

- `intent`: `new | resume | regenerate`
- `hasProject`: boolean
- `hasFile`: boolean
- `hasExtractionContext`: boolean
- `hasCheckpoint`: boolean
- `isRunning`: boolean

Output obbligatori:

- `uiState`
- `primaryAction`
- `secondaryActions[]`
- `autoAction` (opzionale)

Decision table:

| Caso | Input principale | Output |
|---|---|---|
| D-001 | `isRunning=true` | `uiState=running`, primaria = progresso |
| D-002 | `intent=regenerate` + `hasProject=true` + `hasExtractionContext=true` | `uiState=prefilled-regenerate`, primaria = rigenera ora |
| D-003 | `intent=resume` + `hasCheckpoint=true` | `uiState=paused-with-checkpoint`, primaria = riprendi |
| D-004 | `intent=resume` + step recuperati + `hasExtractionContext=false` | `uiState=resume-needs-briefing`, primaria = carica nuovo briefing |
| D-005 | `intent=resume` + `hasCheckpoint=false` + `hasExtractionContext=true` | fallback automatico a `prefilled-regenerate` |
| D-006 | `hasProject=true` + `hasFile=true` | `uiState=draft-ready`, primaria = genera ora |
| D-007 | altri casi | `uiState=draft-empty`, primaria = completa dati obbligatori |

Vincolo hard:

- Il resolver restituisce sempre una sola primaria; qualsiasi pulsante aggiuntivo resta secondario.

---

## Policy intent e prefill (eliminazione click inutili)

### Intent contract

Introdurre intent esplicito nel routing/payload view-model:

- `intent = new`
- `intent = resume`
- `intent = regenerate`

### Comportamento richiesto

1. Da dettaglio artefatto con "Rigenera"
- aprire form gia precompilato
- stato iniziale `prefilled-regenerate`
- CTA primaria immediata: `Rigenera ora`
- nessun ulteriore click "riprendi checkpoint" richiesto

2. Da dettaglio artefatto con "Riprendi"
- se checkpoint valido: entrare in `paused-with-checkpoint` e proporre subito `Riprendi dal checkpoint`
- se checkpoint assente/invalido: fallback automatico a `prefilled-regenerate`

3. Da tool in modalita nuova
- stato `draft-empty` fino a required completi

4. Da tool con step recuperati ma senza extraction context
- non proporre resume come primaria se manca il contesto minimo per rieseguire la chain
- mostrare stato `resume-needs-briefing`
- guidare l'utente a ricaricare il briefing come azione primaria

### Contratto UX del dettaglio artefatto (target PR-2)

Il dettaglio artefatto HotLead Funnel deve risolvere l'azione di rilancio prima del redirect al tool, evitando che l'utente debba dedurre nel form se il percorso corretto sia `resume` o `regenerate`.

| Situazione nel dettaglio artefatto | CTA primaria | CTA secondaria | Routing richiesto |
|---|---|---|---|
| checkpoint riusabile disponibile | Riprendi dal checkpoint | Rigenera variante | `/tools/funnel-pages?...&intent=resume&sourceArtifactId={id}` |
| checkpoint assente ma extraction context o prefill valido | Rigenera variante | Nessuna oppure Apri artefatto correlato | `/tools/funnel-pages?...&intent=regenerate&sourceArtifactId={id}` |
| artifact non rilanciabile o mapping assente | Nessuna CTA di rilancio | Nessuna | nessun redirect |

Vincoli operativi:

1. La CTA primaria nel dettaglio artefatto deve rappresentare il miglior next step effettivamente eseguibile.
2. Il tool HotLead Funnel, all'apertura, non deve richiedere un click intermedio per determinare l'intent.
3. La semantica delle CTA deve restare coerente tra dettaglio artefatto e storico/lista artefatti.

---

## Stato implementazione (aggiornamento 2026-04-16)

### Stato generale

- PR-1: completata
- PR-2: completata

### Completato in questa iterazione

1. Required-first applicato al tool Funnel.
- `project` e `upload` sono ora il primo blocco visivo della pagina.

2. Model gate rimosso dall'upload.
- Il file input non richiede piu la selezione preventiva del modello per essere utilizzato.

3. Impostazioni avanzate collassabili introdotte.
- `model` e `tone` sono stati spostati in un pannello secondario.

4. Action panel contestuale introdotto.
- La UI espone una sola CTA primaria tramite resolver di stato.

5. Resume hardening su caso limite.
- Se esistono step recuperati ma manca un `extractionContext` riusabile, la UI non resta in uno stato di resume bloccato: entra in `resume-needs-briefing` e propone `Carica nuovo briefing`.

6. E2E aggiornati sul nuovo contratto UX.
- Le attese che verificavano CTA recovery parallele sono state riallineate al nuovo principio di primaria unica.

7. Relaunch intent-aware avviato su artifact detail e storico.
- Il builder condiviso di relaunch ora supporta esplicitamente `resume` e `regenerate` per HotLead Funnel.
- Il dettaglio artefatto usa una primaria contestuale (`Riprendi dal checkpoint` oppure `Rigenera variante`) e una secondaria coerente quando disponibile.
- Lo storico artefatti riusa lo stesso builder per mantenere etichette e routing allineati.

8. Validazione completa eseguita con esito verde.
- `lint`, `typecheck` e `test` completati con esito positivo.
- Corretto un failure residuale su test integration della lista artefatti riallineando l'asserzione al fixture.
- Ridotto il rumore di output test tramite silenziamento controllato dei warning attesi nella suite `runtime-info`.

9. Intervento extra post-validazione: sostituzione selettore progetto con Dialog Picker.
- Motivazione: eliminare regressioni UX/layout osservate con nomi progetto molto lunghi nel controllo Select (overflow colonna e positioning non stabile del menu dopo selezione).
- Implementazione: il campo progetto usa ora un trigger button full-width con testo troncato e una modal di scelta progetto (Dialog) con elenco scrollabile e selezione diretta.
- Risultato: comportamento stabile su viewport desktop/mobile, nessun allargamento indesiderato della colonna upload e dropdown non piu soggetto al posizionamento anomalo.

10. Hardening accessibilita e stabilita build sul Dialog Picker.
- Corretto import runtime del Dialog su namespace Radix corretto (`@radix-ui/react-dialog`).
- Aggiunta `Dialog.Description` (screen-reader only) per rimuovere warning console legato a `aria-describedby` mancante su `DialogContent`.
- Rimossi log di debug temporanei introdotti durante troubleshooting layout/select.

11. Hardening micro-interazioni sul trigger progetto (post-chiusura piano).
- Aggiunto tooltip nativo in hover sul trigger progetto per mostrare il titolo completo quando il testo e troncato.
- Allineato feedback puntatore su tutti gli elementi cliccabili del picker (`cursor-pointer` su trigger, righe progetto e close dialog).
- Confermata coerenza visuale con layout invariato e nessuna regressione di overflow colonna.

### Aperto / da completare

1. Nessun blocco P0 aperto.
- PR-1 e PR-2 risultano completate con validazione tecnica in verde.

2. Hardening facoltativo post-merge.
- E2E dedicato sul percorso artifact-first con assert esplicito `resume` vs `regenerate` implementato in `tests/e2e/funnel-pages-retry-resume.spec.ts`.

3. Nessun hardening UX micro-interazione aperto.
- Tooltip e affordance puntatore risultano implementati e validati in frontend.

### File implementati finora

- `src/app/tools/funnel-pages/page.tsx`
- `tests/e2e/funnel-pages-retry-resume.spec.ts`
- `src/lib/artifact-relaunch.ts`
- `src/app/artifacts/[id]/page.tsx`
- `src/app/artifacts/ArtifactsClientPage.tsx`
- `tests/unit/artifact-relaunch.test.ts`
- `tests/integration/artifacts-client-page.test.tsx`
- `tests/unit/runtime-info.test.ts`

---

## Backlog implementativo (P0/P1/P2)

### P0 - Razionalizzazione core del flow (issue-ready)

#### FE

1. Aggiornare layout funnel required-first e separare pannello avanzate.
- File target: `src/app/tools/funnel-pages/page.tsx`

2. Rimuovere il blocco upload legato al modello.
- File target: `src/app/tools/funnel-pages/page.tsx`
- Esito richiesto: upload consentito con solo progetto selezionato.

3. Introdurre resolver UI centralizzato `deriveFunnelUiState`.
- File target: `src/app/tools/funnel-pages/page.tsx`
- Esito richiesto: stato e CTA derivati da matrice decisionale.

4. Introdurre action panel unico `resolvePrimaryAction`.
- File target: `src/app/tools/funnel-pages/page.tsx`
- Esito richiesto: una sola CTA primaria visibile per stato.

5. Gestire stato `prefilled-regenerate` all'ingresso pagina.
- File target: `src/app/tools/funnel-pages/page.tsx`

#### BE / App logic

1. Normalizzare intent nel link di rilancio da dettaglio artefatto.
- File target: `src/lib/artifact-relaunch.ts`
- Esito richiesto: query params coerenti con `intent`.

2. Allineare CTA di dettaglio artefatto al contract intent.
- File target: `src/app/artifacts/[id]/page.tsx`
- Esito richiesto: azione rigenera e/o riprendi coerente con stato checkpoint.

3. Esporre nel dettaglio artefatto una sola primaria orientata al next step migliore.
- File target: `src/app/artifacts/[id]/page.tsx`
- Esito richiesto: `Riprendi dal checkpoint` come primaria quando disponibile, altrimenti `Rigenera variante`.

4. Definire fallback deterministico `resume -> regenerate`.
- File target: `src/app/tools/funnel-pages/page.tsx`

#### QA

1. Consolidare test E2E per esclusivita CTA primaria.
- File target: `tests/e2e/funnel-pages-retry-resume.spec.ts`

2. Aggiungere scenario rigenera da dettaglio senza click intermedi.
- File target: `tests/e2e/funnel-pages-retry-resume.spec.ts`

3. Aggiornare smoke test UI su required-first (project/upload).
- File target: `tests/e2e/funnel-pages-retry-resume.spec.ts` o nuovo spec funnel dedicato.

### P1 - Chiarezza e resilienza UX

#### FE

1. Aggiungere banner contesto origine: "Stai rigenerando da artefatto X".
2. Uniformare microcopy stato job (running/paused/failed/completed).
3. Aggiungere hint inline su required mancanti per abilitare CTA.

#### BE / App logic

1. Telemetria su transizioni stato (`state_enter`, `primary_cta_click`).
2. Tracciamento intent sorgente (`from_tool`, `from_artifact_detail`).

#### QA

1. Test regressione accessibilita base su focus order e keyboard flow.
2. Test error-handling quando file/progetto diventano invalidi post-prefill.

### P2 - Ottimizzazione performance decisionale

#### FE

1. Salvataggio preferenze avanzate per progetto (modello/tipo voce default).
2. Suggerimento smart ultimo progetto usato, sempre modificabile.

#### BE / App logic

1. Endpoint/helper per recupero "last used config" per progetto/tool.
2. KPI snapshot per tempo avvio job e click-to-start.

#### QA

1. Benchmark UX pre/post su tempo medio avvio job.
2. Verifica coerenza defaults per progetto multi-sessione.

---

## Criteri di accettazione

1. Progetto e upload sono le prime azioni visibili e obbligatorie nel form.
2. Upload non e bloccato dalla selezione modello.
3. Modello e tipo voce non sono nel primo livello di scansione visiva.
4. Ogni stato espone una sola CTA primaria.
5. Da dettaglio artefatto, "Rigenera" apre un flusso pronto all'azione senza click ridondanti.
6. Se checkpoint valido, "Riprendi" e proposta primaria coerente; se non valido scatta fallback automatico a rigenera.
7. Riduzione minima del 30% nei click medi da ingresso flow a job running nei percorsi di rilancio.

---

## Piano test QA (minimo)

1. E2E nuovo flusso.
- selezione progetto + upload -> generate -> running

2. E2E rigenera da artefatto.
- click rigenera in dettaglio -> form precompilato -> rigenera ora senza step intermedi

3. E2E resume checkpoint.
- checkpoint valido -> resume diretto
- checkpoint invalido -> fallback rigenera

4. UI state contract.
- per ogni stato della macchina: una sola CTA primaria verificata via selector e testo

5. Accessibility smoke.
- tab order coerente: sezione required -> avanzate -> action panel
- focus visibile su CTA primaria

6. Regressione upload gate.
- assenza blocco upload per modello mancante

---

## KPI di successo

1. Time to Job Start (p50/p90)
2. Click to Start (nuovo vs rigenera vs resume)
3. Resume success rate
4. Regenerate completion rate
5. Drop-off rate nel form Funnel

KPI anti-regressione:

1. Sessioni con piu di una CTA primaria visibile: target 0%
2. Sessioni rigenera da artefatto con click extra non necessari: target <5%
3. Upload bloccati da campi non required: target 0%

---

## Rollout consigliato

1. Feature flag su nuova state machine CTA.
2. Rollout interno progressivo (team marketing interno).
3. Confronto metriche 7 giorni pre/post.
4. Promozione a default dopo stabilita KPI e assenza regressioni QA.

Gate obbligatori pre-default:

1. Nessuna regressione sui flussi resume checkpoint.
2. Riduzione click-to-start >= 30% su percorsi relaunch.
3. Esito smoke accessibility senza blocchi critici.

---

## Backlog issue-ready (copia/incolla GitHub)

### Issue UX-FNL-01 - Project-first upload e rimozione model gate

Titolo suggerito:

- fix(ui): make funnel upload project-first and remove model gate

Summary:

- portare progetto e upload come primo blocco obbligatorio del tool Funnel
- rimuovere il vincolo che blocca l'upload quando il modello non e ancora stato selezionato manualmente
- spostare modello e tono in impostazioni avanzate collassabili

File target:

- `src/app/tools/funnel-pages/page.tsx`

Acceptance Criteria:

- l'upload e abilitato quando il progetto e selezionato, anche se il modello non e stato toccato manualmente
- progetto e upload sono il primo blocco visivo del form
- modello e tono non compaiono come step primario nella scansione iniziale
- i messaggi inline non indicano piu il modello come prerequisito per il caricamento file

Test Plan:

- E2E: progetto selezionato + upload file senza interazione sul modello
- smoke UI: pannello avanzate collassato di default
- regressione: generazione funnel continua a usare il modello risolto dal form/default

Out of Scope:

- cambi al contratto API di generazione funnel
- persistenza di preferenze per progetto

### Issue UX-FNL-02 - Resolver unico per stato UI e CTA primaria

Titolo suggerito:

- refactor(ui): centralize funnel action state and primary CTA resolution

Summary:

- introdurre un resolver unico `intent -> uiState -> primaryAction`
- sostituire i pulsanti sparsi con un action panel contestuale
- garantire una sola CTA primaria per stato

File target:

- `src/app/tools/funnel-pages/page.tsx`

Acceptance Criteria:

- gli stati `draft-empty`, `draft-ready`, `running`, `paused-with-checkpoint`, `failed-no-checkpoint`, `prefilled-regenerate` sono derivati centralmente
- in ogni stato e visibile una sola CTA primaria
- `Riprendi da checkpoint`, `Riprova estrazione`, `Rigenera funnel`, `Nuova generazione` non competono piu nello stesso livello gerarchico
- la CTA primaria cambia in base allo stato senza logica duplicata nel render

Test Plan:

- E2E: verifica una sola CTA primaria visibile per ogni stato principale
- smoke UI: matrice stato -> CTA coerente
- regressione: il resume attuale continua a recuperare i checkpoint esistenti

Out of Scope:

- redesign completo della pagina
- rimozione del supporto retry/resume gia esistente

### Issue UX-FNL-03 - Relaunch intent-aware da dettaglio artefatto

Titolo suggerito:

- feat(ui): make artifact relaunch intent-aware for funnel regenerate and resume

Summary:

- introdurre intent esplicito nel rilancio da dettaglio artefatto
- distinguere semanticamente `regenerate` da `resume`
- far arrivare il tool Funnel gia nello stato corretto, senza click intermedi inutili

File target:

- `src/lib/artifact-relaunch.ts`
- `src/app/artifacts/[id]/page.tsx`
- `src/app/tools/funnel-pages/page.tsx`

Acceptance Criteria:

- il link di rilancio include `intent=regenerate` o `intent=resume` quando applicabile
- da dettaglio artefatto, `Rigenera variante` apre il tool con prefill e CTA primaria immediata `Rigenera ora`
- se il checkpoint e valido, il percorso resume porta a stato `paused-with-checkpoint`
- se il checkpoint non e valido ma esiste prefill sufficiente, scatta fallback automatico a rigenerazione
- non e richiesto un click aggiuntivo nel tool per attivare dati gia caricati

Test Plan:

- E2E: dettaglio artefatto -> rigenera -> tool precompilato -> CTA primaria pronta
- E2E: resume con checkpoint valido
- E2E: resume con checkpoint assente/invalido -> fallback a regenerate
- regressione routing: il relaunch di altri workflow non viene alterato

Out of Scope:

- nuovi endpoint backend
- nuovo schema DB per stato job

### Issue UX-FNL-04 - Copertura E2E su CTA primaria e flow no-click

Titolo suggerito:

- test(e2e): cover funnel primary-cta exclusivity and relaunch no-click flows

Summary:

- aggiornare la suite Playwright Funnel per riflettere la nuova logica di action panel
- coprire esclusivita CTA primaria e riduzione click nel percorso da artefatto

File target:

- `tests/e2e/funnel-pages-retry-resume.spec.ts`
- eventuale nuovo spec dedicato in `tests/e2e`

Acceptance Criteria:

- esiste copertura per nuovo flusso project-first
- esiste copertura per rigenera da artefatto senza click intermedi
- esiste copertura per resume con checkpoint valido
- esiste copertura per fallback `resume -> regenerate`
- le vecchie attese che verificano tre CTA recovery parallele vengono sostituite con attese coerenti con una sola primaria

Test Plan:

- Playwright end-to-end sui tre percorsi: nuovo, rigenera, resume
- smoke accessibility su tab order e focus della CTA primaria
- verifica che l'upload non dipenda dalla selezione manuale del modello

Out of Scope:

- performance testing
- test visivi snapshot completi della pagina

---

## Piano sprint in 2 PR

### PR-1 - Project-first form e CTA state resolver

Titolo PR suggerito:

- fix(ui): rationalize funnel form scan and primary action state

Scope:

- chiudere UX-FNL-01
- chiudere UX-FNL-02
- introdurre required-first layout
- rimuovere model gate dall'upload
- centralizzare risoluzione `uiState` e CTA primaria nel tool funnel
- aggiornare E2E minimi per esclusivita CTA e upload non bloccato dal modello

File target principali:

- `src/app/tools/funnel-pages/page.tsx`
- `tests/e2e/funnel-pages-retry-resume.spec.ts`

Rischi:

- regressione del flusso retry/resume gia introdotto
- mismatch tra stato derivato e phase legacy esistente
- rottura delle attese Playwright basate su CTA multiple attuali

Mitigazioni:

- mantenere inizialmente `phase` come sorgente tecnica e introdurre `uiState` come derivazione compatibile
- aggiornare test E2E nello stesso PR
- preservare i percorsi attuali di `handleRetryExtraction`, `handleResumeFromArtifacts`, `handleRunProcess`

Gate di merge:

- `npm test` PASS
- Playwright funnel retry/resume PASS con nuove attese
- nessuna CTA primaria duplicata negli stati coperti dal test
- upload funzionante con solo progetto selezionato

Out of Scope:

- intent-aware relaunch da dettaglio artefatto
- telemetria nuova

### PR-2 - Artifact relaunch intent-aware e hardening flow di rilancio

Titolo PR suggerito:

- feat(ui): streamline funnel artifact relaunch with intent-aware resume

Scope:

- chiudere UX-FNL-03
- chiudere UX-FNL-04
- introdurre `intent=regenerate|resume` nel relaunch href
- allineare CTA dal dettaglio artefatto al contract intent
- eliminare click intermedi nel percorso rigenera da artefatto
- coprire fallback automatico `resume -> regenerate`

File target principali:

- `src/lib/artifact-relaunch.ts`
- `src/app/artifacts/[id]/page.tsx`
- `src/app/tools/funnel-pages/page.tsx`
- `tests/e2e/funnel-pages-retry-resume.spec.ts`

Rischi:

- regressione sui relaunch href di altri workflow supportati
- prefill parziale che porta a stato ambiguo nel tool funnel
- resume semanticamente disponibile in UI ma senza checkpoint realmente utile

Mitigazioni:

- limitare il nuovo contract intent al workflow `funnel_pages`
- mantenere fallback esplicito a `prefilled-regenerate`
- introdurre assert E2E su percorso dettaglio artefatto -> tool

Gate di merge:

- `npm test` PASS
- test E2E su rigenera da artefatto PASS
- test E2E su resume valido e resume con fallback PASS
- relaunch degli altri workflow invariato o coperto da smoke dedicato

Out of Scope:

- persistenza defaults per progetto
- metriche prodotto avanzate oltre i log minimi

### Sequenza raccomandata

1. Merge PR-1 su `dev` e validazione interna del nuovo scanning project-first.
2. Merge PR-2 su `dev` dopo esito positivo dei test relaunch artifact-first.
3. Rollout progressivo protetto da feature flag se il resolver CTA viene introdotto in modo condizionale.

Stato attuale sequenza:

- Step 1: completato
- Step 2: completato
- Step 3: opzionale (feature flag non necessaria in questa iterazione)

---

## Deliverable di handoff

1. UX spec implementativa (questo documento)
2. Matrice stati-CTA per FE e QA
3. Contratto intent e fallback per BE
4. Piano test E2E e smoke accessibility

Documenti correlati:

- docs/ux/gui-refactor-plan.md
- docs/ux/ux-strategy.md
- docs/specifications/api-specifications.md