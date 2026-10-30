import { Array, Schema, String } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ lines: Schema.Array(Schema.String), draft: Schema.String })

const Message = defineMessageUnion({
  UpdatedDraft: { value: Schema.String },
  SubmittedReply: {},
  RequestedReset: {},
  ReceivedSystemLine: { text: Schema.String },
})

const ConversationDefinition = Block.makeDefinition('Conversation', { Model, Message })

const { makeFieldsStep } = ConversationDefinition

const ConversationComposition = ConversationDefinition.makeComposition()

const init = ConversationComposition.makeInit(() => ({ model: { lines: [], draft: '' } }))

const update = ConversationComposition.makeUpdate({
  UpdatedDraft: makeFieldsStep.fromMessage(({ value }) => ({ draft: () => value })),
  SubmittedReply: model =>
    String.isEmpty(model.draft.trim())
      ? { model }
      : { model: { ...model, lines: Array.append(model.lines, model.draft), draft: '' } },
  RequestedReset: makeFieldsStep(() => ({ lines: () => [], draft: () => '' })),
  ReceivedSystemLine: makeFieldsStep.fromMessage(({ text }) => ({ lines: Array.append(text) })),
})

const view = ConversationComposition.makeView((model, h) =>
  h.section(
    [h.Class('conversation')],
    [
      ...Array.map(model.lines, line => h.p([], [line])),
      h.input([h.Value(model.draft), h.OnInput(value => Message.UpdatedDraft({ value }))]),
      h.button([h.OnClick(Message.SubmittedReply())], ['Send']),
    ],
  ),
)

const prepare = () =>
  ConversationComposition.prepareBlock({
    init,
    update,
    view,
    operations: { requestReset: Message.RequestedReset, informSystemLine: Message.ReceivedSystemLine },
  })
export const ConversationBlock: Block.FromAssemblyWithView<typeof Model, typeof prepare> = Block.assemble(prepare)
