import { expect, test } from '@playwright/test';

function expectKnownResponseEnvelope(contentType: string): void {
  expect(
    contentType.includes('application/json')
    || contentType.includes('text/html')
    || contentType.includes('text/event-stream'),
  ).toBe(true);
}

test('artifact generation flow smoke responds with known envelope', async ({ request }) => {
  const response = await request.post('/api/artifacts/generate', {
    data: {
      projectId: 'ckv0000000000000000000000',
      type: 'content',
      model: 'openai/gpt-4-turbo',
      input: { topic: 'smoke-test' },
    },
  });

  expect(response.status()).toBeLessThan(500);
  const contentType = response.headers()['content-type'] ?? '';
  expectKnownResponseEnvelope(contentType);
});

test('document upload flow smoke responds with known envelope', async ({ request }) => {
  const response = await request.post('/api/tools/funnel-pages/upload', {
    data: { projectId: 'ckv0000000000000000000000' },
  });

  expect(response.status()).toBeLessThan(500);
  const contentType = response.headers()['content-type'] ?? '';
  expectKnownResponseEnvelope(contentType);
});

test('admin quota update flow smoke responds with known envelope', async ({ request }) => {
  const response = await request.put('/api/admin/users/user_smoke/quota', {
    data: {
      monthlyQuota: 100,
      monthlyBudget: 25,
      resetUsage: true,
    },
  });

  expect(response.status()).toBeLessThan(500);
  const contentType = response.headers()['content-type'] ?? '';
  expectKnownResponseEnvelope(contentType);
});
