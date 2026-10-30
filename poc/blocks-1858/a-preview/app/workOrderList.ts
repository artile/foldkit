import { Array, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { WorkOrderId } from '../../domain/workOrder'
import { Row } from './shared'

const Model = Schema.Struct({ rows: Schema.Array(Row), maybeSelectedId: Schema.Option(WorkOrderId) })

export const Message = defineMessageUnion({ ClickedRow: { id: WorkOrderId }, RequestedUpsertRow: { row: Row } })

const OutMessage = defineMessageUnion({ SelectedWorkOrder: { row: Row } })

const WorkOrderListDefinition = Block.makeDefinition('WorkOrderList', { Model, Message, OutMessage })

const { makeFieldsStep } = WorkOrderListDefinition

const WorkOrderListComposition = WorkOrderListDefinition.makeComposition()

const init = WorkOrderListComposition.makeInit(() => ({ model: { rows: [], maybeSelectedId: Option.none() } }))

const update = WorkOrderListComposition.makeUpdate({
  ClickedRow: (model, { id }) =>
    Option.match(
      Array.findFirst(model.rows, row => row.id === id),
      {
        onNone: () => ({ model }),
        onSome: row => ({
          model: { ...model, maybeSelectedId: Option.some(id) },
          outMessage: OutMessage.SelectedWorkOrder({ row }),
        }),
      },
    ),
  RequestedUpsertRow: makeFieldsStep.fromMessage(({ row }) => ({
    rows: rows =>
      Array.some(rows, ({ id }) => id === row.id)
        ? Array.map(rows, current => (current.id === row.id ? row : current))
        : Array.append(rows, row),
  })),
})

const view = WorkOrderListComposition.makeView((model, h) =>
  h.ul(
    [h.Class('work-order-list')],
    Array.map(model.rows, row =>
      h.keyed('li')(row.id, [h.DataAttribute('selected', String(Option.contains(model.maybeSelectedId, row.id)))], [
        h.button([h.OnClick(Message.ClickedRow({ id: row.id }))], [`${row.title} · ${row.approval}`]),
      ]),
    ),
  ),
)

const prepare = () =>
  WorkOrderListComposition.prepareBlock({
    init,
    update,
    view,
    operations: { requestUpsertRow: Message.RequestedUpsertRow },
  })
export const WorkOrderListBlock: Block.FromAssemblyWithViewAndOutMessage<typeof Model, typeof prepare> =
  Block.assemble(prepare)
