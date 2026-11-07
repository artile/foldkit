import { Effect, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Update from '../update/public.js'
import * as Block from './public.js'

const PopoverModel = Schema.Struct({ isOpen: Schema.Boolean })
const PopoverMessage = defineMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
})
const PopoverOutMessage = defineMessageUnion({ Opened: {}, Closed: {} })
const PopoverDefinition = Block.makeDefinition('SingleOutPopover', {
  Model: PopoverModel,
  Message: PopoverMessage,
  OutMessage: PopoverOutMessage,
})
const PopoverComposition = PopoverDefinition.makeComposition()
const preparePopover = () =>
  PopoverComposition.prepareBlock({
    init: PopoverComposition.makeInit(() => ({ model: { isOpen: false } })),
    update: PopoverComposition.makeUpdate({
      RequestedOpen: () => ({
        model: { isOpen: true },
        outMessage: PopoverOutMessage.Opened(),
      }),
      RequestedClose: () => ({
        model: { isOpen: false },
        outMessage: PopoverOutMessage.Closed(),
      }),
    }),
    operations: {
      requestOpen: PopoverMessage.RequestedOpen,
      requestClose: PopoverMessage.RequestedClose,
    },
  })
const PopoverBlock: Block.FromAssemblyWithOutMessage<
  typeof PopoverModel,
  typeof preparePopover
> = Block.assemble(preparePopover)

const SelectModel = Schema.Struct({
  popover: PopoverBlock.Model,
  query: Schema.String,
})
type SelectModel = typeof SelectModel.Type
const SelectMessage = defineMessageUnion({
  PressedTab: {},
  PressedOpen: {},
  CompletedFocus: {},
})
const SelectOutMessage = defineMessageUnion({
  QueryChanged: { query: Schema.String },
})
const SelectDefinition = Block.makeDefinition('SingleOutSelect', {
  Model: SelectModel,
  Message: SelectMessage,
  OutMessage: SelectOutMessage,
})
const FocusAfterTrigger = SelectDefinition.makeCommand('FocusAfterTrigger', {
  messages: [SelectMessage.CompletedFocus],
  handler: function* () {
    return () => Effect.succeed(SelectMessage.CompletedFocus())
  },
})
const PopoverBinding = SelectDefinition.makeRequiredFieldBinding(PopoverBlock, {
  field: 'popover',
}).withOutMessagePolicy({
  fold: SelectDefinition.makeOutMessageFold(PopoverBlock, {
    Opened: () =>
      SelectDefinition.makeOutMessageStep(({ query }) =>
        SelectOutMessage.QueryChanged({ query }),
      ),
    Closed: SelectDefinition.makeNoopStep,
  }),
})
const SelectComposition = SelectDefinition.makeComposition({
  bindings: [PopoverBinding],
})
const focusAfterTrigger = SelectDefinition.makeCommandsStep(() => [
  FocusAfterTrigger(),
])
const update = SelectComposition.makeUpdate({
  PressedTab: model =>
    Update.combineSteps(model, [
      PopoverBinding.requestClose(),
      focusAfterTrigger,
    ]),
  PressedOpen: model =>
    Update.combineSteps(model, [
      focusAfterTrigger,
      PopoverBinding.requestOpen(),
    ]),
  CompletedFocus: SelectDefinition.makeNoopStep(),
})
const model: SelectModel = { popover: { isOpen: true }, query: 'pe' }

const tabOut = SelectDefinition.makeStep(() =>
  Update.combineSteps([PopoverBinding.requestClose(), focusAfterTrigger]),
)
const deferredUpdate = SelectComposition.makeUpdate({
  PressedTab: model => tabOut(model),
  PressedOpen: model =>
    Update.combineSteps(model, [
      focusAfterTrigger,
      Update.combineSteps([focusAfterTrigger, PopoverBinding.requestOpen()]),
    ]),
  CompletedFocus: SelectDefinition.makeNoopStep(),
})

it('types the carried OutMessage as the reachable policy OutMessage', () => {
  type Result = ReturnType<typeof update>
  expectTypeOf<Exclude<Result['outMessage'], undefined>>().toEqualTypeOf<
    typeof SelectOutMessage.QueryChanged.Type
  >()
})

it('carries the OutMessage through extracted and nested combinations', () => {
  const closed = deferredUpdate(model, SelectMessage.PressedTab())
  const opened = deferredUpdate(
    { ...model, popover: { isOpen: false } },
    SelectMessage.PressedOpen(),
  )
  expect(closed.outMessage).toBeUndefined()
  expect(closed.commands?.map(({ name }) => name)).toEqual([
    'SingleOutSelect/FocusAfterTrigger',
  ])
  expect(opened.outMessage).toEqual(
    SelectOutMessage.QueryChanged({ query: 'pe' }),
  )
  expect(opened.commands?.map(({ name }) => name)).toEqual([
    'SingleOutSelect/FocusAfterTrigger',
    'SingleOutSelect/FocusAfterTrigger',
  ])
})

it('keeps Commands and no OutMessage when the one capable Step emits none', () => {
  const result = update(model, SelectMessage.PressedTab())
  expect(result.model).toEqual({ popover: { isOpen: false }, query: 'pe' })
  expect(result.outMessage).toBeUndefined()
  expect(result.commands?.map(({ name }) => name)).toEqual([
    'SingleOutSelect/FocusAfterTrigger',
  ])
})

it('carries the OutMessage the one capable Step emits beside the Commands', () => {
  const result = update(
    { ...model, popover: { isOpen: false } },
    SelectMessage.PressedOpen(),
  )
  expect(result.model.popover).toEqual({ isOpen: true })
  expect(result.outMessage).toEqual(
    SelectOutMessage.QueryChanged({ query: 'pe' }),
  )
  expect(result.commands?.map(({ name }) => name)).toEqual([
    'SingleOutSelect/FocusAfterTrigger',
  ])
})

if (false) {
  SelectComposition.makeUpdate({
    // @ts-expect-error Two OutMessage-capable Steps stay rejected.
    PressedTab: model =>
      Update.combineSteps(model, [
        PopoverBinding.requestClose(),
        PopoverBinding.requestOpen(),
      ]),
    PressedOpen: SelectDefinition.makeNoopStep(),
    CompletedFocus: SelectDefinition.makeNoopStep(),
  })
  const emit = SelectDefinition.makeOutMessageStep(({ query }) =>
    SelectOutMessage.QueryChanged({ query }),
  )
  SelectComposition.makeUpdate({
    // @ts-expect-error A Binding request and a plain emitting Step stay rejected.
    PressedTab: model =>
      Update.combineSteps([PopoverBinding.requestClose(), emit])(model),
    PressedOpen: SelectDefinition.makeNoopStep(),
    CompletedFocus: SelectDefinition.makeNoopStep(),
  })
  // @ts-expect-error Two plain emitting Steps stay rejected.
  Update.combineSteps(model, [emit, emit])
}
