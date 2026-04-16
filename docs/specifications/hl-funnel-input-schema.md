# HL Funnel - Unified Input Schema

Version: 1.2
Date: 2026-04-14
Scope: contratto semantico unico dei campi input richiesti da prompt optin, quiz, vsl.

## Obiettivo

Definire un set unico e organizzato di variabili per alimentare i 3 generatori:
- Optin Generator
- Quiz Generator
- VSL Generator

Il set e progettato per:
- garantire un contratto coerente tra prompt/tool route
- validare i dati prima della generazione
- riusare lo stesso payload tra i 3 prompt
- supportare sia inserimento manuale (briefing) sia popolamento automatico da extraction

## Allineamento refactoring tool (upload-first)

Con il refactoring Funnel Pages del branch corrente, il flusso UI principale e:
1. upload documento (`/api/tools/funnel-pages/upload`)
2. extraction contesto testuale (`/api/tools/extraction/generate` con `responseMode: "text"`)
3. generazione step funnel (`/api/tools/funnel-pages/generate`, payload V3 `extractionContext`)

Questo documento resta il riferimento del **modello dati target**:
- nel flusso text-first, guida la qualita semantica del contesto testuale passato ai prompt;
- nei flussi strutturati/legacy, resta il modello verso cui i campi vengono mappati server-side.

## Prompt coperti

- src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_optin_generator.md
- src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_quiz_generator.md
- src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_vsl_generator.md

## Convenzioni

- Required: true indica campo obbligatorio a livello modulo.
- Type usa primitive UI-friendly: text, textarea, select, boolean, number, repeater.
- Used by indica i generatori che leggono il campo.
- Alcuni campi possono essere valorizzati automaticamente dal sistema (non visibili nel modulo).

## Unified Field Catalog

| Key | Label | Type | Required | Used by |
|---|---|---|---|---|
| business_type | Tipo business | select(B2B,B2C) | true | optin, quiz, vsl |
| sector_niche | Settore/Nicchia | text | true | optin, quiz, vsl |
| offer_price_range | Fascia prezzo offerta | text | true | optin, quiz, vsl |
| target_profile | Profilo target ideale | textarea | true | optin, quiz, vsl |
| operational_context | Contesto operativo | textarea | false | optin, vsl |
| core_problem | Problema principale | textarea | true | optin, quiz, vsl |
| new_opportunity | Nuova opportunita | textarea | true | quiz, vsl |
| old_method | Metodo tradizionale attuale | textarea | true | quiz, vsl |
| delivery_model | Modello erogazione | select(done-for-you,done-with-you,fai-da-te,corso) | true | quiz, vsl |
| client_involvement_required | Coinvolgimento richiesto al cliente | textarea | false | quiz, vsl |
| must_have_criteria | Criteri must-have | textarea | true | quiz, vsl |
| nice_to_have_criteria | Criteri nice-to-have | textarea | false | quiz |
| disqualification_criteria | Criteri squalifica | textarea | true | quiz, vsl |
| minimum_operational_capabilities | Capacita operative minime | textarea | true | quiz, vsl |
| disqualified_redirect_offer | Redirect fuori target | textarea | true | quiz |
| optin_title_promise | Titolo/Promessa optin | text | true | optin, quiz, vsl |
| promised_benefit | Beneficio promesso | textarea | true | optin, quiz, vsl |
| promised_result_format | Formato deliverable | select(video,pdf,analisi,report,altro) | true | optin, quiz, vsl |
| email_already_collected | Email gia raccolta in optin (autofill sistema=true) | boolean | false | optin, quiz, vsl |
| primary_segmentation_basis | Variabile segmentazione primaria | text | true | quiz, vsl |
| desired_cluster_count | Numero cluster desiderati | number | true | quiz, vsl |
| cluster_profiles | Profili cluster | repeater(object) | true | quiz, vsl |
| cluster_overlap_management | Regola overlap cluster | textarea | false | quiz |
| lead_magnet | Lead magnet unico | object | true | quiz, vsl, optin |
| false_belief_vehicle | False belief veicolo | textarea | true | quiz, vsl |
| false_belief_internal | False belief interne | textarea | true | quiz, vsl |
| false_belief_external | False belief esterne | textarea | true | quiz, vsl |
| funnel_primary_goal | Obiettivo primario funnel | text | true | optin, quiz, vsl |
| success_metrics | Metriche di successo | textarea | true | optin, quiz, vsl |
| next_customer_journey_step | Step successivo journey | textarea | true | optin, quiz, vsl |
| case_studies | Casi studio verificabili | repeater(object) | false | optin, quiz, vsl |
| testimonials_sources | Fonti testimonianze strutturate | repeater(object) | false | optin, vsl |
| authority_assets | Asset di credibilita | textarea | false | optin, vsl |
| visual_proof_assets | Asset prova visiva | repeater(object) | false | vsl |
| optin_output_context | Output optin gia generato | textarea | false | vsl |
| quiz_output_context | Output quiz gia generato | textarea | false | vsl |
| funnel_context_notes | Note contesto funnel | textarea | false | optin, vsl |
| assumptions_allowed | Abilita assunzioni conservative | boolean | true | optin, quiz, vsl |
| assumption_notes | Note assunzioni | textarea | false | optin, quiz, vsl |
| forbidden_terms_or_claims | Termini/claim vietati | textarea | false | optin, quiz, vsl |

