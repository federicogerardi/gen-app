import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL required'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET required'),
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY required'),
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN required'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_EMAIL_DOMAINS: z.string().default('company.com'),
  VERCEL_CRON_SECRET: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
}).superRefine((value, ctx) => {
  const isVercelProductionDeployment = value.NODE_ENV === 'production' && value.VERCEL_ENV === 'production';
  if (isVercelProductionDeployment && !value.VERCEL_CRON_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['VERCEL_CRON_SECRET'],
      message: 'VERCEL_CRON_SECRET is required in production deployments',
    });
  }
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
    UPSTASH_REDIS_REST_URL: source.UPSTASH_REDIS_REST_URL ?? (isTest ? 'https://test-upstash.local' : ''),
    UPSTASH_REDIS_REST_TOKEN: source.UPSTASH_REDIS_REST_TOKEN ?? (isTest ? 'test-upstash-token' : ''),
    VERCEL_CRON_SECRET: source.VERCEL_CRON_SECRET ?? (isTest ? 'test-cron-secret' : undefined),
  };

  return envSchema.parse(normalized);
}

export const env = parseEnv(process.env);
