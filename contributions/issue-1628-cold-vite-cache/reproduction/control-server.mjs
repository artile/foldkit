import { createServer } from '/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/examples/api-cache-query/node_modules/vite/dist/node/index.js'

const mode = process.env['REPRO_MODE']
const nestedDependencies = ['@effect/platform-browser', '@foldkit/devtools > clsx', 'effect/http', 'effect/persistence', 'foldkit > parse5']
const plainDependencies = ['@effect/platform-browser', 'clsx', 'effect/http', 'effect/persistence', 'parse5']
const dependencies = mode === 'include-plain' ? plainDependencies : nestedDependencies
const server = await createServer({
  root: '/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/examples/api-cache-query',
  server: { port: 5180, strictPort: true },
  ...(mode?.startsWith('include') ? { optimizeDeps: { include: dependencies } } : {}),
  plugins: mode === 'scan' ? [{
    name: 'diagnostic:scan-foldkit-source',
    enforce: 'post',
    configEnvironment: {
      order: 'post',
      handler: (name, config) => {
        if (name === 'client') {
          config.optimizeDeps.exclude = config.optimizeDeps.exclude.filter(dependency => dependency !== 'foldkit')
        }
      },
    },
  }] : [],
})
await server.listen()
server.printUrls()
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await server.close()
    process.exit(0)
  })
}
