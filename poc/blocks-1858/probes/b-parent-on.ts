type Ret<M> = { readonly model: M; readonly note?: string }
type Own<M> = { readonly Clicked: (model: M) => Ret<M> }
type Outs<M> = { readonly [K: `@${string}`]: (model: M, out: never) => Ret<M> }
type Rec<M> = Own<M> & Outs<M>
type Model = { readonly count: number }
type Handle<Slot extends string, Out extends { _tag: string }> = { slot: Slot; out?: Out }

declare const Parent: {
  on: <const Slot extends string, Out extends { _tag: string }>(
    child: Handle<Slot, Out>,
    handlers: { readonly [T in Out['_tag']]?: (model: Model, out: Extract<Out, { _tag: T }>) => Ret<Model> },
  ) => { readonly [K in `@${Slot}/${Out['_tag']}`]: (model: Model, out: never) => Ret<Model> }
  make: (update: Rec<Model>) => void
}
declare const primary: Handle<'primary', { _tag: 'Reached'; at: number }>

Parent.make({
  Clicked: model => ({ model }),
  ...Parent.on(primary, {
    Reached: (model, { at }) => ({ model: { count: model.count + at } }),
  }),
})
Parent.make({
  Clicked: model => ({ model }),
  Clickd: model => ({ model }),
  ...Parent.on(primary, {
    Reachd: model => ({ model }),
  }),
})
export {}
