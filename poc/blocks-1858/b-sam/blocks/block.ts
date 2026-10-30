import { Context, Effect, Layer, type Option, Schema, Scope, Stream } from 'effect'

import type { AnyDefinition, CommandValue } from './command'
import type { HtmlBuilder, VNode } from './html'
import * as Output from './output'

// SPEC

export interface Spec {
  readonly Model?: Schema.Top
  readonly Message?: Schema.Top
  readonly OutMessage?: Schema.Top
  readonly Command?: ReadonlyArray<AnyDefinition>
}

type SchemaType<S, K extends keyof Spec, Fallback> = S extends { readonly [P in K]: infer T extends Schema.Top }
  ? T['Type']
  : Fallback

export interface BlockBrand<S extends Spec, Args> {
  readonly '~spec': S
  readonly '~args': Args
}

type SpecOf<Self> = Self extends BlockBrand<infer S, any> ? S : never
type ArgsOf<Self> = Self extends BlockBrand<any, infer A> ? A : never

export type ModelOf<Self> = SchemaType<SpecOf<Self>, 'Model', {}>
type Tagged = { readonly _tag: string }
export type MessageOf<Self> = Extract<SchemaType<SpecOf<Self>, 'Message', never>, Tagged>
export type OutMessageOf<Self> = Extract<SchemaType<SpecOf<Self>, 'OutMessage', never>, Tagged>
export type CommandsOf<Self> =
  SpecOf<Self> extends { readonly Command: infer C extends ReadonlyArray<AnyDefinition> } ? C[number] : never

// INSTANCE

export interface Routed {
  readonly _tag: 'Routed'
  readonly path: string
  readonly message: { readonly _tag: string }
}

export interface Spawn {
  readonly blockName: string
  readonly construct: (id: string, args: unknown, context: Context.Context<never>) => Effect.Effect<AnyImpl, never, Scope.Scope | CurrentPath>
  readonly args: unknown
  readonly context: Context.Context<never>
}

export interface Instance<Self> {
  readonly _tag: 'BlockInstance'
  readonly id: string
  readonly slot: string
  readonly path: string
  readonly view: () => VNode
  readonly send: (message: MessageOf<Self>) => Routed
  readonly model: Output.Output<Resolved<ModelOf<Self>>>
  readonly '~self'?: Self
  readonly '~spawn': Spawn
}

export const isInstance = (value: unknown): value is Instance<unknown> =>
  typeof value === 'object' && value !== null && (value as { _tag?: unknown })._tag === 'BlockInstance'

export type Resolved<M> = M extends string | number | boolean | bigint | symbol | null | undefined
  ? M
  : M extends Instance<infer Self>
    ? Resolved<ModelOf<Self>>
    : M extends Option.Option<infer Item>
      ? Option.Option<Resolved<Item>>
      : M extends ReadonlyArray<infer Item>
        ? ReadonlyArray<Resolved<Item>>
        : M extends object
          ? { readonly [K in keyof M]: Resolved<M[K]> }
          : M

// IMPLEMENTATION

export type Return<Self> = Readonly<{
  model: ModelOf<Self>
  commands?: ReadonlyArray<CommandValueOf<CommandsOf<Self>>>
  outMessage?: OutMessageOf<Self>
  messages?: ReadonlyArray<Routed>
}>

type CommandValueOf<C> = C extends AnyDefinition ? CommandValue<C['commandName'], C['Args']> : never

type OwnHandlers<Self> = {
  readonly [T in MessageOf<Self>['_tag']]: (
    model: ModelOf<Self>,
    message: Extract<MessageOf<Self>, { readonly _tag: T }>,
  ) => Return<Self>
}

export type ChildHandlerKey = `@${string}`

type ChildHandlers<Self> = {
  readonly [K: ChildHandlerKey]: (model: ModelOf<Self>, outMessage: never, instance: never) => Return<Self>
}

export type Update<Self> = OwnHandlers<Self> & ChildHandlers<Self>

type CommandHandlers<Self> = {
  readonly [C in CommandsOf<Self> as C['commandName']]: (args: C['Args']) => Effect.Effect<C['Result']>
}

type HasKeys<T> = [keyof T] extends [never] ? false : true

export type Impl<Self> = Readonly<{
  view?: (model: ModelOf<Self>, h: HtmlBuilder<MessageOf<Self>>) => VNode
  stream?: Stream.Stream<MessageOf<Self>>
}> &
  (SpecOf<Self> extends { readonly Model: Schema.Top } ? Readonly<{ model: ModelOf<Self> }> : Readonly<{ model?: {} }>) &
  ([MessageOf<Self>] extends [never] ? Readonly<{ update?: Update<Self> }> : Readonly<{ update: Update<Self> }>) &
  (HasKeys<CommandHandlers<Self>> extends true ? Readonly<{ commands: CommandHandlers<Self> }> : unknown)

export interface AnyImpl {
  readonly model?: unknown
  readonly update?: Record<string, (model: any, message: any, instance?: any) => any>
  readonly commands?: Record<string, (args: any) => Effect.Effect<any>>
  readonly view?: (model: any, h: HtmlBuilder<any>) => VNode
  readonly stream?: Stream.Stream<any>
}

export class CurrentPath extends Context.Service<CurrentPath, string>()('blocks/CurrentPath') {}

export interface Implementation {
  readonly blockName: string
  readonly construct: Spawn['construct']
}

export const isImplementation = (value: unknown): value is Implementation =>
  typeof value === 'object' && value !== null && 'construct' in value && 'blockName' in value

export interface BlockLayer<Self, R> extends Layer.Layer<Self, never, R> {
  readonly block: AnyBlockClass
}

// HANDLES

