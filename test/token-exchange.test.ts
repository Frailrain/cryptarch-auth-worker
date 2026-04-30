import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import {
  PROD_CLIENT_ID,
  PROD_ORIGIN,
  REDIRECT_URI,
  mockBungieResponse,
  post,
  setupFetchMocks,
} from './helpers';

setupFetchMocks();

describe('POST /token/exchange', () => {
  it('forwards Bungie 200 on the happy path', async () => {
    const tokenPayload = {
      access_token: 'access-abc',
      expires_in: 3600,
      refresh_token: 'refresh-def',
      refresh_expires_in: 7_776_000,
      membership_id: '1234',
      token_type: 'Bearer',
    };
    mockBungieResponse(200, tokenPayload);

    const res = await post(SELF, '/token/exchange', {
      origin: PROD_ORIGIN,
      body: { code: 'authcode', client_id: PROD_CLIENT_ID, redirect_uri: REDIRECT_URI },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(tokenPayload);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(PROD_ORIGIN);
  });

  it('returns 400 on missing code', async () => {
    const res = await post(SELF, '/token/exchange', {
      origin: PROD_ORIGIN,
      body: { client_id: PROD_CLIENT_ID, redirect_uri: REDIRECT_URI },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'missing_fields' });
  });

  it('returns 400 on missing redirect_uri', async () => {
    const res = await post(SELF, '/token/exchange', {
      origin: PROD_ORIGIN,
      body: { code: 'authcode', client_id: PROD_CLIENT_ID },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'missing_fields' });
  });

  it('returns 400 on unknown client_id', async () => {
    const res = await post(SELF, '/token/exchange', {
      origin: PROD_ORIGIN,
      body: { code: 'authcode', client_id: 'who-dis', redirect_uri: REDIRECT_URI },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'unknown_client' });
  });

  it('returns 403 on origin mismatch', async () => {
    const res = await post(SELF, '/token/exchange', {
      origin: 'https://evil.example.com',
      body: { code: 'authcode', client_id: PROD_CLIENT_ID, redirect_uri: REDIRECT_URI },
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'origin_mismatch' });
  });

  it('returns 403 on missing Origin header', async () => {
    const res = await post(SELF, '/token/exchange', {
      body: { code: 'authcode', client_id: PROD_CLIENT_ID, redirect_uri: REDIRECT_URI },
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'origin_mismatch' });
  });

  it('returns 400 on malformed JSON', async () => {
    const res = await post(SELF, '/token/exchange', {
      origin: PROD_ORIGIN,
      rawBody: '{not-json',
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'malformed_json' });
  });

  it('forwards Bungie 4xx body and status 1:1', async () => {
    mockBungieResponse(400, { error: 'invalid_grant', error_description: 'expired code' });

    const res = await post(SELF, '/token/exchange', {
      origin: PROD_ORIGIN,
      body: { code: 'expired', client_id: PROD_CLIENT_ID, redirect_uri: REDIRECT_URI },
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'invalid_grant',
      error_description: 'expired code',
    });
  });

  it('forwards Bungie 5xx body and status 1:1', async () => {
    mockBungieResponse(503, { error: 'upstream_unavailable' });

    const res = await post(SELF, '/token/exchange', {
      origin: PROD_ORIGIN,
      body: { code: 'authcode', client_id: PROD_CLIENT_ID, redirect_uri: REDIRECT_URI },
    });

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'upstream_unavailable' });
  });

  it('answers OPTIONS preflight with permissive CORS', async () => {
    const res = await SELF.fetch(
      new Request('http://test/token/exchange', {
        method: 'OPTIONS',
        headers: {
          Origin: PROD_ORIGIN,
          'Access-Control-Request-Method': 'POST',
        },
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(PROD_ORIGIN);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});
