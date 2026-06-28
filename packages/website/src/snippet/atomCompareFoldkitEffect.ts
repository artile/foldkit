import { Effect, Schema as S, Stream } from 'effect'
import { Command, Subscription } from 'foldkit'

// A side effect is a Command returned from update. It has a name, shows up
// in DevTools next to the Message that produced it, and is assertable in tests.
const createTodo = (text: string) =>
  Command.define('CreateTodo', {
    effect: Api.createTodo(text).pipe(Effect.as(CompletedCreateTodo())),
  })

// A global listener gated on Model state is a Subscription. The runtime
// subscribes and unsubscribes as model.isDrawing changes. No addEventListener,
// no cleanup, no stale closure.
export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  mouseRelease: entry(
    { isDrawing: S.Boolean },
    {
      modelToDependencies: model => ({ isDrawing: model.isDrawing }),
      dependenciesToStream: ({ isDrawing }) =>
        Stream.when(
          Stream.fromEventListener(document, 'mouseup').pipe(
            Stream.map(() => ReleasedMouse()),
          ),
          Effect.sync(() => isDrawing),
        ),
    },
  ),
}))
