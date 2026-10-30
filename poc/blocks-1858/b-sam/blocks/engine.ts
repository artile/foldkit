import { Context, Effect, Exit, Option, Scope, Stream } from 'effect'

import { type AnyImpl, CurrentPath, type Implementation, type Instance, isImplementation, isInstance, type Routed } from './block'
import type { CommandValue } from './command'
import { html, type VNode } from './html'
import * as Output from './output'

export interface Node {
  readonly path: string
  readonly id: string
  readonly slot: string
  readonly blockName: string
  readonly parentPath: string | undefined
  readonly ref: Instance<unknown> | undefined
  readonly impl: AnyImpl
  readonly scope: Scope.Closeable
  model: unknown
}

export interface Pending {
  readonly path: string
  readonly command: CommandValue
}

export type Mode = 'Run' | 'Story'

export interface Engine {
  readonly nodes: Map<string, Node>
  readonly rootPath: string
  readonly pending: Array<Pending>
  readonly lastCommands: Array<CommandValue>
  readonly rootOutMessages: Array<{ readonly _tag: string }>
  readonly reader: Output.Reader
  readonly resolve: (path: string) => unknown
  readonly dispatch: (path: string, message: { readonly _tag: string }) => Effect.Effect<void>
  readonly applyGiven: (tree: unknown) => Effect.Effect<void>
  readonly findPath: (blockName: string, id: string) => string
  readonly renderTree: () => RenderedNode
  readonly onChange: (listener: () => void) => void
}

export type RenderedNode =
  | Readonly<{ kind: 'Element'; tag: string; key: string | undefined; attributes: ReadonlyArray<RenderedAttribute>; children: ReadonlyArray<RenderedNode> }>
  | Readonly<{ kind: 'Text'; value: string }>

export type RenderedAttribute =
  | Readonly<{ kind: 'Class' | 'Value'; value: string }>
  | Readonly<{ kind: 'Disabled'; value: boolean }>
  | Readonly<{ kind: 'Data'; name: string; value: string }>
  | Readonly<{ kind: 'OnClick'; dispatch: () => void }>
  | Readonly<{ kind: 'OnInput'; dispatch: (value: string) => void }>

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype

const collectInstances = (value: unknown, into: Array<Instance<unknown>>): void => {
  if (isInstance(value)) {
    into.push(value)
  } else if (Option.isOption(value)) {
    if (Option.isSome(value)) {
      collectInstances(value.value, into)
    }
  } else if (Array.isArray(value)) {
    value.forEach(item => collectInstances(item, into))
  } else if (isPlainObject(value)) {
    Object.values(value).forEach(item => collectInstances(item, into))
  }
}

