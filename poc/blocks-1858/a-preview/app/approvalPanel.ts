import { Effect, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { ApproveWorkOrderArgs, Client, CommandIds, execute, nextCommandId } from '../../domain/domainCommands'
import { WorkOrderId } from '../../domain/workOrder'
import { Row } from './shared'

const Model = Schema.Struct({
  maybeRow: Schema.Option(Row),
  isSubmitting: Schema.Boolean,
  maybeError: Schema.Option(Schema.String),
  commandIds: CommandIds,
})

export const Message = defineMessageUnion({
  RequestedShow: { row: Row },
  ReceivedRowUpdate: { row: Row },
  ClickedApprove: {},
  SucceededApproveWorkOrder: { workOrderId: WorkOrderId },
  FailedApproveWorkOrder: { reason: Schema.String },
})

export const OutMessage = defineMessageUnion({ ApprovedWorkOrder: { workOrderId: WorkOrderId } })

const ApprovalPanelDefinition = Block.makeDefinition('ApprovalPanel', { Model, Message, OutMessage })

const { makeFieldsStep } = ApprovalPanelDefinition

export const ApproveWorkOrder = ApprovalPanelDefinition.makeCommand('ApproveWorkOrder', {
  args: ApproveWorkOrderArgs,
  messages: [Message.SucceededApproveWorkOrder, Message.FailedApproveWorkOrder],
  handler: function* () {
    const client = yield* Client
    return args =>
      execute.ApproveWorkOrder(args).pipe(
        Effect.map(result =>
          result._tag === 'SucceededApproveWorkOrder'
            ? Message.SucceededApproveWorkOrder({ workOrderId: args.target })
            : Message.FailedApproveWorkOrder({
                reason: result.failure._tag === 'Rejected' ? result.failure.rejection._tag : 'Unknown',
              }),
        ),
        Effect.provideService(Client, client),
      )
  },
})

const ApprovalPanelComposition = ApprovalPanelDefinition.makeComposition()

export const init = ApprovalPanelComposition.makeInit((session: string) => ({
  model: {
    maybeRow: Option.none(),
    isSubmitting: false,
    maybeError: Option.none(),
    commandIds: CommandIds.make({ session: `${session}:ApprovalPanel`, sent: 0 }),
  },
}))

export const update = ApprovalPanelComposition.makeUpdate({
  RequestedShow: makeFieldsStep.fromMessage(({ row }) => ({
    maybeRow: () => Option.some(row),
    maybeError: () => Option.none(),
  })),
  ReceivedRowUpdate: (model, { row }) =>
    Option.exists(model.maybeRow, ({ id }) => id === row.id) ? { model: { ...model, maybeRow: Option.some(row) } } : { model },
  ClickedApprove: model =>
    Option.match(model.maybeRow, {
      onNone: () => ({ model }),
      onSome: row => {
        const allocation = nextCommandId(model.commandIds)
        return {
          model: { ...model, isSubmitting: true, commandIds: allocation.commandIds },
          commands: [ApproveWorkOrder({ target: row.id, input: { by: 'owner' }, commandId: allocation.commandId })],
        }
      },
    }),
  SucceededApproveWorkOrder: (model, { workOrderId }) => ({
    model: { ...model, isSubmitting: false },
    outMessage: OutMessage.ApprovedWorkOrder({ workOrderId }),
  }),
  FailedApproveWorkOrder: makeFieldsStep.fromMessage(({ reason }) => ({
    isSubmitting: () => false,
    maybeError: () => Option.some(reason),
  })),
})

const view = ApprovalPanelComposition.makeView((model, h) =>
  h.section(
    [h.Class('approval-panel')],
    Option.match(model.maybeRow, {
      onNone: () => [h.p([], ['Select a work order'])],
      onSome: row => [
        h.p([], [`$${row.amount} · ${row.approval}`]),
        h.button(
          [h.Disabled(row.approval !== 'Waiting' || model.isSubmitting), h.OnClick(Message.ClickedApprove())],
          ['Approve'],
        ),
        ...Option.toArray(Option.map(model.maybeError, reason => h.p([h.Class('error')], [reason]))),
      ],
    }),
  ),
)

const prepare = () =>
  ApprovalPanelComposition.prepareBlock({
    init,
    update,
    view,
    EffectsLayer: ApproveWorkOrder.layer,
    operations: { requestShow: Message.RequestedShow, informRowUpdate: Message.ReceivedRowUpdate },
  })
export const ApprovalPanelBlock: Block.FromAssemblyWithViewAndOutMessage<typeof Model, typeof prepare> =
  Block.assemble(prepare)
