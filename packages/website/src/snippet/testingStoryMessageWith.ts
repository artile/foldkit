import { given, message, messageWith, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

test('a frame from the current connection session is applied', () => {
  story(
    update,
    given(initialModel),
    message(Message.ClickedReconnect()),
    messageWith(model =>
      Message.ReceivedFrame({ session: model.session, frame }),
    ),
    model(model => {
      expect(model.frames).toEqual([frame])
    }),
  )
})
