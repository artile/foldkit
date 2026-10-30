import { Effect, Option, Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { ApproveWorkOrderArgs, Client, CommandIds, execute, nextCommandId } from '../../domain/domainCommands'
import { WorkOrderId } from '../../domain/workOrder'
import { Block, Command } from '../blocks'
import { Row } from './shared'

const Message = defineMessageUnion({
  RequestedShow: { row: Row },
  ClickedApprove: {},
  SucceededApproveWorkOrder: { workOrderId: WorkOrderId },
  FailedApproveWorkOrder: { reason: Schema.String },
})

export const ApproveWorkOrder = Command.make('ApproveWorkOrder', {
  args: ApproveWorkOrderArgs,
  messages: [Message.SucceededApproveWorkOrder, Message.FailedApproveWorkOrder],
})

export class ApprovalPanel extends Block<ApprovalPanel, { readonly session: string }>()('ApprovalPanel', {
  Model: Schema.Struct({
    maybeRow: Schema.Option(Row),
    isSubmitting: Schema.Boolean,
    maybeError: Schema.Option(Schema.String),
    commandIds: CommandIds,
  }),
  Message,
  OutMessage: defineMessageUnion({ ApprovedWorkOrder: { workOrderId: WorkOrderId } }),
  Command: [ApproveWorkOrder],
}) {}

export const ApprovalPanelLive = ApprovalPanel.make(
  Effect.fn(function* (id, { session }) {
    const client = yield* Client

    return {
      model: {
        maybeRow: Option.none(),
        isSubmitting: false,
        maybeError: Option.none(),
        commandIds: CommandIds.make({ session: `${session}:${id}`, sent: 0 }),
      },
      update: {
        RequestedShow: (model, { row }) => ({
          model: modifyFields(model, { maybeRow: () => Option.some(row), maybeError: () => Option.none() }),
        }),
        ClickedApprove: model =>
          Option.match(model.maybeRow, {
            onNone: () => ({ model }),
            onSome: row => {
              const allocation = nextCommandId(model.commandIds)
              return {
                model: modifyFields(model, { isSubmitting: () => true, commandIds: () => allocation.commandIds }),
                commands: [
                  ApproveWorkOrder({ target: row.id, input: { by: 'owner' }, commandId: allocation.commandId }),
                ],
              }
            },
          }),
        SucceededApproveWorkOrder: (model, { workOrderId }) => ({
          model: modifyFields(model, { isSubmitting: () => false }),
          outMessage: ApprovalPanel.OutMessage.ApprovedWorkOrder({ workOrderId }),
        }),
        FailedApproveWorkOrder: (model, { reason }) => ({
          model: modifyFields(model, { isSubmitting: () => false, maybeError: () => Option.some(reason) }),
        }),
      },
      commands: {
        ApproveWorkOrder: args =>
          execute.ApproveWorkOrder(args).pipe(
            Effect.map(result =>
              result._tag === 'SucceededApproveWorkOrder'
                ? ApprovalPanel.Message.SucceededApproveWorkOrder({ workOrderId: args.target })
                : ApprovalPanel.Message.FailedApproveWorkOrder({
                    reason: result.failure._tag === 'Rejected' ? result.failure.rejection._tag : 'Unknown',
                  }),
            ),
            Effect.provideService(Client, client),
          ),
      },
      view: (model, h) =>
        h.section(
          [h.Class('approval-panel')],
          Option.match(model.maybeRow, {
            onNone: () => [h.p([], ['Select a work order'])],
            onSome: row => [
              h.p([], [`$${row.amount} · ${row.approval}`]),
              h.button(
                [h.Disabled(row.approval !== 'Waiting' || model.isSubmitting), h.OnClick(ApprovalPanel.Message.ClickedApprove())],
                ['Approve'],
              ),
              ...Option.toArray(Option.map(model.maybeError, reason => h.p([h.Class('error')], [reason]))),
            ],
          }),
        ),
    }
  }),
)
