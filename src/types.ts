// Worker bindings (vars + secrets). Names mirror wrangler.toml [vars] and
// `wrangler secret put` keys exactly — the CLIENT_REGISTRY at request time
// reads from this shape.
export interface Env {
  PROD_CLIENT_ID: string;
  DEV_WIN_CLIENT_ID: string;
  DEV_LINUX_CLIENT_ID: string;

  ALLOWED_ORIGINS_PROD: string;
  ALLOWED_ORIGINS_DEV_WIN: string;
  ALLOWED_ORIGINS_DEV_LINUX: string;

  BUNGIE_CLIENT_SECRET_PROD: string;
  BUNGIE_API_KEY_PROD: string;
  BUNGIE_CLIENT_SECRET_DEV_WIN: string;
  BUNGIE_API_KEY_DEV_WIN: string;
  BUNGIE_CLIENT_SECRET_DEV_LINUX: string;
  BUNGIE_API_KEY_DEV_LINUX: string;
}

export interface ClientConfig {
  secret: string;
  apiKey: string;
  allowedOrigins: string[];
}

export type ClientRegistry = Record<string, ClientConfig>;