## Repeater Object Definitions

### cluster_profiles[]

| Field | Type | Required |
|---|---|---|
| cluster_name | text | true |
| cluster_description | textarea | true |
| psychographic_profile | textarea | true |

### lead_magnet

| Field | Type | Required |
|---|---|---|
| cluster_name | text | true |
| title | text | true |
| format | select(VSL,PDF,Case Study,Demo,Altro) | true |
| hook | textarea | true |
| messaging | textarea | true |
| next_step | textarea | true |

### case_studies[]

| Field | Type | Required |
|---|---|---|
| name | text | true |
| initial_problem | textarea | true |
| result_metrics | textarea | true |
| timeframe | text | false |
| source | text | true |

### testimonials_sources[]

| Field | Type | Required |
|---|---|---|
| quote | textarea | true |
| source | text | true |
| timestamp | text | false |
| achieved_result | textarea | false |
| measurable_results | textarea | false |

### visual_proof_assets[]

| Field | Type | Required |
|---|---|---|
| asset_type | select(screenshot,report,dashboard,altro) | true |
| metric_highlight | text | true |
| source | text | false |

## Validation Rules (Modulo)

- business_type must be B2B or B2C.
- desired_cluster_count range consigliato: 3..5.
- email_already_collected e valorizzato automaticamente a true dal modulo corrente.
- if delivery_model=done-for-you, false_belief_internal should include delega/control objections.
- if delivery_model in (fai-da-te, corso), false_belief_internal should include technical fear/motivation signals.
- if case_studies present, each item must include source.
- if testimonials_sources present, non verificato cannot be quoted directly.
- if testimonials_sources present, ogni testimonianza deve includere quote testuale virgoletata e source nella stessa entry (non e valido solo il nome del testimonial).
- if achieved_result or measurable_results are present, they must be attributable to the same testimonial source.
- assumptions_allowed=true permits conservative fallbacks and requires assumption_notes when critical fields are missing.

## Conditional UI Logic

- Show field website_in_contact_questions toggle only when business_type=B2B.
- Show vsl_context_group (optin_output_context, quiz_output_context) when generating VSL.
- Show visual_proof_assets only if user declares available screenshots/proofs.
- Show disqualified_redirect_offer only if disqualification_criteria is not empty.
- cluster_profiles sono collassabili (accordion) per ridurre ingombro verticale.
- lead magnet e singolo nel form; runtime mapping verso array payload `lead_magnets_by_cluster[0]`.

## Minimal MVP Field Set

Per una prima release del modulo, usare almeno:
- business_type
- sector_niche
- target_profile
- core_problem
- new_opportunity
- old_method
- delivery_model
- offer_price_range
- must_have_criteria
- disqualification_criteria
- minimum_operational_capabilities
- optin_title_promise
- promised_benefit
- promised_result_format
- primary_segmentation_basis
- desired_cluster_count
- cluster_profiles
- lead_magnet
- false_belief_vehicle
- false_belief_internal
- false_belief_external
- funnel_primary_goal
- success_metrics
- next_customer_journey_step

## Suggested Unified Payload Shape

