# User Spend Visibility Refactor Plan

Versione: 1.0  
Data: 2026-04-12  
Area: GUI, contratti dati user-facing, admin visibility  
Stato: pianificato

---

## Obiettivo

Rimuovere ogni feedback economico dal perimetro user e centralizzare la visibilità della spesa esclusivamente nel perimetro admin.

Esito atteso:

- gli utenti role `user` vedono solo utilizzo generazioni e massimo disponibile
- gli utenti role `user` non vedono budget, spesa mensile, costo per generazione o percentuali economiche
- gli utenti role `admin` mantengono piena visibilità dei dati di spesa nelle superfici admin già presenti

---

## Decisione di prodotto confermata

Interpretazione confermata del requisito:

- "solo admin possono vedere il feedback di spesa in tutte le posizioni" significa centralizzare la spesa nel perimetro admin

Conseguenze operative:

- non basta nascondere il rendering lato UI user
- i payload API user-facing non devono più esporre campi economici quando non necessari
- il perimetro admin resta la sola area autorizzata a visualizzare budget, spesa aggregata e costo per evento/generazione

---

## Scope

### In scope

- dashboard utente
- lista artefatti utente
- dettaglio artefatto utente
- hook e tipi client collegati a quota e artefatti
- endpoint API user-facing che oggi restituiscono dati economici
- test unit e integration collegati ai contratti aggiornati
- documentazione funzionale e contrattuale impattata

### Out of scope

- modifiche allo schema Prisma
- cambi al modello di calcolo costo
- cambi ai controlli di budget lato guard backend
- rimozione dei dati economici dal perimetro admin
- redesign completo dell admin oltre al mantenimento della visibilità esistente

---

## Superfici coinvolte

### Perimetro user da rifattorizzare

- [src/app/dashboard/page.tsx](../../src/app/dashboard/page.tsx)
- [src/app/artifacts/ArtifactsClientPage.tsx](../../src/app/artifacts/ArtifactsClientPage.tsx)
- [src/app/artifacts/[id]/page.tsx](../../src/app/artifacts/%5Bid%5D/page.tsx)
- [src/components/hooks/useQuota.ts](../../src/components/hooks/useQuota.ts)
- [src/components/hooks/useArtifacts.ts](../../src/components/hooks/useArtifacts.ts)
- [src/app/api/users/quota/route.ts](../../src/app/api/users/quota/route.ts)
- [src/app/api/artifacts/route.ts](../../src/app/api/artifacts/route.ts)
- [src/app/api/artifacts/[id]/route.ts](../../src/app/api/artifacts/%5Bid%5D/route.ts)
- [src/app/api/projects/[id]/route.ts](../../src/app/api/projects/%5Bid%5D/route.ts)

### Perimetro admin da preservare

- [src/app/admin/page.tsx](../../src/app/admin/page.tsx)
- [src/app/admin/AdminClientPage.tsx](../../src/app/admin/AdminClientPage.tsx)
- [src/app/admin/AdminQuotaForm.tsx](../../src/app/admin/AdminQuotaForm.tsx)
- [src/app/api/admin/users/route.ts](../../src/app/api/admin/users/route.ts)
- [src/app/api/admin/users/[userId]/quota/route.ts](../../src/app/api/admin/users/%5BuserId%5D/quota/route.ts)
- [src/app/api/admin/metrics/route.ts](../../src/app/api/admin/metrics/route.ts)

---

## Stato attuale sintetico

### Leak economici nel perimetro user

1. Dashboard user
- [src/app/dashboard/page.tsx](../../src/app/dashboard/page.tsx) legge `monthlyBudget` e `monthlySpent` direttamente da query server-side su `db.user.findUnique`, mostra una card dedicata a budget speso e calcola `budgetPercent`.

2. Dettaglio artefatto user
- [src/app/artifacts/[id]/page.tsx](../../src/app/artifacts/%5Bid%5D/page.tsx) mostra il costo della singola generazione nella sidebar metadati.

3. Contratti API user-facing
- [src/app/api/users/quota/route.ts](../../src/app/api/users/quota/route.ts) restituisce `monthlyBudget` e `monthlySpent`.
- [src/app/api/artifacts/route.ts](../../src/app/api/artifacts/route.ts) restituisce item con `costUSD`.
- [src/app/api/artifacts/[id]/route.ts](../../src/app/api/artifacts/%5Bid%5D/route.ts) restituisce artifact con `costUSD`.
- [src/app/api/projects/[id]/route.ts](../../src/app/api/projects/%5Bid%5D/route.ts) include `artifacts` completi nel payload progetto e puo quindi propagare indirettamente `costUSD`.

