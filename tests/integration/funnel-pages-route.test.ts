/** @jest-environment node */

import { POST } from '@/app/api/tools/funnel-pages/generate/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { createArtifactStream } from '@/lib/llm/streaming';
import {
  buildFunnelOptinPrompt,
  buildFunnelQuizPrompt,
  buildFunnelVslPrompt,
} from '@/lib/tool-prompts/funnel-pages';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn() }));
jest.mock('@/lib/llm/streaming', () => ({ createArtifactStream: jest.fn() }));
jest.mock('@/lib/tool-prompts/funnel-pages', () => ({
  buildFunnelOptinPrompt: jest.fn(),
  buildFunnelQuizPrompt: jest.fn(),
  buildFunnelVslPrompt: jest.fn(),
}));

jest.mock('@/lib/db', () => jest.requireActual('./db-mock').createDbMock());

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockedStream = createArtifactStream as jest.MockedFunction<typeof createArtifactStream>;
const mockedOptinPrompt = buildFunnelOptinPrompt as jest.MockedFunction<typeof buildFunnelOptinPrompt>;
const mockedQuizPrompt = buildFunnelQuizPrompt as jest.MockedFunction<typeof buildFunnelQuizPrompt>;
const mockedVslPrompt = buildFunnelVslPrompt as jest.MockedFunction<typeof buildFunnelVslPrompt>;
const findUser = db.user.findUnique as jest.Mock;
const findProject = db.project.findUnique as jest.Mock;
const findActiveModel = db.llmModel.findFirst as jest.Mock;

const projectId = 'cjld2cyuq0000t3rmniod1foy';
const baseBody = {
  projectId,
  model: 'openai/gpt-4-turbo',
  tone: 'professional',
  step: 'optin',
  product: 'Corso AI',
  audience: 'Freelancer',
  offer: 'Sconto 50%',
  promise: 'Piu clienti',
};

const makeRequest = (payload: unknown) =>
  new Request('http://localhost/api/tools/funnel-pages/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 10 });
  mockedStream.mockResolvedValue(new ReadableStream());
  mockedOptinPrompt.mockResolvedValue('OPTIN PROMPT');
  mockedQuizPrompt.mockResolvedValue('QUIZ PROMPT');
  mockedVslPrompt.mockResolvedValue('VSL PROMPT');
  findActiveModel.mockImplementation(async ({ where }: { where?: { modelId?: string } }) => (
    where?.modelId === 'openai/gpt-4-turbo' ? { id: 'model_1' } : null
  ));
  findUser.mockResolvedValue({ id: 'user_1', monthlyUsed: 1, monthlyQuota: 100, monthlySpent: '1', monthlyBudget: '10' });
  findProject.mockResolvedValue({ id: projectId, userId: 'user_1' });
});

describe('POST /api/tools/funnel-pages/generate', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(makeRequest(baseBody));
    expect(res.status).toBe(401);
  });

  it('returns 400 when quiz step misses optinOutput', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const res = await POST(makeRequest({ ...baseBody, step: 'quiz' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when vsl step misses outputs', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const res = await POST(makeRequest({ ...baseBody, step: 'vsl', optinOutput: 'x' }));
    expect(res.status).toBe(400);
  });

  it('returns 429 when quota exhausted', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findUser.mockResolvedValue({ id: 'user_1', monthlyUsed: 100, monthlyQuota: 100, monthlySpent: '1', monthlyBudget: '10' });
    const res = await POST(makeRequest(baseBody));
    expect(res.status).toBe(429);
  });

  it('returns 404 when project missing', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue(null);
    const res = await POST(makeRequest(baseBody));
    expect(res.status).toBe(404);
  });

  it('routes prompt builder for optin step', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const res = await POST(makeRequest({ ...baseBody, step: 'optin' }));
    expect(res.status).toBe(200);
    expect(mockedOptinPrompt).toHaveBeenCalled();

    const streamArgs = mockedStream.mock.calls[0][0] as {
      input: { topic?: string };
      promptOverride?: string;
      streamDeadlineMs?: number;
    };
    expect(streamArgs.promptOverride).toBe('OPTIN PROMPT');
    expect(streamArgs.input.topic).toBe('funnel_optin');
    expect(streamArgs.input.topic).not.toBe('OPTIN PROMPT');
    expect(streamArgs.streamDeadlineMs).toBe(270000);
  });

  it('routes prompt builder for optin step from extracted fields payload', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const res = await POST(
      makeRequest({
        projectId,
        model: 'openai/gpt-4-turbo',
        tone: 'professional',
        step: 'optin',
        extractedFields: {
          business_type: 'B2B',
          sector_niche: 'Lead generation per PMI',
          offer_price_range: '2000-5000 EUR',
          target_profile: 'Founder PMI',
          testimonials_sources: [
            {
              quote: 'Abbiamo aumentato i lead qualificati del 45% in 60 giorni.',
              source: 'Marta B., COO',
              achieved_result: 'Pipeline piu prevedibile',
              measurable_results: '+45% lead qualificati, -28% CPL',
            },
          ],
        },
      })
    );

    expect(res.status).toBe(200);
    expect(mockedOptinPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        briefing: expect.objectContaining({
          business_context: expect.objectContaining({
            sector_niche: 'Lead generation per PMI',
          }),
          proof_context: expect.objectContaining({
            testimonials_sources: expect.arrayContaining([
              expect.objectContaining({
                quote: 'Abbiamo aumentato i lead qualificati del 45% in 60 giorni.',
                source: 'Marta B., COO',
                achieved_result: 'Pipeline piu prevedibile',
                measurable_results: '+45% lead qualificati, -28% CPL',
              }),
            ]),
          }),
        }),
      })
    );
  });

  it('routes prompt builder for quiz step', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const res = await POST(makeRequest({ ...baseBody, step: 'quiz', optinOutput: 'OPTIN OUT' }));
    expect(res.status).toBe(200);
    expect(mockedQuizPrompt).toHaveBeenCalled();
  });

  it('routes prompt builder for vsl step', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const res = await POST(makeRequest({ ...baseBody, step: 'vsl', optinOutput: 'OPTIN OUT', quizOutput: 'QUIZ OUT' }));
    expect(res.status).toBe(200);
    expect(mockedVslPrompt).toHaveBeenCalled();
    expect(mockedStream).toHaveBeenCalledWith(expect.objectContaining({ workflowType: 'funnel_pages' }));
  });

  it('returns 503 when stream creation fails', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    mockedStream.mockRejectedValue(new Error('stream down'));
    const res = await POST(makeRequest(baseBody));
    expect(res.status).toBe(503);
  });
});
