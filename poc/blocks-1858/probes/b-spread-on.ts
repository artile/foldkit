type Ret<M> = { readonly model: M; readonly note?: string }
type Own<M> = { readonly Clicked: (model: M) => Ret<M> }
type Outs<M> = { readonly [K: `@${string}`]: (model: M, out: never) => Ret<M> }
type Rec<M> = Own<M> & Outs<M>
type Model = { readonly count: number }

declare function on<const Slot extends string>(slot: Slot): <M, R>(h: { readonly Reached?: (model: M, out: { _tag: 'Reached' }) => R }) => { readonly [K in `@${Slot}/Reached`]: (model: M, out: { _tag: 'Reached' }) => R }

declare function make(update: Rec<Model>): void

make({
  Clicked: model => ({ model }),
  ...on('primary')({
    Reached: model => ({ model: { count: model.count + 1 } }),
  }),
})

make({
  Clicked: model => ({ model }),
  ...on('primary')({
    Reached: model => ({ model: { count: model.cnt } }),
  }),
})

export {}
