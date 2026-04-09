import { buildMetaAdsPrompt } from '@/lib/tool-prompts/meta-ads';
import {
  buildFunnelOptinPrompt,
  buildFunnelQuizPrompt,
  buildFunnelVslPrompt,
} from '@/lib/tool-prompts/funnel-pages';
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
});
