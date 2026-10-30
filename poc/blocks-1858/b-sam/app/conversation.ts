import { Array, Effect, Schema, String } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Block } from '../blocks'

export class Conversation extends Block<Conversation>()('Conversation', {
  Model: Schema.Struct({ lines: Schema.Array(Schema.String), draft: Schema.String }),
  Message: defineMessageUnion({
    UpdatedDraft: { value: Schema.String },
    SubmittedReply: {},
    RequestedReset: {},
    ReceivedSystemLine: { text: Schema.String },
  }),
}) {}

export const ConversationLive = Conversation.make(
  Effect.fn(function* () {
    return {
      model: { lines: [], draft: '' },
      update: {
        UpdatedDraft: (model, { value }) => ({ model: modifyFields(model, { draft: () => value }) }),
        SubmittedReply: model =>
          String.isEmpty(model.draft.trim())
            ? { model }
            : { model: modifyFields(model, { lines: Array.append(model.draft), draft: () => '' }) },
        RequestedReset: () => ({ model: { lines: [], draft: '' } }),
        ReceivedSystemLine: (model, { text }) => ({ model: modifyFields(model, { lines: Array.append(text) }) }),
      },
      view: (model, h) =>
        h.section(
          [h.Class('conversation')],
          [
            ...Array.map(model.lines, line => h.p([], [line])),
            h.input([h.Value(model.draft), h.OnInput(value => Conversation.Message.UpdatedDraft({ value }))]),
            h.button([h.OnClick(Conversation.Message.SubmittedReply())], ['Send']),
          ],
        ),
    }
  }),
)
