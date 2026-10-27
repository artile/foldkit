import { defineConfig } from '/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/node_modules/.pnpm/@playwright+test@1.63.0/node_modules/@playwright/test/index.mjs'

export default defineConfig({
  testDir: '/home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1628-cold-vite-cache/reproduction',
  testMatch: 'cold-cache.spec.ts',
  fullyParallel: true,
  workers: 3,
  retries: 0,
  timeout: 30000,
  reporter: 'list',
  outputDir: process.env['REPRO_OUTPUT_DIR'] ?? '/home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1628-cold-vite-cache/reproduction/results',
  use: {
    baseURL: 'http://localhost:5180',
    launchOptions: { executablePath: '/usr/bin/chromium' },
  },
  webServer: {
    command: process.env['REPRO_MODE'] ? 'node /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1628-cold-vite-cache/reproduction/control-server.mjs' : 'pnpm -C /home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/examples/api-cache-query exec vite --port 5180 --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: false,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
