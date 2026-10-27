import { defineConfig } from '/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/node_modules/.pnpm/@playwright+test@1.63.0/node_modules/@playwright/test/index.mjs'

const artifact = '/home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1628-cold-vite-cache/reproduction'
const isSource = process.env.EXAMPLE_VERIFY_SOURCE === '1'
export default defineConfig({
  testDir: artifact,
  testMatch: isSource ? 'local-source-edit.spec.ts' : 'local-startup.spec.ts',
  fullyParallel: true,
  workers: isSource ? 1 : 3,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  outputDir: process.env.REPRO_OUTPUT_DIR,
  use: {
    baseURL: 'http://localhost:5180',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? '/usr/bin/chromium' },
  },
  webServer: {
    command: `${process.execPath} ${artifact}/local-server.mjs`,
    url: 'http://localhost:5180',
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
