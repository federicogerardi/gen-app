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

    let config!: { headers?: () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>> };
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      config = require('../../next.config').default;
    });

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
