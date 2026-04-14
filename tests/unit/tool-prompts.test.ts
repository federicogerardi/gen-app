import { buildMetaAdsPrompt } from '@/lib/tool-prompts/meta-ads';
import { buildExtractionPrompt } from '@/lib/tool-prompts/extraction';
import {
  buildFunnelOptinPrompt,
  buildFunnelQuizPrompt,
  buildFunnelVslPrompt,
} from '@/lib/tool-prompts/funnel-pages';
import { EXTRACTION_GENERATION_TEMPLATE } from '@/lib/tool-prompts/extraction-templates';
import { TOOL_PROMPT_REGISTRY } from '@/lib/tool-prompts/registry';
import { loadPromptSource } from '@/lib/tool-prompts/loader';

jest.mock('@/lib/tool-prompts/loader', () => ({
  loadPromptSource: jest.fn(),
  injectTemplateValues: jest.requireActual('@/lib/tool-prompts/loader').injectTemplateValues,
}));

const mockedLoadPromptSource = loadPromptSource as jest.MockedFunction<typeof loadPromptSource>;

describe('buildMetaAdsPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadPromptSource.mockResolvedValue('Template: {{context}}');
  });

  it('loads meta ads template and injects context', async () => {
    const prompt = await buildMetaAdsPrompt({
      product: 'CRM SaaS',
      audience: 'SMB owners',
      offer: '14-day trial',
      objective: 'Lead generation',
      tone: 'professional',
      angle: 'ROI focus',
    });

    expect(mockedLoadPromptSource).toHaveBeenCalledWith(TOOL_PROMPT_REGISTRY.metaAds.generation);
    expect(prompt).toContain('Prodotto/Servizio: CRM SaaS');
    expect(prompt).toContain('Creative angle: ROI focus');
  });

  it('uses fallback angle when missing', async () => {
    const prompt = await buildMetaAdsPrompt({
      product: 'CRM SaaS',
      audience: 'SMB owners',
      offer: '14-day trial',
      objective: 'Lead generation',
      tone: 'professional',
    });

    expect(prompt).toContain('Creative angle: Non specificato');
  });
});

describe('buildExtractionPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadPromptSource.mockResolvedValue('Extraction template: {{context}}');
  });

  it('composes extraction prompt context from field map and raw content', async () => {
    const prompt = await buildExtractionPrompt({
      tone: 'professional',
      rawContent: 'Testo sorgente con dati business e target.',
      fieldMap: {
        business_type: {
          type: 'select',
          required: true,
          description: 'Tipo business',
        },
      },
      notes: 'Nessuna nota',
    });

    expect(prompt).toContain('Extraction template:');
    expect(prompt).toContain('business_type');
    expect(prompt).toContain('Testo sorgente con dati business e target.');
  });

  it('builds text-mode extraction prompt with schema-aligned sections and required checklist', async () => {
    const prompt = await buildExtractionPrompt({
      tone: 'professional',
      responseMode: 'text',
      rawContent: 'Briefing aziendale con target, offerta, proof e obiettivi funnel.',
      fieldMap: {
        business_type: {
          type: 'select',
          required: true,
          description: 'Tipo business',
        },
        core_problem: {
          type: 'textarea',
          required: true,
          description: 'Problema principale',
        },
      },
      notes: 'Mantieni solo fatti verificabili',
    });

    expect(prompt).toContain('## Business Context');
    expect(prompt).toContain('## Offer & Delivery Context');
    expect(prompt).toContain('## Qualification Context');
    expect(prompt).toContain('## Segmentation & Lead Magnet Context');
    expect(prompt).toContain('## Belief Context');
    expect(prompt).toContain('## Funnel Goal Context');
    expect(prompt).toContain('## Proof Context');
    expect(prompt).toContain('## Missing / Unclear');
    expect(prompt).toContain('## Required Fields Checklist');
    expect(prompt).toContain('business_type');
    expect(prompt).toContain('core_problem');
    expect(prompt).toContain('testo virgoletato + fonte');
  });
});

