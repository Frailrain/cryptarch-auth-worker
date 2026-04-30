import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import {
  PROD_CLIENT_ID,
  PROD_ORIGIN,
  REDIRECT_URI,
  mockBungieResponse,
  setupFetchMocks,
} from './helpers';
import { fetchMock } from 'cloudflare:test';

setupFetchMocks();

const tokenPayload = {
  access_token: 'a',
  expires_in: 3600,
  refresh_token: 'r',
  refresh_expires_in: 7_776_000,
  membership_id: '1',
};

function reqFromIp(ip: string): Request {
  return new Request('http://test/token/exchange', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'cf-connecting-ip': ip,
      Origin: PROD_ORIGIN,
    },
    body: JSON.stringify({
      code: 'c',
      client_id: PROD_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
    }),
  });
}

describe('per-IP rate limit', () => {
  it('allows the 60th request and rejects the 61st with 429', async () => {
    // Each request triggers exactly one Bungie call until rate-limit kicks in.
    for (let i = 0; i < 60; i++) mockBungieResponse(200, tokenPayload);

    for (let i = 1; i <= 60; i++) {
      const res = await SELF.fetch(reqFromIp('198.51.100.7'));
      expect(res.status, `request #${i}`).toBe(200);
    }

    const blocked = await SELF.fetch(reqFromIp('198.51.100.7'));
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: 'rate_limited' });

    // No Bungie call should have been issued for the rejected request.
    fetchMock.assertNoPendingInterceptors();
  });

  it('tracks separate buckets per IP', async () => {
    mockBungieResponse(200, tokenPayload);

    const a = await SELF.fetch(reqFromIp('198.51.100.10'));
    expect(a.status).toBe(200);

    mockBungieResponse(200, tokenPayload);
    const b = await SELF.fetch(reqFromIp('198.51.100.11'));
    expect(b.status).toBe(200);
  });
});
