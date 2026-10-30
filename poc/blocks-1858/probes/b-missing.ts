import { Effect, Layer } from 'effect'

import { ClientInMemory } from '../domain/inMemory'
import { Runtime } from '../b-sam/blocks'
import { ApprovalPanelLive } from '../b-sam/app/approvalPanel'
import { ConversationLive } from '../b-sam/app/conversation'
import { LiveTickerLive } from '../b-sam/app/liveTicker'
import { WorkOrderListLive } from '../b-sam/app/workOrderList'
import { WorkOrdersPage, WorkOrdersPageLive } from '../b-sam/app/workOrdersPage'

const withoutTicker = WorkOrdersPageLive.pipe(
  Layer.provide(WorkOrderListLive),
  Layer.provide(ConversationLive),
  Layer.provide(ApprovalPanelLive),
  Layer.provide(ClientInMemory),
)

export const missingBlock = Runtime.run(WorkOrdersPage, {
  container: document.body,
  layer: withoutTicker,
  args: { session: 's' },
})

export const missingService = Runtime.run(WorkOrdersPage, {
  container: document.body,
  layer: WorkOrdersPageLive.pipe(Layer.provide([WorkOrderListLive, ConversationLive, ApprovalPanelLive, LiveTickerLive])),
  args: { session: 's' },
})
void Effect
