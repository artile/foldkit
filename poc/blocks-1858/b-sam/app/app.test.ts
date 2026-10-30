import { expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'

import { ClientInMemory } from '../../domain/inMemory'
import { Runtime } from '../blocks'
import { BlocksLayer } from './main'
import { WorkOrdersPage } from './workOrdersPage'

const clickButton = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find(element => element.textContent?.startsWith(text))
  if (button === undefined) {
    throw new Error(`No button ${text} in ${container.innerHTML}`)
  }
  button.click()
}

const waitFor = (check: () => boolean) =>
  Effect.gen(function* () {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (check()) {
        return
      }
      yield* Effect.sleep('10 millis')
    }
    throw new Error('waitFor timed out')
  })

it.live('opens and approves a work order through the InMemory Domain', () =>
  Effect.gen(function* () {
    const container = document.createElement('div')
    yield* Runtime.run(WorkOrdersPage, {
      container,
      layer: BlocksLayer.pipe(Layer.provide(ClientInMemory)),
      args: { session: 'page' },
    })

    clickButton(container, 'New work order')
    yield* waitFor(() => container.textContent?.includes('Leaking sink · Waiting') ?? false)

    clickButton(container, 'Leaking sink')
    yield* waitFor(() => container.textContent?.includes('Selected: Leaking sink') ?? false)

    clickButton(container, 'Approve')
    yield* waitFor(() => container.textContent?.includes('Leaking sink · Approved') ?? false)
    yield* waitFor(() => container.textContent?.includes('Owner approved') ?? false)
    expect(container.querySelector('.approval-panel button')?.hasAttribute('disabled')).toBe(true)
  }).pipe(Effect.scoped),
)
