import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const worktree = process.argv.at(2)
assert.ok(worktree, 'Pass the prepared Foldkit worktree path')
const Keyboard = await import(pathToFileURL(resolve(worktree, 'packages/ui/dist/keyboard.js')))
const cases = [
  { name: 'previous with no active item', count: 4, focused: -1, disabled: [], key: 'ArrowUp', expected: 3 },
  { name: 'previous with disabled penultimate item', count: 4, focused: -1, disabled: [2], key: 'ArrowUp', expected: 3 },
  { name: 'horizontal previous with no active item', count: 4, focused: -1, disabled: [], key: 'ArrowLeft', nextKey: 'ArrowRight', previousKey: 'ArrowLeft', expected: 3 },
  { name: 'previous with disabled suffix', count: 4, focused: -1, disabled: [2, 3], key: 'ArrowUp', expected: 1 },
  { name: 'previous with only the last item enabled', count: 4, focused: -1, disabled: [0, 1, 2], key: 'ArrowUp', expected: 3 },
  { name: 'next with no active item', count: 4, focused: -1, disabled: [], key: 'ArrowDown', expected: 0 },
  { name: 'next skips disabled prefix', count: 4, focused: -1, disabled: [0, 1], key: 'ArrowDown', expected: 2 },
  { name: 'previous from first wraps', count: 4, focused: 0, disabled: [], key: 'ArrowUp', expected: 3 },
  { name: 'previous from valid index', count: 4, focused: 2, disabled: [], key: 'ArrowUp', expected: 1 },
  { name: 'all items disabled retains absence', count: 4, focused: -1, disabled: [0, 1, 2, 3], key: 'ArrowUp', expected: -1 },
  { name: 'single enabled item', count: 1, focused: -1, disabled: [], key: 'ArrowUp', expected: 0 },
  { name: 'two enabled items', count: 2, focused: -1, disabled: [], key: 'ArrowUp', expected: 1 },
  { name: 'Home from no active item', count: 4, focused: -1, disabled: [0], key: 'Home', expected: 1 },
  { name: 'End from no active item', count: 4, focused: -1, disabled: [3], key: 'End', expected: 2 },
  { name: 'unrecognized key retains absence', count: 4, focused: -1, disabled: [], key: 'Tab', expected: -1 },
]
const results = cases.map(testCase => {
  const actual = Keyboard.keyToIndex(testCase.nextKey ?? 'ArrowDown', testCase.previousKey ?? 'ArrowUp', testCase.count, testCase.focused, index => testCase.disabled.includes(index))(testCase.key)
  return { ...testCase, actual, isPassed: actual === testCase.expected }
})
console.log(JSON.stringify(results, null, 2))
assert.ok(results.every(result => result.isPassed), 'Previous navigation must start at the last enabled item when no item is active')
