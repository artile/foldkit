---
'foldkit': minor
---

Add two Story steps for Messages that do not come from a plain value: `messageWith` and `Subscription.from(subscriptions).emit`.

`messageWith(model => message)` sends a Message built from the Model the story holds when the step runs. Use it when the Message carries a value that update stored in the Model, such as a request generation or a stream session. Before, a story had to repeat that value by hand or split into several stories to read it.

`Subscription.from(subscriptions)` returns an emitter for a registered Subscription record, the same record a Scene registers. Its `emit(entry, message)` creates a step that feeds a Message the entry declares through update. The entry must belong to the record, which the types check. For a child Block's entry, pass the raw child Message, and Story applies the generated delivery. Before, a Story of a parent update had to build the child envelope through `Binding.embedView(...).toParentMessage`, which needs a view even for a viewless child Block.

```ts
const { emit } = Subscription.from(Scene.subscriptions(BoardComposition))

story(
  update,
  given(initialModel),
  emit(
    OrderFeed.OrderFeedBlock.subscriptions.entries,
    OrderFeed.OrderFeedBlock.Message.ReceivedEntry({ seq: 13, order }),
  ),
  messageWith(model =>
    Message.ReceivedFrame({ session: model.session, frame }),
  ),
)
```

Both steps follow the rules of `message`: they throw while a Command from an earlier step is unresolved, and the Message must belong to the tested update. `emit` also throws when the entry does not declare the Message or the record does not register it.
