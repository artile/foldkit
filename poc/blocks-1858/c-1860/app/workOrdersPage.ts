import { Array, Effect, Option, Schema } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Client, CommandIds, execute, nextCommandId, OpenWorkOrderArgs, type SummaryState } from '../domain/domainCommands'
import { WorkOrderId } from '../domain/workOrder'
import { ApprovalPanel } from './approvalPanel'
import { Block } from './blocks'
import { Conversation } from './conversation'
import { LiveTicker } from './liveTicker'
import { Session } from './session'
import { Row } from './shared'
import { WorkOrderList } from './workOrderList'

const Message = defineMessageUnion({
  ClickedOpenWorkOrder: {},
  SucceededOpenWorkOrder: { row: Row },
  FailedOpenWorkOrder: { reason: Schema.String },
})

export const OpenWorkOrder = Command.define('OpenWorkOrder', {
  args: OpenWorkOrderArgs,
  messages: [Message.SucceededOpenWorkOrder, Message.FailedOpenWorkOrder],
})

export class WorkOrdersPage extends Block<WorkOrdersPage>()('WorkOrdersPage', {
  Model: Schema.Struct({
    list: WorkOrderList,
    conversation: Conversation,
    approval: ApprovalPanel,
    tickers: Schema.Array(LiveTicker),
    maybeError: Schema.Option(Schema.String),
    commandIds: CommandIds,
  }),
  Message,
  Command: [OpenWorkOrder],
}) {}

const toRow = (id: WorkOrderId, summary: SummaryState) =>
  Row.make({ id, title: summary.title, amount: summary.amount, approval: summary.approval })

export const WorkOrdersPageLive = WorkOrdersPage.make(
  Effect.fn(function* (id) {
    const client = yield* Client
    const session = yield* Session
    const list = yield* new WorkOrderList('list')
    const conversation = yield* new Conversation('conversation')
    const approval = yield* new ApprovalPanel('approval', { session })
    const ticker = yield* LiveTicker.each('tickers')

    return {
      model: {
        list,
        conversation,
        approval,
        tickers: [],
        maybeError: Option.none(),
        commandIds: CommandIds.make({ session: `${session}:${id}`, sent: 0 }),
      },
      update: {
        ClickedOpenWorkOrder: model => {
          const allocation = nextCommandId(model.commandIds)
          const workOrderId = WorkOrderId.make(`wo-${model.commandIds.sent + 1}`)
          return {
            model: modifyFields(model, { commandIds: () => allocation.commandIds }),
            commands: [
              OpenWorkOrder({ target: workOrderId, input: { title: 'Leaking sink', amount: 400 }, commandId: allocation.commandId }),
            ],
          }
        },
        SucceededOpenWorkOrder: (model, { row }) => ({
          model: modifyFields(model, { tickers: Array.append(ticker(row.id)) }),
          messages: [model.list.send(WorkOrderList.Message.RequestedUpsertRow({ row }))],
        }),
        FailedOpenWorkOrder: (model, { reason }) => ({
          model: modifyFields(model, { maybeError: () => Option.some(reason) }),
        }),

        ...list.on({
          SelectedWorkOrder: (model, { row }) => ({
            model,
            messages: [
              model.approval.send(ApprovalPanel.Message.RequestedShow({ row })),
              model.conversation.send(Conversation.Message.RequestedReset()),
            ],
          }),
        }),
        ...ticker.on({
          ChangedSummary: (model, { id: workOrderId, summary }) => ({
            model,
            messages: [
              model.list.send(WorkOrderList.Message.RequestedUpsertRow({ row: toRow(workOrderId, summary) })),
              model.approval.send(ApprovalPanel.Message.ReceivedRowUpdate({ row: toRow(workOrderId, summary) })),
            ],
          }),
        }),
        ...approval.on({
          ApprovedWorkOrder: model => ({
            model,
            messages: [model.conversation.send(Conversation.Message.ReceivedSystemLine({ text: 'Owner approved' }))],
          }),
        }),
      },
      commands: {
        OpenWorkOrder: args =>
          execute.OpenWorkOrder(args).pipe(
            Effect.map(result =>
              result._tag === 'SucceededOpenWorkOrder'
                ? WorkOrdersPage.Message.SucceededOpenWorkOrder({
                    row: Row.make({ id: args.target, title: args.input.title, amount: args.input.amount, approval: 'Waiting' }),
                  })
                : WorkOrdersPage.Message.FailedOpenWorkOrder({ reason: 'Could not open' }),
            ),
            Effect.provideService(Client, client),
          ),
      },
      view: (model, h) =>
        h.div(
          [h.Class('work-orders-page')],
          [
            h.header(
              [],
              [
                h.h2(
                  [],
                  [
                    `Selected: ${Option.match(
                      Option.flatMap(model.list.model.maybeSelectedId, selectedId =>
                        Array.findFirst(model.list.model.rows, row => row.id === selectedId),
                      ),
                      { onNone: () => 'none', onSome: row => row.title },
                    )}`,
                  ],
                ),
                h.button([h.OnClick(WorkOrdersPage.Message.ClickedOpenWorkOrder())], ['New work order']),
              ],
            ),
            model.list.view(),
            model.conversation.view(),
            model.approval.view(),
          ],
        ),
    }
  }),
)
