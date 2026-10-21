// Usage: node run.mjs <foldkit worktree>
// Serves app/ with Vite against the worktree's foldkit and @foldkit/ui source,
// then drives it in Chromium. Exits 1 when a disabled submit Button submits,
// 2 when the run itself breaks.
process.on('uncaughtException', error => {
  console.error(error)
  process.exit(2)
})
process.on('unhandledRejection', error => {
  console.error(error)
  process.exit(2)
})
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const worktree = path.resolve(process.argv[2] ?? '.')
const here = path.dirname(fileURLToPath(import.meta.url))
const fromWorktree = relative =>
  pathToFileURL(path.join(worktree, relative)).href

const { createServer } = await import(
  fromWorktree('examples/counter/node_modules/vite/dist/node/index.js')
)
const { chromium } = await import(
  fromWorktree('packages/examples-e2e/node_modules/playwright/index.mjs')
)
const { foldkitAliases } = await import(fromWorktree('examples/vite.aliases.ts'))

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })

const port = await freePort()
const server = await createServer({
  root: path.join(here, 'app'),
  configFile: false,
  logLevel: 'error',
  cacheDir: path.join(os.tmpdir(), 'issue-1680-repro-vite'),
  resolve: {
    alias: [
      ...Object.entries(
        foldkitAliases(path.join(worktree, 'examples/counter')),
      ).map(([find, replacement]) => ({ find, replacement })),
      {
        find: /^effect$/,
        replacement: path.join(worktree, 'examples/counter/node_modules/effect'),
      },
    ],
  },
  server: {
    host: '127.0.0.1',
    port,
    strictPort: true,
    fs: { allow: [worktree, here] },
  },
})
await server.listen()

const url = `http://127.0.0.1:${port}/`
const browser = await chromium.launch()

const actions = {
  'Click the disabled Apply button': page => page.click('#apply', { force: true }),
  'Focus Apply, press Enter': async page => {
    await page.focus('#apply')
    await page.keyboard.press('Enter')
  },
  'Focus Apply, press Space': async page => {
    await page.focus('#apply')
    await page.keyboard.press('Space')
  },
  'Type in the text field, press Enter': async page => {
    await page.fill('#code', 'abc')
    await page.press('#code', 'Enter')
  },
}

let failures = 0
try {
  const page = await browser.newPage()
  await page.goto(url)
  await page.waitForSelector('#apply')
  console.log('Rendered:', await page.locator('#apply').evaluate(e => e.outerHTML))

  for (const [name, act] of Object.entries(actions)) {
    await page.goto(url)
    await page.waitForSelector('#apply')
    await act(page)
    await page.waitForTimeout(150)
    const count = Number(await page.textContent('#count'))
    const verdict = count === 0 ? 'PASS' : 'FAIL'
    if (count !== 0) failures++
    console.log(`${verdict}  ${name}: SubmittedForm received ${count} (expected 0)`)
  }
} finally {
  await browser.close()
  await server.close()
}
process.exit(failures === 0 ? 0 : 1)
