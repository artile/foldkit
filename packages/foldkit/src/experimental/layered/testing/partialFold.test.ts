import { Effect, Layer, Schema } from 'effect'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import * as Block from '../../../block/public.js'
import { defineMessageUnion } from '../../../message/index.js'
import { modifyFields } from '../../../struct/index.js'
import * as Story from './story.js'

const ChoiceModel = Schema.Struct({ value: Schema.String })
const ChoiceMessage = defineMessageUnion({
  ClickedOption: { value: Schema.String },
  ClickedClose: {},
})
const ChoiceOutMessage = defineMessageUnion({
  Selected: { value: Schema.String },
  Closed: {},
})
const ChoiceKey = Symbol('PartialFoldChoice')
// InitArgs omitted: init takes no arguments.
const ChoiceBlock = Block.make('PartialFoldChoice', {
  key: ChoiceKey,
  Model: ChoiceModel,
  Message: ChoiceMessage,
  OutMessage: ChoiceOutMessage,
})
const ChoiceComposition = ChoiceBlock.makeComposition()
const choiceLayer = ChoiceBlock.makeLayer({
  init: ChoiceComposition.makeInit(() => ({
    model: ChoiceModel.make({ value: '' }),
  })),
  update: ChoiceComposition.makeUpdate({
    ClickedOption: (model, { value }) => ({
      model: modifyFields(model, { value: () => value }),
      outMessage: ChoiceOutMessage.Selected({ value }),
    }),
    ClickedClose: model => ({
      model,
      outMessage: ChoiceOutMessage.Closed(),
    }),
  }),
})

const ParentModel = Schema.Struct({
  choice: ChoiceBlock.Model,
  picked: Schema.String,
})
type ParentModel = typeof ParentModel.Type
const ParentKey = Symbol('PartialFoldParent')
const ParentBlock = Block.make('PartialFoldParent', {
  key: ParentKey,
  Model: ParentModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
const ChoiceBinding = ParentBlock.makeRequiredFieldBinding(ChoiceBlock, {
  field: 'choice',
}).withOutMessagePolicy({
  fold: ParentBlock.makeOutMessageFold.partial(ChoiceBlock, {
    Selected: ({ value }) =>
      ParentBlock.makeFieldsStep(() => ({ picked: () => value })),
  }),
})
const ParentComposition = ParentBlock.makeComposition({
  bindings: [ChoiceBinding],
})
const parentLayer = ParentBlock.makeLayer({
  init: ParentComposition.makeInit(() => ({ model: { picked: '' } })),
  update: ParentComposition.makeUpdate({}),
}).pipe(Layer.provide(choiceLayer))

const initialModel: ParentModel = ParentModel.make({
  choice: ChoiceModel.make({ value: '' }),
  picked: '',
})

describe('makeOutMessageFold.partial with Block.make children', () => {
  it.effect('folds a named child OutMessage variant into the parent', () =>
    Story.story(
      { block: ParentBlock, layer: parentLayer },
      Story.given(initialModel),
      Story.messageIn(
        ChoiceBinding,
        ChoiceMessage.ClickedOption({ value: 'Pear' }),
      ),
      Story.model(model => {
        expect(model.picked).toBe('Pear')
        expect(model.choice.value).toBe('Pear')
      }),
    ),
  )

  it.effect('initializes a child Block declared without InitArgs', () =>
    Story.story(
      { block: ParentBlock, layer: parentLayer },
      Story.init(),
      Story.model(model => {
        expect(model.choice).toEqual({ value: '' })
      }),
    ),
  )

  it.effect('leaves the parent Model unchanged for an unnamed variant', () =>
    Story.story(
      { block: ParentBlock, layer: parentLayer },
      Story.given(initialModel),
      Story.messageIn(ChoiceBinding, ChoiceMessage.ClickedClose()),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model).toEqual(initialModel)
      }),
    ),
  )

  it.effect('rejects a variant the child does not declare', () =>
    Effect.sync(() => {
      expect(() =>
        ParentBlock.makeOutMessageFold.partial(ChoiceBlock, {
          // @ts-expect-error a partial fold still rejects unknown variants
          Escaped: () => ParentBlock.makeNoopStep(),
        }),
      ).toThrow('unexpected handlers for: Escaped')
    }),
  )

  it.effect(
    'rejects a handler that writes a field the parent does not own',
    () =>
      Effect.sync(() => {
        ParentBlock.makeOutMessageFold.partial(ChoiceBlock, {
          Selected: () =>
            // @ts-expect-error `missing` is not a parent Model field
            ParentBlock.makeFieldsStep(() => ({ missing: () => 1 })),
        })
      }),
  )
})
