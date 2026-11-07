import { Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Update from '../update/public.js'
import * as Block from './public.js'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  RequestedSelect: { value: Schema.String },
})
type Message = typeof Message.Type
const OutMessage = defineMessageUnion({
  Selected: { value: Schema.String },
  Closed: {},
})
type OutMessage = typeof OutMessage.Type
const SelectionDefinition = Block.makeDefinition('OutMessageStepSelection', {
  Model,
  Message,
  OutMessage,
})

it('returns the identical Model and OutMessage without other result channels', () => {
  const model = Model.make({ count: 1 })
  const outMessage = OutMessage.Closed()
  const emitClose = SelectionDefinition.makeOutMessageStep(() => outMessage)
  const result = emitClose(model)

  expect(result).toEqual({ model, outMessage })
  expect(result.model).toBe(model)
  expect(result.outMessage).toBe(outMessage)
  expectTypeOf<typeof result.outMessage>().toEqualTypeOf<
    typeof OutMessage.Closed.Type
  >()
  expect(Object.keys(result).sort()).toEqual(['model', 'outMessage'])
  expectTypeOf<typeof result.commands>().toEqualTypeOf<undefined>()
  expectTypeOf<Update.RequirementsOf<typeof emitClose>>().toEqualTypeOf<never>()
  expectTypeOf<
    Update.RegistrationEvidenceOf<typeof result>
  >().toEqualTypeOf<never>()
})

it('retains refined input Models and literal OutMessage payloads', () => {
  const ExtendedModel = Schema.Struct({ ...Model.fields, label: Schema.String })
  type ExtendedModel = typeof ExtendedModel.Type
  const model = ExtendedModel.make({ count: 2, label: 'Selected' })
  const select = SelectionDefinition.makeOutMessageStep(() => ({
    _tag: 'Selected',
    value: 'Pear',
  }))
  const result = select(model)

  expect(result.model).toBe(model)
  expect(result.outMessage.value).toBe('Pear')
  expectTypeOf<typeof result.model>().toEqualTypeOf<typeof ExtendedModel.Type>()
  expectTypeOf<typeof result.outMessage.value>().toEqualTypeOf<'Pear'>()
  expectTypeOf<typeof result.outMessage._tag>().toEqualTypeOf<'Selected'>()
})

it('supports primitive Models without changing their value', () => {
  const TextDefinition = Block.makeDefinition('OutMessageStepText', {
    Model: Schema.String,
    Message: Schema.Never,
    OutMessage,
  })
  const result = TextDefinition.makeOutMessageStep(() => OutMessage.Closed())(
    'ready',
  )

  expect(result.model).toBe('ready')
  expectTypeOf<typeof result.model>().toEqualTypeOf<'ready'>()
})

it('emits a derived OutMessage from an inferred Binding policy', () => {
  const SelectionComposition = SelectionDefinition.makeComposition()
  const prepareSelection = () =>
    SelectionComposition.prepareBlock({
      init: SelectionComposition.makeInit(() => ({ model: { count: 0 } })),
      update: SelectionComposition.makeUpdate({
        RequestedSelect: (model, { value }) => ({
          model,
          outMessage: OutMessage.Selected({ value }),
        }),
      }),
      operations: { requestSelect: Message.RequestedSelect },
    })
  const SelectionBlock: Block.FromAssemblyWithOutMessage<
    typeof Model,
    typeof prepareSelection
  > = Block.assemble(prepareSelection)
  const ParentModel = Schema.Struct({ selection: SelectionBlock.Model })
  type ParentModel = typeof ParentModel.Type
  const ParentOutMessage = defineMessageUnion({
    Chose: { value: Schema.String },
  })
  type ParentOutMessage = typeof ParentOutMessage.Type
  const ParentDefinition = Block.makeDefinition('OutMessageStepParent', {
    Model: ParentModel,
    Message,
    OutMessage: ParentOutMessage,
  })
  const SelectionBinding = ParentDefinition.makeRequiredFieldBinding(
    SelectionBlock,
    {
      field: 'selection',
    },
  ).withOutMessagePolicy({
    fold: ParentDefinition.makeOutMessageFold(SelectionBlock, {
      Selected: ({ value }) =>
        ParentDefinition.makeOutMessageStep(() =>
          ParentOutMessage.Chose({ value }),
        ),
      Closed: ParentDefinition.makeNoopStep,
    }),
  })
  const ParentComposition = ParentDefinition.makeComposition({
    bindings: [SelectionBinding],
  })
  const update = ParentComposition.makeUpdate({
    RequestedSelect: (model, { value }) =>
      SelectionBinding.requestSelect({ value })(model),
  })
  const model = ParentModel.make({ selection: { count: 3 } })
  const result = update(model, Message.RequestedSelect({ value: 'Pear' }))

  expect(result.model).toEqual(model)
  expect(result.outMessage).toEqual(ParentOutMessage.Chose({ value: 'Pear' }))
  expectTypeOf<Update.RequirementsOf<typeof update>>().toEqualTypeOf<never>()

  const combinedUpdate = ParentComposition.makeUpdate({
    RequestedSelect: (parentModel, { value }) =>
      Update.combineSteps(parentModel, [
        ParentDefinition.makeNoopStep(),
        SelectionBinding.requestSelect({ value }),
      ]),
  })
  expect(
    combinedUpdate(model, Message.RequestedSelect({ value: 'Pear' }))
      .outMessage,
  ).toEqual(ParentOutMessage.Chose({ value: 'Pear' }))

  if (false) {
    const selectAndPreserve = ParentDefinition.makeStep(() =>
      Update.combineSteps([
        ParentDefinition.makeNoopStep(),
        SelectionBinding.requestSelect({ value: 'Pear' }),
      ]),
    )
    const selectTwice = ParentDefinition.makeStep(() =>
      Update.combineSteps([
        SelectionBinding.requestSelect({ value: 'Pear' }),
        ParentDefinition.makeNoopStep(),
        SelectionBinding.requestSelect({ value: 'Plum' }),
      ]),
    )

    // One OutMessage-capable Binding request keeps its OutMessage.
    ParentComposition.makeUpdate({
      RequestedSelect: model => selectAndPreserve(model),
    })
    ParentComposition.makeUpdate({
      // @ts-expect-error Two OutMessage-capable Binding requests cannot share one result.
      RequestedSelect: model => {
        const combined = Update.combineSteps(model, [
          SelectionBinding.requestSelect({ value: 'Pear' }),
          SelectionBinding.requestSelect({ value: 'Plum' }),
        ])
        return combined
      },
    })
    ParentComposition.makeUpdate({
      // @ts-expect-error Extracting the combination through makeStep keeps the count.
      RequestedSelect: model => selectTwice(model),
    })
    ParentComposition.makeUpdate({
      // @ts-expect-error Conditional use keeps the count.
      RequestedSelect: (model, message) =>
        message.value === 'Pear' ? selectTwice(model) : { model },
    })
    ParentComposition.makeInit(
      // @ts-expect-error Initializers cannot discard an OutMessage from a deferred combined Step.
      () => ({ model: {}, steps: [selectAndPreserve] }),
    )

    ParentDefinition.makeComposition().makeUpdate({
      RequestedSelect: model =>
        // @ts-expect-error Emitting an OutMessage cannot erase child registration obligations.
        SelectionBinding.requestSelect({ value: 'Pear' })(model),
    })
  }
})

