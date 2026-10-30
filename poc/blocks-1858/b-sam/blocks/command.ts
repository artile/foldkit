import type { Schema } from 'effect'

import type { Output } from './output'

type WithOutputs<Args> = { readonly [K in keyof Args]: Args[K] | Output<Args[K]> }

export interface CommandValue<Name extends string = string, Args = unknown> {
  readonly _tag: 'CommandValue'
  readonly name: Name
  readonly args: Args
}

export interface Definition<
  Name extends string = string,
  Args = any,
  Result extends { readonly _tag: string } = { readonly _tag: string },
> {
  (args: WithOutputs<Args>): CommandValue<Name, Args>
  readonly commandName: Name
  readonly Args: Args
  readonly Result: Result
}

export type AnyDefinition = Definition<string, any, any>

export const make = <
  const Name extends string,
  const Fields extends Schema.Struct.Fields,
  const Messages extends ReadonlyArray<Schema.Top>,
>(
  name: Name,
  _config: { readonly args: Fields; readonly messages: Messages },
): Definition<Name, Schema.Struct<Fields>['Type'], Extract<Messages[number]['Type'], { readonly _tag: string }>> =>
  Object.assign((args: unknown) => ({ _tag: 'CommandValue' as const, name, args }), {
    commandName: name,
  }) as never
