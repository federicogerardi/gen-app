/**
 * Canonical field map for extracting a funnel briefing from raw document content.
 * This drives the extraction agent — each key maps to a field in funnelUnifiedBriefingSchema.
 * Used by the funnel upload flow and reusable in any cross-tool extraction call.
 */

import type { z } from 'zod';
import type { extractionFieldDefinitionSchema } from '@/lib/tool-routes/schemas';

type FieldDef = z.infer<typeof extractionFieldDefinitionSchema>;
type FieldMap = Record<string, FieldDef>;

export const FUNNEL_EXTRACTION_FIELD_MAP = {
  // --- business_context ---
  business_type: {
    type: 'select',
    required: true,
    description: "Tipo di business: B2B (vendita ad aziende o professionisti) o B2C (vendita a privati consumatori)",
  },
  sector_niche: {
    type: 'textarea',
    required: true,
    description: "Settore e nicchia di mercato specifica del business (es. \"Consulenza fiscale per freelancer italiani\")",
  },
  offer_price_range: {
    type: 'text',
    required: true,
    description: "Fascia di prezzo del servizio o prodotto principale (es. \"2.000–5.000 EUR\", \"997 USD una tantum\")",
  },
  target_profile: {
    type: 'textarea',
    required: true,
    description: "Profilo ideale del cliente target: chi è, cosa fa, quali responsabilità ha",
  },
  operational_context: {
    type: 'textarea',
    required: false,
    description: "Contesto operativo del cliente tipico: struttura del team, stack tecnologico, maturità aziendale",
  },

  // --- offer_context ---
  core_problem: {
    type: 'textarea',
    required: true,
    description: "Problema principale che il prodotto/servizio risolve per il cliente target",
  },
  new_opportunity: {
    type: 'textarea',
    required: true,
    description: "Opportunità nuova o approccio innovativo che l'offerta introduce rispetto al mercato",
  },
  old_method: {
    type: 'textarea',
    required: true,
    description: "Il metodo tradizionale/vecchio che i clienti usavano prima e perché non funziona più",
  },
  delivery_model: {
    type: 'select',
    required: true,
    description: "Modalità di erogazione del servizio: \"done-for-you\", \"done-with-you\", \"fai-da-te\" o \"corso\"",
  },
  client_involvement_required: {
    type: 'textarea',
    required: false,
    description: "Quanto e come il cliente deve essere coinvolto nel processo (tempo, decisioni, validazioni)",
  },

  // --- qualification_context ---
  must_have_criteria: {
    type: 'textarea',
    required: true,
    description: "Criteri imprescindibili per qualificare un lead come adatto: cosa deve avere o essere",
  },
  nice_to_have_criteria: {
    type: 'textarea',
    required: false,
    description: "Criteri preferenziali ma non bloccanti per la qualificazione",
  },
  disqualification_criteria: {
    type: 'textarea',
    required: true,
    description: "Criteri di esclusione: cosa rende un lead inadatto o non qualificabile",
  },
  minimum_operational_capabilities: {
    type: 'textarea',
    required: true,
    description: "Requisiti minimi che il cliente deve soddisfare per poter usare l'offerta (budget, strumenti, team)",
  },
  disqualified_redirect_offer: {
    type: 'textarea',
    required: false,
    description: "Eventuale offerta alternativa o risorsa per chi non supera la qualificazione",
  },

  // --- optin_context ---
  optin_title_promise: {
    type: 'text',
    required: true,
    description: "La promessa principale della pagina optin: cosa ottiene chi si iscrive (titolo/headline)",
  },
  promised_benefit: {
    type: 'textarea',
    required: true,
    description: "Il beneficio concreto e immediato promesso in cambio dell'iscrizione",
  },
  promised_result_format: {
    type: 'select',
    required: true,
    description: "Formato del contenuto promesso: \"video\", \"pdf\", \"analisi\", \"report\" o \"altro\"",
  },

  // --- segmentation_context ---
  primary_segmentation_basis: {
    type: 'textarea',
    required: true,
    description: "Il criterio principale su cui si basa la segmentazione degli utenti nel quiz funnel",
  },
  desired_cluster_count: {
    type: 'number',
    required: false,
    description: "Numero desiderato di cluster/segmenti utente (valore tra 3 e 5, default: 3)",
  },
  cluster_profiles: {
    type: 'array',
    required: false,
    description: "Array di profili cluster già definiti. Ogni elemento: cluster_name, cluster_description, psychographic_profile",
  },

  // --- belief_context ---
  false_belief_vehicle: {
    type: 'textarea',
    required: true,
    description: "La falsa credenza esterna che porta il prospect ad acquistare le soluzioni sbagliate (es. \"basta aumentare il budget ads\")",
  },
  false_belief_internal: {
    type: 'textarea',
    required: true,
    description: "La falsa credenza interna del prospect su se stesso che lo blocca (es. \"non sono pronto, devo prima fare X\")",
  },
  false_belief_external: {
    type: 'textarea',
    required: true,
    description: "La falsa credenza sul mercato/settore che giustifica l'inazione (es. \"il mercato è saturo\")",
  },

  // --- funnel_goals ---
  funnel_primary_goal: {
    type: 'textarea',
    required: true,
    description: "Obiettivo primario dell'intero funnel: cosa deve produrre in termini di azione/conversione",
  },
  success_metrics: {
    type: 'textarea',
    required: true,
    description: "Metriche principali per misurare il successo del funnel (es. tasso di optin, costo per lead, show-up rate)",
  },
  next_customer_journey_step: {
    type: 'textarea',
    required: true,
    description: "Il passo successivo nel percorso del cliente dopo il funnel (es. \"call strategica\", \"demo prodotto\")",
  },

  // --- lead magnets ---
  lead_magnets_by_cluster: {
    type: 'array',
    required: false,
    description: "Array di lead magnet per cluster. Ogni elemento: cluster_name, title, format, hook, messaging, next_step",
  },

  // --- proof_context ---
  testimonials_sources: {
    type: 'array',
    required: false,
    description: "Array di testimonianze reali disponibili nel documento. Ogni elemento deve includere: testo testimonianza (quote), nome testimonial e ruolo se presente (source), risultato specifico ottenuto (achieved_result) e numeri misurabili associati (measurable_results)",
  },

  // --- assumptions ---
  assumptions_allowed: {
    type: 'boolean',
    required: false,
    description: "Se true, l'agente può fare assunzioni ragionevoli sui campi mancanti; se false, deve lasciare i campi vuoti",
  },
  forbidden_terms_or_claims: {
    type: 'textarea',
    required: false,
    description: "Termini, claim o affermazioni che non devono mai comparire nel funnel (vincoli legali, compliance, brand policy)",
  },
} satisfies FieldMap;

export type FunnelExtractionFieldMap = typeof FUNNEL_EXTRACTION_FIELD_MAP;

export const EXTRACTION_SECTION_KEYS = [
  'business_context',
  'offer_context',
  'qualification_context',
  'optin_context',
  'segmentation_context',
  'belief_context',
  'funnel_goals',
  'proof_context',
  'generated_context',
  'assumptions_and_constraints',
] as const;

export function normalizeExtractedFields(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...value };
  const wrappers = ['fields', 'data', 'result'];

  for (const wrapper of wrappers) {
    const candidate = result[wrapper];
    if (typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)) {
      Object.assign(result, candidate as Record<string, unknown>);
    }
  }

  for (const key of EXTRACTION_SECTION_KEYS) {
    const section = result[key];
    if (typeof section !== 'object' || section === null || Array.isArray(section)) {
      continue;
    }

    for (const [nestedKey, nestedValue] of Object.entries(section)) {
      if (nestedValue === null || nestedValue === undefined || nestedValue === '') {
        continue;
      }

      if (!(nestedKey in result) || result[nestedKey] === '' || result[nestedKey] === null || result[nestedKey] === undefined) {
        result[nestedKey] = nestedValue;
      }
    }
  }

  return result;
}