describe('funnel prompt builders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadPromptSource.mockResolvedValue('PROMPT TEMPLATE');
  });

  const baseInput = {
    product: 'Corso AI',
    audience: 'Freelancer',
    offer: 'Sconto 50%',
    promise: 'Più clienti',
    tone: 'casual' as const,
    notes: 'Urgente',
  };

  it('buildFunnelOptinPrompt composes template and briefing', async () => {
    const prompt = await buildFunnelOptinPrompt(baseInput);

    expect(mockedLoadPromptSource).toHaveBeenCalledWith(TOOL_PROMPT_REGISTRY.funnel.optin);
    expect(prompt).toContain('PROMPT TEMPLATE');
    expect(prompt).toContain('## BRIEFING OPERATIVO');
    expect(prompt).toContain('Prodotto/Servizio: Corso AI');
    expect(prompt).toContain("nell'optin page puoi usare emoji in modo persuasivo e misurato");
  });

  it('buildFunnelQuizPrompt includes optin context', async () => {
    const prompt = await buildFunnelQuizPrompt({ ...baseInput, optinOutput: 'OPTIN OUTPUT' });

    expect(mockedLoadPromptSource).toHaveBeenCalledWith(TOOL_PROMPT_REGISTRY.funnel.quiz);
    expect(prompt).toContain('## CONTESTO OPTIN PAGE GIA GENERATA');
    expect(prompt).toContain('OPTIN OUTPUT');
  });

  it('buildFunnelVslPrompt includes optin and quiz context', async () => {
    const prompt = await buildFunnelVslPrompt({
      ...baseInput,
      optinOutput: 'OPTIN OUTPUT',
      quizOutput: 'QUIZ OUTPUT',
    });

    expect(mockedLoadPromptSource).toHaveBeenCalledWith(TOOL_PROMPT_REGISTRY.funnel.vsl);
    expect(prompt).toContain('## CONTESTO OPTIN PAGE GIA GENERATA');
    expect(prompt).toContain('## CONTESTO QUIZ GIA GENERATO');
    expect(prompt).toContain('QUIZ OUTPUT');
  });

  it('buildFunnelOptinPrompt supports unified V2 briefing payload', async () => {
    const prompt = await buildFunnelOptinPrompt({
      tone: 'professional',
      briefing: {
        business_context: {
          business_type: 'B2B',
          sector_niche: 'Consulenza commerciale',
          offer_price_range: '3000-10000 EUR',
          target_profile: 'PMI con team sales interno',
        },
        offer_context: {
          core_problem: 'Pipeline poco prevedibile',
          new_opportunity: 'Funnel diagnostico segmentato',
          old_method: 'Campagne broad e qualificazione manuale',
          delivery_model: 'done-for-you',
        },
        qualification_context: {
          must_have_criteria: 'Decision maker coinvolto',
          disqualification_criteria: 'No budget o no urgenza',
          minimum_operational_capabilities: 'CRM e processo vendite minimo',
        },
        optin_context: {
          optin_title_promise: 'Diagnosi rapida',
          promised_benefit: 'Capire dove perdi opportunita',
          promised_result_format: 'video',
          email_already_collected: true,
        },
        segmentation_context: {
          primary_segmentation_basis: 'Maturita funnel',
          desired_cluster_count: 3,
          cluster_profiles: [],
          lead_magnets_by_cluster: [],
        },
        belief_context: {
          false_belief_vehicle: 'Basta aumentare il budget',
          false_belief_internal: 'Non ho tempo per strutturare il funnel',
          false_belief_external: 'Nel mio mercato non funziona',
        },
        funnel_goals: {
          funnel_primary_goal: 'Piu call qualificate',
          success_metrics: 'Show rate e close rate',
          next_customer_journey_step: 'Call strategica',
        },
        proof_context: {
          case_studies: [],
          testimonials_sources: [],
          visual_proof_assets: [],
        },
        generated_context: {},
        assumptions_and_constraints: {
          assumptions_allowed: true,
        },
      },
    });

    expect(prompt).toContain('### Business Context');
    expect(prompt).toContain('Tipo business: B2B');
    expect(prompt).toContain('Segmentazione primaria: Maturita funnel');
  });
});

describe('extraction prompt contract', () => {
  it('enforces flat keys, full fields population, critical fields first and valid partial JSON', () => {
    expect(EXTRACTION_GENERATION_TEMPLATE).toContain('Usa esclusivamente chiavi flat presenti nella field map');
    expect(EXTRACTION_GENERATION_TEMPLATE).toContain('Compila sempre fields con tutte le chiavi della field map');
    expect(EXTRACTION_GENERATION_TEMPLATE).toContain('Critical fields first');
    expect(EXTRACTION_GENERATION_TEMPLATE).toContain('Restituisci solo JSON valido, senza testo extra');
    expect(EXTRACTION_GENERATION_TEMPLATE).toContain('JSON valido con fields parziali/null');
  });
});
