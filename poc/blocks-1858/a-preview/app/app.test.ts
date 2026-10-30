import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { Runtime } from 'foldkit'

import { ClientInMemory } from '../../domain/inMemory'
import { makeProgram } from './main'

const clickButton = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find(element => element.textContent?.startsWith(text))
  if (button === undefined) {
    throw new Error(`No button ${text} in ${container.innerHTML}`)
  }
  button.click()
}

const waitFor = (check: () => boolean, describe: () => string = () => '') =>
  Effect.gen(function* () {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (check()) {
        return
      }
      yield* Effect.sleep('10 millis')
    }
    throw new Error(`waitFor timed out: ${describe()}`)
  })

it.live('opens and approves a work order through the InMemory Domain', () =>
  Effect.gen(function* () {
    const root = document.createElement('div')
    const container = document.createElement('div')
    container.id = 'work-orders'
    root.appendChild(container)
    document.body.appendChild(root)
    Runtime.embed(makeProgram(container, 'page').provide(ClientInMemory))

    yield* waitFor(() => root.textContent?.includes('New work order') ?? false, () => document.body.innerHTML)
    clickButton(root, 'New work order')
    yield* waitFor(() => root.textContent?.includes('Leaking sink · Waiting') ?? false)

    clickButton(root, 'Leaking sink')
    yield* waitFor(() => root.textContent?.includes('Selected: Leaking sink') ?? false)

    clickButton(root, 'Approve')
    yield* waitFor(() => root.textContent?.includes('Leaking sink · Approved') ?? false)
    yield* waitFor(() => root.textContent?.includes('Owner approved') ?? false)
    expect(root.querySelector('.approval-panel button')?.hasAttribute('disabled')).toBe(true)
  }),
)
