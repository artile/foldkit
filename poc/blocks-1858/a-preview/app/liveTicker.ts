import { Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Schema } from 'effect'

import { Client, SummaryState } from '../../domain/domainCommands'
import { WorkOrderId } from '../../domain/workOrder'

const Model = Schema.Struct({ workOrderId: WorkOrderId })

export const Message = defineMessageUnion({ ReceivedSummary: { summary: SummaryState } })

export const OutMessage = defineMessageUnion({ ChangedSummary: { id: WorkOrderId, summary: SummaryState } })

const LiveTickerDefinition = Block.makeDefinition('LiveTicker', { Model, Message, OutMessage })

const { makeOutMessageStep } = LiveTickerDefinition

const subscriptions = LiveTickerDefinition.makeSubscriptions(entry => ({
  summary: entry(
    'WatchSummary',
    { workOrderId: WorkOrderId },
    {
      messages: [Message.ReceivedSummary],
      modelToDependencies: model => ({ workOrderId: model.workOrderId }),
      handler: function* () {
        const client = yield* Client
        return ({ workOrderId }) =>
          client.WorkOrderSummary.watch(workOrderId).pipe(
            Stream.filter(summary => summary !== null),
            Stream.map(summary => Message.ReceivedSummary({ summary })),
            Stream.orDie,
          )
      },
    },
  ),
}))

const LiveTickerComposition = LiveTickerDefinition.makeComposition()

const init = LiveTickerComposition.makeInit((workOrderId: WorkOrderId) => ({ model: { workOrderId } }))

const update = LiveTickerComposition.makeUpdate({
  ReceivedSummary: (model, { summary }) => makeOutMessageStep(() => OutMessage.ChangedSummary({ id: model.workOrderId, summary }))(model),
})

const prepare = () =>
  LiveTickerComposition.prepareBlock({ init, update, subscriptions, EffectsLayer: subscriptions.layer })
export const LiveTickerBlock: Block.FromAssemblyWithOutMessage<typeof Model, typeof prepare> = Block.assemble(prepare)
