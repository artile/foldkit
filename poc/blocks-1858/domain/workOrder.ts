import * as Domain from '@alchemy.run/domain'
import * as Schema from 'effect/Schema'

export const APPROVAL_THRESHOLD = 250

export const WorkOrderId = Schema.String.pipe(Schema.brand('WorkOrderId'))
export type WorkOrderId = typeof WorkOrderId.Type

export const PhotoRow = Schema.Literals(['Before', 'After'])
export type PhotoRow = typeof PhotoRow.Type

export class WorkOrderOpened extends Domain.Event('WorkOrderOpened', {
  title: Schema.String,
  amount: Schema.Number,
}) {}
export class WorkOrderApproved extends Domain.Event('WorkOrderApproved', {
  by: Schema.String,
}) {}
export class PhotoAttached extends Domain.Event('PhotoAttached', {
  row: PhotoRow,
  url: Schema.String,
}) {}
export class WorkOrderClosed extends Domain.Event('WorkOrderClosed', {}) {}

export class AlreadyOpen extends Domain.Rejection('AlreadyOpen') {}
export class NotOpen extends Domain.Rejection('NotOpen') {}
export class AlreadyApproved extends Domain.Rejection('AlreadyApproved') {}
export class MissingPhotos extends Domain.Rejection('MissingPhotos', {
  row: PhotoRow,
}) {}

export class OpenWorkOrder extends Domain.Command('OpenWorkOrder', {
  target: WorkOrderId,
  input: { title: Schema.String, amount: Schema.Number },
  events: [WorkOrderOpened],
  rejects: [AlreadyOpen],
}) {}
export class ApproveWorkOrder extends Domain.Command('ApproveWorkOrder', {
  target: WorkOrderId,
  input: { by: Schema.String },
  events: [WorkOrderApproved],
  rejects: [NotOpen, AlreadyApproved],
}) {}
export class AttachPhoto extends Domain.Command('AttachPhoto', {
  target: WorkOrderId,
  input: { row: PhotoRow, url: Schema.String },
  events: [PhotoAttached],
  rejects: [NotOpen],
}) {}
export class CloseWorkOrder extends Domain.Command('CloseWorkOrder', {
  target: WorkOrderId,
  input: {},
  events: [WorkOrderClosed],
  rejects: [NotOpen, MissingPhotos],
}) {}

const Open = Schema.TaggedStruct('Open', {
  title: Schema.String,
  amount: Schema.Number,
  isApproved: Schema.Boolean,
  beforePhotos: Schema.Number,
  afterPhotos: Schema.Number,
})
const WorkOrderState = Schema.Union([
  Schema.TaggedStruct('Unopened', {}),
  Open,
  Schema.TaggedStruct('Closed', {}),
])

export class WorkOrder extends Domain.Aggregate('WorkOrder', {
  id: WorkOrderId,
  state: WorkOrderState,
  initial: { _tag: 'Unopened' },
  commands: [OpenWorkOrder, ApproveWorkOrder, AttachPhoto, CloseWorkOrder],
  decide: {
    OpenWorkOrder: (state, command) =>
      state._tag !== 'Unopened'
        ? new AlreadyOpen()
        : [new WorkOrderOpened({ title: command.title, amount: command.amount })],
    ApproveWorkOrder: (state, command) => {
      if (state._tag !== 'Open') {
        return new NotOpen()
      }
      if (state.isApproved) {
        return new AlreadyApproved()
      }
      return [new WorkOrderApproved({ by: command.by })]
    },
    AttachPhoto: (state, command) =>
      state._tag !== 'Open'
        ? new NotOpen()
        : [new PhotoAttached({ row: command.row, url: command.url })],
    CloseWorkOrder: state => {
      if (state._tag !== 'Open') {
        return new NotOpen()
      }
      if (state.beforePhotos === 0) {
        return new MissingPhotos({ row: 'Before' })
      }
      if (state.afterPhotos === 0) {
        return new MissingPhotos({ row: 'After' })
      }
      return [new WorkOrderClosed()]
    },
  },
  evolve: {
    WorkOrderOpened: (_, event) => ({
      _tag: 'Open' as const,
      title: event.title,
      amount: event.amount,
      isApproved: event.amount <= APPROVAL_THRESHOLD,
      beforePhotos: 0,
      afterPhotos: 0,
    }),
    WorkOrderApproved: state =>
      state._tag === 'Open' ? { ...state, isApproved: true } : state,
    PhotoAttached: (state, event) =>
      state._tag !== 'Open'
        ? state
        : event.row === 'Before'
          ? { ...state, beforePhotos: state.beforePhotos + 1 }
          : { ...state, afterPhotos: state.afterPhotos + 1 },
    WorkOrderClosed: () => ({ _tag: 'Closed' as const }),
  },
}) {}

export const ApprovalStatus = Schema.Literals(['None', 'Waiting', 'Approved'])

export class WorkOrderSummary extends Domain.View('WorkOrderSummary', {
  from: [WorkOrder],
  key: WorkOrder,
  state: Schema.Struct({
    title: Schema.String,
    amount: Schema.Number,
    approval: ApprovalStatus,
    isClosed: Schema.Boolean,
  }),
  initial: { title: '', amount: 0, approval: 'None', isClosed: false },
  evolve: {
    WorkOrderOpened: (view, event) => ({
      ...view,
      title: event.title,
      amount: event.amount,
      approval: event.amount <= APPROVAL_THRESHOLD ? ('Approved' as const) : ('Waiting' as const),
    }),
    WorkOrderApproved: view => ({ ...view, approval: 'Approved' as const }),
    WorkOrderClosed: view => ({ ...view, isClosed: true }),
  },
}) {}

export class Maintenance extends Domain.Model('Maintenance', {
  aggregates: [WorkOrder],
  views: [WorkOrderSummary],
}) {}

export class WorkOrdersApi extends Domain.Api(
  'WorkOrdersApi',
  OpenWorkOrder,
  ApproveWorkOrder,
  AttachPhoto,
  CloseWorkOrder,
  WorkOrderSummary,
) {}
