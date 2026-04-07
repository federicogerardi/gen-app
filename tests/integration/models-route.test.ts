/** @jest-environment node */

import { GET } from '@/app/api/models/route';
import { auth } from '@/lib/auth';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;

describe('GET /api/models', () => {
  it('returns models for authenticated users', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1', role: 'user' } } as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'openai/gpt-4-turbo' }),
      ]),
    );
  });

  it('returns 401 for unauthenticated users', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
});