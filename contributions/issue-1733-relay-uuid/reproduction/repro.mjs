// Starts a Vite dev server with the published Foldkit plugin and asserts that
// the DevTools MCP relay logs its listening line. Exit 0 = relay started.
import { createServer } from 'vite'
import { foldkit } from '@foldkit/vite-plugin'
import { readFileSync } from 'node:fs'

const effectVersion = JSON.parse(
  readFileSync(new URL('./node_modules/effect/package.json', import.meta.url)),
).version

const lines = []
const original = console.log
console.log = (...args) => {
  lines.push(args.join(' '))
  original(...args)
}

const server = await createServer({
  root: process.cwd(),
  configFile: false,
  logLevel: 'silent',
  server: { port: 0 },
  plugins: [foldkit()],
})
await server.listen()
await new Promise(resolve => setTimeout(resolve, 3000))
await server.close()

const isListening = lines.some(line =>
  line.includes('[foldkit:devTools] MCP relay listening at'),
)
console.log = original
console.log(`effect ${effectVersion}: relay ${isListening ? 'started' : 'did NOT start'}`)
process.exit(isListening ? 0 : 1)
