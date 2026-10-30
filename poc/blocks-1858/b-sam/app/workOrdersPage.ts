import { Array, Effect, Option, Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Client, CommandIds, execute, nextCommandId, OpenWorkOrderArgs } from '../../domain/domainCommands'
import { WorkOrderId } from '../../domain/workOrder'
import { Block, Command, Output } from '../blocks'
import { ApprovalPanel } from './approvalPanel'
import { Conversation } from './conversation'
import { LiveTicker } from './liveTicker'
import { Row } from './shared'
import { WorkOrderList } from './workOrderList'

const Message = defineMessageUnion({
  ClickedOpenWorkOrder: {},
  SucceededOpenWorkOrder: { row: Row },
  FailedOpenWorkOrder: { reason: Schema.String },
})

export const OpenWorkOrder = Command.make('OpenWorkOrder', {
  args: OpenWorkOrderArgs,
  messages: [Message.SucceededOpenWorkOrder, Message.FailedOpenWorkOrder],
})

export class WorkOrdersPage extends Block<WorkOrdersPage, { readonly session: string }>()('WorkOrdersPage', {
  Model: Schema.Struct({
    list: WorkOrderList.Ref,
    conversation: Conversation.Ref,
    approval: ApprovalPanel.Ref,
    tickers: Schema.Array(LiveTicker.Ref),
    maybeError: Schema.Option(Schema.String),
    commandIds: CommandIds,
  }),
  Message,
  Command: [OpenWorkOrder],
}) {}

const toRow = (id: WorkOrderId, summary: { readonly title: string; readonly amount: number; readonly approval: Row['approval'] }) =>
  Row.make({ id, title: summary.title, amount: summary.amount, approval: summary.approval })

export const WorkOrdersPageLive = WorkOrdersPage.make(
  Effect.fn(function* (id, { session }) {
    const client = yield* Client
    const list = yield* WorkOrderList.instance('list')
    const conversation = yield* Conversation.instance('conversation')
    const approval = yield* ApprovalPanel.instance('approval', { session })
    const ticker = yield* LiveTicker.each('tickers')

    const selectedTitle = list.model.pipe(
      Output.map(listModel =>
        Option.match(
          Option.flatMap(listModel.maybeSelectedId, selectedId => Array.findFirst(listModel.rows, row => row.id === selectedId)),
          { onNone: () => 'none', onSome: row => row.title },
        ),
      ),
    )

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

        ...WorkOrdersPage.on(list, {
          SelectedWorkOrder: (model, { row }) => ({
            model,
            messages: [
              model.approval.send(ApprovalPanel.Message.RequestedShow({ row })),
              model.conversation.send(Conversation.Message.RequestedReset()),
            ],
          }),
        }),
        ...WorkOrdersPage.on(ticker, {
          ChangedSummary: (model, { id: workOrderId, summary }) => ({
            model,
            messages: [
              model.list.send(WorkOrderList.Message.RequestedUpsertRow({ row: toRow(workOrderId, summary) })),
              model.approval.send(ApprovalPanel.Message.ReceivedRowUpdate({ row: toRow(workOrderId, summary) })),
            ],
          }),
        }),
        ...WorkOrdersPage.on(approval, {
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
            h.header([], [h.h2([], ['Selected: ', selectedTitle]), h.button([h.OnClick(WorkOrdersPage.Message.ClickedOpenWorkOrder())], ['New work order'])]),
            model.list.view(),
            model.conversation.view(),
            model.approval.view(),
          ],
        ),
    }
  }),
)
