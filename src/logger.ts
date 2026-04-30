// Structured JSON logger. Workers ship console.log to Tail/Logpush as-is.
// NEVER include: code, access_token, refresh_token, client_secret, request
// or response bodies. Caller must pre-redact.

export interface LogFields {
  endpoint: string;
  status: number;
  rateLimit: 'allowed' | 'rejected' | 'skipped';
  clientId?: string;
  rateLimitCount?: number;
  ip?: string;
  reason?: string;
}

export function logRequest(fields: LogFields): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      ...fields,
    }),
  );
}
