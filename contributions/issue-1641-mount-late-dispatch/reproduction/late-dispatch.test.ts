import { Context, Effect, Fiber, Queue, Stream } from 'effect'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import {
  __htmlBuilder,
  __beginRender,
  __clearRuntime,
  __createBoundaryRegistry,
  __setRuntime,
  defineView,
} from '@foldkit-source/html/index.ts'
import { defineMessageUnion } from '@foldkit-source/message/index.ts'
import { MountTracker } from '@foldkit-source/mount/index.ts'
import { Dispatch } from '@foldkit-source/runtime/dispatch.ts'
import { init, toVNode } from '@foldkit-source/snabbdom/index.ts'

const interruptions = vi.hoisted(() => ({ isDelayed: true, pending: [] }))
vi.mock('effect', async importOriginal => {
  const actual = await importOriginal<typeof import('effect')>()
  return {
    ...actual,
    Fiber: {
      ...actual.Fiber,
      interrupt: fiber =>
        interruptions.isDelayed
          ? actual.Effect.sync(() => {
              interruptions.pending.push(fiber)
            })
          : actual.Fiber.interrupt(fiber),
    },
  }
})

beforeEach(() => {
  interruptions.isDelayed = true
  interruptions.pending.length = 0
})

afterEach(async () => {
  interruptions.isDelayed = false
  for (const fiber of interruptions.pending) {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }
  vi.restoreAllMocks()
})

const Message = defineMessageUnion({ CompletedProbe: {} })

it.each([false, true])(
  'drops emissions after destroy with a Submodel boundary: %s',
  async isInsideBoundary => {
    const emitted: Array<unknown> = []
    const dispatched: Array<unknown> = []
    const lifecycle: Array<string> = []
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const dispatch = Dispatch.of({
      dispatchAsync: () => Effect.void,
      dispatchSync: message => {
        dispatched.push(message)
      },
    })
    const context = Context.make(Dispatch, dispatch).pipe(
      Context.add(MountTracker, {
        started: () => {
          lifecycle.push('started')
        },
        ended: () => {
          lifecycle.push('ended')
        },
      }),
    )
    const queue = await Effect.runPromise(
      Queue.unbounded<typeof Message.CompletedProbe.Type>(),
    )
    const registry = __createBoundaryRegistry()
    const h = __htmlBuilder()
    const patch = init([])
    const render = view => {
      __beginRender(registry)
      __setRuntime(dispatch.dispatchSync, context, registry)
      try {
        return view()
      } finally {
        __clearRuntime()
      }
    }
    const probe = {
      name: 'Probe',
      f: () =>
        Stream.fromQueue(queue).pipe(
          Stream.map(message => {
            emitted.push(message)
            return message
          }),
        ),
    }
    const childView = defineView((_model, childHtml) =>
      childHtml.span([childHtml.OnMount(probe)]),
    )
    const withChild = () =>
      h.div(
        [],
        [
          isInsideBoundary
            ? h.submodel({
                slotId: 'probe',
                model: {},
                view: childView,
                toParentMessage: message => message,
              })
            : h.span([h.OnMount(probe)]),
        ],
      )
    const mounted = patch(
      toVNode(document.createElement('div')),
      render(withChild),
    )

    Queue.offerUnsafe(queue, Message.CompletedProbe())
    await vi.waitFor(() => {
      expect(dispatched).toEqual([Message.CompletedProbe()])
    })
    dispatched.length = 0

    patch(
      mounted,
      render(() => h.div([])),
    )
    expect(lifecycle).toEqual(['started', 'ended'])
    expect(interruptions.pending).toHaveLength(1)

    Queue.offerUnsafe(queue, Message.CompletedProbe())
    await vi.waitFor(() => {
      expect(emitted).toHaveLength(2)
    })

    expect(dispatched).toEqual([])
    expect(errors).not.toHaveBeenCalled()
  },
)
