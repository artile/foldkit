import { Context, Effect, Layer, Schema } from 'effect'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import * as ModelPreservationBridge from '../../runtime/modelPreservationBridge.js'
import * as Program from '../../runtime/programPublic.js'
import { embed } from '../../runtime/start.js'

class UnitApi extends Context.Service<
  UnitApi,
  Readonly<{ deleteUnit: (unitId: string) => Effect.Effect<boolean> }>
>()('HandlerRecord/UnitApi') {}

const Message = defineMessageUnion({
  ClickedDelete: { unitId: Schema.String },
  ClickedRefresh: {},
  SucceededDeleteUnit: { unitId: Schema.String },
  FailedDeleteUnit: { error: Schema.String },
  Refreshed: {},
})
const Model = Schema.Struct({ log: Schema.Array(Schema.String) })
const Key = Symbol('HandlerRecordRail')
const Rail = Block.make('HandlerRecordRail', {
  key: Key,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  effects: { services: [UnitApi] },
  view: { kind: 'Element' },
})
const DeleteUnit = Rail.makeCommand('DeleteUnit', {
  args: { unitId: Schema.String },
  messages: [Message.SucceededDeleteUnit, Message.FailedDeleteUnit],
})
const Refresh = Rail.makeCommand('Refresh', { messages: [Message.Refreshed] })

const Composition = Rail.makeComposition()
const init = Composition.makeInit(() => ({
  model: { log: [] },
  commands: [
    DeleteUnit({ unitId: 'u1' }),
    DeleteUnit({ unitId: 'locked' }),
    Refresh(),
  ],
}))
const view = Composition.makeView((model, h) =>
  h.div([], [[...model.log].sort().join(', ')]),
)
const append =
  (entry: string) =>
  (model: typeof Model.Type): typeof Model.Type => ({
    log: [...model.log, entry],
  })
const update = Composition.makeUpdate({
  ClickedDelete: (model, { unitId }) => ({
    model,
    commands: [DeleteUnit({ unitId })],
  }),
  ClickedRefresh: model => ({ model, commands: [Refresh()] }),
  SucceededDeleteUnit: (model, { unitId }) => ({
    model: append(`deleted ${unitId}`)(model),
  }),
  FailedDeleteUnit: (model, { error }) => ({
    model: append(`failed ${error}`)(model),
  }),
  Refreshed: model => ({ model: append('refreshed')(model) }),
})

const constructed = vi.fn()
const layer = Rail.makeLayer({
  init,
  update,
  view,
  handlers: {
    DeleteUnit: function* () {
      const api = yield* UnitApi
      constructed()

      return ({ unitId }) =>
        api
          .deleteUnit(unitId)
          .pipe(
            Effect.map(isDeleted =>
              isDeleted
                ? Message.SucceededDeleteUnit({ unitId })
                : Message.FailedDeleteUnit({ error: unitId }),
            ),
          )
    },
    Refresh: function* () {
      return () => Effect.succeed(Message.Refreshed())
    },
  },
})

const referenceLayer = Rail.makeLayer({
  init,
  update,
  view,
  EffectsLayer: Layer.mergeAll(
    DeleteUnit.toLayer(
      Effect.gen(function* () {
        const api = yield* UnitApi

        return ({ unitId }) =>
          api
            .deleteUnit(unitId)
            .pipe(
              Effect.map(isDeleted =>
                isDeleted
                  ? Message.SucceededDeleteUnit({ unitId })
                  : Message.FailedDeleteUnit({ error: unitId }),
              ),
            )
      }),
    ),
    Refresh.toLayer(Effect.succeed(() => Effect.succeed(Message.Refreshed()))),
  ),
})

const UnitApiLive = Layer.succeed(UnitApi, {
  deleteUnit: unitId => Effect.succeed(unitId !== 'locked'),
})

describe('makeLayer handlers record', () => {
  it('builds the same Layer type as the Definition.toLayer form', () => {
    expectTypeOf<Layer.Success<typeof layer>>().toEqualTypeOf<
      Layer.Success<typeof referenceLayer>
    >()
    expectTypeOf<Layer.Error<typeof layer>>().toEqualTypeOf<
      Layer.Error<typeof referenceLayer>
    >()
    expectTypeOf<Layer.Services<typeof layer>>().toEqualTypeOf<
      Layer.Services<typeof referenceLayer>
    >()
  })

  it('runs both Commands through the handlers supplied by name', async () => {
    constructed.mockClear()
    const container = document.createElement('div')
    container.id = 'handler-record-rail'
    const wrapper = document.createElement('div')
    wrapper.append(container)
    document.body.append(wrapper)
    const preservation = vi
      .spyOn(ModelPreservationBridge, 'resolvePreservedModel')
      .mockReturnValue(Effect.succeed(undefined))
    const handle = embed(
      Program.makeElement({ block: Rail, layer, container }).provide({
        services: UnitApiLive,
      }),
    )

    try {
      await vi.waitFor(() =>
        expect(wrapper.textContent).toBe(
          'deleted u1, failed locked, refreshed',
        ),
      )
    } finally {
      await handle.dispose()
      preservation.mockRestore()
      wrapper.remove()
    }

    expect(constructed).toHaveBeenCalledTimes(1)
  })

  it('rejects a handlers record that names no declared Command at runtime', () => {
    const erasedRecord: object = {
      init,
      update,
      view,
      handlers: {
        Missing: function* () {
          return () => Effect.succeed(Message.Refreshed())
        },
      },
    }

    expect(() =>
      Reflect.apply(Rail.makeLayer, undefined, [erasedRecord]),
    ).toThrow('declares no Command "Missing"')
  })

  it('rejects incomplete, unknown and mistyped handlers at compile time', () => {
    const typeOnly = () => {
      // @ts-expect-error Refresh has no handler.
      void Rail.makeLayer({
        init,
        update,
        view,
        handlers: {
          DeleteUnit: function* () {
            return ({ unitId }) =>
              Effect.succeed(Message.SucceededDeleteUnit({ unitId }))
          },
        },
      })

      // @ts-expect-error The plans require no Command named Delete.
      void Rail.makeLayer({
        init,
        update,
        view,
        handlers: {
          DeleteUnit: function* () {
            return ({ unitId }) =>
              Effect.succeed(Message.SucceededDeleteUnit({ unitId }))
          },
          Refresh: function* () {
            return () => Effect.succeed(Message.Refreshed())
          },
          Delete: function* () {
            return () => Effect.succeed(Message.Refreshed())
          },
        },
      })

      // @ts-expect-error DeleteUnit returns a Message it did not declare.
      void Rail.makeLayer({
        init,
        update,
        view,
        handlers: {
          DeleteUnit: function* () {
            return () => Effect.succeed(Message.Refreshed())
          },
          Refresh: function* () {
            return () => Effect.succeed(Message.Refreshed())
          },
        },
      })

      void Rail.makeLayer({
        init,
        update,
        view,
        handlers: {
          DeleteUnit: function* () {
            return ({ unitId }) => {
              expectTypeOf(unitId).toEqualTypeOf<string>()

              return Effect.succeed(Message.SucceededDeleteUnit({ unitId }))
            }
          },
          Refresh: function* () {
            return () => Effect.succeed(Message.Refreshed())
          },
        },
      })
    }

    expect(typeOnly).toBeTypeOf('function')
  })
})
