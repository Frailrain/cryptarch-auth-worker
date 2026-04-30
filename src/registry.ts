import type { ClientRegistry, Env } from './types';

function parseOrigins(s: string | undefined): string[] {
  if (!s) return [];
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

export function buildRegistry(env: Env): ClientRegistry {
  const registry: ClientRegistry = {};
  const entries: Array<{
    id: string;
    secret: string;
    apiKey: string;
    origins: string;
  }> = [
    {
      id: env.PROD_CLIENT_ID,
      secret: env.BUNGIE_CLIENT_SECRET_PROD,
      apiKey: env.BUNGIE_API_KEY_PROD,
      origins: env.ALLOWED_ORIGINS_PROD,
    },
    {
      id: env.DEV_WIN_CLIENT_ID,
      secret: env.BUNGIE_CLIENT_SECRET_DEV_WIN,
      apiKey: env.BUNGIE_API_KEY_DEV_WIN,
      origins: env.ALLOWED_ORIGINS_DEV_WIN,
    },
    {
      id: env.DEV_LINUX_CLIENT_ID,
      secret: env.BUNGIE_CLIENT_SECRET_DEV_LINUX,
      apiKey: env.BUNGIE_API_KEY_DEV_LINUX,
      origins: env.ALLOWED_ORIGINS_DEV_LINUX,
    },
  ];
  for (const entry of entries) {
    if (!entry.id) continue;
    registry[entry.id] = {
      secret: entry.secret ?? '',
      apiKey: entry.apiKey ?? '',
      allowedOrigins: parseOrigins(entry.origins),
    };
  }
  return registry;
}
