import { Context, Effect, Layer, type Scope } from 'effect'

import { type Engine, makeEngine, type RenderedNode, rootImplementation, startRoot } from './engine'

const toDom = (node: RenderedNode, document: Document): globalThis.Node => {
  if (node.kind === 'Text') {
    return document.createTextNode(node.value)
  }
  const element = document.createElement(node.tag)
  for (const attribute of node.attributes) {
    if (attribute.kind === 'Class') {
      element.className = attribute.value
    } else if (attribute.kind === 'Value') {
      ;(element as HTMLInputElement).value = attribute.value
    } else if (attribute.kind === 'Disabled') {
      ;(element as HTMLButtonElement).disabled = attribute.value
    } else if (attribute.kind === 'Data') {
      element.setAttribute(`data-${attribute.name}`, attribute.value)
    } else if (attribute.kind === 'OnClick') {
      element.addEventListener('click', attribute.dispatch)
    } else if (attribute.kind === 'OnInput') {
      const { dispatch } = attribute
      element.addEventListener('input', event => dispatch((event.target as HTMLInputElement).value))
    }
  }
  node.children.forEach(child => element.appendChild(toDom(child, document)))
  return element
}

/** Starts a root Block. The Layer must have no requirements left. */
export const run = <Self, Args>(
  block: { readonly prototype: Self & { readonly '~args': Args } },
  options: { readonly container: HTMLElement; readonly layer: Layer.Layer<Self, never, never>; readonly args: Args },
): Effect.Effect<Engine, never, Scope.Scope> =>
  Effect.gen(function* () {
    void block
    const context = yield* Layer.build(options.layer)
    const implementation = rootImplementation(context as Context.Context<never>)
    const engine = makeEngine({ mode: 'Run', rootName: implementation.blockName, runFork: effect => void Effect.runFork(effect) })
    const render = () => options.container.replaceChildren(toDom(engine.renderTree(), options.container.ownerDocument))
    engine.onChange(render)
    yield* startRoot(engine, { blockName: implementation.blockName, construct: implementation.construct, args: options.args, context: Context.empty() as never }, options.args)
    render()
    return engine
  })