4. Lista artefatti user
- [src/app/artifacts/ArtifactsClientPage.tsx](../../src/app/artifacts/ArtifactsClientPage.tsx) non renderizza oggi il costo, ma dipende da un contratto client che continua a ricevere `costUSD`.

5. Tipi frontend user-facing
- [src/components/hooks/useQuota.ts](../../src/components/hooks/useQuota.ts) assume ancora campi economici.
- [src/components/hooks/useArtifacts.ts](../../src/components/hooks/useArtifacts.ts) assume ancora `costUSD` nei tipi artifact.

### Visibilità economica correttamente confinata in admin

- [src/app/admin/AdminClientPage.tsx](../../src/app/admin/AdminClientPage.tsx) espone overview di spesa, budget per utente, activity cost e gestione quota/budget.
- [src/app/admin/page.tsx](../../src/app/admin/page.tsx) prepara i dati di costo per il client admin.
- [src/app/api/admin/metrics/route.ts](../../src/app/api/admin/metrics/route.ts) e [src/app/api/admin/users/route.ts](../../src/app/api/admin/users/route.ts) restano coerenti con il requisito.

### Note di consistenza implementativa

- [src/app/dashboard/page.tsx](../../src/app/dashboard/page.tsx) non dipende da [src/components/hooks/useQuota.ts](../../src/components/hooks/useQuota.ts): il leak dashboard va corretto nel rendering server-side e nella select Prisma, non solo nel contratto del hook.
- [src/app/artifacts/ArtifactsClientPage.tsx](../../src/app/artifacts/ArtifactsClientPage.tsx) consuma [src/components/hooks/useArtifacts.ts](../../src/components/hooks/useArtifacts.ts), quindi il riallineamento del payload artifact ha un impatto diretto su tipi e query client.
- [tests/integration/admin-client-page.test.tsx](../../tests/integration/admin-client-page.test.tsx) usa fixture con `monthlyBudget`, `monthlySpent` e `costUSD`, ma oggi non protegge in modo esplicito la persistenza della visibilità economica admin con assertion dedicate.

---

## Obiettivo UX per ruolo

### Role user

Messaggio principale:

- quante generazioni ha usato
- quante ne restano
- qual è il massimo disponibile nel periodo

Messaggi da rimuovere:

- budget speso
- budget totale
- percentuale di budget consumata
- costo della singola generazione
- aggregati monetari o label economiche equivalenti

### Role admin

Messaggio principale:

- monitorare utilizzo e spesa in modo completo
- intervenire su quota e budget
- leggere feedback economico in overview, lista utenti, drawer e activity stream

---

## Piano operativo per workstream

### WS1 - Contratti API user-facing

Obiettivo:

- impedire che il client user riceva dati economici non più autorizzati

Interventi:

- rimuovere `monthlyBudget` e `monthlySpent` dalla risposta di [src/app/api/users/quota/route.ts](../../src/app/api/users/quota/route.ts)
- rimuovere `costUSD` dagli item restituiti da [src/app/api/artifacts/route.ts](../../src/app/api/artifacts/route.ts)
- rimuovere `costUSD` dall artifact restituito da [src/app/api/artifacts/[id]/route.ts](../../src/app/api/artifacts/%5Bid%5D/route.ts)
- sanitizzare anche gli artifact inclusi in [src/app/api/projects/[id]/route.ts](../../src/app/api/projects/%5Bid%5D/route.ts)
- verificare eventuali altri endpoint user-facing che propagano artifact con costo oltre alle route gia identificate

Note:

- il controllo budget lato backend non cambia
- il dato economico continua a esistere nel dominio e nel DB, ma non viene serializzato verso il perimetro user

Definition of Done:

- nessun endpoint user-facing serializza campi economici
- gli endpoint admin continuano a restituire i campi di spesa necessari

### WS2 - Tipi client e hook user-facing

Obiettivo:

- riallineare i tipi frontend al nuovo contratto API

Interventi:

- aggiornare `QuotaInfo` in [src/components/hooks/useQuota.ts](../../src/components/hooks/useQuota.ts)
- aggiornare `Artifact` in [src/components/hooks/useArtifacts.ts](../../src/components/hooks/useArtifacts.ts)
- rimuovere dipendenze inutili dai campi economici nei componenti user

Definition of Done:

- i tipi client non modellano più spesa o budget nel perimetro user
- nessun componente user richiede `costUSD`, `monthlySpent` o `monthlyBudget`

### WS3 - Dashboard user

Obiettivo:

- trasformare la panoramica account in una vista centrata su utilizzo generazioni

