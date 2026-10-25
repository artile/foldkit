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
const { __requireDispatch } = await import(
  pathToFileURL(`${worktree}/packages/foldkit/dist/html/index.js`).href
)
const { afterCommit } = await import(
  pathToFileURL(`${worktree}/packages/foldkit/dist/render/render.js`).href
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

const passed = []
const check = async (name, run) => {
  await run()
  passed.push(name)
}
const clearHost = () => {
  frames.splice(0)
  deliveries.splice(0)
  Reflect.deleteProperty(document, 'startViewTransition')
  document.body.replaceChildren()
}
const withQueue = run =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const status = {
          isRuntimeDisposed: false,
          isCrashed: false,
          isRenderingFrame: false,
        }
        const processed = []
        const errors = []
        let onProcess = () => {}
        const queue = yield* makeMessageQueue({
          status,
          processMessage: message => {
            processed.push(message)
            fakeNow += 6
            onProcess(message)
          },
          crashWith: (cause, message) =>
            Effect.sync(() => {
              status.isCrashed = true
              errors.push({ cause, message })
            }),
        })
        yield* Effect.sync(() =>
          run({
            queue,
            status,
            processed,
            errors,
            setProcess: next => {
              onProcess = next
            },
          }),
        )
      }),
    ),
  )

try {
  if (!process.argv.includes('--runtime-only')) {
    await check(
      'prefix snapshots FIFO work and preserves reentrant suffix and posted drain',
      async () => {
        await withQueue(({ queue, processed, setProcess }) => {
          queue.enqueueMessage('A')
          queue.enqueueMessage('B')
          queue.enqueueMessage('C')
          queue.completeBoot()
          assert.deepEqual(processed, ['A'])
          const postedCount = deliveries.length
          setProcess(message => {
            if (message === 'B') {
              queue.enqueueMessage('D')
            }
            if (message === 'C') {
              queue.enqueueMessage('E')
            }
          })
          queue.drainQueuedPrefix()
          assert.deepEqual(processed, ['A', 'B', 'C'])
          assert.equal(deliveries.length, postedCount)
          assert.ok(queue.isAnyMessageDeferred())
          runDelivery()
          runDelivery()
          assert.deepEqual(processed, ['A', 'B', 'C', 'D', 'E'])
          assert.equal(queue.isAnyMessageDeferred(), false)
        })
        clearHost()
      },
    )
    await check(
      'empty prefix retains posted drain ownership for later arrivals',
      async () => {
        await withQueue(({ queue, processed }) => {
          queue.enqueueMessage('A')
          queue.enqueueMessage('B')
          queue.completeBoot()
          queue.drainQueuedPrefix()
          assert.deepEqual(processed, ['A', 'B'])
          assert.equal(queue.isAnyMessageDeferred(), false)
          queue.enqueueMessage('C')
          assert.deepEqual(processed, ['A', 'B'])
          assert.ok(queue.isAnyMessageDeferred())
          runDelivery()
          assert.deepEqual(processed, ['A', 'B', 'C'])
        })
        clearHost()
      },
    )
    await check(
      'prefix respects boot, rendering, disposal, and crash gates',
      async () => {
        await withQueue(({ queue, status, processed }) => {
          queue.enqueueMessage('A')
          queue.drainQueuedPrefix()
          assert.deepEqual(processed, [])
          queue.enqueueMessage('B')
          queue.completeBoot()
          for (const flag of [
            'isRenderingFrame',
            'isRuntimeDisposed',
            'isCrashed',
          ]) {
            status[flag] = true
            queue.drainQueuedPrefix()
            assert.deepEqual(processed, ['A'])
            status[flag] = false
          }
          queue.drainQueuedPrefix()
          assert.deepEqual(processed, ['A', 'B'])
        })
        clearHost()
      },
    )
    await check(
      'prefix blocks nested drains and attributes a defect to the failing Message',
      async () => {
        await withQueue(({ queue, processed, errors, setProcess }) => {
          for (const message of ['A', 'B', 'C', 'D']) {
            queue.enqueueMessage(message)
          }
          queue.completeBoot()
          setProcess(message => {
            queue.drainQueuedPrefix()
            if (message === 'C') {
              throw new Error('prefix defect')
            }
          })
          queue.drainQueuedPrefix()
          assert.deepEqual(processed, ['A', 'B', 'C'])
          assert.equal(errors.length, 1)
          assert.equal(errors.at(0).message.value, 'C')
          runDelivery()
          assert.deepEqual(processed, ['A', 'B', 'C'])
        })
        clearHost()
      },
    )
  }

  const Model = Schema.Struct({ count: Schema.Number, value: Schema.String })
  const Message = defineMessageUnion({
    ClickedPulse: { cost: Schema.Number },
    UpdatedValue: { value: Schema.String },
    FailedPulse: {},
    ClickedWait: {},
    CompletedWaitForCommit: {},
  })
  const start = async (isTransition = false) => {
    let dispatch
    let processedCount = 0
    let completedWaitCount = 0
    let isReentrant = false
    const rendered = []
    const callbacks = []
    let skippedTransitions = 0
    if (isTransition) {
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        value: update => {
          callbacks.push(update)
          return {
            updateCallbackDone: Promise.resolve(),
            skipTransition: () => {
              skippedTransitions += 1
            },
          }
        },
      })
    }
    const container = document.createElement('div')
    container.id = 'validation-app'
    document.body.appendChild(container)
    const element = makeElement({
      Model,
      container,
      devTools: false,
      init: () => ({ model: { count: 0, value: '' } }),
      update: (model, message) =>
        Message.match(message, {
          ClickedPulse: ({ cost }) => {
            fakeNow += cost
            processedCount += 1
            if (isReentrant) {
              dispatch(Message.ClickedPulse({ cost }))
            }
            return { model: modifyFields(model, { count: count => count + 1 }) }
          },
          UpdatedValue: ({ value }) => ({
            model: modifyFields(model, { value: () => value }),
          }),
          FailedPulse: () => {
            throw new Error('forced catch-up defect')
          },
          ClickedWait: () => ({
            model,
            commands: [
              {
                name: 'WaitForCommit',
                effect: Effect.as(
                  afterCommit,
                  Message.CompletedWaitForCommit(),
                ),
              },
            ],
          }),
          CompletedWaitForCommit: () => {
            completedWaitCount += 1
            return { model }
          },
        }),
      view: (model, h) => {
        dispatch = __requireDispatch()
        rendered.push(model)
        return h.div(
          [],
          [
            h.p([h.Id('count')], [globalThis.String(model.count)]),
            h.input([
              h.Id('field'),
              h.Value(model.value),
              h.OnInput(value => Message.UpdatedValue({ value })),
            ]),
          ],
        )
      },
      crash: { view: (context, h) => h.div([], ['crash-marker']) },
      ...(isTransition ? { viewTransition: () => true } : {}),
    })
    const fiber = Effect.runFork(element.start())
    for (let attempt = 0; attempt < 100 && !dispatch; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    assert.ok(dispatch)
    return {
      dispatch: message => dispatch(message),
      callbacks,
      rendered,
      processedCount: () => processedCount,
      completedWaitCount: () => completedWaitCount,
      setReentrant: value => {
        isReentrant = value
      },
      skippedTransitions: () => skippedTransitions,
      stop: async () => {
        isReentrant = false
        await Effect.runPromise(Fiber.interrupt(fiber))
        clearHost()
      },
    }
  }
  await check(
    'fourth blocked frame catches up controlled input and leaves producer suffix deferred',
    async () => {
      const app = await start()
      try {
        app.setReentrant(true)
        app.dispatch(Message.ClickedPulse({ cost: 6 }))
        const field = document.getElementById('field')
        field.value = 'latest queued value'
        field.dispatchEvent(new Event('input', { bubbles: true }))
        for (let turn = 0; turn < 3; turn += 1) {
          runFrame()
          assert.equal(app.rendered.length, 1)
        }
        runFrame()
        assert.equal(app.rendered.length, 2)
        assert.equal(app.rendered.at(-1).value, 'latest queued value')
        assert.equal(field.value, 'latest queued value')
        assert.equal(app.processedCount(), 2)
        assert.equal(deliveries.length, 1)
        assert.equal(frames.length, 1)
      } finally {
        await app.stop()
      }
    },
  )
  await check(
    'successful commit restores a full three-skip allowance',
    async () => {
      const app = await start()
      try {
        app.setReentrant(true)
        app.dispatch(Message.ClickedPulse({ cost: 6 }))
        for (let turn = 0; turn < 8; turn += 1) {
          runFrame()
          assert.equal(app.rendered.length, 1 + Math.floor((turn + 1) / 4))
          runDelivery()
        }
      } finally {
        await app.stop()
      }
    },
  )
  await check(
    'ViewTransition callback refusals share the frame allowance without resetting at transition start',
    async () => {
      const app = await start(true)
      try {
        for (let turn = 0; turn < 4; turn += 1) {
          fakeNow += 6
          app.dispatch(Message.ClickedPulse({ cost: 0 }))
          runFrame()
          assert.equal(app.callbacks.length, turn + 1)
          app.dispatch(Message.ClickedPulse({ cost: 6 }))
          app.dispatch(Message.ClickedPulse({ cost: 6 }))
          app.callbacks.at(-1)()
          assert.equal(app.rendered.length, turn < 3 ? 1 : 2)
          while (Array.isArrayNonEmpty(deliveries)) {
            runDelivery()
          }
        }
        assert.equal(app.skippedTransitions(), 4)
        const count = app.rendered.length
        for (const callback of app.callbacks) {
          callback()
        }
        assert.equal(app.rendered.length, count)
      } finally {
        await app.stop()
      }
    },
  )
  await check(
    'forced plain frame invalidates an earlier callback and bypasses a new transition',
    async () => {
      const app = await start(true)
      try {
        app.dispatch(Message.ClickedPulse({ cost: 0 }))
        runFrame()
        const stale = app.callbacks.at(0)
        app.setReentrant(true)
        app.dispatch(Message.ClickedPulse({ cost: 6 }))
        for (let turn = 0; turn < 4; turn += 1) {
          runFrame()
        }
        assert.equal(app.callbacks.length, 1)
        assert.equal(app.rendered.length, 2)
        assert.equal(app.skippedTransitions(), 1)
        stale()
        assert.equal(app.rendered.length, 2)
      } finally {
        await app.stop()
      }
    },
  )
  await check(
    'mixed callback and frame refusals force the fourth blocked opportunity',
    async () => {
      const app = await start(true)
      try {
        app.dispatch(Message.ClickedPulse({ cost: 0 }))
        runFrame()
        app.setReentrant(true)
        app.dispatch(Message.ClickedPulse({ cost: 6 }))
        app.callbacks.at(0)()
        for (let turn = 0; turn < 2; turn += 1) {
          runFrame()
        }
        assert.equal(app.rendered.length, 1)
        runFrame()
        assert.equal(app.rendered.length, 2)
      } finally {
        await app.stop()
      }
    },
  )
  await check(
    'afterCommit remains pending during refusals and settles on the forced commit',
    async () => {
      const app = await start()
      try {
        app.dispatch(Message.ClickedPulse({ cost: 0 }))
        app.dispatch(Message.ClickedWait())
        await new Promise(resolve => setTimeout(resolve, 0))
        app.setReentrant(true)
        app.dispatch(Message.ClickedPulse({ cost: 6 }))
        for (let turn = 0; turn < 3; turn += 1) {
          runFrame()
        }
        await new Promise(resolve => setTimeout(resolve, 0))
        assert.equal(app.completedWaitCount(), 0)
        runFrame()
        await new Promise(resolve => setTimeout(resolve, 0))
        app.setReentrant(false)
        while (Array.isArrayNonEmpty(deliveries)) {
          runDelivery()
        }
        assert.equal(app.completedWaitCount(), 1)
      } finally {
        await app.stop()
      }
    },
  )
  await check(
    'disposed runtime ignores a stale transition callback and held frames',
    async () => {
      const app = await start(true)
      app.dispatch(Message.ClickedPulse({ cost: 0 }))
      runFrame()
      const stale = app.callbacks.at(0)
      app.setReentrant(true)
      app.dispatch(Message.ClickedPulse({ cost: 6 }))
      const held = frames.splice(0)
      await app.stop()
      const count = app.rendered.length
      stale()
      for (const frame of held) {
        frame(fakeNow)
      }
      assert.equal(app.rendered.length, count)
      assert.equal(document.body.textContent, '')
    },
  )
  await check(
    'forced prefix defect renders crash UI and stops live commit',
    async () => {
      const app = await start()
      try {
        app.setReentrant(true)
        app.dispatch(Message.ClickedPulse({ cost: 6 }))
        app.dispatch(Message.FailedPulse())
        for (let turn = 0; turn < 4; turn += 1) {
          runFrame()
        }
        assert.equal(document.body.textContent, 'crash-marker')
        assert.equal(app.rendered.length, 1)
      } finally {
        await app.stop()
      }
    },
  )
  console.log(JSON.stringify({ passed, count: passed.length }))
} finally {
  Object.defineProperty(performance, 'now', {
    configurable: true,
    value: originalNow,
  })
  globalThis.MessageChannel = originalChannel
  await window.happyDOM.close()
}
