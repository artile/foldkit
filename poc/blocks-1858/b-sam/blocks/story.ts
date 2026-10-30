import { Context, Effect, Layer } from 'effect'
import { expect } from 'vitest'

import type { deliver, MessageOf, ModelOf, OutMessageOf, Resolved } from './block'
import type { AnyDefinition, CommandValue } from './command'
import { type Engine, makeEngine, rootImplementation, startRoot } from './engine'
import * as Output from './output'

export interface Step<Self> {
  readonly _tag: 'Step'
  readonly run: (engine: Engine) => Effect.Effect<void>
  readonly '~self'?: (self: Self) => void
}

type DeepPartial<T> = T extends ReadonlyArray<unknown>
  ? T
  : T extends { readonly _tag: string }
    ? T
    : T extends object
      ? { readonly [K in keyof T]?: DeepPartial<T[K]> }
      : T

const step = <Self>(run: Step<Self>['run']): Step<Self> => ({ _tag: 'Step', run })

const isStep = (value: unknown): value is Step<unknown> =>
  typeof value === 'object' && value !== null && (value as { _tag?: unknown })._tag === 'Step'

export const given = <Self>(tree: DeepPartial<Resolved<ModelOf<Self>>>): Step<Self> =>
  step(engine => engine.applyGiven(tree))

export const message = <Self>(
  value: MessageOf<Self> | ReturnType<typeof deliver>,
): Step<Self> =>
  step(engine => {
    engine.lastCommands.length = 0
    engine.rootOutMessages.length = 0
    const delivered = value as { readonly _tag: string; readonly blockName?: string; readonly id?: string; readonly message?: { readonly _tag: string } }
    if (delivered._tag === 'Deliver' && delivered.blockName !== undefined && delivered.id !== undefined && delivered.message !== undefined) {
      return engine.dispatch(engine.findPath(delivered.blockName, delivered.id), delivered.message)
    }
    return engine.dispatch(engine.rootPath, delivered)
  })

export const model = <Self>(assert: (model: Resolved<ModelOf<Self>>) => void): Step<Self> =>
  step(engine => Effect.sync(() => assert(engine.resolve(engine.rootPath) as never)))

export const expectOutMessage = <Self>(outMessage: OutMessageOf<Self>): Step<Self> =>
  step(engine => Effect.sync(() => expect(engine.rootOutMessages).toEqual([outMessage])))

export const expectNoOutMessage = <Self>(): Step<Self> =>
  step(engine => Effect.sync(() => expect(engine.rootOutMessages).toEqual([])))

const plain = (command: CommandValue, engine: Engine) => ({
  name: command.name,
  args: Output.resolveDeep(command.args, engine.reader),
})

export const Command = {
  expectExact: (commands: ReadonlyArray<CommandValue>): Step<any> =>
    step(engine =>
      Effect.sync(() =>
        expect(engine.lastCommands.map(command => plain(command, engine))).toEqual(
          commands.map(command => plain(command, engine)),
        ),
      ),
    ),
  expectNone: (): Step<any> => step(engine => Effect.sync(() => expect(engine.lastCommands).toEqual([]))),
  resolve: <D extends AnyDefinition>(definition: D, result: D['Result']): Step<any> =>
    step(engine =>
      Effect.suspend(() => {
        const index = engine.pending.findIndex(({ command }) => command.name === definition.commandName)
        if (index === -1) {
          return Effect.die(new Error(`No pending ${definition.commandName} Command`))
        }
        const [{ path }] = engine.pending.splice(index, 1) as unknown as [{ path: string }]
        engine.lastCommands.length = 0
        return engine.dispatch(path, result)
      }),
    ),
}

type ArgsOf<Self> = Self extends { readonly '~args': infer A } ? A : never

export function story<Self, R>(layer: Layer.Layer<Self, never, R>, ...steps: ReadonlyArray<Step<Self>>): Effect.Effect<void, never, R>
export function story<Self, R>(
  layer: Layer.Layer<Self, never, R>,
  args: ArgsOf<Self>,
  ...steps: ReadonlyArray<Step<Self>>
): Effect.Effect<void, never, R>
export function story(layer: Layer.Layer<unknown, never, unknown>, ...rest: ReadonlyArray<unknown>): Effect.Effect<void, never, any> {
  const [first, ...others] = rest
  const args = isStep(first) ? undefined : first
  const steps = (isStep(first) ? rest : others) as ReadonlyArray<Step<unknown>>
  return Effect.scoped(
    Effect.gen(function* () {
      const context = yield* Layer.build(layer as unknown as Layer.Layer<unknown, never, never>)
      const implementation = rootImplementation(context)
      const engine = makeEngine({ mode: 'Story', rootName: implementation.blockName, runFork: effect => void Effect.runFork(effect) })
      yield* startRoot(engine, { blockName: implementation.blockName, construct: implementation.construct, args, context: Context.empty() as never }, args)
      for (const current of steps) {
        yield* current.run(engine)
      }
    }),
  )
}

