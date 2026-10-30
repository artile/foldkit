import { Effect } from 'effect'
import { Program } from 'foldkit'

import { Flags, WorkOrdersPageBlock } from './workOrdersPage'

export const makeProgram = (container: HTMLElement, session: string) =>
  Program.makeElement({ block: WorkOrdersPageBlock, Flags, flags: Effect.succeed({ session }), container })
