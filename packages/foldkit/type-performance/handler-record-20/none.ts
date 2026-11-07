import { Context, Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

class Api extends Context.Service<Api, Readonly<{ call: (id: string) => Effect.Effect<boolean> }>>()('PerUse/Api') {}
const Message = defineMessageUnion({
  Clicked0: { id: Schema.String },
  Succeeded0: {},
  Failed0: { error: Schema.String },
  Clicked1: { id: Schema.String },
  Succeeded1: {},
  Failed1: { error: Schema.String },
  Clicked2: { id: Schema.String },
  Succeeded2: {},
  Failed2: { error: Schema.String },
  Clicked3: { id: Schema.String },
  Succeeded3: {},
  Failed3: { error: Schema.String },
  Clicked4: { id: Schema.String },
  Succeeded4: {},
  Failed4: { error: Schema.String },
  Clicked5: { id: Schema.String },
  Succeeded5: {},
  Failed5: { error: Schema.String },
  Clicked6: { id: Schema.String },
  Succeeded6: {},
  Failed6: { error: Schema.String },
  Clicked7: { id: Schema.String },
  Succeeded7: {},
  Failed7: { error: Schema.String },
  Clicked8: { id: Schema.String },
  Succeeded8: {},
  Failed8: { error: Schema.String },
  Clicked9: { id: Schema.String },
  Succeeded9: {},
  Failed9: { error: Schema.String },
  Clicked10: { id: Schema.String },
  Succeeded10: {},
  Failed10: { error: Schema.String },
  Clicked11: { id: Schema.String },
  Succeeded11: {},
  Failed11: { error: Schema.String },
  Clicked12: { id: Schema.String },
  Succeeded12: {},
  Failed12: { error: Schema.String },
  Clicked13: { id: Schema.String },
  Succeeded13: {},
  Failed13: { error: Schema.String },
  Clicked14: { id: Schema.String },
  Succeeded14: {},
  Failed14: { error: Schema.String },
  Clicked15: { id: Schema.String },
  Succeeded15: {},
  Failed15: { error: Schema.String },
  Clicked16: { id: Schema.String },
  Succeeded16: {},
  Failed16: { error: Schema.String },
  Clicked17: { id: Schema.String },
  Succeeded17: {},
  Failed17: { error: Schema.String },
  Clicked18: { id: Schema.String },
  Succeeded18: {},
  Failed18: { error: Schema.String },
  Clicked19: { id: Schema.String },
  Succeeded19: {},
  Failed19: { error: Schema.String },
})
const Key = Symbol('PerUse')
const PerUse = Block.make('PerUse', {
  key: Key,
  Model: Schema.Struct({ count: Schema.Number }),
  Message,
  InitArgs: Schema.Tuple([]),
  effects: { services: [Api] },
})
const Do0 = PerUse.makeCommand('Do0', { args: { id: Schema.String }, messages: [Message.Succeeded0, Message.Failed0] })
const Do1 = PerUse.makeCommand('Do1', { args: { id: Schema.String }, messages: [Message.Succeeded1, Message.Failed1] })
const Do2 = PerUse.makeCommand('Do2', { args: { id: Schema.String }, messages: [Message.Succeeded2, Message.Failed2] })
const Do3 = PerUse.makeCommand('Do3', { args: { id: Schema.String }, messages: [Message.Succeeded3, Message.Failed3] })
const Do4 = PerUse.makeCommand('Do4', { args: { id: Schema.String }, messages: [Message.Succeeded4, Message.Failed4] })
const Do5 = PerUse.makeCommand('Do5', { args: { id: Schema.String }, messages: [Message.Succeeded5, Message.Failed5] })
const Do6 = PerUse.makeCommand('Do6', { args: { id: Schema.String }, messages: [Message.Succeeded6, Message.Failed6] })
const Do7 = PerUse.makeCommand('Do7', { args: { id: Schema.String }, messages: [Message.Succeeded7, Message.Failed7] })
const Do8 = PerUse.makeCommand('Do8', { args: { id: Schema.String }, messages: [Message.Succeeded8, Message.Failed8] })
const Do9 = PerUse.makeCommand('Do9', { args: { id: Schema.String }, messages: [Message.Succeeded9, Message.Failed9] })
const Do10 = PerUse.makeCommand('Do10', { args: { id: Schema.String }, messages: [Message.Succeeded10, Message.Failed10] })
const Do11 = PerUse.makeCommand('Do11', { args: { id: Schema.String }, messages: [Message.Succeeded11, Message.Failed11] })
const Do12 = PerUse.makeCommand('Do12', { args: { id: Schema.String }, messages: [Message.Succeeded12, Message.Failed12] })
const Do13 = PerUse.makeCommand('Do13', { args: { id: Schema.String }, messages: [Message.Succeeded13, Message.Failed13] })
const Do14 = PerUse.makeCommand('Do14', { args: { id: Schema.String }, messages: [Message.Succeeded14, Message.Failed14] })
const Do15 = PerUse.makeCommand('Do15', { args: { id: Schema.String }, messages: [Message.Succeeded15, Message.Failed15] })
const Do16 = PerUse.makeCommand('Do16', { args: { id: Schema.String }, messages: [Message.Succeeded16, Message.Failed16] })
const Do17 = PerUse.makeCommand('Do17', { args: { id: Schema.String }, messages: [Message.Succeeded17, Message.Failed17] })
const Do18 = PerUse.makeCommand('Do18', { args: { id: Schema.String }, messages: [Message.Succeeded18, Message.Failed18] })
const Do19 = PerUse.makeCommand('Do19', { args: { id: Schema.String }, messages: [Message.Succeeded19, Message.Failed19] })
const Composition = PerUse.makeComposition()
const init = Composition.makeInit(() => ({ model: { count: 0 } }))
const update = Composition.makeUpdate({
  Clicked0: (model, { id }) => ({ model, commands: [Do0({ id })] }),
  Succeeded0: model => ({ model }),
  Failed0: model => ({ model }),
  Clicked1: (model, { id }) => ({ model, commands: [Do1({ id })] }),
  Succeeded1: model => ({ model }),
  Failed1: model => ({ model }),
  Clicked2: (model, { id }) => ({ model, commands: [Do2({ id })] }),
  Succeeded2: model => ({ model }),
  Failed2: model => ({ model }),
  Clicked3: (model, { id }) => ({ model, commands: [Do3({ id })] }),
  Succeeded3: model => ({ model }),
  Failed3: model => ({ model }),
  Clicked4: (model, { id }) => ({ model, commands: [Do4({ id })] }),
  Succeeded4: model => ({ model }),
  Failed4: model => ({ model }),
  Clicked5: (model, { id }) => ({ model, commands: [Do5({ id })] }),
  Succeeded5: model => ({ model }),
  Failed5: model => ({ model }),
  Clicked6: (model, { id }) => ({ model, commands: [Do6({ id })] }),
  Succeeded6: model => ({ model }),
  Failed6: model => ({ model }),
  Clicked7: (model, { id }) => ({ model, commands: [Do7({ id })] }),
  Succeeded7: model => ({ model }),
  Failed7: model => ({ model }),
  Clicked8: (model, { id }) => ({ model, commands: [Do8({ id })] }),
  Succeeded8: model => ({ model }),
  Failed8: model => ({ model }),
  Clicked9: (model, { id }) => ({ model, commands: [Do9({ id })] }),
  Succeeded9: model => ({ model }),
  Failed9: model => ({ model }),
  Clicked10: (model, { id }) => ({ model, commands: [Do10({ id })] }),
  Succeeded10: model => ({ model }),
  Failed10: model => ({ model }),
  Clicked11: (model, { id }) => ({ model, commands: [Do11({ id })] }),
  Succeeded11: model => ({ model }),
  Failed11: model => ({ model }),
  Clicked12: (model, { id }) => ({ model, commands: [Do12({ id })] }),
  Succeeded12: model => ({ model }),
  Failed12: model => ({ model }),
  Clicked13: (model, { id }) => ({ model, commands: [Do13({ id })] }),
  Succeeded13: model => ({ model }),
  Failed13: model => ({ model }),
  Clicked14: (model, { id }) => ({ model, commands: [Do14({ id })] }),
  Succeeded14: model => ({ model }),
  Failed14: model => ({ model }),
  Clicked15: (model, { id }) => ({ model, commands: [Do15({ id })] }),
  Succeeded15: model => ({ model }),
  Failed15: model => ({ model }),
  Clicked16: (model, { id }) => ({ model, commands: [Do16({ id })] }),
  Succeeded16: model => ({ model }),
  Failed16: model => ({ model }),
  Clicked17: (model, { id }) => ({ model, commands: [Do17({ id })] }),
  Succeeded17: model => ({ model }),
  Failed17: model => ({ model }),
  Clicked18: (model, { id }) => ({ model, commands: [Do18({ id })] }),
  Succeeded18: model => ({ model }),
  Failed18: model => ({ model }),
  Clicked19: (model, { id }) => ({ model, commands: [Do19({ id })] }),
  Succeeded19: model => ({ model }),
  Failed19: model => ({ model }),
})
export const used = [Layer.empty, init, update] as const