```json
{
  "business_context": {
    "business_type": "B2B",
    "sector_niche": "",
    "offer_price_range": "",
    "target_profile": "",
    "operational_context": ""
  },
  "offer_context": {
    "core_problem": "",
    "new_opportunity": "",
    "old_method": "",
    "delivery_model": "done-for-you",
    "client_involvement_required": ""
  },
  "qualification_context": {
    "must_have_criteria": "",
    "nice_to_have_criteria": "",
    "disqualification_criteria": "",
    "minimum_operational_capabilities": "",
    "disqualified_redirect_offer": ""
  },
  "optin_context": {
    "optin_title_promise": "",
    "promised_benefit": "",
    "promised_result_format": "video",
    "email_already_collected": true
  },
  "segmentation_context": {
    "primary_segmentation_basis": "",
    "desired_cluster_count": 3,
    "cluster_profiles": [],
    "cluster_overlap_management": "",
    "lead_magnets_by_cluster": [
      {
        "cluster_name": "",
        "title": "",
        "format": "VSL",
        "hook": "",
        "messaging": "",
        "next_step": ""
      }
    ]
  },
  "belief_context": {
    "false_belief_vehicle": "",
    "false_belief_internal": "",
    "false_belief_external": ""
  },
  "funnel_goals": {
    "funnel_primary_goal": "",
    "success_metrics": "",
    "next_customer_journey_step": ""
  },
  "proof_context": {
    "case_studies": [],
    "testimonials_sources": [],
    "authority_assets": "",
    "visual_proof_assets": []
  },
  "generated_context": {
    "optin_output_context": "",
    "quiz_output_context": "",
    "funnel_context_notes": ""
  },
  "assumptions_and_constraints": {
    "assumptions_allowed": true,
    "assumption_notes": "",
    "forbidden_terms_or_claims": ""
  }
}
```

## Notes

- Questo schema definisce il contratto funzionale condiviso tra prompt/route, non impone una sola UI.
- I campi non necessari al singolo step possono restare vuoti, salvo required.
- Per output di qualita marketing alta, raccomandato compilare sempre proof_context.
- Nel flusso upload-first alcuni campi possono risultare mancanti/partial e vengono gestiti con fallback conservativi durante la mappatura.
- `email_already_collected` continua a essere valorizzato automaticamente a `true` nel flusso funnel corrente.
- Nel mapping upload-first (payload V3), `testimonials_sources` viene propagato in `proof_context` mantenendo anche `achieved_result` e `measurable_results` quando disponibili.

## Updates — 2026-04-14 (Extraction Chain Hardening Complete)

### Text-Mode Extraction: Stable & Production-Ready ✅

La decisione strategica di semplificare da JSON schema parsing a plain text extraction è ora **completamente implementata**.

**Cosa è cambiato:**
- **extraction/generate route** (`responseMode: "text"`): soft_accept ora **arresta l'escalation** (non continua ai model successivi)
- **HTTP status codes**: soft_accept ritorna **200** (non 503), abilitando corretta persistenza in DB
- **Timeout handling (as-is 2026-04-15)**: in text mode sono attive deadline per-attempt estese (120s/150s/180s) senza guard stream aggressivi; in structured mode restano guard timeout (`first-token`, `token-idle`, `json-start`, `json-parse`) con soglie riallineate completeness-first.
- **Type system**: Fixed typecheck errors; all tests passing (377/377)
- **DB sync**: Logs e database state ora **sincronizzati** — `acceptanceDecision:soft_accept` → persiste come success

**Implicazioni per questo schema:**
- `testimonials_sources[]` con `quote` field virgoletato **è già presente e supportato** da text extraction
- Text output flows correttamente nei 3 prompt (optin/quiz/vsl) — nessuna dipendenza da JSON parsing
- Escalation logic ensures: attempt 1 (Claude) succeeds ~50% of time; attempt 2 (GPT-4.1) succeeds ~90%; fallback managed gracefully

**Reference:**
- Hardening tracker: [`docs/implementation/feature-extraction-chain-hardening-tracker-1.md`](../implementation/feature-extraction-chain-hardening-tracker-1.md)
- Operational index: [`docs/implement-index.md`](../implement-index.md)
- API spec: [`docs/specifications/api-specifications.md`](./api-specifications.md) — Text-Mode Extraction section added

**Next phase:** Monitor first-attempt success rates in production; measure extraction quality on downstream generators.
