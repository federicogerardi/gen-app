import '@testing-library/jest-dom';

/**
 * Polyfill for Next.js API globals in Node environment.
 * These are needed because Next.js uses Web APIs that don't exist in Node.js.
 */

if (typeof global !== 'undefined' && typeof window === 'undefined') {
  // Node environment - add Web API polyfills for Next.js compatibility

  if (!globalThis.Request) {
    globalThis.Request = class {
      url: string;
      options?: Record<string, unknown>;
      constructor(url: string, options?: Record<string, unknown>) {
        this.url = url;
        this.options = options;
      }
      json(): Promise<unknown> { return Promise.resolve(null); }
      text(): Promise<string> { return Promise.resolve(''); }
    } as unknown as typeof globalThis.Request;
  }

  if (!globalThis.Response) {
    globalThis.Response = class {
      body?: unknown;
      init?: Record<string, unknown>;
      constructor(body?: unknown, init?: Record<string, unknown>) {
        this.body = body;
        this.init = init;
      }
      json(): Promise<unknown> { return Promise.resolve(null); }
      text(): Promise<string> { return Promise.resolve(''); }
    } as unknown as typeof globalThis.Response;
  }

  if (!globalThis.ReadableStream) {
    globalThis.ReadableStream = class {
      constructor() {}
    } as unknown as typeof globalThis.ReadableStream;
  }

  if (!globalThis.fetch) {
    globalThis.fetch = () => Promise.resolve(new globalThis.Response()) as ReturnType<typeof globalThis.fetch>;
  }
}
