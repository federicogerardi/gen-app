/** @jest-environment node */

describe('next config security headers', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('defines global security headers with required keys', async () => {
    jest.doMock('@sentry/nextjs', () => ({
      withSentryConfig: (config: unknown) => config,
    }));

    const imported = await import('../../next.config');
    const config = imported.default as {
      headers?: () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>>;
    };

    expect(typeof config.headers).toBe('function');
    const rules = await config.headers!();

    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe('/:path*');

    const headerKeys = rules[0].headers.map((header) => header.key);
    expect(headerKeys).toEqual(expect.arrayContaining([
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Strict-Transport-Security',
    ]));
  });
});
