import { parseEnv } from '@/lib/env';

describe('parseEnv', () => {
  it('parses required vars in production mode', () => {
    const parsed = parseEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
      OPENROUTER_API_KEY: 'openrouter-key',
      VERCEL_CRON_SECRET: 'cron-secret',
      NEXT_PUBLIC_APP_URL: 'https://example.com',
      ALLOWED_EMAIL_DOMAINS: 'company.com,example.com',
    });

    expect(parsed.NODE_ENV).toBe('production');
    expect(parsed.DATABASE_URL).toContain('postgresql://');
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe('https://example.com');
  });

  it('throws in production mode when required vars are missing', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: 'https://example.com',
      }),
    ).toThrow();
  });

  it('uses safe defaults in test mode for required secrets', () => {
    const parsed = parseEnv({
      NODE_ENV: 'test',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    });

    expect(parsed.NODE_ENV).toBe('test');
    expect(parsed.DATABASE_URL).toContain('postgresql://test:test@localhost:5432/test');
    expect(parsed.OPENROUTER_API_KEY).toBe('test-openrouter-key');
    expect(parsed.VERCEL_CRON_SECRET).toBe('test-cron-secret');
  });
});
