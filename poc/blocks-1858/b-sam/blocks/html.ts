import type { Output } from './output'
import { isOutput } from './output'

export type AnyMessage = { readonly _tag: string }

export type Attribute<Message> =
  | Readonly<{ kind: 'Class'; value: string }>
  | Readonly<{ kind: 'OnClick'; message: Message }>
  | Readonly<{ kind: 'OnInput'; toMessage: (value: string) => Message }>
  | Readonly<{ kind: 'Value'; value: string }>
  | Readonly<{ kind: 'Disabled'; value: boolean }>
  | Readonly<{ kind: 'Data'; name: string; value: string }>

export type VNode =
  | Readonly<{
      kind: 'Element'
      tag: string
      key: string | undefined
      attributes: ReadonlyArray<Attribute<AnyMessage>>
      children: ReadonlyArray<VNode>
    }>
  | Readonly<{ kind: 'Text'; value: string }>
  | Readonly<{ kind: 'Instance'; path: string }>
  | Readonly<{ kind: 'Output'; output: Output<string> }>

export type Child = VNode | string | Output<string>

const toVNode = (child: Child): VNode => {
  if (typeof child === 'string') {
    return { kind: 'Text', value: child }
  }
  if (isOutput(child)) {
    return { kind: 'Output', output: child }
  }
  return child
}

type ElementBuilder<Message> = (
  attributes: ReadonlyArray<Attribute<Message>>,
  children?: ReadonlyArray<Child>,
) => VNode

const element =
  <Message>(tag: string, key?: string): ElementBuilder<Message> =>
  (attributes, children = []) => ({
    kind: 'Element',
    tag,
    key,
    attributes: attributes as ReadonlyArray<Attribute<AnyMessage>>,
    children: children.map(toVNode),
  })

const TAGS = ['div', 'section', 'header', 'h2', 'p', 'span', 'ul', 'li', 'button', 'input', 'img'] as const
type Tag = (typeof TAGS)[number]

export type HtmlBuilder<Message> = { readonly [T in Tag]: ElementBuilder<Message> } & {
  readonly keyed: (tag: Tag) => (key: string, attributes: ReadonlyArray<Attribute<Message>>, children?: ReadonlyArray<Child>) => VNode
  readonly Class: (value: string) => Attribute<Message>
  readonly OnClick: (message: Message) => Attribute<Message>
  readonly OnInput: (toMessage: (value: string) => Message) => Attribute<Message>
  readonly Value: (value: string) => Attribute<Message>
  readonly Disabled: (value: boolean) => Attribute<Message>
  readonly Data: (name: string, value: string) => Attribute<Message>
}

const builder: HtmlBuilder<AnyMessage> = {
  ...(Object.fromEntries(TAGS.map(tag => [tag, element(tag)])) as { [T in Tag]: ElementBuilder<AnyMessage> }),
  keyed: tag => (key, attributes, children) => element<AnyMessage>(tag, key)(attributes, children),
  Class: value => ({ kind: 'Class', value }),
  OnClick: message => ({ kind: 'OnClick', message }),
  OnInput: toMessage => ({ kind: 'OnInput', toMessage }),
  Value: value => ({ kind: 'Value', value }),
  Disabled: value => ({ kind: 'Disabled', value }),
  Data: (name, value) => ({ kind: 'Data', name, value }),
}

export const html = <Message>(): HtmlBuilder<Message> => builder as unknown as HtmlBuilder<Message>
