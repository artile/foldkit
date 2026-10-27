import { test, expect } from '/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/node_modules/.pnpm/@playwright+test@1.63.0/node_modules/@playwright/test/index.mjs'
import { writeFile } from 'node:fs/promises'

for (const pageNumber of [1, 2, 3]) {
  test(`first navigation ${pageNumber} renders without optimizer invalidation`, async ({ page }, testInfo) => {
    const events = []
    const started = performance.now()
    const record = (kind, data) => events.push({ elapsedMs: performance.now() - started, kind, data })
    page.on('response', response => { if (response.status() >= 400) { record('http-error', { url: response.url(), status: response.status(), statusText: response.statusText() }) } })
    page.on('requestfailed', request => record('request-failed', { url: request.url(), failure: request.failure() }))
    page.on('pageerror', error => record('page-error', error.message))
    page.on('console', message => record('console', { type: message.type(), text: message.text() }))
    page.on('websocket', socket => {
      record('websocket-created', socket.url())
      socket.on('framereceived', frame => record('websocket-received', frame.payload))
      socket.on('framesent', frame => record('websocket-sent', frame.payload))
    })
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) { record('navigation', frame.url()) } })
    try {
      await page.goto('/')
      const slug = process.env.EXAMPLE_SLUG ?? 'api-cache-query'
      if (slug === 'counter') {
        await page.getByRole('button', { name: '+', exact: true }).click()
        await expect(page).toHaveTitle(/Counter: 1/)
      } else if (slug === 'ui-showcase') {
        await page.getByRole('link', { name: 'Button', exact: true }).first().click()
        await expect(page).toHaveURL(/\/button$/)
      } else {
        await expect(page.getByRole('button', { name: 'The Model Is the Cache' })).toBeVisible()
      }
      await expect(page.locator('#foldkit-devtools')).toBeAttached()
      record('content-passed', slug)
      const failures = events.filter(event => event.kind === 'page-error' || (event.kind === 'http-error' && (event.data.statusText.includes('Outdated Optimize Dep') || event.data.url.includes('/.vite/deps/'))) || (event.kind === 'request-failed' && event.data.url.includes('/.vite/deps/')) || (event.kind === 'websocket-received' && String(event.data).includes('full-reload')))
      expect(failures, 'V2 optimizer diagnostics').toEqual([])
    } finally {
      record('body', await page.locator('body').innerHTML().catch(error => String(error)))
      await writeFile(testInfo.outputPath('events.json'), JSON.stringify(events, null, 2))
    }
  })
}
