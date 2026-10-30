import { expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Stream from 'effect/Stream'

import { execute, watchSummary } from './domainCommands'
import { ClientInMemory } from './inMemory'
import { WorkOrderId } from './workOrder'

const id = WorkOrderId.make('wo-1')

it.effect('opens, refuses an early close, approves and watches a work order on InMemory', () =>
  Effect.gen(function* () {
    const opened = yield* execute.OpenWorkOrder({ target: id, input: { title: 'Leak', amount: 900 }, commandId: 's:0' })
    expect(opened._tag).toBe('SucceededOpenWorkOrder')

    const again = yield* execute.OpenWorkOrder({ target: id, input: { title: 'Leak', amount: 900 }, commandId: 's:1' })
    expect(again).toMatchObject({ _tag: 'FailedOpenWorkOrder', failure: { _tag: 'Rejected', rejection: { _tag: 'AlreadyOpen' } } })

    const closeEarly = yield* execute.CloseWorkOrder({ target: id, input: {}, commandId: 's:2' })
    expect(closeEarly).toMatchObject({ _tag: 'FailedCloseWorkOrder', failure: { rejection: { _tag: 'MissingPhotos', row: 'Before' } } })

    const approved = yield* execute.ApproveWorkOrder({ target: id, input: { by: 'owner' }, commandId: 's:3' })
    expect(approved._tag).toBe('SucceededApproveWorkOrder')

    const summary = yield* watchSummary(id).pipe(
      Stream.filter(state => state.approval === 'Approved'),
      Stream.take(1),
      Stream.runHead,
      Effect.timeout('2 seconds'),
    )
    expect(Option.getOrThrow(summary)).toMatchObject({ title: 'Leak', approval: 'Approved' })
  }).pipe(Effect.provide(ClientInMemory)),
)
