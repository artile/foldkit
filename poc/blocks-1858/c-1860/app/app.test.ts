import { expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'

import { ClientInMemory } from '../domain/inMemory'
import { Program } from './blocks'
import { BlocksLayer } from './main'
import { Session } from './session'
import { WorkOrdersPage } from './workOrdersPage'

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
    const program = Program.make(WorkOrdersPage, {
      container,
      layer: BlocksLayer.pipe(Layer.provide(Layer.merge(ClientInMemory, Layer.succeed(Session, 'page')))),
    })
    Effect.runFork(program.start())

    yield* waitFor(() => root.textContent?.includes('New work order') ?? false, () => document.body.innerHTML)
    clickButton(root, 'New work order')
    yield* waitFor(() => root.textContent?.includes('Leaking sink · Waiting') ?? false, () => root.innerHTML)

    clickButton(root, 'Leaking sink')
    yield* waitFor(() => root.textContent?.includes('Selected: Leaking sink') ?? false, () => root.innerHTML)

    clickButton(root, 'Approve')
    yield* waitFor(() => root.textContent?.includes('Leaking sink · Approved') ?? false, () => root.innerHTML)
    yield* waitFor(() => root.textContent?.includes('Owner approved') ?? false, () => root.innerHTML)
    expect(root.querySelector('.approval-panel button')?.hasAttribute('disabled')).toBe(true)
  }),
)
