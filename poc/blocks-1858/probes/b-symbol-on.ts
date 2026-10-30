declare const OnSlot: unique symbol
type Ret<M> = { readonly model: M }
interface OnEntry<M> { readonly [OnSlot]: (model: M) => M }
type Rec<M> = { readonly Clicked: (model: M) => Ret<M> } & { readonly [OnSlot]?: (model: M) => M }
type Model = { readonly count: number }
declare const child: {
  on<P>(h: { readonly Reached?: (model: P, out: { _tag: 'Reached'; at: number }) => Ret<P> }): OnEntry<P>
}
declare function make(update: Rec<Model>): void

make({
  Clicked: model => ({ model }),
  ...child.on({ Reached: (model, { at }) => ({ model: { count: model.count + at } }) }),
})
make({
  Clicked: model => ({ model }),
  ...child.on({ Reached: model => ({ model: { count: model.cnt } }) }),
})
make({
  Clicked: model => ({ model }),
  ...child.on({ Reachd: model => ({ model }) }),
})
export {}
