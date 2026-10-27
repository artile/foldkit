import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const slug = process.env.EXAMPLE_SLUG ?? 'api-cache-query'
const mode = process.env.EXAMPLE_CACHE_MODE ?? 'cold'
if (!['api-cache-query', 'counter', 'ui-showcase'].includes(slug) || !['cold', 'warm'].includes(mode)) {
  throw new Error('Invalid diagnostic slug or cache mode')
}
const root = `/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/examples/${slug}`
process.chdir(root)
if (mode === 'cold') {
  await rm(join(root, 'node_modules/.vite'), { recursive: true, force: true })
}
const require = createRequire(join(root, 'package.json'))
const vitePackage = dirname(require.resolve('vite/package.json'))
if (process.env.EXAMPLE_NEGATIVE === '1') {
  const { createServer, loadConfigFromFile } = await import(pathToFileURL(join(vitePackage, 'dist/node/index.js')))
  const loaded = await loadConfigFromFile({ command: 'serve', mode: 'development' }, join(root, 'vite.config.ts'), root)
  if (!loaded) { throw new Error('Missing real example config') }
  const plugins = (await Promise.all(loaded.config.plugins.flat(Infinity))).filter(plugin => plugin && plugin.name !== 'foldkit:example-client-dependencies')
  const server = await createServer({ ...loaded.config, root, configFile: false, plugins, server: { ...loaded.config.server, port: 5180, strictPort: true } })
  await server.listen()
  server.printUrls()
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => { await server.close(); process.exit(0) })
  }
} else {
  const child = spawn(process.execPath, [join(vitePackage, 'bin/vite.js'), '--port', '5180', '--strictPort'], { cwd: root, stdio: 'inherit' })
  child.on('error', error => { console.error(error); process.exitCode = 1 })
  child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0) })
}