export const makeEngine = (options: {
  readonly mode: Mode
  readonly rootName: string
  readonly runFork: <A>(effect: Effect.Effect<A>) => void
}): Engine => {
  const nodes = new Map<string, Node>()
  const rootPath = options.rootName
  const pending: Array<Pending> = []
  const lastCommands: Array<CommandValue> = []
  const rootOutMessages: Array<{ readonly _tag: string }> = []
  const listeners: Array<() => void> = []

  const resolveValue = (value: unknown): unknown => {
    if (isInstance(value)) {
      return resolve(value.path)
    }
    if (Option.isOption(value)) {
      return Option.map(value, resolveValue)
    }
    if (Array.isArray(value)) {
      return value.map(resolveValue)
    }
    if (isPlainObject(value)) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveValue(item)]))
    }
    return value
  }

  const resolve = (path: string): unknown => {
    const node = nodes.get(path)
    return node === undefined ? undefined : resolveValue(node.model)
  }

  const reader: Output.Reader = { modelAt: resolve }

  const construct = (ref: Instance<unknown>, parentPath: string | undefined): Effect.Effect<void> =>
    Effect.gen(function* () {
      const scope = yield* Scope.make()
      const spawn = ref['~spawn']
      const impl = yield* spawn.construct(ref.id, spawn.args, spawn.context).pipe(
        Effect.provideService(Scope.Scope, scope),
        Effect.provideService(CurrentPath, ref.path),
      )
      nodes.set(ref.path, {
        path: ref.path,
        id: ref.id,
        slot: ref.slot,
        blockName: spawn.blockName,
        parentPath,
        ref,
        impl,
        scope,
        model: impl.model ?? {},
      })
      if (impl.stream !== undefined) {
        yield* Stream.runForEach(impl.stream, message => dispatch(ref.path, message)).pipe(Effect.forkIn(scope))
      }
    })

  const reconcile: Effect.Effect<void> = Effect.gen(function* () {
    const reachable = new Set<string>([rootPath])
    const visit = (path: string): Effect.Effect<void> =>
      Effect.gen(function* () {
        const node = nodes.get(path)
        if (node === undefined) {
          return
        }
        const children: Array<Instance<unknown>> = []
        collectInstances(node.model, children)
        for (const child of children) {
          reachable.add(child.path)
          if (!nodes.has(child.path)) {
            yield* construct(child, path)
          }
          yield* visit(child.path)
        }
      })
    yield* visit(rootPath)

    for (const [path, node] of nodes) {
      if (!reachable.has(path)) {
        nodes.delete(path)
        yield* Scope.close(node.scope, Exit.void)
      }
    }
  })

  const runCommand = (path: string, command: CommandValue): Effect.Effect<void> => {
    const node = nodes.get(path)
    const handler = node?.impl.commands?.[command.name]
    if (handler === undefined) {
      return Effect.die(new Error(`No handler for Command ${command.name} at ${path}`))
    }
    return Effect.flatMap(handler(Output.resolveDeep(command.args, reader)), result => dispatch(path, result))
  }

  const applyResult = (node: Node, result: AnyResult): Effect.Effect<void> =>
    Effect.gen(function* () {
      node.model = result.model
      yield* reconcile

      if (result.outMessage !== undefined) {
        const parent = node.parentPath === undefined ? undefined : nodes.get(node.parentPath)
        if (parent === undefined) {
          rootOutMessages.push(result.outMessage)
        } else {
          const handler = parent.impl.update?.[`@${node.slot}/${result.outMessage._tag}`]
          if (handler !== undefined) {
            yield* applyResult(parent, handler(parent.model, result.outMessage, node.ref))
          }
        }
      }

      for (const routed of result.messages ?? []) {
        yield* dispatch(routed.path, routed.message)
      }

      for (const command of result.commands ?? []) {
        lastCommands.push(command)
        if (options.mode === 'Story') {
          pending.push({ path: node.path, command })
        } else {
          options.runFork(runCommand(node.path, command))
        }
      }
    })

  const dispatch = (path: string, message: { readonly _tag: string }): Effect.Effect<void> =>
    Effect.gen(function* () {
      const node = nodes.get(path)
      const handler = node?.impl.update?.[message._tag]
      if (node === undefined || handler === undefined) {
        return
      }
      yield* applyResult(node, handler(node.model, message))
      listeners.forEach(listener => listener())
    })

  const applyGivenAt = (path: string, tree: unknown): void => {
    const node = nodes.get(path)
    if (node === undefined || !isPlainObject(tree) || !isPlainObject(node.model)) {
      return
    }
    const current = node.model
    const next: Record<string, unknown> = { ...current }
    for (const [key, given] of Object.entries(tree)) {
      const value = current[key]
      if (isInstance(value)) {
        applyGivenAt(value.path, given)
      } else if (Option.isOption(value) && Option.isSome(value) && isInstance(value.value) && Option.isOption(given)) {
        Option.map(given, item => applyGivenAt((value.value as Instance<unknown>).path, item))
      } else {
        next[key] = given
      }
    }
    node.model = next
  }

  const applyGiven = (tree: unknown) =>
    Effect.gen(function* () {
      applyGivenAt(rootPath, tree)
      yield* reconcile
    })

  const findPath = (blockName: string, id: string): string => {
    for (const node of nodes.values()) {
      if (node.blockName === blockName && node.id === id) {
        return node.path
      }
    }
    throw new Error(`No ${blockName} instance with id ${id}`)
  }

  const renderNode = (vnode: VNode, path: string): Array<RenderedNode> => {
    switch (vnode.kind) {
      case 'Text':
        return [vnode]
      case 'Output':
        return [{ kind: 'Text', value: vnode.output.read(reader) }]
      case 'Instance': {
        const node = nodes.get(vnode.path)
        return node?.impl.view === undefined ? [] : renderNode(node.impl.view(node.model, html()), vnode.path)
      }
      case 'Element':
        return [
          {
            kind: 'Element',
            tag: vnode.tag,
            key: vnode.key,
            attributes: vnode.attributes.map((attribute): RenderedAttribute => {
              if (attribute.kind === 'OnClick') {
                return { kind: 'OnClick', dispatch: () => options.runFork(dispatch(path, attribute.message)) }
              }
              if (attribute.kind === 'OnInput') {
                return { kind: 'OnInput', dispatch: value => options.runFork(dispatch(path, attribute.toMessage(value))) }
              }
              return attribute
            }),
            children: vnode.children.flatMap(child => renderNode(child, path)),
          },
        ]
    }
  }

  const renderTree = (): RenderedNode => {
    const root = nodes.get(rootPath)
    const rendered = root?.impl.view === undefined ? [] : renderNode(root.impl.view(root.model, html()), rootPath)
    return rendered[0] ?? { kind: 'Text', value: '' }
  }

  return {
    nodes,
    rootPath,
    pending,
    lastCommands,
    rootOutMessages,
    reader,
    resolve,
    dispatch,
    applyGiven,
    findPath,
    renderTree,
    onChange: listener => {
      listeners.push(listener)
    },
  }
}

interface AnyResult {
  readonly model: unknown
  readonly commands?: ReadonlyArray<CommandValue>
  readonly outMessage?: { readonly _tag: string }
  readonly messages?: ReadonlyArray<Routed>
}

export const startRoot = (
  engine: Engine,
  construct: Instance<unknown>['~spawn'],
  args: unknown,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const ref = {
      _tag: 'BlockInstance',
      id: engine.rootPath,
      slot: engine.rootPath,
      path: engine.rootPath,
      '~spawn': { ...construct, args },
    } as unknown as Instance<unknown>
    const scope = yield* Scope.make()
    const impl = yield* construct.construct(engine.rootPath, args, Context.empty() as Context.Context<never>).pipe(
      Effect.provideService(Scope.Scope, scope),
      Effect.provideService(CurrentPath, engine.rootPath),
    )
    engine.nodes.set(engine.rootPath, {
      path: engine.rootPath,
      id: engine.rootPath,
      slot: engine.rootPath,
      blockName: construct.blockName,
      parentPath: undefined,
      ref,
      impl,
      scope,
      model: impl.model ?? {},
    })
    yield* engine.applyGiven({})
  })

export const rootImplementation = (context: Context.Context<never>): Implementation => {
  const implementations = Array.from(context.mapUnsafe.values()).filter(isImplementation)
  const [implementation] = implementations
  if (implementations.length !== 1 || implementation === undefined) {
    throw new Error(`Expected one root Block in the Layer, found ${implementations.length}`)
  }
  return implementation
}
