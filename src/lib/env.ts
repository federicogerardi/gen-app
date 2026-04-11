import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL required'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET required'),
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY required'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_EMAIL_DOMAINS: z.string().default('company.com'),
  VERCEL_CRON_SECRET: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): AppEnv {
  const isTest = source.NODE_ENV === 'test';

  const normalized = {
    ...source,
    DATABASE_URL: source.DATABASE_URL ?? (isTest ? 'postgresql://test:test@localhost:5432/test' : ''),
    GOOGLE_CLIENT_ID: source.GOOGLE_CLIENT_ID ?? (isTest ? 'test-google-client-id' : ''),
    GOOGLE_CLIENT_SECRET: source.GOOGLE_CLIENT_SECRET ?? (isTest ? 'test-google-client-secret' : ''),
    OPENROUTER_API_KEY: source.OPENROUTER_API_KEY ?? (isTest ? 'test-openrouter-key' : ''),
  };

  return envSchema.parse(normalized);
}

export const env = parseEnv(process.env);
