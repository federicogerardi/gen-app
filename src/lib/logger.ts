import pino, { type Logger } from 'pino';
import { env } from '@/lib/env';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'authorization',
  'cookie',
  'token',
  'accessToken',
  'refreshToken',
];

const baseLogger = pino({
  level: env.LOG_LEVEL ?? (env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  base: {
    service: 'gen-app',
    env: env.NODE_ENV,
  },
});

export type RequestLogContext = {
  requestId: string;
  route: string;
  userId?: string;
  method?: string;
};

export function getRequestLogger(context: RequestLogContext): Logger {
  return baseLogger.child(context);
}

export const logger = baseLogger;
