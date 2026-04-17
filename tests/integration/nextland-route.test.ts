/** @jest-environment node */

import { POST } from '@/app/api/tools/nextland/generate/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { createArtifactStream } from '@/lib/llm/streaming';
import {
  buildNextLandLandingPrompt,
  buildNextLandThankYouPrompt,
} from '@/lib/tool-prompts/nextland';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn() }));
jest.mock('@/lib/llm/streaming', () => ({ createArtifactStream: jest.fn() }));
jest.mock('@/lib/tool-prompts/nextland', () => ({
  buildNextLandLandingPrompt: jest.fn(),
  buildNextLandThankYouPrompt: jest.fn(),
}));

jest.mock('@/lib/db', () => jest.requireActual('./db-mock').createDbMock());

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockedStream = createArtifactStream as jest.MockedFunction<typeof createArtifactStream>;
const mockedLandingPrompt = buildNextLandLandingPrompt as jest.MockedFunction<typeof buildNextLandLandingPrompt>;
const mockedThankYouPrompt = buildNextLandThankYouPrompt as jest.MockedFunction<typeof buildNextLandThankYouPrompt>;
const findUser = db.user.findUnique as jest.Mock;
const findProject = db.project.findUnique as jest.Mock;
const findActiveModel = db.llmModel.findFirst as jest.Mock;

const projectId = 'cjld2cyuq0000t3rmniod1foy';
const baseBody = {
  projectId,
  model: 'openai/gpt-4-turbo',
  tone: 'professional',
  step: 'landing',
  extractionContext: 'Contesto estratto molto dettagliato con target, offerta e CTA primaria.',
};

const makeRequest = (payload: unknown) =>
  new Request('http://localhost/api/tools/nextland/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 10 });
  mockedStream.mockResolvedValue(new ReadableStream());
  mockedLandingPrompt.mockResolvedValue('NEXTLAND LANDING PROMPT');
  mockedThankYouPrompt.mockResolvedValue('NEXTLAND THANK YOU PROMPT');
  findActiveModel.mockImplementation(async ({ where }: { where?: { modelId?: string } }) => (
    where?.modelId === 'openai/gpt-4-turbo' ? { id: 'model_1' } : null
  ));
  findUser.mockResolvedValue({ id: 'user_1', monthlyUsed: 1, monthlyQuota: 100, monthlySpent: '1', monthlyBudget: '10' });
  findProject.mockResolvedValue({ id: projectId, userId: 'user_1' });
});

describe('POST /api/tools/nextland/generate', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(makeRequest(baseBody));
    expect(res.status).toBe(401);
  });

  it('returns 400 when thank_you step misses landingOutput', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const res = await POST(makeRequest({ ...baseBody, step: 'thank_you' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when project missing', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue(null);
    const res = await POST(makeRequest(baseBody));
    expect(res.status).toBe(404);
  });

  it('routes prompt builder for landing step', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const res = await POST(makeRequest(baseBody));

    expect(res.status).toBe(200);
    expect(mockedLandingPrompt).toHaveBeenCalled();

    const streamArgs = mockedStream.mock.calls[0][0] as {
      input: { topic?: string };
      promptOverride?: string;
      streamDeadlineMs?: number;
      workflowType?: string;
    };
    expect(streamArgs.promptOverride).toBe('NEXTLAND LANDING PROMPT');
    expect(streamArgs.input.topic).toBe('nextland_landing');
    expect(streamArgs.workflowType).toBe('nextland');
    expect(streamArgs.streamDeadlineMs).toBe(270000);
  });

  it('routes prompt builder for thank_you step with landing output', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const res = await POST(makeRequest({
      ...baseBody,
      step: 'thank_you',
      landingOutput: '# Landing pronta',
    }));

    expect(res.status).toBe(200);
    expect(mockedThankYouPrompt).toHaveBeenCalledWith(expect.objectContaining({ landingOutput: '# Landing pronta' }));
  });

  it('returns 503 when stream creation fails', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    mockedStream.mockRejectedValue(new Error('stream down'));
    const res = await POST(makeRequest(baseBody));
    expect(res.status).toBe(503);
  });
});