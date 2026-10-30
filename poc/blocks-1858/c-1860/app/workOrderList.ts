import { Array, Effect, Option, Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { WorkOrderId } from '../domain/workOrder'
import { Block } from './blocks'
import { Row } from './shared'

export class WorkOrderList extends Block<WorkOrderList>()('WorkOrderList', {
  Model: Schema.Struct({ rows: Schema.Array(Row), maybeSelectedId: Schema.Option(WorkOrderId) }),
  Message: defineMessageUnion({ ClickedRow: { id: WorkOrderId }, RequestedUpsertRow: { row: Row } }),
  OutMessage: defineMessageUnion({ SelectedWorkOrder: { row: Row } }),
}) {}

export const WorkOrderListLive = WorkOrderList.make(
  Effect.fn(function* () {
    return {
      model: { rows: [], maybeSelectedId: Option.none() },
      update: {
        ClickedRow: (model, { id }) =>
          Option.match(
            Array.findFirst(model.rows, row => row.id === id),
            {
              onNone: () => ({ model }),
              onSome: row => ({
                model: modifyFields(model, { maybeSelectedId: () => Option.some(id) }),
                outMessage: WorkOrderList.OutMessage.SelectedWorkOrder({ row }),
              }),
            },
          ),
        RequestedUpsertRow: (model, { row }) => ({
          model: modifyFields(model, {
            rows: rows =>
              Array.some(rows, ({ id }) => id === row.id)
                ? Array.map(rows, current => (current.id === row.id ? row : current))
                : Array.append(rows, row),
          }),
        }),
      },
      view: (model, h) =>
        h.ul(
          [h.Class('work-order-list')],
          Array.map(model.rows, row =>
            h.keyed('li')(row.id, [h.DataAttribute('selected', String(Option.contains(model.maybeSelectedId, row.id)))], [
              h.button([h.OnClick(WorkOrderList.Message.ClickedRow({ id: row.id }))], [`${row.title} · ${row.approval}`]),
            ]),
          ),
        ),
    }
  }),
)