if (false) {
  const WithoutOutMessage = Block.makeDefinition('OutMessageStepWithout', {
    Model,
    Message,
  })
  // @ts-expect-error An OutMessage contract is required.
  WithoutOutMessage.makeOutMessageStep
  // @ts-expect-error Composition does not duplicate Definition-owned Step authoring.
  SelectionDefinition.makeComposition().makeOutMessageStep
  // @ts-expect-error Foreign OutMessages are rejected.
  SelectionDefinition.makeOutMessageStep(() => ({ _tag: 'Foreign' }))
  SelectionDefinition.makeOutMessageStep(() => ({
    _tag: 'Selected',
    // @ts-expect-error Payloads must satisfy the declared OutMessage Schema.
    value: 1,
  }))
  // @ts-expect-error Optional values use withOutMessage instead.
  SelectionDefinition.makeOutMessageStep(undefined)
  const unknownValue: unknown = OutMessage.Closed()
  const uncheckedValue: any = OutMessage.Closed()
  // @ts-expect-error Unknown values cannot establish the OutMessage contract.
  SelectionDefinition.makeOutMessageStep(unknownValue)
  // @ts-expect-error Any values cannot bypass the OutMessage contract.
  SelectionDefinition.makeOutMessageStep(uncheckedValue)
  const emitClose = SelectionDefinition.makeOutMessageStep(() =>
    OutMessage.Closed(),
  )
  const keepModel = SelectionDefinition.makeNoopStep()
  const changeFields = SelectionDefinition.makeFieldsStep(() => ({}))
  const noopAndClose = [keepModel, emitClose]
  const fieldsAndClose = [changeFields, emitClose]
  // @ts-expect-error The produced Step checks its owning Model.
  emitClose({ count: 'invalid' })
  // One emitting Step in a fixed list keeps its OutMessage on the result.
  const closedOnce = Update.combineSteps(Model.make({ count: 0 }), [
    emitClose,
    keepModel,
  ])
  expectTypeOf(closedOnce.outMessage).toEqualTypeOf<
    typeof OutMessage.Closed.Type | undefined
  >()
  Update.combineSteps([keepModel, emitClose])
  // @ts-expect-error Two emitting Steps cannot share one result.
  Update.combineSteps(Model.make({ count: 0 }), [emitClose, emitClose])
  // @ts-expect-error Two emitting Steps around a Model-only Step stay rejected.
  Update.combineSteps([emitClose, keepModel, emitClose])
  Update.combineSteps([emitClose, keepModel])
  // @ts-expect-error An extracted Step list of unknown length cannot emit.
  Update.combineSteps(noopAndClose)
  // @ts-expect-error A field Step cannot hide an OutMessage in an extracted list.
  Update.combineSteps(fieldsAndClose)
  // @ts-expect-error A data-first extracted list cannot hide its OutMessage.
  Update.combineSteps(Model.make({ count: 0 }), noopAndClose)
  // @ts-expect-error A pure no-op's public contract cannot hide an OutMessage.
  const emittingNoop: typeof keepModel = emitClose
  // @ts-expect-error A pure field Step's public contract cannot hide an OutMessage.
  const emittingFields: typeof changeFields = emitClose
  void emittingNoop
  void emittingFields

  const UnknownDefinition = Block.makeDefinition('UnknownOutMessageStep', {
    Model: Schema.Unknown,
    Message: Schema.Never,
    OutMessage,
  })
  const emitUnknown = UnknownDefinition.makeOutMessageStep(() =>
    OutMessage.Closed(),
  )
  const preserveUnknown = UnknownDefinition.makeNoopStep()
  // An unconstrained Model still retains its OutMessage channel.
  Update.combineSteps([preserveUnknown, emitUnknown])
  // @ts-expect-error Two emitting Steps over an unconstrained Model stay rejected.
  Update.combineSteps([emitUnknown, preserveUnknown, emitUnknown])
}