Interventi:

- sostituire la card budget con una card focalizzata su disponibilità generazioni in [src/app/dashboard/page.tsx](../../src/app/dashboard/page.tsx)
- rimuovere dalla select server-side di [src/app/dashboard/page.tsx](../../src/app/dashboard/page.tsx) i campi `monthlyBudget` e `monthlySpent`
- eliminare label e copy economici residui
- rimuovere `budgetPercent` e logica correlata se non più necessaria
- mantenere la leggibilità del blocco metriche con la shell grafica attuale

Definition of Done:

- la dashboard mostra solo metriche di generazione non economiche nel blocco account
- nessun testo user-facing menziona budget o spesa

### WS4 - Artefatti user

Obiettivo:

- eliminare il feedback economico dal dettaglio artefatto e mantenere solo metadati utili all utente

Interventi:

- rimuovere la riga costo dalla sidebar di [src/app/artifacts/[id]/page.tsx](../../src/app/artifacts/%5Bid%5D/page.tsx)
- lasciare [src/app/artifacts/ArtifactsClientPage.tsx](../../src/app/artifacts/ArtifactsClientPage.tsx) priva di metrica economica anche dopo il riallineamento dei tipi e del payload
- verificare che dettaglio progetto o altri consumer user-facing di artifact non reintroducano `costUSD`

Definition of Done:

- il dettaglio artefatto non mostra più il costo
- lista e dettaglio espongono solo stato, modello, progetto, token e timestamp se utili

### WS5 - Perimetro admin invariato

Obiettivo:

- preservare la centralizzazione della spesa nel perimetro admin

Interventi:

- non toccare overview spesa in [src/app/admin/AdminClientPage.tsx](../../src/app/admin/AdminClientPage.tsx)
- non toccare quota/budget nel drawer admin
- non toccare `recentActivity.costUSD` nel feed admin
- verificare solo che eventuali refactor shared non rompano il rendering admin

Definition of Done:

- la spesa resta visibile in tutte le posizioni admin oggi esistenti
- nessuna regressione funzionale sull admin quota management

### WS6 - Test e documentazione

Obiettivo:

- mettere in sicurezza il refactor con test di contratto e rendering

Interventi:

- aggiornare [tests/unit/hooks.test.ts](../../tests/unit/hooks.test.ts)
- aggiornare [tests/integration/users-routes.test.ts](../../tests/integration/users-routes.test.ts)
- aggiornare [tests/integration/artifacts-route.test.ts](../../tests/integration/artifacts-route.test.ts)
- aggiornare [tests/integration/artifacts-id-route.test.ts](../../tests/integration/artifacts-id-route.test.ts)
- aggiornare [tests/integration/projects-id-route.test.ts](../../tests/integration/projects-id-route.test.ts) per l assenza di `costUSD` negli artifact inclusi
- aggiornare [tests/integration/artifacts-client-page.test.tsx](../../tests/integration/artifacts-client-page.test.tsx) se necessario per coprire assenza di costo
- aggiornare [tests/integration/admin-client-page.test.tsx](../../tests/integration/admin-client-page.test.tsx) con assertion esplicite su overview spesa, budget utente e activity cost
- allineare la documentazione API in [docs/specifications/api-specifications.md](../specifications/api-specifications.md) se i contratti vengono modificati

Definition of Done:

- test verdi sul nuovo contratto user-facing
- documentazione coerente con il comportamento implementato

---

## Sequenza di implementazione consigliata

1. Aggiornare prima gli endpoint API user-facing.
2. Aggiornare hook e tipi client.
3. Rifattorizzare dashboard user.
4. Rifattorizzare dettaglio artefatto user.
5. Verificare che il perimetro admin resti invariato.
6. Aggiornare test e documentazione contrattuale.

Motivazione:

- partire dai contratti evita di introdurre un falso senso di sicurezza con semplice hiding lato render
- il refactor dei componenti diventa più lineare quando i tipi sono già corretti
- la dashboard richiede anche un intervento server-side diretto, quindi non puo essere coperta solo dal refactor degli hook client

---

## Rischi e mitigazioni

1. Rischio: rimozione solo UI e non API
- Mitigazione: trattare la sanitizzazione dei payload come prima milestone obbligatoria.

2. Rischio: regressioni su componenti admin che condividono tipi o utilità
- Mitigazione: separare chiaramente i tipi user-facing da quelli admin o rendere espliciti i contratti per perimetro.

3. Rischio: documentazione fuori sync con gli endpoint reali
- Mitigazione: aggiornare [docs/specifications/api-specifications.md](../specifications/api-specifications.md) nello stesso change set del refactor.

