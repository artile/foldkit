import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { Message, SubmitOrder, cartModel, update } from './order'

test('the order feed reports the order before the submit reply arrives', () => {
  story(
    update,
    given(cartModel),
    message(Message.ClickedSubmitOrder()),
    Command.keepPending(SubmitOrder),
    message(
      Message.ReceivedOrderEvent({ orderId: 'order-1', status: 'Placed' }),
    ),
    model(model => {
      expect(model.orderStatus).toBe('Placed')
    }),
    Command.resolve(
      SubmitOrder,
      Message.SucceededSubmitOrder({ orderId: 'order-1' }),
    ),
    model(model => {
      expect(model.orderStatus).toBe('Placed')
    }),
  )
})
