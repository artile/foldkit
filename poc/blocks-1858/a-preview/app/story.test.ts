import { Option } from 'effect'
import { Command, expectOutMessage, given, message, model, story } from 'foldkit/story'
import { toParentMessage } from 'foldkit/test'
import { expect, test } from 'vitest'

import { WorkOrderId } from '../../domain/workOrder'
import * as ApprovalPanel from './approvalPanel'
import * as LiveTicker from './liveTicker'
import { Row } from './shared'
import * as WorkOrderList from './workOrderList'
import { ApprovalBinding, ListBinding, Message, OpenWorkOrder, TickersBinding, init, update } from './workOrdersPage'

const row = Row.make({ id: WorkOrderId.make('wo-1'), title: 'Leaking sink', amount: 400, approval: 'Waiting' })

const panelModel = ApprovalPanel.init('s').model
const pageModel = init({ session: 's' }).model

test('Approve returns an ApproveWorkOrder Command and reports the approval', () => {
  story(
    ApprovalPanel.update,
    given({ ...panelModel, maybeRow: Option.some(row) }),
    message(ApprovalPanel.Message.ClickedApprove()),
    Command.expectExact(
      ApprovalPanel.ApproveWorkOrder({ target: row.id, input: { by: 'owner' }, commandId: 's:ApprovalPanel:0' }),
    ),
    Command.resolve(ApprovalPanel.ApproveWorkOrder, ApprovalPanel.Message.SucceededApproveWorkOrder({ workOrderId: row.id })),
    expectOutMessage(ApprovalPanel.OutMessage.ApprovedWorkOrder({ workOrderId: row.id })),
    model(model => expect(model.isSubmitting).toBe(false)),
  )
})

test('a refused approval shows the reason', () => {
  story(
    ApprovalPanel.update,
    given({ ...panelModel, maybeRow: Option.some(row) }),
    message(ApprovalPanel.Message.ClickedApprove()),
    Command.resolve(ApprovalPanel.ApproveWorkOrder, ApprovalPanel.Message.FailedApproveWorkOrder({ reason: 'AlreadyApproved' })),
    model(model => expect(model.maybeError).toEqual(Option.some('AlreadyApproved'))),
  )
})

test('opening a work order adds a row and a live ticker', () => {
  story(
    update,
    given(pageModel),
    message(Message.ClickedOpenWorkOrder()),
    Command.expectExact(
      OpenWorkOrder({ target: row.id, input: { title: 'Leaking sink', amount: 400 }, commandId: 's:WorkOrdersPage:0' }),
    ),
    Command.resolve(OpenWorkOrder, Message.SucceededOpenWorkOrder({ row })),
    model(model => {
      expect(model.list.rows).toEqual([row])
      expect(model.tickers).toHaveLength(1)
    }),
  )
})

test('selecting a row shows it in the approval panel', () => {
  story(
    update,
    given({ ...pageModel, list: { ...pageModel.list, rows: [row] }, conversation: { ...pageModel.conversation, lines: ['old'] } }),
    message(toParentMessage(ListBinding, WorkOrderList.Message.ClickedRow({ id: row.id }))),
    model(model => {
      expect(model.approval.maybeRow).toEqual(Option.some(row))
      expect(model.conversation.lines).toEqual([])
    }),
  )
})

test('a live summary updates the row, and an approval adds a line', () => {
  story(
    update,
    given(pageModel),
    message(Message.ClickedOpenWorkOrder()),
    Command.resolve(OpenWorkOrder, Message.SucceededOpenWorkOrder({ row })),
    message(
      toParentMessage(
        TickersBinding,
        row.id,
        LiveTicker.Message.ReceivedSummary({ summary: { title: 'Leaking sink', amount: 400, approval: 'Approved', isClosed: false } }),
      ),
    ),
    model(model => expect(model.list.rows[0]?.approval).toBe('Approved')),
    message(toParentMessage(ApprovalBinding, ApprovalPanel.Message.SucceededApproveWorkOrder({ workOrderId: row.id }))),
    model(model => expect(model.conversation.lines).toEqual(['Owner approved'])),
  )
})

test('a live summary for another work order leaves the shown row', () => {
  story(
    ApprovalPanel.update,
    given({ ...panelModel, maybeRow: Option.some(row) }),
    message(ApprovalPanel.Message.ReceivedRowUpdate({ row: { ...row, id: WorkOrderId.make('wo-2'), approval: 'Approved' } })),
    model(model => expect(model.maybeRow).toEqual(Option.some(row))),
  )
})
