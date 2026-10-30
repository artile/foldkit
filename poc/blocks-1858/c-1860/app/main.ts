import { Layer } from 'effect'

import { ApprovalPanelLive } from './approvalPanel'
import { ConversationLive } from './conversation'
import { LiveTickerLive } from './liveTicker'
import { WorkOrderListLive } from './workOrderList'
import { WorkOrdersPageLive } from './workOrdersPage'

export const BlocksLayer = WorkOrdersPageLive.pipe(
  Layer.provide(WorkOrderListLive),
  Layer.provide(ConversationLive),
  Layer.provide(ApprovalPanelLive),
  Layer.provide(LiveTickerLive),
)
