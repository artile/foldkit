import { Effect, Layer, Predicate } from 'effect'

import { declaredDefinitionOf } from '../../block/identity.js'
import type { NamedIdentity } from '../../block/identity.js'
import type { ProducerRequirements } from '../../block/requirements.js'
import type { Handler } from '../../command/public.js'
import type { PlanOutput } from '../hybrid/authoring.js'
import type { ImplementationRecord } from './completionRecord.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any

type PlanRequirements<Plans> = [PlanOutput<Plans>] extends [never]
  ? never
  : ProducerRequirements<Extract<PlanOutput<Plans>, AnyFunction>>

type LastSegment<Name extends string> = Name extends `${string}/${infer Rest}`
  ? LastSegment<Rest>
  : Name

/** The bare Command handlers of this Block that its plans require. */
type LocalCommandHandlers<Plans, OwnerId extends string> =
  Extract<
    PlanRequirements<Plans>,
    Handler<any, any, any>
  > extends infer Required
    ? Required extends Handler<infer Name, any, any>
      ? Name extends `${OwnerId}/${LastSegment<Name>}`
        ? Required
        : never
      : never
    : never

type HandlerParts<Value> =
  Value extends Handler<infer Name, infer Args, infer Message>
    ? readonly [name: Name, args: Args, message: Message]
    : never

/** Effect channels a Block's `handlers` record may use: its declared effects. */
export type HandlerChannels = Readonly<{ error: unknown; services: unknown }>

/**
 * One handler constructor. It reads Services once and returns the handler that
 * runs on each Command. Both stay within the Block's declared effects contract.
 */
export type HandlerConstructor<
  Args,
  Message,
  Channels extends HandlerChannels,
> = () => Generator<
  Effect.Effect<unknown, Channels['error'], Channels['services']>,
  (args: Args) => Effect.Effect<Message, never, Channels['services']>,
  unknown
>

type HandlerShape<Required, Channels extends HandlerChannels> = {
  readonly [
    Entry in HandlerParts<Required> as LastSegment<Entry[0]>
  ]: HandlerConstructor<Entry[1], Entry[2], Channels>
}

/**
 * @internal Shapes the implementation record so `handlers` takes its type from
 * the plans and the declared effects alone. The record itself is inferred
 * through this homomorphic mapping, so typing a handler's arguments never
 * fixes the record before its other fields are inferred.
 */
export type ImplementationRecordShape<
  Body,
  Plans,
  OwnerId extends string,
  Channels extends HandlerChannels,
> = {
  [Key in keyof Body]: Key extends 'handlers'
    ? Required<
        Partial<HandlerShape<LocalCommandHandlers<Plans, OwnerId>, Channels>>
      >
    : Key extends 'children' | 'bindings' | 'operations'
      ? never
      : Body[Key]
}

type ExistingLayer<Body> =
  Body extends Readonly<{ EffectsLayer: infer Recipe extends Layer.Any }>
    ? Recipe
    : Layer.Layer<never>

type CompileHandlerRecord<
  Body,
  Plans,
  OwnerId extends string,
  Channels extends HandlerChannels,
> =
  Body extends Readonly<{ handlers: unknown }>
    ? Omit<Body, 'handlers' | 'EffectsLayer'> &
        Readonly<{
          EffectsLayer: Layer.Layer<
            | LocalCommandHandlers<Plans, OwnerId>
            | Layer.Success<ExistingLayer<Body>>,
            Channels['error'] | Layer.Error<ExistingLayer<Body>>,
            Channels['services'] | Layer.Services<ExistingLayer<Body>>
          >
        }>
    : Body

/** @internal The record after `handlers` lowering: the EffectsLayer `toLayer` would build. */
export type CompiledRecord<
  Body,
  Plans,
  OwnerId extends string,
  Channels extends HandlerChannels,
> = Extract<
  CompileHandlerRecord<Body, Plans, OwnerId, Channels>,
  ImplementationRecord
>

type ToLayerDefinition = Readonly<{
  toLayer: (build: Effect.Effect<AnyFunction, unknown, unknown>) => Layer.Any
}>

const hasToLayer = (value: unknown): value is ToLayerDefinition =>
  (Predicate.isObject(value) || Predicate.isFunction(value)) &&
  Predicate.isFunction(Reflect.get(value, 'toLayer'))

/** @internal Replaces a record's `handlers` with the Layers its Commands' `toLayer` builds. */
export const compileHandlerRecord = <Body extends object>(
  owner: NamedIdentity,
  body: Body,
): Body => {
  if (!Object.hasOwn(body, 'handlers')) {
    return body
  }

  const { handlers, ...rest }: Readonly<{ handlers?: unknown }> = body

  if (!Predicate.isObject(handlers) || globalThis.Array.isArray(handlers)) {
    throw new Error(
      `[foldkit] Block "${owner.id}" handlers must be a record of handler constructors keyed by Command name.`,
    )
  }

  const layers = Object.entries(handlers).map(([name, constructor]) => {
    const definition = declaredDefinitionOf(owner, 'Command', name)

    if (definition === undefined || !hasToLayer(definition)) {
      throw new Error(
        `[foldkit] Block "${owner.id}" declares no Command "${name}" for its handlers record.`,
      )
    }

    if (!Predicate.isFunction(constructor)) {
      throw new Error(
        `[foldkit] Block "${owner.id}" handler "${name}" must be a generator function.`,
      )
    }

    return definition.toLayer(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      Effect.gen(constructor as () => Generator<never, AnyFunction>),
    )
  })

  const existing: unknown = Reflect.get(body, 'EffectsLayer')
  const all = Layer.isLayer(existing) ? [...layers, existing] : layers

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return {
    ...rest,
    EffectsLayer:
      all.length === 0
        ? Layer.empty
        : Reflect.apply(Layer.mergeAll, undefined, all),
  } as never
}
