import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const worktree = resolve(process.argv.at(2) ?? process.cwd())
const requireFromPackage = createRequire(`${worktree}/packages/foldkit/package.json`)
const { Window } = await import(pathToFileURL(requireFromPackage.resolve('happy-dom')).href)
const { Array, Effect, Fiber, Schema } = await import(pathToFileURL(requireFromPackage.resolve('effect')).href)
const { makeElement } = await import(pathToFileURL(`${worktree}/packages/foldkit/dist/runtime/public.js`).href)
const { defineMessageUnion } = await import(pathToFileURL(`${worktree}/packages/foldkit/dist/message/public.js`).href)
const { modifyFields } = await import(pathToFileURL(`${worktree}/packages/foldkit/dist/struct/public.js`).href)

const window = new Window({ url: 'http://localhost/' })
for (const name of ['document', 'HTMLElement', 'Element', 'Node', 'MouseEvent', 'Event', 'MutationObserver']) {
  globalThis[name] = window[name]
}
globalThis.window = window
globalThis.getComputedStyle = window.getComputedStyle.bind(window)

const PRODUCER_COUNT = 24
const OVER_BUDGET_MS = 6
const frames = []
const deliveries = []
let fakeNow = 0
let nextFrameId = 0
const originalNow = performance.now
const originalChannel = globalThis.MessageChannel

class ControlledMessageChannel {
  port1 = {
    postMessage: () => deliveries.push(() => this.port2.onmessage?.({ data: null })),
    close: () => {},
  }
  port2 = { onmessage: undefined, close: () => {} }
}

const requestFrame = callback => {
  frames.push(callback)
  nextFrameId += 1
  return nextFrameId
}
globalThis.requestAnimationFrame = requestFrame
window.requestAnimationFrame = requestFrame
globalThis.cancelAnimationFrame = () => {}
window.cancelAnimationFrame = () => {}
globalThis.MessageChannel = ControlledMessageChannel
Object.defineProperty(performance, 'now', { configurable: true, value: () => fakeNow })

const runFrame = () => {
  const callbacks = frames.splice(0)
  assert.ok(Array.isArrayNonEmpty(callbacks), 'a dirty Model must have a scheduled frame')
  for (const callback of callbacks) {
    callback(fakeNow)
  }
}

const runDelivery = () => {
  const delivery = deliveries.shift()
  assert.ok(delivery, 'the producer must leave a deferred drain task')
  delivery()
}

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({ Pulsed: {} })

const runProducer = async (burnMs, isReentrant) => {
  const container = document.createElement('div')
  container.id = 'producer-app'
  document.body.appendChild(container)
  let processedCount = 0
  const element = makeElement({
    Model,
    container,
    devTools: false,
    init: () => ({ model: { count: 0 } }),
    update: model => {
      fakeNow += burnMs
      processedCount += 1
      if (isReentrant && processedCount < PRODUCER_COUNT) {
        document.getElementById('pulse').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      }
      return { model: modifyFields(model, { count: count => count + 1 }) }
    },
    view: (model, h) => h.div([], [
      h.p([h.Id('count')], [globalThis.String(model.count)]),
      h.button([h.Id('pulse'), h.OnClick(Message.Pulsed())], ['Pulse']),
    ]),
  })
  const fiber = Effect.runFork(element.start())
  try {
    for (let attempt = 0; attempt < 100 && !document.getElementById('pulse'); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    assert.ok(document.getElementById('pulse'), 'the app must complete its initial render')
    const dispatchPulse = () => document.getElementById('pulse').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    dispatchPulse()
    if (!isReentrant) {
      dispatchPulse()
    }
    const samples = []
    while (processedCount < PRODUCER_COUNT) {
      runFrame()
      samples.push({ model: processedCount, dom: Number(document.getElementById('count').textContent) })
      if (Array.isArrayNonEmpty(deliveries)) {
        runDelivery()
      }
      if (!isReentrant && processedCount < PRODUCER_COUNT) {
        dispatchPulse()
        if (Array.isArrayEmpty(deliveries) && processedCount < PRODUCER_COUNT) {
          dispatchPulse()
        }
      }
    }
    if (Array.isArrayNonEmpty(frames)) {
      runFrame()
    }
    const finalDom = Number(document.getElementById('count').textContent)
    assert.equal(finalDom, PRODUCER_COUNT, 'the finite producer must eventually render its last Model')
    return { burnMs, isReentrant, samples, finalDom }
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
    container.remove()
    frames.splice(0)
    deliveries.splice(0)
  }
}

try {
  const cheap = await runProducer(0, true)
  assert.equal(cheap.finalDom, PRODUCER_COUNT)
  const reentrant = await runProducer(OVER_BUDGET_MS, true)
  const external = await runProducer(OVER_BUDGET_MS, false)
  for (const result of [cheap, reentrant, external]) {
    console.log(JSON.stringify(result))
  }
  const starved = [reentrant, external].filter(result => !result.samples.some(({ dom }) => dom > 0 && dom < PRODUCER_COUNT))
  assert.deepEqual(
    starved.map(({ isReentrant }) => isReentrant ? 'reentrant' : 'external'),
    [],
    'the DOM must make progress before a 24-turn producer stops',
  )
} finally {
  Object.defineProperty(performance, 'now', { configurable: true, value: originalNow })
  globalThis.MessageChannel = originalChannel
  await window.happyDOM.close()
}
