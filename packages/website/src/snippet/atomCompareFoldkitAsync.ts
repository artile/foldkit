import { Match as M, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'

// MODEL: the remote state is a value in the Model, not hidden in a cache.
const UserData = S.Union([NotAsked, Loading, Failed, Loaded])

export const Model = S.Struct({
  user: UserData,
})
type Model = typeof Model.Type

// MESSAGE
const ClickedLoadUser = m('ClickedLoadUser')
const SucceededLoadUser = m('SucceededLoadUser', { user: User })
const FailedLoadUser = m('FailedLoadUser', { error: ApiError })

const Message = S.Union([ClickedLoadUser, SucceededLoadUser, FailedLoadUser])
type Message = typeof Message.Type

// COMMAND
const fetchUser = Command.define('FetchUser', {
  effect: Api.getUser.pipe(
    Effect.map(user => SucceededLoadUser({ user })),
    Effect.catch(error => Effect.succeed(FailedLoadUser({ error }))),
  ),
})

// UPDATE
export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedLoadUser: () => [
        evo(model, { user: () => Loading() }),
        [fetchUser],
      ],
      SucceededLoadUser: ({ user }) => [
        evo(model, { user: () => Loaded({ user }) }),
        [],
      ],
      FailedLoadUser: ({ error }) => [
        evo(model, { user: () => Failed({ error }) }),
        [],
      ],
    }),
  )
