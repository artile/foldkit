import { expect, it } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { Command, expectOutMessage, message, model } from 'foldkit/story'

import { ClientInMemory } from '../domain/inMemory'
import { WorkOrderId } from '../domain/workOrder'
import { ApprovalPanel, ApprovalPanelLive, ApproveWorkOrder } from './approvalPanel'
import { deliver, story } from './blocks'
import { Conversation, ConversationLive } from './conversation'
import { LiveTicker, LiveTickerLive } from './liveTicker'
import { Session } from './session'
import { Row } from './shared'
import { WorkOrderList, WorkOrderListLive } from './workOrderList'
import { OpenWorkOrder, WorkOrdersPage, WorkOrdersPageLive } from './workOrdersPage'

const row = Row.make({ id: WorkOrderId.make('wo-1'), title: 'Leaking sink', amount: 400, approval: 'Waiting' })

const Services = Layer.merge(ClientInMemory, Layer.succeed(Session, 's'))

const PageLayer = WorkOrdersPageLive.pipe(
  Layer.provide([WorkOrderListLive, ConversationLive, ApprovalPanelLive, LiveTickerLive]),
)

it.effect('Approve returns an ApproveWorkOrder Command and reports the approval', () =>
  story(
    ApprovalPanelLive,
    { session: 's' },
    message(ApprovalPanel.Message.RequestedShow({ row })),
    message(ApprovalPanel.Message.ClickedApprove()),
    Command.expectExact(ApproveWorkOrder({ target: row.id, input: { by: 'owner' }, commandId: 's:ApprovalPanel:0' })),
    Command.resolve(ApproveWorkOrder, ApprovalPanel.Message.SucceededApproveWorkOrder({ workOrderId: row.id })),
    expectOutMessage(ApprovalPanel.OutMessage.ApprovedWorkOrder({ workOrderId: row.id })),
    model(model => expect(model.isSubmitting).toBe(false)),
  ).pipe(Effect.provide(Services)),
)

it.effect('a refused approval shows the reason', () =>
  story(
    ApprovalPanelLive,
    { session: 's' },
    message(ApprovalPanel.Message.RequestedShow({ row })),
    message(ApprovalPanel.Message.ClickedApprove()),
    Command.resolve(ApproveWorkOrder, ApprovalPanel.Message.FailedApproveWorkOrder({ reason: 'AlreadyApproved' })),
    model(model => expect(model.maybeError).toEqual(Option.some('AlreadyApproved'))),
  ).pipe(Effect.provide(Services)),
)

it.effect('a live summary for another work order leaves the shown row', () =>
  story(
    ApprovalPanelLive,
    { session: 's' },
    message(ApprovalPanel.Message.RequestedShow({ row })),
    message(ApprovalPanel.Message.ReceivedRowUpdate({ row: { ...row, id: WorkOrderId.make('wo-2'), approval: 'Approved' } })),
    model(model => expect(model.maybeRow).toEqual(Option.some(row))),
  ).pipe(Effect.provide(Services)),
)

it.effect('opening a work order adds a row and a live ticker', () =>
  story(
    PageLayer,
    message(WorkOrdersPage.Message.ClickedOpenWorkOrder()),
    Command.expectExact(
      OpenWorkOrder({ target: row.id, input: { title: 'Leaking sink', amount: 400 }, commandId: 's:WorkOrdersPage:0' }),
    ),
    Command.resolve(OpenWorkOrder, WorkOrdersPage.Message.SucceededOpenWorkOrder({ row })),
    model(model => {
      expect(model.list.rows).toEqual([row])
      expect(model.tickers).toHaveLength(1)
    }),
  ).pipe(Effect.provide(Services)),
)

it.effect('selecting a row shows it in the approval panel', () =>
  story(
    PageLayer,
    message(deliver(WorkOrderList, 'list', WorkOrderList.Message.RequestedUpsertRow({ row }))),
    message(deliver(Conversation, 'conversation', Conversation.Message.ReceivedSystemLine({ text: 'old' }))),
    message(deliver(WorkOrderList, 'list', WorkOrderList.Message.ClickedRow({ id: row.id }))),
    model(model => {
      expect(model.approval.maybeRow).toEqual(Option.some(row))
      expect(model.conversation.lines).toEqual([])
    }),
  ).pipe(Effect.provide(Services)),
)

it.effect('a live summary updates the row, and an approval adds a line', () =>
  story(
    PageLayer,
    message(WorkOrdersPage.Message.ClickedOpenWorkOrder()),
    Command.resolve(OpenWorkOrder, WorkOrdersPage.Message.SucceededOpenWorkOrder({ row })),
    message(
      deliver(
        LiveTicker,
        ['tickers', 'wo-1'],
        LiveTicker.Message.ReceivedSummary({ summary: { title: 'Leaking sink', amount: 400, approval: 'Approved', isClosed: false } }),
      ),
    ),
    model(model => expect(model.list.rows[0]?.approval).toBe('Approved')),
    message(deliver(WorkOrderList, 'list', WorkOrderList.Message.ClickedRow({ id: row.id }))),
    message(
      deliver(
        LiveTicker,
        ['tickers', 'wo-1'],
        LiveTicker.Message.ReceivedSummary({ summary: { title: 'Leaking sink', amount: 400, approval: 'Waiting', isClosed: false } }),
      ),
    ),
    model(model => expect(Option.map(model.approval.maybeRow, ({ approval }) => approval)).toEqual(Option.some('Waiting'))),
    message(deliver(ApprovalPanel, 'approval', ApprovalPanel.Message.SucceededApproveWorkOrder({ workOrderId: row.id }))),
    model(model => expect(model.conversation.lines).toEqual(['Owner approved'])),
  ).pipe(Effect.provide(Services)),
)
