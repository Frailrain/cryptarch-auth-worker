import { Hono } from 'hono';
import { callBungieToken } from './bungie';
import { logRequest } from './logger';
import { checkRateLimit } from './rate-limit';
import { buildRegistry } from './registry';
import type { ClientConfig, Env } from './types';

type AppCtx = { Bindings: Env };

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

// Always reflect the request Origin in CORS headers when present. Origin
// allowlisting happens in the handler and returns 403 — CORS is just the
// transport that lets the extension JS read that error body.
function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowOrigin = origin ?? '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function jsonError(
  status: number,
  error: string,
  origin: string | undefined,
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders(origin), ...JSON_HEADERS },
  });
}

interface ValidatedRequest {
  client: ClientConfig;
  clientId: string;
}

function validateClientAndOrigin(
  env: Env,
  clientId: unknown,
  origin: string | undefined,
):
  | { ok: true; data: ValidatedRequest }
  | { ok: false; status: 400 | 403; reason: string } {
  if (typeof clientId !== 'string' || clientId.length === 0) {
    return { ok: false, status: 400, reason: 'missing_fields' };
  }
  const registry = buildRegistry(env);
  const client = registry[clientId];
  if (!client) {
    return { ok: false, status: 400, reason: 'unknown_client' };
  }
  if (!origin || !client.allowedOrigins.includes(origin)) {
    return { ok: false, status: 403, reason: 'origin_mismatch' };
  }
  return { ok: true, data: { client, clientId } };
}

async function readJsonBody(c: {
  req: { json: () => Promise<unknown> };
}): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false }> {
  try {
    const parsed = await c.req.json();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ok: true, body: parsed as Record<string, unknown> };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

const app = new Hono<AppCtx>();

app.options('/token/*', (c) => {
  const origin = c.req.header('origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
});

app.post('/token/exchange', async (c) => {
  const ip = getClientIp(c);
  const origin = c.req.header('origin');
  const endpoint = '/token/exchange';

  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    logRequest({ endpoint, status: 429, rateLimit: 'rejected', rateLimitCount: rl.count, ip });
    return jsonError(429, 'rate_limited', origin);
  }

  const parsed = await readJsonBody(c);
  if (!parsed.ok) {
    logRequest({ endpoint, status: 400, rateLimit: 'allowed', ip, reason: 'malformed_json' });
    return jsonError(400, 'malformed_json', origin);
  }

  const { code, client_id, redirect_uri } = parsed.body;
  if (typeof code !== 'string' || typeof redirect_uri !== 'string') {
    logRequest({ endpoint, status: 400, rateLimit: 'allowed', ip, reason: 'missing_fields' });
    return jsonError(400, 'missing_fields', origin);
  }

  const validation = validateClientAndOrigin(c.env, client_id, origin);
  if (!validation.ok) {
    logRequest({
      endpoint,
      status: validation.status,
      rateLimit: 'allowed',
      ip,
      reason: validation.reason,
      ...(typeof client_id === 'string' ? { clientId: client_id } : {}),
    });
    return jsonError(validation.status, validation.reason, origin);
  }

  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri,
  });

  const bungieResp = await callBungieToken({
    clientId: validation.data.clientId,
    clientSecret: validation.data.client.secret,
    body: form,
  });

  logRequest({
    endpoint,
    clientId: validation.data.clientId,
    status: bungieResp.status,
    rateLimit: 'allowed',
    ip,
  });

  return new Response(bungieResp.body, {
    status: bungieResp.status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': bungieResp.contentType,
    },
  });
});

app.post('/token/refresh', async (c) => {
  const ip = getClientIp(c);
  const origin = c.req.header('origin');
  const endpoint = '/token/refresh';

  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    logRequest({ endpoint, status: 429, rateLimit: 'rejected', rateLimitCount: rl.count, ip });
    return jsonError(429, 'rate_limited', origin);
  }

  const parsed = await readJsonBody(c);
  if (!parsed.ok) {
    logRequest({ endpoint, status: 400, rateLimit: 'allowed', ip, reason: 'malformed_json' });
    return jsonError(400, 'malformed_json', origin);
  }

  const { refresh_token, client_id } = parsed.body;
  if (typeof refresh_token !== 'string') {
    logRequest({ endpoint, status: 400, rateLimit: 'allowed', ip, reason: 'missing_fields' });
    return jsonError(400, 'missing_fields', origin);
  }

  const validation = validateClientAndOrigin(c.env, client_id, origin);
  if (!validation.ok) {
    logRequest({
      endpoint,
      status: validation.status,
      rateLimit: 'allowed',
      ip,
      reason: validation.reason,
      ...(typeof client_id === 'string' ? { clientId: client_id } : {}),
    });
    return jsonError(validation.status, validation.reason, origin);
  }

  const form = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token,
  });

  const bungieResp = await callBungieToken({
    clientId: validation.data.clientId,
    clientSecret: validation.data.client.secret,
    body: form,
  });

  logRequest({
    endpoint,
    clientId: validation.data.clientId,
    status: bungieResp.status,
    rateLimit: 'allowed',
    ip,
  });

  return new Response(bungieResp.body, {
    status: bungieResp.status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': bungieResp.contentType,
    },
  });
});

app.get('/health', (c) => c.json({ ok: true }));

app.notFound((c) => jsonError(404, 'not_found', c.req.header('origin')));

export default app;
