import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'
import { defineMessageUnion } from 'foldkit/message'

import {
  AlreadyApproved,
  AlreadyOpen,
  MissingPhotos,
  NotOpen,
  PhotoRow,
  WorkOrderId,
  WorkOrdersApi,
} from './workOrder'

// NOTE: a typed stand-in for `@alchemy.run/domain/Foldkit` on alchemy main.
// The npm build 2.0.0-beta.84 does not ship that module, so this file keeps its
// shapes: args `{ target, input, commandId }`, results `Succeeded<Name>` with a
// receipt and `Failed<Name>` with `Rejected | Unknown`, and View snapshots.

const Receipt = Schema.Struct({ stream: Schema.String, version: Schema.Number })

const failureOf = <Rejection extends Schema.Top>(rejection: Rejection) =>
  Schema.Union([
    Schema.TaggedStruct('Rejected', { rejection }),
    Schema.TaggedStruct('Unknown', {}),
  ])

const OpenRejection = AlreadyOpen
const ApproveRejection = Schema.Union([NotOpen, AlreadyApproved])
const AttachRejection = NotOpen
const CloseRejection = Schema.Union([NotOpen, MissingPhotos])

export const Result = defineMessageUnion({
  SucceededOpenWorkOrder: { commandId: Schema.String, receipt: Receipt },
  FailedOpenWorkOrder: { commandId: Schema.String, failure: failureOf(OpenRejection) },
  SucceededApproveWorkOrder: { commandId: Schema.String, receipt: Receipt },
  FailedApproveWorkOrder: { commandId: Schema.String, failure: failureOf(ApproveRejection) },
  SucceededAttachPhoto: { commandId: Schema.String, receipt: Receipt },
  FailedAttachPhoto: { commandId: Schema.String, failure: failureOf(AttachRejection) },
  SucceededCloseWorkOrder: { commandId: Schema.String, receipt: Receipt },
  FailedCloseWorkOrder: { commandId: Schema.String, failure: failureOf(CloseRejection) },
})
export type Result = typeof Result.Type

export const Client = WorkOrdersApi.Client
export type Client = typeof Client.Identifier

type Receipt = typeof Receipt.Type
type Failure<R> = Readonly<{ _tag: 'Rejected'; rejection: R }> | Readonly<{ _tag: 'Unknown' }>

const send = <R extends Schema.Top, E, Success, Failed>(
  rejection: R,
  call: Effect.Effect<Receipt, E>,
  onSuccess: (receipt: Receipt) => Success,
  onFailure: (failure: Failure<R['Type']>) => Failed,
): Effect.Effect<Success | Failed> =>
  call.pipe(
    Effect.map(({ stream, version }): Success | Failed => onSuccess({ stream, version })),
    Effect.catch(error =>
      Effect.succeed(
        Schema.is(rejection)(error)
          ? onFailure({ _tag: 'Rejected', rejection: error })
          : onFailure({ _tag: 'Unknown' }),
      ),
    ),
    Effect.catchDefect(() => Effect.succeed(onFailure({ _tag: 'Unknown' }))),
  )

export const OpenWorkOrderArgs = {
  target: WorkOrderId,
  input: Schema.Struct({ title: Schema.String, amount: Schema.Number }),
  commandId: Schema.String,
}
export const ApproveWorkOrderArgs = {
  target: WorkOrderId,
  input: Schema.Struct({ by: Schema.String }),
  commandId: Schema.String,
}
export const AttachPhotoArgs = {
  target: WorkOrderId,
  input: Schema.Struct({ row: PhotoRow, url: Schema.String }),
  commandId: Schema.String,
}
export const CloseWorkOrderArgs = {
  target: WorkOrderId,
  input: Schema.Struct({}),
  commandId: Schema.String,
}

type ArgsOf<Fields extends Schema.Struct.Fields> = Schema.Struct<Fields>['Type']

export const execute = {
  OpenWorkOrder: ({ target, input, commandId }: ArgsOf<typeof OpenWorkOrderArgs>) =>
    Effect.flatMap(Effect.service(Client), client =>
      send(
        OpenRejection,
        client.OpenWorkOrder({ target, commandId, ...input }),
        receipt => Result.SucceededOpenWorkOrder({ commandId, receipt }),
        failure => Result.FailedOpenWorkOrder({ commandId, failure }),
      ),
    ),
  ApproveWorkOrder: ({ target, input, commandId }: ArgsOf<typeof ApproveWorkOrderArgs>) =>
    Effect.flatMap(Effect.service(Client), client =>
      send(
        ApproveRejection,
        client.ApproveWorkOrder({ target, commandId, ...input }),
        receipt => Result.SucceededApproveWorkOrder({ commandId, receipt }),
        failure => Result.FailedApproveWorkOrder({ commandId, failure }),
      ),
    ),
  AttachPhoto: ({ target, input, commandId }: ArgsOf<typeof AttachPhotoArgs>) =>
    Effect.flatMap(Effect.service(Client), client =>
      send(
        AttachRejection,
        client.AttachPhoto({ target, commandId, ...input }),
        receipt => Result.SucceededAttachPhoto({ commandId, receipt }),
        failure => Result.FailedAttachPhoto({ commandId, failure }),
      ),
    ),
  CloseWorkOrder: ({ target, commandId }: ArgsOf<typeof CloseWorkOrderArgs>) =>
    Effect.flatMap(Effect.service(Client), client =>
      send(
        CloseRejection,
        client.CloseWorkOrder({ target, commandId }),
        receipt => Result.SucceededCloseWorkOrder({ commandId, receipt }),
        failure => Result.FailedCloseWorkOrder({ commandId, failure }),
      ),
    ),
}

export const SummaryState = Schema.Struct({
  title: Schema.String,
  amount: Schema.Number,
  approval: Schema.Literals(['None', 'Waiting', 'Approved']),
  isClosed: Schema.Boolean,
})
export type SummaryState = typeof SummaryState.Type

export const watchSummary = (key: WorkOrderId): Stream.Stream<SummaryState, never, Client> =>
  Stream.unwrap(Effect.map(Effect.service(Client), client => client.WorkOrderSummary.watch(key))).pipe(
    Stream.filter((state): state is SummaryState => state !== null),
    Stream.orDie,
  )

export const CommandIds = Schema.Struct({ session: Schema.String, sent: Schema.Number })
export type CommandIds = typeof CommandIds.Type

export const nextCommandId = (ids: CommandIds) => ({
  commandId: `${ids.session}:${ids.sent}`,
  commandIds: CommandIds.make({ session: ids.session, sent: ids.sent + 1 }),
})
