import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const worktree = resolve(process.argv.at(2))
const requireFromPackage = createRequire(
  `${worktree}/packages/foldkit/package.json`,
)
const { Window } = await import(
  pathToFileURL(requireFromPackage.resolve('happy-dom')).href
)
const { Array, Effect, Fiber, Schema } = await import(
  pathToFileURL(requireFromPackage.resolve('effect')).href
)
const { makeMessageQueue } = await import(
  pathToFileURL(`${worktree}/packages/foldkit/dist/runtime/messageQueue.js`)
    .href
)
const { makeElement } = await import(
  pathToFileURL(`${worktree}/packages/foldkit/dist/runtime/public.js`).href
)
const { modifyFields } = await import(
  pathToFileURL(`${worktree}/packages/foldkit/dist/struct/public.js`).href
)
const { defineMessageUnion } = await import(
  pathToFileURL(`${worktree}/packages/foldkit/dist/message/public.js`).href
)

const window = new Window({ url: 'http://localhost/' })
for (const name of [
  'document',
  'HTMLElement',
  'Element',
  'Node',
  'MouseEvent',
  'Event',
  'MutationObserver',
]) {
  globalThis[name] = window[name]
}
globalThis.window = window
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
const frames = []
const deliveries = []
let fakeNow = 0
let nextFrameId = 0
let commitCount = 0
const originalNow = performance.now
const originalChannel = globalThis.MessageChannel
const requestFrame = callback => {
  frames.push(callback)
  nextFrameId += 1
  return nextFrameId
}
globalThis.requestAnimationFrame = requestFrame
window.requestAnimationFrame = requestFrame
globalThis.cancelAnimationFrame = () => {}
window.cancelAnimationFrame = () => {}
globalThis.MessageChannel = class {
  port1 = {
    postMessage: () =>
      deliveries.push(() => this.port2.onmessage?.({ data: null })),
    close: () => {},
  }
  port2 = { onmessage: undefined, close: () => {} }
}
Object.defineProperty(performance, 'now', {
  configurable: true,
  value: () => fakeNow,
})

const now = () => globalThis.Number(process.hrtime.bigint()) / 1e6
const summarize = values => {
  const sorted = values.toSorted((left, right) => left - right)
  return {
    samples: values,
    median: sorted.at(Math.floor(sorted.length / 2)),
    min: sorted.at(0),
    max: sorted.at(-1),
  }
}
const runFrame = () => {
  for (const frame of frames.splice(0)) {
    frame(fakeNow)
  }
}
const runDelivery = () => deliveries.shift()?.()

const measurements = []
try {
  for (const pendingCount of [1, 16, 64]) {
    const totals = []
    const longestDrains = []
    for (let sample = 0; sample < 3; sample += 1) {
      deliveries.splice(0)
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            let count = 0
            const queue = yield* makeMessageQueue({
              status: {
                isRuntimeDisposed: false,
                isCrashed: false,
                isRenderingFrame: false,
              },
              processMessage: () => {
                const started = now()
                while (now() - started < 6) {}
                fakeNow += 6
                count += 1
              },
              crashWith: () => Effect.void,
            })
            for (let index = 0; index < pendingCount + 1; index += 1) {
              queue.enqueueMessage(index)
            }
            queue.completeBoot()
            assert.equal(count, 1)
            let longestDrain = 0
            const totalStarted = now()
            if (queue.drainQueuedPrefix) {
              const started = now()
              queue.drainQueuedPrefix()
              longestDrain = now() - started
            } else {
              while (queue.isAnyMessageDeferred()) {
                const started = now()
                runDelivery()
                longestDrain = Math.max(longestDrain, now() - started)
              }
            }
            totals.push(now() - totalStarted)
            longestDrains.push(longestDrain)
            assert.equal(count, pendingCount + 1)
          }),
        ),
      )
    }
    measurements.push({
      pendingCount,
      actualUpdateCostMs: 6,
      totalMs: summarize(totals),
      longestDrainMs: summarize(longestDrains),
    })
  }
  console.log(JSON.stringify({ worktree, measurements }))
} finally {
  Object.defineProperty(performance, 'now', {
    configurable: true,
    value: originalNow,
  })
  globalThis.MessageChannel = originalChannel
  await window.happyDOM.close()
}
