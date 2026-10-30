import { Effect, Stream } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Client, SummaryState } from '../../domain/domainCommands'
import { WorkOrderId } from '../../domain/workOrder'
import { Block } from '../blocks'

export class LiveTicker extends Block<LiveTicker>()('LiveTicker', {
  Message: defineMessageUnion({ ReceivedSummary: { summary: SummaryState } }),
  OutMessage: defineMessageUnion({ ChangedSummary: { id: WorkOrderId, summary: SummaryState } }),
}) {}

export const LiveTickerLive = LiveTicker.make(
  Effect.fn(function* (id) {
    const client = yield* Client
    const workOrderId = WorkOrderId.make(id)

    return {
      stream: client.WorkOrderSummary.watch(workOrderId).pipe(
        Stream.filter(summary => summary !== null),
        Stream.map(summary => LiveTicker.Message.ReceivedSummary({ summary })),
        Stream.orDie,
      ),
      update: {
        ReceivedSummary: (model, { summary }) => ({
          model,
          outMessage: LiveTicker.OutMessage.ChangedSummary({ id: workOrderId, summary }),
        }),
      },
    }
  }),
)