4. Rischio: perdita di segnali utili nel dettaglio artefatto
- Mitigazione: mantenere token, stato, modello, creato e completato come metadati operativi non economici.

---

## Checklist operativa

### Preparazione

- [ ] Confermare i componenti user dove la spesa è ancora visibile.
- [ ] Confermare che la centralizzazione della spesa resta esclusivamente admin.

### API e contratti

- [ ] Aggiornare [src/app/api/users/quota/route.ts](../../src/app/api/users/quota/route.ts) rimuovendo `monthlyBudget` e `monthlySpent`.
- [ ] Aggiornare [src/app/api/artifacts/route.ts](../../src/app/api/artifacts/route.ts) rimuovendo `costUSD` dal payload user-facing.
- [ ] Aggiornare [src/app/api/artifacts/[id]/route.ts](../../src/app/api/artifacts/%5Bid%5D/route.ts) rimuovendo `costUSD` dal payload user-facing.
- [ ] Aggiornare [src/app/api/projects/[id]/route.ts](../../src/app/api/projects/%5Bid%5D/route.ts) per non esporre `costUSD` negli artifact inclusi.
- [ ] Verificare eventuale esposizione indiretta di artifact con costo in altri payload collegati.

### Frontend user

- [ ] Aggiornare [src/components/hooks/useQuota.ts](../../src/components/hooks/useQuota.ts).
- [ ] Aggiornare [src/components/hooks/useArtifacts.ts](../../src/components/hooks/useArtifacts.ts).
- [ ] Rifattorizzare [src/app/dashboard/page.tsx](../../src/app/dashboard/page.tsx) per mostrare solo metriche di generazione e rimuovere la select server-side dei campi economici.
- [ ] Rifattorizzare [src/app/artifacts/[id]/page.tsx](../../src/app/artifacts/%5Bid%5D/page.tsx) rimuovendo il costo.
- [ ] Verificare che [src/app/artifacts/ArtifactsClientPage.tsx](../../src/app/artifacts/ArtifactsClientPage.tsx) non reintroduca dati economici via tipo o rendering futuro.
- [ ] Verificare che eventuali viste progetto user-facing non reintroducano costo tramite artifact inclusi.

### Frontend admin

- [ ] Verificare che [src/app/admin/AdminClientPage.tsx](../../src/app/admin/AdminClientPage.tsx) mantenga overview spesa, budget per utente e costi activity.
- [ ] Verificare che [src/app/admin/AdminQuotaForm.tsx](../../src/app/admin/AdminQuotaForm.tsx) resti invariato funzionalmente.

### Test

- [ ] Aggiornare [tests/unit/hooks.test.ts](../../tests/unit/hooks.test.ts).
- [ ] Aggiornare [tests/integration/users-routes.test.ts](../../tests/integration/users-routes.test.ts).
- [ ] Aggiornare [tests/integration/artifacts-client-page.test.tsx](../../tests/integration/artifacts-client-page.test.tsx) o aggiungere assertion sull assenza di costo.
- [ ] Aggiornare [tests/integration/artifacts-route.test.ts](../../tests/integration/artifacts-route.test.ts).
- [ ] Aggiornare [tests/integration/artifacts-id-route.test.ts](../../tests/integration/artifacts-id-route.test.ts).
- [ ] Aggiornare [tests/integration/projects-id-route.test.ts](../../tests/integration/projects-id-route.test.ts).
- [ ] Aggiornare [tests/integration/admin-client-page.test.tsx](../../tests/integration/admin-client-page.test.tsx) con assertion esplicite sulla presenza del feedback economico.

### Documentazione

- [ ] Aggiornare [docs/specifications/api-specifications.md](../specifications/api-specifications.md).
- [ ] Aggiornare [docs/implement-index.md](../implement-index.md) se il lavoro viene schedulato o completato come priorità UX attiva.

### Verifica finale

- [ ] Un utente role `user` non vede importi in dashboard, lista artefatti, dettaglio artefatto e hook/API associati.
- [ ] Un utente role `admin` continua a vedere importi in overview admin, schede utenti, drawer quota e attività recente.
- [ ] Nessuna regressione sui flussi core di autenticazione, lista artefatti e admin quota management.

---

## Criteri di accettazione

Il refactor è accettato quando:

- il perimetro user espone solo quantità di generazioni usate e massime disponibili
- ogni feedback economico è centralizzato nel perimetro admin
- i contratti API e i tipi frontend riflettono questa separazione
- la documentazione e i test sono coerenti con il comportamento reale
