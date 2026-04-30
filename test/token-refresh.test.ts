import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import {
  DEV_WIN_CLIENT_ID,
  DEV_WIN_ORIGIN,
  PROD_CLIENT_ID,
  PROD_ORIGIN,
  mockBungieResponse,
  post,
  setupFetchMocks,
} from './helpers';

setupFetchMocks();

describe('POST /token/refresh', () => {
  it('forwards Bungie 200 on the happy path', async () => {
    const tokenPayload = {
      access_token: 'new-access',
      expires_in: 3600,
      refresh_token: 'new-refresh',
      refresh_expires_in: 7_776_000,
      membership_id: '1234',
      token_type: 'Bearer',
    };
    mockBungieResponse(200, tokenPayload);

    const res = await post(SELF, '/token/refresh', {
      origin: PROD_ORIGIN,
      body: { refresh_token: 'old-refresh', client_id: PROD_CLIENT_ID },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(tokenPayload);
  });

  it('forwards Bungie 401 (refresh-expired) 1:1', async () => {
    mockBungieResponse(401, { error: 'invalid_grant', error_description: 'refresh token expired' });

    const res = await post(SELF, '/token/refresh', {
      origin: PROD_ORIGIN,
      body: { refresh_token: 'dead-refresh', client_id: PROD_CLIENT_ID },
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: 'invalid_grant' });
  });

  it('returns 400 on missing refresh_token', async () => {
    const res = await post(SELF, '/token/refresh', {
      origin: PROD_ORIGIN,
      body: { client_id: PROD_CLIENT_ID },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'missing_fields' });
  });

  it('returns 403 on origin mismatch (origin not in client allowlist)', async () => {
    const res = await post(SELF, '/token/refresh', {
      origin: PROD_ORIGIN,
      body: { refresh_token: 'r', client_id: DEV_WIN_CLIENT_ID },
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'origin_mismatch' });
  });

  it('accepts a different client+origin pair from the registry', async () => {
    mockBungieResponse(200, {
      access_token: 'a',
      expires_in: 3600,
      refresh_token: 'b',
      refresh_expires_in: 7_776_000,
      membership_id: '999',
    });
    const res = await post(SELF, '/token/refresh', {
      origin: DEV_WIN_ORIGIN,
      body: { refresh_token: 'old', client_id: DEV_WIN_CLIENT_ID },
    });
    expect(res.status).toBe(200);
  });
});
