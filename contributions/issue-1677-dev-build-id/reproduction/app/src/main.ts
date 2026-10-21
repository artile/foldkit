import { Schema } from 'effect'
import type { Runtime } from 'foldkit'
import type { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ greeting: Schema.String })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({ ClickedGreeting: {} })
export type Message = typeof Message.Type

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: { greeting: 'hello' },
})

export const update = (model: Model, _message: Message) => ({ model })

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'reproduction',
  body: h.main([], [model.greeting]),
})
