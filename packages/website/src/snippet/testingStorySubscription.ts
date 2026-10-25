import { Scene, Story } from 'foldkit'
import { expect, test } from 'vitest'

const { emit } = Story.Subscription.from(
  Scene.subscriptions(BoardComposition, boardSubscriptions),
)

test('a feed entry for the order list updates the board', () => {
  Story.story(
    update,
    Story.given(initialModel),
    emit(boardSubscriptions.clockTicks, Message.Ticked()),
    emit(
      OrderFeed.OrderFeedBlock.subscriptions.entries,
      OrderFeed.OrderFeedBlock.Message.ReceivedEntry({ seq: 13, order }),
    ),
    Story.model(model => {
      expect(model.orders.cursor).toBe(13)
    }),
  )
})
