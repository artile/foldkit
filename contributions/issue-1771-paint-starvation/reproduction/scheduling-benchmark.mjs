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

const queueSamples = []
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
          count += 1
        },
        crashWith: () => Effect.void,
      })
      queue.completeBoot()
      for (let sample = 0; sample < 19; sample += 1) {
        const started = now()
        for (let index = 0; index < 500000; index += 1) {
          queue.enqueueMessage(index)
        }
        const elapsed = now() - started
        if (sample >= 4) {
          queueSamples.push(elapsed)
        }
      }
      assert.equal(count, 19 * 500000)
    }),
  ),
)

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({ ClickedPulse: {} })
let burnMs = 0
let remainingPulses = 0
const container = document.createElement('div')
container.id = 'validation-app'
document.body.appendChild(container)
const element = makeElement({
  Model,
  container,
  devTools: false,
  init: () => ({ model: { count: 0 } }),
  update: model => {
    fakeNow += burnMs
    if (remainingPulses > 0) {
      remainingPulses -= 1
      document
        .getElementById('pulse')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }
    return { model: modifyFields(model, { count: count => count + 1 }) }
  },
  view: (model, h) => {
    commitCount += 1
    return h.div(
      [],
      [
        h.p([h.Id('count')], [globalThis.String(model.count)]),
        h.button([h.Id('pulse'), h.OnClick(Message.ClickedPulse())], ['Pulse']),
      ],
    )
  },
})
const fiber = Effect.runFork(element.start())
try {
  for (
    let attempt = 0;
    attempt < 100 && !document.getElementById('pulse');
    attempt += 1
  ) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  const button = document.getElementById('pulse')
  assert.ok(button)
  const pulse = () =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  let expectedCount = 0
  const run = (kind, iterations, cost) => {
    burnMs = cost
    const samples = []
    const commits = []
    for (let sample = 0; sample < 12; sample += 1) {
      const beforeCommits = commitCount
      const started = now()
      if (kind === 'sustained') {
        remainingPulses = iterations - 1
        pulse()
        expectedCount += iterations
        while (remainingPulses > 0 || Array.isArrayNonEmpty(deliveries)) {
          runFrame()
          runDelivery()
        }
      } else {
        for (let index = 0; index < iterations; index += 1) {
          pulse()
          expectedCount += 1
          if (kind === 'commits') {
            runFrame()
          }
        }
      }
      while (Array.isArrayNonEmpty(deliveries)) {
        runDelivery()
      }
      runFrame()
      const elapsed = now() - started
      assert.equal(
        globalThis.Number(document.getElementById('count').textContent),
        expectedCount,
      )
      if (sample >= 3) {
        samples.push(elapsed)
        commits.push(commitCount - beforeCommits)
      }
    }
    return {
      iterations,
      simulatedUpdateCostMs: cost,
      elapsedMs: summarize(samples),
      commits,
    }
  }
  console.log(
    JSON.stringify({
      worktree,
      node: process.version,
      queue: { iterations: 500000, elapsedMs: summarize(queueSamples) },
      burst: run('burst', 20000, 0),
      commits: run('commits', 1500, 0),
      sustained: run('sustained', 5000, 6),
    }),
  )
} finally {
  await Effect.runPromise(Fiber.interrupt(fiber))
  Object.defineProperty(performance, 'now', {
    configurable: true,
    value: originalNow,
  })
  globalThis.MessageChannel = originalChannel
  await window.happyDOM.close()
}
