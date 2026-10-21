import { Schema } from 'effect'
import { Runtime, type Update } from 'foldkit'
import { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

// MODEL

export const Model = Schema.Struct({ submitCount: Schema.Number })
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({ SubmittedForm: {} })
export type Message = typeof Message.Type

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    SubmittedForm: () => ({
      model: modifyFields(model, { submitCount: count => count + 1 }),
    }),
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: { submitCount: 0 },
})

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Repro',
  body: h.div(
    [],
    [
      h.form(
        [h.OnSubmit(Message.SubmittedForm())],
        [
          h.input([h.Name('code'), h.Id('code')]),
          Button.view(
            {
              type: 'submit',
              isDisabled: true,
              toView: attributes =>
                h.button([...attributes.button, h.Id('apply')], ['Apply']),
            },
            h,
          ),
        ],
      ),
      h.p([h.Id('count')], [String(model.submitCount)]),
    ],
  ),
})
