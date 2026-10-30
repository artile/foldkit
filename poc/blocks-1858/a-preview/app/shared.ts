import { Schema } from 'effect'

import { ApprovalStatus, WorkOrderId } from '../../domain/workOrder'

export const Row = Schema.Struct({
  id: WorkOrderId,
  title: Schema.String,
  amount: Schema.Number,
  approval: ApprovalStatus,
})
export type Row = typeof Row.Type
