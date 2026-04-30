import { fetchMock } from 'cloudflare:test';
import { beforeEach, afterEach } from 'vitest';
import { __resetRateLimitForTests } from '../src/rate-limit';

export const PROD_ORIGIN = 'chrome-extension://prod-id';
export const PROD_CLIENT_ID = 'prod-client';
export const DEV_WIN_CLIENT_ID = 'dev-win-client';
export const DEV_WIN_ORIGIN = 'chrome-extension://dev-win-id';
export const REDIRECT_URI = 'https://prod-id.chromiumapp.org/';

export function setupFetchMocks(): void {
  beforeEach(() => {
    __resetRateLimitForTests();
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });
  afterEach(() => {
    fetchMock.assertNoPendingInterceptors();
  });
}

export function mockBungieResponse(status: number, body: object): void {
  fetchMock
    .get('https://www.bungie.net')
    .intercept({
      path: '/platform/app/oauth/token/',
      method: 'POST',
    })
    .reply(status, body, {
      headers: { 'content-type': 'application/json' },
    });
}

export interface PostOpts {
  origin?: string;
  body?: unknown;
  rawBody?: string;
}

export async function post(
  worker: { fetch: (req: Request) => Promise<Response> },
  path: string,
  opts: PostOpts = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'cf-connecting-ip': '203.0.113.1',
  };
  if (opts.origin !== undefined) headers['Origin'] = opts.origin;
  const init: RequestInit = {
    method: 'POST',
    headers,
    body: opts.rawBody ?? JSON.stringify(opts.body ?? {}),
  };
  return worker.fetch(new Request(`http://test${path}`, init));
}
