import 'server-only';

import packageJson from '../../package.json';

export type RuntimeChannel = 'production' | 'preview' | 'development' | 'test';

export type RuntimeInfo = {
  channel: RuntimeChannel;
  channelLabel: 'PROD' | 'PREVIEW' | 'DEV';
  appVersion: string;
  versionLabel: string;
  isNonProduction: boolean;
};

const FALLBACK_APP_VERSION = '0.0.0-unknown';
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isSemverCompatible(value: string): boolean {
  return SEMVER_PATTERN.test(value);
}

function getChannelLabel(channel: RuntimeChannel): RuntimeInfo['channelLabel'] {
  if (channel === 'production') return 'PROD';
  if (channel === 'preview') return 'PREVIEW';
  return 'DEV';
}

function resolveChannel(source: NodeJS.ProcessEnv): RuntimeChannel {
  const vercelEnv = normalizeEnvValue(source.VERCEL_ENV)?.toLowerCase();
  if (vercelEnv) {
    if (vercelEnv === 'production') return 'production';
    if (vercelEnv === 'preview') return 'preview';
    if (vercelEnv === 'development') return 'development';
    return 'development';
  }

  const nodeEnv = normalizeEnvValue(source.NODE_ENV)?.toLowerCase();
  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'test') return 'test';
  if (nodeEnv === 'development') return 'development';
  return 'development';
}

function resolveNonProductionVersion(source: NodeJS.ProcessEnv): string {
  const hasEnvVersion = Object.prototype.hasOwnProperty.call(source, 'NEXT_PUBLIC_APP_VERSION');
  const envVersion = normalizeEnvValue(source.NEXT_PUBLIC_APP_VERSION);
  if (hasEnvVersion) {
    if (envVersion && isSemverCompatible(envVersion)) return envVersion;
    console.warn('[runtime-info] NEXT_PUBLIC_APP_VERSION malformed in non-production. Using safe fallback.', {
      value: source.NEXT_PUBLIC_APP_VERSION,
    });
    return FALLBACK_APP_VERSION;
  }

  const packageVersion = normalizeEnvValue(packageJson.version);
  if (packageVersion && isSemverCompatible(packageVersion)) {
    return packageVersion;
  }

  console.warn('[runtime-info] package.json version malformed in non-production. Using safe fallback.', {
    value: packageJson.version,
  });
  return FALLBACK_APP_VERSION;
}

function resolvePackageVersion(): string {
  const packageVersion = normalizeEnvValue(packageJson.version);
  if (packageVersion && isSemverCompatible(packageVersion)) {
    return packageVersion;
  }

  console.warn('[runtime-info] package.json version malformed. Using safe fallback.', {
    value: packageJson.version,
  });
  return FALLBACK_APP_VERSION;
}

export function getRuntimeInfo(source: NodeJS.ProcessEnv = process.env): RuntimeInfo {
  const channel = resolveChannel(source);
  const channelLabel = getChannelLabel(channel);
  const isNonProduction = channel !== 'production';
  const vercelEnv = normalizeEnvValue(source.VERCEL_ENV)?.toLowerCase();
  const isVercelProduction = vercelEnv === 'production';

  let appVersion: string;
  if (channel === 'production') {
    const requiredVersion = normalizeEnvValue(source.NEXT_PUBLIC_APP_VERSION);
    if (requiredVersion && isSemverCompatible(requiredVersion)) {
      appVersion = requiredVersion;
    } else if (isVercelProduction) {
      throw new Error('NEXT_PUBLIC_APP_VERSION is required and must be semver-compatible in production runtime.');
    } else {
      console.warn('[runtime-info] Missing or malformed NEXT_PUBLIC_APP_VERSION outside Vercel production. Falling back to package.json version.', {
        value: source.NEXT_PUBLIC_APP_VERSION,
      });
      appVersion = resolvePackageVersion();
    }
  } else {
    appVersion = resolveNonProductionVersion(source);
  }

  return {
    channel,
    channelLabel,
    appVersion,
    versionLabel: `v${appVersion}`,
    isNonProduction,
  };
}