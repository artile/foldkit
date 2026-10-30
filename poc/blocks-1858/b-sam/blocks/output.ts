import { type Pipeable, pipeArguments } from 'effect/Pipeable'

export interface Reader {
  readonly modelAt: (path: string) => unknown
}

export interface Output<A> extends Pipeable {
  readonly _tag: 'Output'
  readonly read: (reader: Reader) => A
}

const proto = {
  _tag: 'Output',
  pipe() {
    return pipeArguments(this, arguments)
  },
}

export const make = <A>(read: (reader: Reader) => A): Output<A> =>
  Object.assign(Object.create(proto), { read })

export const isOutput = (value: unknown): value is Output<unknown> =>
  typeof value === 'object' && value !== null && (value as { _tag?: unknown })._tag === 'Output'

export const map =
  <A, B>(f: (value: A) => B) =>
  (self: Output<A>): Output<B> =>
    make(reader => f(self.read(reader)))

export const all = <const Outputs extends ReadonlyArray<Output<any>>>(
  outputs: Outputs,
): Output<{ readonly [K in keyof Outputs]: Outputs[K] extends Output<infer A> ? A : never }> =>
  make(reader => outputs.map(output => output.read(reader)) as never)

export const resolveDeep = (value: unknown, reader: Reader): unknown => {
  if (isOutput(value)) {
    return value.read(reader)
  }
  if (Array.isArray(value)) {
    return value.map(item => resolveDeep(item, reader))
  }
  if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveDeep(item, reader)]))
  }
  return value
}
