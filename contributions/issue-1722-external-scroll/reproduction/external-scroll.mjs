import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { test } from 'node:test'

const worktree = resolve(process.env.FOLDKIT_WORKTREE ?? '/home/om/TAO/Tools/foldkit-worktrees/issue-1722-external-scroll')
const requireFromUi = createRequire(resolve(worktree, 'packages/ui/package.json'))
const { Window } = await import(pathToFileURL(requireFromUi.resolve('happy-dom')).href)
const { Array, Context, Deferred, Effect, Option, Stream, pipe } = await import(pathToFileURL(requireFromUi.resolve('effect')).href)
const window = new Window()
for (const name of ['document', 'HTMLElement', 'Element', 'MutationObserver', 'ResizeObserver', 'Event']) {
  globalThis[name] = window[name]
}
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)

const VirtualList = await import(pathToFileURL(resolve(worktree, 'packages/ui/dist/virtualList/index.js')).href)
const Mount = await import(pathToFileURL(resolve(worktree, 'packages/foldkit/dist/mount/index.js')).href)
const Html = await import(pathToFileURL(resolve(worktree, 'packages/foldkit/dist/html/index.js')).href)

const VIEWPORT_HEIGHT = 300
const LIST_ORIGIN = 240
const ROW_HEIGHT = 30
const ITEM_COUNT = 1000
const LIST_HEIGHT = ROW_HEIGHT * ITEM_COUNT
const SCROLL_OFFSET = 600
const ROW_LIMIT = 30

const createElements = (id, listHeight) => {
  const content = document.createElement('main')
  const header = document.createElement('section')
  const list = document.createElement('ul')
  list.id = id
  content.style.overflow = 'auto'
  content.style.height = `${VIEWPORT_HEIGHT}px`
  header.style.height = `${LIST_ORIGIN}px`
  list.style.overflow = 'visible'
  list.style.margin = '0'
  list.style.padding = '0'
  content.append(header, list)
  document.body.append(content)
  Object.defineProperties(content, {
    clientWidth: { value: 320 },
    clientHeight: { value: VIEWPORT_HEIGHT },
    scrollHeight: { value: LIST_ORIGIN + LIST_HEIGHT },
  })
  Object.defineProperties(list, {
    clientWidth: { value: 320 },
    clientHeight: { value: listHeight },
    scrollHeight: { value: LIST_HEIGHT },
  })
  return { content, list }
}

const observeThen = async (id, list, action) => {
  const messages = []
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const mounted = yield* Deferred.make()
    yield* VirtualList.ObserveVirtualList({ id }).f(list, Mount.liveViewStateChanges).pipe(
      Stream.runForEach(message => Effect.gen(function* () {
        messages.push(message)
        yield* Deferred.succeed(mounted, undefined)
      })),
      Effect.forkScoped,
    )
    yield* Deferred.await(mounted)
    yield* action
    yield* Effect.sleep('20 millis')
  })))
  return messages
}

await test('parent scrolling must update the external viewport with the list origin subtracted', async () => {
  const id = 'external-observation'
  const { content, list } = createElements(id, LIST_HEIGHT)
  try {
    const messages = await observeThen(id, list, Effect.sync(() => {
      content.scrollTop = LIST_ORIGIN + SCROLL_OFFSET
      content.dispatchEvent(new Event('scroll'))
    }))
    const maybeScroll = Array.findFirst(messages, message => message._tag === 'ObservedContainerScroll')
    console.log('parent-scroll probe:', JSON.stringify({ parentScrollTop: content.scrollTop, listScrollTop: list.scrollTop, messages }))
    assert.ok(Option.isSome(maybeScroll), 'Parent scroll emitted no VirtualList scroll Message')
    assert.equal(maybeScroll.value.scrollTop, SCROLL_OFFSET)
    assert.equal(maybeScroll.value.containerHeight, VIEWPORT_HEIGHT)
  } finally {
    content.remove()
  }
})

await test('natural-height list must mount a viewport-sized row window', () => {
  const id = 'external-render'
  const measurement = VirtualList.update(VirtualList.init({ id, rowHeightPx: ROW_HEIGHT }), VirtualList.Message.ResizedContainer({ containerWidth: 320, containerHeight: LIST_HEIGHT }))
  const items = Array.range(0, ITEM_COUNT - 1)
  const render = () => VirtualList.view()(measurement.model, {
    items,
    itemToKey: String,
    itemToView: item => Html.__htmlBuilder().span([], [String(item)]),
    containerAttributes: [Html.__htmlBuilder().Style({ overflow: 'visible' })],
  }, Html.__htmlBuilder())
  Html.__setRuntime(() => undefined, Context.empty())
  const html = (() => {
    try {
      return render()
    } finally {
      Html.__clearRuntime()
    }
  })()
  const rows = Array.filter(html.children ?? [], row => row.data?.attrs?.['data-virtual-list-item-index'] !== undefined)
  console.log('row-window probe:', JSON.stringify({ mountedRows: rows.length, viewportRows: VIEWPORT_HEIGHT / ROW_HEIGHT, rowLimit: ROW_LIMIT }))
  assert.ok(rows.length <= ROW_LIMIT, `Mounted ${rows.length} rows for a ${VIEWPORT_HEIGHT}px parent viewport`)
})

await test('logical offset must scroll the parent to list origin plus offset', async () => {
  const id = 'external-command'
  const { content, list } = createElements(id, LIST_HEIGHT)
  try {
    const offsetScroll = VirtualList.scrollToOffset(VirtualList.init({ id, rowHeightPx: ROW_HEIGHT }), SCROLL_OFFSET)
    list.setAttribute('data-virtual-list-scroll-version', String(offsetScroll.model.pendingScrollVersion))
    const maybeCommand = pipe(offsetScroll.commands ?? [], Array.head)
    assert.ok(Option.isSome(maybeCommand))
    await observeThen(id, list, maybeCommand.value.effect.pipe(Effect.tap(result => Effect.sync(() => {
      assert.equal(result._tag, 'CompletedApplyScroll')
      assert.equal(result.outcome._tag, 'Applied')
      console.log('offset-command result:', JSON.stringify(result))
    }))))
    console.log('offset-command probe:', JSON.stringify({ parentScrollTop: content.scrollTop, listScrollTop: list.scrollTop, expectedParentScrollTop: LIST_ORIGIN + SCROLL_OFFSET }))
    assert.equal(content.scrollTop, LIST_ORIGIN + SCROLL_OFFSET)
  } finally {
    content.remove()
  }
})

await test('self-contained scroll observation works as a control', async () => {
  const id = 'self-contained-control'
  const { content, list } = createElements(id, VIEWPORT_HEIGHT)
  try {
    const messages = await observeThen(id, list, Effect.sync(() => {
      list.scrollTop = SCROLL_OFFSET
      list.dispatchEvent(new Event('scroll'))
    }))
    const maybeScroll = Array.findFirst(messages, message => message._tag === 'ObservedContainerScroll')
    assert.ok(Option.isSome(maybeScroll))
    assert.equal(maybeScroll.value.scrollTop, SCROLL_OFFSET)
    assert.equal(maybeScroll.value.containerHeight, VIEWPORT_HEIGHT)
  } finally {
    content.remove()
  }
})

await window.happyDOM.close()
