import { defineConfig, devices } from '@playwright/test';

const nodeProcess = (
  globalThis as {
    process?: { platform?: string; env?: Record<string, string | undefined> };
  }
).process;
const isCI = Boolean(nodeProcess?.env?.CI);
const previewPort = nodeProcess?.env?.PLAYWRIGHT_PORT ?? '4173';
const baseUrl = `http://127.0.0.1:${previewPort}`;

const executablePath =
  nodeProcess?.env?.PLAYWRIGHT_CHROMIUM_PATH ??
  (nodeProcess?.platform === 'linux' ? '/usr/bin/chromium' : undefined);

const launchOptions = {
  ...(executablePath ? { executablePath } : {}),
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-crash-reporter',
  ],
  env: {
    ...((nodeProcess?.env ?? {}) as Record<string, string>),
    XDG_CONFIG_HOME: '/tmp/pw-chrome-cfg',
    XDG_CACHE_HOME: '/tmp/pw-chrome-cache',
  },
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry',
    launchOptions,
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions },
    },
    {
      name: 'android-mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, launchOptions },
    },
  ],
  webServer: {
    command: `./node_modules/.bin/vite preview --host 127.0.0.1 --port ${previewPort}`,
    url: baseUrl,
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
});
