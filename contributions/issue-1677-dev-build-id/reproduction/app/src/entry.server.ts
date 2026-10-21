import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { init, view } from './main'

export const renderDocument = Server.renderDocument

export const renderPage = (_request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.map(Server.renderToString({ init, view }), renderedApplication =>
      Server.Rendered(renderedApplication),
    ),
  )
