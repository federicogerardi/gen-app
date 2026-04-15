import packageJson from '../../package.json';
import { getRuntimeInfo } from '@/lib/runtime-info';

describe('getRuntimeInfo', () => {
  it('maps production channel and uses NEXT_PUBLIC_APP_VERSION', () => {
    const info = getRuntimeInfo({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_VERSION: '1.2.3',
    });

    expect(info.channel).toBe('production');
    expect(info.channelLabel).toBe('PROD');
    expect(info.appVersion).toBe('1.2.3');
    expect(info.versionLabel).toBe('v1.2.3');
    expect(info.isNonProduction).toBe(false);
  });

  it('maps preview channel from VERCEL_ENV and uses NEXT_PUBLIC_APP_VERSION', () => {
    const info = getRuntimeInfo({
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_APP_VERSION: '2.0.0-beta.1',
    });

    expect(info.channel).toBe('preview');
    expect(info.channelLabel).toBe('PREVIEW');
    expect(info.appVersion).toBe('2.0.0-beta.1');
    expect(info.versionLabel).toBe('v2.0.0-beta.1');
    expect(info.isNonProduction).toBe(true);
  });

  it('falls back to package.json version in development when env version is absent', () => {
    const info = getRuntimeInfo({
      NODE_ENV: 'development',
    });

    expect(info.channel).toBe('development');
    expect(info.channelLabel).toBe('DEV');
    expect(info.appVersion).toBe(packageJson.version);
    expect(info.versionLabel).toBe(`v${packageJson.version}`);
    expect(info.isNonProduction).toBe(true);
  });

  it('falls back to package.json version in test environment when env version is absent', () => {
    const info = getRuntimeInfo({
      NODE_ENV: 'test',
    });

    expect(info.channel).toBe('test');
    expect(info.channelLabel).toBe('DEV');
    expect(info.appVersion).toBe(packageJson.version);
    expect(info.versionLabel).toBe(`v${packageJson.version}`);
    expect(info.isNonProduction).toBe(true);
  });

  it('uses safe fallback for malformed NEXT_PUBLIC_APP_VERSION in non-production', () => {
    const info = getRuntimeInfo({
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_VERSION: 'not-semver',
    });

    expect(info.channel).toBe('development');
    expect(info.channelLabel).toBe('DEV');
    expect(info.appVersion).toBe('0.0.0-unknown');
    expect(info.versionLabel).toBe('v0.0.0-unknown');
    expect(info.isNonProduction).toBe(true);
  });

  it('uses safe fallback for empty NEXT_PUBLIC_APP_VERSION in non-production', () => {
    const info = getRuntimeInfo({
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_VERSION: '   ',
    });

    expect(info.channel).toBe('development');
    expect(info.channelLabel).toBe('DEV');
    expect(info.appVersion).toBe('0.0.0-unknown');
    expect(info.versionLabel).toBe('v0.0.0-unknown');
    expect(info.isNonProduction).toBe(true);
  });

  it('falls back to package.json version in local production-like build when NEXT_PUBLIC_APP_VERSION is missing', () => {
    const info = getRuntimeInfo({
      NODE_ENV: 'production',
    });

    expect(info.channel).toBe('production');
    expect(info.channelLabel).toBe('PROD');
    expect(info.appVersion).toBe(packageJson.version);
    expect(info.versionLabel).toBe(`v${packageJson.version}`);
    expect(info.isNonProduction).toBe(false);
  });

  it('throws in vercel production when NEXT_PUBLIC_APP_VERSION is missing', () => {
    expect(() =>
      getRuntimeInfo({
        NODE_ENV: 'production',
        VERCEL_ENV: 'production',
      }),
    ).toThrow('NEXT_PUBLIC_APP_VERSION is required and must be semver-compatible in production runtime.');
  });

  it('throws in vercel production when NEXT_PUBLIC_APP_VERSION is malformed', () => {
    expect(() =>
      getRuntimeInfo({
        NODE_ENV: 'production',
        VERCEL_ENV: 'production',
        NEXT_PUBLIC_APP_VERSION: 'invalid',
      }),
    ).toThrow('NEXT_PUBLIC_APP_VERSION is required and must be semver-compatible in production runtime.');
  });
});