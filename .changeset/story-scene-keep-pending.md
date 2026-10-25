---
'foldkit': minor
---

Add `Command.keepPending` to Story and Scene. It declares that a pending Command is still running, so the test can send later Messages before the Command's result arrives.

Story `message`, Scene interactions, and `Scene.Subscription.emit` stop a test while any Command is unresolved. Only interruptible and Interrupt Commands could stay pending, so a test of a request whose reply arrives after another fact had to make the request cancelable or resolve it too early. Examples are an order submission that a live feed confirms before the submit request returns, and a save that is still in flight while the user keeps typing.

```ts
story(
  update,
  given(cartModel),
  message(Message.ClickedSubmitOrder()),
  Command.keepPending(SubmitOrder),
  message(Message.ReceivedOrderEvent({ orderId: 'order-1', status: 'Placed' })),
  Command.resolve(
    SubmitOrder,
    Message.SucceededSubmitOrder({ orderId: 'order-1' }),
  ),
)
```

The matcher takes a Definition or an instance, like `Command.resolve`, and must select exactly one pending Command that is not kept yet. The kept Command stays exempt for every later Message until a resolve step supplies its result, and `Command.resolveAllExact` does not require it in the same call. Other pending Commands still stop the next Message, and the story or scene still throws at the end when the kept Command was never resolved. Command definitions and the Runtime are unchanged. The unresolved Command error now mentions `Command.keepPending`.
