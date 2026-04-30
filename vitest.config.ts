import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

const TEST_BINDINGS = {
  PROD_CLIENT_ID: 'prod-client',
  DEV_WIN_CLIENT_ID: 'dev-win-client',
  DEV_LINUX_CLIENT_ID: 'dev-linux-client',
  ALLOWED_ORIGINS_PROD: 'chrome-extension://prod-id',
  ALLOWED_ORIGINS_DEV_WIN: 'chrome-extension://dev-win-id,chrome-extension://dev-win-alt',
  ALLOWED_ORIGINS_DEV_LINUX: 'chrome-extension://dev-linux-id',
  BUNGIE_CLIENT_SECRET_PROD: 'prod-secret',
  BUNGIE_API_KEY_PROD: 'prod-api-key',
  BUNGIE_CLIENT_SECRET_DEV_WIN: 'dev-win-secret',
  BUNGIE_API_KEY_DEV_WIN: 'dev-win-api-key',
  BUNGIE_CLIENT_SECRET_DEV_LINUX: 'dev-linux-secret',
  BUNGIE_API_KEY_DEV_LINUX: 'dev-linux-api-key',
};

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        miniflare: {
          bindings: TEST_BINDINGS,
          compatibilityFlags: ['nodejs_compat'],
        },
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
});
