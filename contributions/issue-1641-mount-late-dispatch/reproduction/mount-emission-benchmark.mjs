import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const worktree = resolve(process.argv.at(2))
const require = createRequire(`${worktree}/packages/foldkit/package.json`)
const { Window } = await import(
  pathToFileURL(require.resolve('happy-dom')).href
)
const window = new Window()
for (const name of [
  'document',
  'Element',
  'HTMLElement',
  'SVGElement',
  'Node',
  'Text',
  'Comment',
  'Event',
]) {
  globalThis[name] = window[name]
}
globalThis.window = window

const { Context, Effect, Stream } = await import(
  pathToFileURL(require.resolve('effect')).href
)
const built = name =>
  import(pathToFileURL(`${worktree}/packages/foldkit/dist/${name}.js`).href)
const Html = await built('html/index')
const { init, toVNode } = await built('snabbdom/index')
const Message = (await built('message/index')).defineMessageUnion({
  CompletedProbe: {},
})
const patch = init([])
const h = Html.__htmlBuilder()
const emissionCount = 500000
const messages = Array.from({ length: emissionCount }, () =>
  Message.CompletedProbe(),
)
const durations = []
for (let round = 0; round < 9; round += 1) {
  let delivered = 0
  let completed
  const completion = new Promise(resolve => {
    completed = resolve
  })
  const context = Context.empty()
  const render = view => {
    Html.__setRuntime(() => {
      delivered += 1
      if (delivered === emissionCount) {
        completed()
      }
    }, context)
    try {
      return view()
    } finally {
      Html.__clearRuntime()
    }
  }
  const action = { name: 'Probe', f: () => Stream.fromArray(messages) }
  const startTime = performance.now()
  const mounted = patch(
    toVNode(document.createElement('div')),
    render(() => h.div([], [h.span([h.OnMount(action)])])),
  )
  await completion
  const elapsed = performance.now() - startTime
  patch(
    mounted,
    render(() => h.div([])),
  )
  if (round >= 2) {
    durations.push(elapsed)
  }
}
const sorted = durations.toSorted((left, right) => left - right)
console.log(
  JSON.stringify({
    emissionCount,
    milliseconds: durations,
    medianMs: sorted.at(3),
  }),
)
await window.happyDOM.close()
