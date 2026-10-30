import { Array, Effect, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndAppend } from 'foldkit/bindingInit'
import { defineMessageUnion } from 'foldkit/message'

import { Client, CommandIds, execute, nextCommandId, OpenWorkOrderArgs, SummaryState } from '../../domain/domainCommands'
import { WorkOrderId } from '../../domain/workOrder'
import { ApprovalPanelBlock } from './approvalPanel'
import { ConversationBlock } from './conversation'
import { LiveTickerBlock } from './liveTicker'
import { Row } from './shared'
import { WorkOrderListBlock } from './workOrderList'

const Model = Schema.Struct({
  list: WorkOrderListBlock.Model,
  conversation: ConversationBlock.Model,
  approval: ApprovalPanelBlock.Model,
  tickers: Schema.Array(LiveTickerBlock.Model),
  maybeError: Schema.Option(Schema.String),
  commandIds: CommandIds,
})

export const Message = defineMessageUnion({
  ClickedOpenWorkOrder: {},
  SucceededOpenWorkOrder: { row: Row },
  FailedOpenWorkOrder: { reason: Schema.String },
})

export const WorkOrdersPageDefinition = Block.makeDefinition('WorkOrdersPage', {
  Model,
  Message,
  ChildInitContext: Schema.String,
})

const { makeFieldsStep, makeStep } = WorkOrdersPageDefinition

export const OpenWorkOrder = WorkOrdersPageDefinition.makeCommand('OpenWorkOrder', {
  args: OpenWorkOrderArgs,
  messages: [Message.SucceededOpenWorkOrder, Message.FailedOpenWorkOrder],
  handler: function* () {
    const client = yield* Client
    return args =>
      execute.OpenWorkOrder(args).pipe(
        Effect.map(result =>
          result._tag === 'SucceededOpenWorkOrder'
            ? Message.SucceededOpenWorkOrder({
                row: Row.make({ id: args.target, title: args.input.title, amount: args.input.amount, approval: 'Waiting' }),
              })
            : Message.FailedOpenWorkOrder({ reason: 'Could not open' }),
        ),
        Effect.provideService(Client, client),
      )
  },
})

const toRow = (id: WorkOrderId, summary: SummaryState) =>
  Row.make({ id, title: summary.title, amount: summary.amount, approval: summary.approval })

export const ConversationBinding = WorkOrdersPageDefinition.makeBinding(ConversationBlock, { field: 'conversation' })

export const ApprovalBinding = WorkOrdersPageDefinition.makeBinding(ApprovalPanelBlock, {
  field: 'approval',
  init: { contextToArgs: session => [session] },
}).withOutMessagePolicy({
  fold: WorkOrdersPageDefinition.makeOutMessageFold(ApprovalPanelBlock, {
    ApprovedWorkOrder: () => ConversationBinding.informSystemLine({ text: 'Owner approved' }),
  }),
})

export const ListBinding = WorkOrdersPageDefinition.makeBinding(WorkOrderListBlock, { field: 'list' }).withOutMessagePolicy({
  fold: WorkOrdersPageDefinition.makeOutMessageFold(WorkOrderListBlock, {
    SelectedWorkOrder: ({ row }) =>
      makeStep(() => Update.combineSteps([ApprovalBinding.requestShow({ row }), ConversationBinding.requestReset()])),
  }),
})

const foldTickerOutMessage = WorkOrdersPageDefinition.makeOutMessageFold(LiveTickerBlock, {
  ChangedSummary: ({ id, summary }) =>
    makeStep(() =>
      Update.combineSteps([
        ListBinding.requestUpsertRow({ row: toRow(id, summary) }),
        ApprovalBinding.requestShow({ row: toRow(id, summary) }),
      ]),
    ),
})

export const TickersBinding = WorkOrdersPageDefinition.makeBinding(LiveTickerBlock, {
  field: 'tickers',
  key: 'workOrderId',
  init: { instances: () => [], toItem: (_occurrence, ticker) => ticker },
}).withOutMessagePolicy({
  fold: (_workOrderId, outMessage) => foldTickerOutMessage(outMessage),
})

export const WorkOrdersPageComposition = WorkOrdersPageDefinition.makeComposition({
  bindings: [ListBinding, ConversationBinding, ApprovalBinding, TickersBinding],
})

export const Flags = Schema.Struct({ session: Schema.String })

export const init = WorkOrdersPageComposition.makeInit(({ session }: typeof Flags.Type) => ({
  childInitContext: session,
  model: {
    maybeError: Option.none(),
    commandIds: CommandIds.make({ session: `${session}:WorkOrdersPage`, sent: 0 }),
  },
}))

export const update = WorkOrdersPageComposition.makeUpdate({
  ClickedOpenWorkOrder: model => {
    const allocation = nextCommandId(model.commandIds)
    const workOrderId = WorkOrderId.make(`wo-${model.commandIds.sent + 1}`)
    return {
      model: { ...model, commandIds: allocation.commandIds },
      commands: [
        OpenWorkOrder({ target: workOrderId, input: { title: 'Leaking sink', amount: 400 }, commandId: allocation.commandId }),
      ],
    }
  },
  SucceededOpenWorkOrder: (model, { row }) =>
    Update.combineSteps(model, [
      makeStep(stepModel => initAndAppend(TickersBinding, stepModel, { key: row.id, args: [row.id] })),
      ListBinding.requestUpsertRow({ row }),
    ]),
  FailedOpenWorkOrder: makeFieldsStep.fromMessage(({ reason }) => ({ maybeError: () => Option.some(reason) })),
})

const view = WorkOrdersPageComposition.makeView((model, h) =>
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
                Option.flatMap(model.list.maybeSelectedId, selectedId =>
                  Array.findFirst(model.list.rows, row => row.id === selectedId),
                ),
                { onNone: () => 'none', onSome: row => row.title },
              )}`,
            ],
          ),
          h.button([h.OnClick(Message.ClickedOpenWorkOrder())], ['New work order']),
        ],
      ),
      h.block(ListBinding.embedView({ slotId: 'list', model: model.list })),
      h.block(ConversationBinding.embedView({ slotId: 'conversation', model: model.conversation })),
      h.block(ApprovalBinding.embedView({ slotId: 'approval', model: model.approval })),
    ],
  ),
)

const prepare = () =>
  WorkOrdersPageComposition.prepareBlock({ init, update, view, EffectsLayer: OpenWorkOrder.layer })
export const WorkOrdersPageBlock: Block.FromAssemblyWithView<typeof Model, typeof prepare> = Block.assemble(prepare)
