import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const worktree = process.argv.at(2)
assert.ok(worktree, 'Pass the prepared Foldkit worktree path')
const require = createRequire(resolve(worktree, 'packages/ui/package.json'))
const { Option } = await import(pathToFileURL(require.resolve('effect')))
const Scene = await import(pathToFileURL(resolve(worktree, 'packages/foldkit/dist/scene/public.js')))
const Combobox = await import(pathToFileURL(resolve(worktree, 'packages/ui/dist/combobox/public.js')))
const bundle = Combobox.create()
const view = (model, h) => bundle.view(model, {
  items: ['Apple', 'Banana', 'Cherry', 'Date'],
  itemToConfig: () => ({ content: undefined }),
  itemToValue: item => item,
  itemToDisplayText: item => item,
  maybeSelectedValue: Option.none(),
  restingInputValue: '',
  openOnFocus: true,
}, h)

Scene.scene(
  { update: bundle.update, view },
  Scene.given(Combobox.init({ id: 'test' })),
  Scene.focus('#test-input'),
  Scene.tap(({ model }) => {
    assert.equal(model.isOpen, true)
    assert.ok(Option.isNone(model.maybeActiveItemIndex))
    console.log('After focus: isOpen=true, maybeActiveItemIndex=None')
  }),
  Scene.Mount.resolve(Combobox.AnchorCombobox, Combobox.Message.CompletedAnchorCombobox()),
  Scene.Mount.resolve(Combobox.PortalComboboxBackdrop, Combobox.Message.CompletedPortalComboboxBackdrop()),
  Scene.keydown('#test-input', 'ArrowUp'),
  Scene.tap(({ model, html }) => {
    const actual = Option.getOrThrow(model.maybeActiveItemIndex)
    const input = Option.getOrThrow(Scene.find(html, '#test-input'))
    console.log(JSON.stringify({ actualActiveIndex: actual, expectedActiveIndex: 3, ariaActiveDescendant: input.data?.attrs?.['aria-activedescendant'] }))
    assert.equal(actual, 3, 'ArrowUp after openOnFocus must activate Date, the last enabled item')
  }),
  Scene.Command.resolve(Combobox.ScrollIntoView, Combobox.Message.CompletedScrollIntoView()),
)
