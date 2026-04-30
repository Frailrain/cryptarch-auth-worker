export const BUNGIE_TOKEN_URL = 'https://www.bungie.net/platform/app/oauth/token/';

export interface BungieTokenCall {
  clientId: string;
  clientSecret: string;
  body: URLSearchParams;
}

export interface BungiePassthrough {
  status: number;
  body: string;
  contentType: string;
}

export async function callBungieToken(call: BungieTokenCall): Promise<BungiePassthrough> {
  const auth = btoa(`${call.clientId}:${call.clientSecret}`);
  const response = await fetch(BUNGIE_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: call.body.toString(),
  });
  const body = await response.text();
  const contentType = response.headers.get('content-type') ?? 'application/json';
  return { status: response.status, body, contentType };
}
