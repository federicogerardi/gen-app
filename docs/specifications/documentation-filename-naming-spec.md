# Specifica naming file documentazione

**Versione**: 1.0  
**Stato**: Attiva  
**Ultimo aggiornamento**: 2026-04-13

## Obiettivo

Definire una convenzione unica, stabile e prevedibile per il naming dei file markdown in `docs/`, riducendo nomi casuali e migliorando ricerca, manutenzione e tracciabilita.

## Ambito

- Valida per tutti i file `*.md` sotto `docs/`.
- Non copre naming di codice applicativo, test o configurazioni.

## Regole fondamentali

1. Usare sempre lowercase kebab-case.
2. Usare solo caratteri `[a-z0-9-]` nel nome base.
3. Evitare prefissi/suffissi ambigui (`new`, `final`, `tmp`, `misc`, `notes` generico).
4. Il nome deve indicare sia il tema sia il tipo documento.
5. Estensione sempre `.md`.

## Pattern canonico

Pattern consigliato:

`<scope>-<topic>-<doc-type>[-<qualifier>][-YYYY-MM-DD][-n].md`

Componenti:

- `scope`: area funzionale o dominio (`api`, `auth`, `llm`, `ux`, `quota`, `deploy`, `tool-prompts`).
- `topic`: soggetto specifico (`rate-limiting`, `projects-first-navigation`).
- `doc-type`: natura del documento (obbligatorio).
- `qualifier`: opzionale, solo se serve disambiguare (`rollout`, `rollback`, `internal`).
- `YYYY-MM-DD`: solo per snapshot time-bound (review, closure, audit, runbook operativi datati).
- `n`: iterazione solo quando convivono versioni parallele con stesso scopo (`-1`, `-2`).

## Vocabolario doc-type standard

Usare uno dei seguenti tipi dove possibile:

- `spec`
- `plan`
- `tracker`
- `runbook`
- `review`
- `audit`
- `gap-analysis`
- `closure`
- `overview`
- `blueprint`
- `strategy`
- `adr` (solo nel dominio ADR numerato)

## Regole per data e versionamento

- Aggiungere la data solo quando il contenuto e una fotografia nel tempo.
- Formato data obbligatorio: `YYYY-MM-DD`.
- Non usare timestamp con ore/minuti nel filename.
- Usare `-n` solo per famiglie iterative intenzionali ancora attive.
- Se un documento evolve nella stessa lineage, aggiornare il file esistente invece di creare varianti (`v2`, `final-final`).

## Regole per acronimi e termini composti

- Acronomi in minuscolo: `api`, `ux`, `llm`, `adr`.
- Numeri ammessi se semanticamente utili: `pr-28-dev-merge-review-2026-04-13.md`.
- Evitare underscore e spazi.

## Matrice cartella -> naming consigliato

- `docs/adrs/`: `NNN-<topic>.md` (esempio: `004-tool-route-error-contract.md`).
- `docs/specifications/`: `<scope>-<topic>-spec.md`.
- `docs/implementation/`: `<scope>-<topic>-plan.md` o `<scope>-<topic>-tracker[-n].md`.
- `docs/review/`: `<scope>-<topic>-review-YYYY-MM-DD.md`, `<scope>-<topic>-closure-YYYY-MM-DD.md`, `<scope>-<topic>-gap-analysis-YYYY-MM-DD.md`.
- `docs/archive/`: mantenere naming originario del documento sorgente; aggiungere data solo se assente e necessaria a distinguere snapshot.
- `docs/ux/`: `<topic>-plan.md` o `<topic>-strategy.md`.

## Esempi

Buoni esempi:

- `api-specifications.md`
- `projects-first-navigation-plan.md`
- `feature-audit-remediation-sequenced-tracker-1.md`
- `pr-28-dev-merge-review-2026-04-13.md`

Esempi da evitare:

- `nuovo-doc.md`
- `update_final.md`
- `note.md`
- `roadmap2.md`

## Politica di migrazione dal naming randomico

1. Non rinominare in massa senza necessita operativa.
2. Applicare la convenzione a ogni nuovo file da ora in avanti.
3. Rinominare file esistenti solo quando vengono toccati per manutenzione sostanziale.
4. In caso di rename, aggiornare nello stesso change tutti gli indici e i link interni (`docs/README.md`, indici locali).

## Checklist rapida prima del salvataggio

- Il filename e in kebab-case minuscolo?
- Il `doc-type` e esplicito?
- Data presente solo se davvero necessaria?
- Iterazione `-n` usata solo quando coesistono file paralleli?
- Link negli indici aggiornati?

## Riferimenti

- `docs/README.md`
- `docs/implement-index.md`
- `.github/instructions/docs-taxonomy.instructions.md`