type OnHandlers<Self, Parent> = {
  readonly [T in OutMessageOf<Self>['_tag']]?: (
    model: ModelOf<Parent>,
    outMessage: Extract<OutMessageOf<Self>, { readonly _tag: T }>,
    instance: Instance<Self>,
  ) => Return<Parent>
}

export type OnResult<Slot extends string, Self, Parent> = {
  readonly [T in OutMessageOf<Self>['_tag'] as `@${Slot}/${T}`]: (
    model: ModelOf<Parent>,
    outMessage: never,
    instance: never,
  ) => Return<Parent>
}

export interface Slot<Self, Name extends string> {
  readonly slot: Name
  readonly '~self'?: Self
}

export interface Each<Self, Name extends string> extends Slot<Self, Name> {
  (id: string): Instance<Self>
}

type ArgsParameter<Args> = [Args] extends [void] ? [] : [args: Args]

export interface BlockStatics<Self, S extends Spec, Args> {
  readonly blockName: string
  readonly spec: S
  readonly Model: S['Model']
  readonly Message: S['Message']
  readonly OutMessage: S['OutMessage']
  readonly Ref: Schema.declare<Instance<Self>>
  readonly Key: Context.Service<Self, Implementation>
  readonly instance: <const Id extends string>(
    id: Id,
    ...args: ArgsParameter<Args>
  ) => Effect.Effect<Instance<Self> & Slot<Self, Id>, never, Self>
  readonly each: <const Name extends string>(
    slot: Name,
    ...args: ArgsParameter<Args>
  ) => Effect.Effect<Each<Self, Name>, never, Self>
  readonly on: <ChildSelf, const Name extends string>(
    child: Slot<ChildSelf, Name>,
    handlers: OnHandlers<ChildSelf, Self>,
  ) => OnResult<Name, ChildSelf, Self>
  readonly make: <R>(
    constructor: (id: string, args: Args) => Effect.Effect<Impl<Self>, never, R>,
  ) => BlockLayer<Self, Exclude<R, Scope.Scope | CurrentPath>>
}

export interface AnyBlockClass {
  readonly blockName: string
  readonly Key: Context.Service<any, Implementation>
}

// CONSTRUCTOR

const makeInstance = (slot: string, id: string, spawn: Spawn, parentPath: string): Instance<any> => {
  const path = `${parentPath}/${slot === id ? id : `${slot}/${id}`}`
  return {
    _tag: 'BlockInstance',
    id,
    slot,
    path,
    view: () => ({ kind: 'Instance', path }),
    send: message => ({ _tag: 'Routed', path, message: message as { readonly _tag: string } }),
    model: Output.make(reader => reader.modelAt(path)) as never,
    '~spawn': spawn,
  }
}

const spawnFor = (blockName: string, Key: Context.Service<any, Implementation>, args: unknown) =>
  Effect.gen(function* () {
    const implementation = yield* Key
    const context = yield* Effect.context<never>()
    const parentPath = Context.getOrElse(context, CurrentPath, () => '')
    const spawn: Spawn = { blockName, construct: implementation.construct, args, context }
    return { spawn, parentPath }
  })

const defineBlock =
  <Self, Args = void>() =>
  <const Name extends string, const S extends Spec>(
    name: Name,
    spec: S,
  ): BlockStatics<Self, S, Args> & (new () => BlockBrand<S, Args>) => {
    const Key = Context.Service<Self, Implementation>(`blocks/${name}`)

    class BlockClass {
      static readonly blockName = name
      static readonly spec = spec
      static readonly Model = spec.Model
      static readonly Message = spec.Message
      static readonly OutMessage = spec.OutMessage
      static readonly Key = Key
      static readonly Ref = Schema.declare<Instance<Self>>((value): value is Instance<Self> => isInstance(value))

      static instance(id: string, args?: unknown) {
        return Effect.map(spawnFor(name, Key, args), ({ spawn, parentPath }) =>
          makeInstance(id, id, spawn, parentPath),
        )
      }

      static each(slot: string, args?: unknown) {
        return Effect.map(spawnFor(name, Key, args), ({ spawn, parentPath }) =>
          Object.assign((id: string) => makeInstance(slot, id, spawn, parentPath), { slot }),
        )
      }

      static on(child: { readonly slot: string }, handlers: Record<string, unknown>) {
        return Object.fromEntries(Object.entries(handlers).map(([tag, handler]) => [`@${child.slot}/${tag}`, handler]))
      }

      static make(constructor: (id: string, args: unknown) => Effect.Effect<AnyImpl, never, any>) {
        const layer = Layer.effect(
          Key,
          Effect.map(Effect.context<never>(), (layerContext): Implementation => ({
            blockName: name,
            construct: (id, args, yieldContext) =>
              Effect.gen(function* () {
                const scope = yield* Scope.Scope
                const path = yield* CurrentPath
                const context = Context.merge(layerContext, yieldContext).pipe(
                  Context.add(Scope.Scope, scope),
                  Context.add(CurrentPath, path),
                )
                return yield* Effect.provideContext(constructor(id, args), context)
              }),
          })),
        )
        return Object.assign(layer, { block: BlockClass })
      }
    }

    return BlockClass as never
  }

export const deliver = <B extends { readonly blockName: string; readonly prototype: BlockBrand<any, any> }>(
  block: B,
  id: string,
  message: MessageOf<B['prototype']>,
): Readonly<{ _tag: 'Deliver'; blockName: string; id: string; message: { readonly _tag: string } }> => ({
  _tag: 'Deliver',
  blockName: block.blockName,
  id,
  message: message as { readonly _tag: string },
})

export const Block = Object.assign(defineBlock, { deliver })
