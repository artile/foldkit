import * as Domain from '@alchemy.run/domain'
import * as Layer from 'effect/Layer'

import { Maintenance, WorkOrdersApi } from './workOrder'

export const MaintenanceInMemory = Maintenance.layer(Layer.empty).pipe(Layer.provide(Domain.InMemory))

export const ClientInMemory = Layer.effect(WorkOrdersApi.Client, WorkOrdersApi.testClient).pipe(
  Layer.provide(MaintenanceInMemory),
)
