import { Effect, Fiber, Match, Option } from 'effect'
import * as Calendar from 'foldkit/calendar'
import type { HtmlBuilder } from 'foldkit/html'
import * as Runtime from 'foldkit/runtime'
import { modifyFields } from 'foldkit/struct'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CalendarAttributes, OutMessage } from './index.js'
import { Message, Model, init, update, view } from './index.js'

const calendarId = 'calendar'
const gridId = `${calendarId}-grid`
const today = Calendar.make(2026, 5, 13)

const toCalendarView =
  (h: HtmlBuilder<Message>) => (attributes: CalendarAttributes) =>
    Match.value(attributes).pipe(
      Match.tagsExhaustive({
        Days: days =>
          h.div(days.root, [
            h.div(days.grid, [
              ...days.weeks.map(week =>
                h.div(
                  week.attributes,
                  week.cells.map(cell =>
                    h.div(cell.cellAttributes, [
                      h.button(cell.buttonAttributes, [cell.label]),
                    ]),
                  ),
                ),
              ),
            ]),
          ]),
        Months: months =>
          h.div(months.root, [
            h.div(
              months.grid,
              months.cells.map(cell =>
                h.div(cell.cellAttributes, [
                  h.button(cell.buttonAttributes, [cell.label]),
                ]),
              ),
            ),
          ]),
        Years: years =>
          h.div(years.root, [
            h.div(
              years.grid,
              years.cells.map(cell =>
                h.div(cell.cellAttributes, [
                  h.button(cell.buttonAttributes, [cell.label]),
                ]),
              ),
            ),
          ]),
      }),
    )

const mountCalendar = (initialModel: Model) => {
  const outMessages: Array<OutMessage> = []
  const updatedModels: Array<Model> = [initialModel]
  const container = document.createElement('div')
  container.id = `${calendarId}-app`
  document.body.append(container)

  const program = Runtime.makeElement({
    Model,
    init: () => ({ model: initialModel }),
    update: (model, message) => {
      const calendarUpdate = update(model, message)
      updatedModels.push(calendarUpdate.model)

      if (calendarUpdate.outMessage !== undefined) {
        outMessages.push(calendarUpdate.outMessage)
      }

      if (calendarUpdate.commands === undefined) {
        return { model: calendarUpdate.model }
      } else {
        return { model: calendarUpdate.model, commands: calendarUpdate.commands }
      }
    },
    view: (model: Model, h: HtmlBuilder<Message>) =>
      view(
        model,
        { maybeSelectedDate: Option.none(), toView: toCalendarView(h) },
        h,
      ),
    container,
  })

  const fiber = Effect.runFork(program.start())
  const latestModel = () => updatedModels[updatedModels.length - 1]

  return { fiber, outMessages, updatedModels, latestModel }
}

const pressKey = (key: string) =>
  document
    .getElementById(gridId)
    ?.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )

const waitForGrid = () =>
  vi.waitFor(() => {
    expect(document.getElementById(gridId)).not.toBe(null)
  })


describe('Calendar commit key right after a navigation key, before a render', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('control: Days mode, ArrowRight, render, Enter selects the next day', async () => {
    const calendar = mountCalendar(init({ id: calendarId, today }))
    try {
      await waitForGrid()
      pressKey('ArrowRight')
      await vi.waitFor(() => {
        expect(
          document.getElementById(gridId)?.getAttribute('aria-activedescendant'),
        ).toBe(`${calendarId}-cell-2026-5-14`)
      })
      pressKey('Enter')

      await vi.waitFor(() => {
        expect(calendar.outMessages.at(-1)).toEqual(
          expect.objectContaining({ _tag: 'SelectedDate', date: Calendar.make(2026, 5, 14) }),
        )
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(calendar.fiber))
    }
  })

  it('Days mode: ArrowRight then Enter in one task selects and focuses the next day', async () => {
    const calendar = mountCalendar(init({ id: calendarId, today }))
    try {
      await waitForGrid()
      pressKey('ArrowRight')
      pressKey('Enter')

      await vi.waitFor(() => {
        expect(calendar.outMessages.at(-1)?._tag).toBe('SelectedDate')
      })
      expect({
        focusAfterArrowRight: calendar.updatedModels[1]?.maybeFocusedDate,
        selectedDate: calendar.outMessages.at(-1),
        focusAfterEnter: calendar.latestModel()?.maybeFocusedDate,
      }).toEqual({
        focusAfterArrowRight: Option.some(Calendar.make(2026, 5, 14)),
        selectedDate: expect.objectContaining({ date: Calendar.make(2026, 5, 14) }),
        focusAfterEnter: Option.some(Calendar.make(2026, 5, 14)),
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(calendar.fiber))
    }
  })

  it('Months mode: ArrowRight then Enter in one task opens the next month', async () => {
    const calendar = mountCalendar(
      modifyFields(init({ id: calendarId, today }), { viewMode: () => 'Months' }),
    )
    try {
      await waitForGrid()
      pressKey('ArrowRight')
      pressKey('Enter')

      await vi.waitFor(() => {
        expect(calendar.latestModel()?.viewMode).toBe('Days')
      })
      expect({
        viewMode: calendar.latestModel()?.viewMode,
        viewYear: calendar.latestModel()?.viewYear,
        viewMonth: calendar.latestModel()?.viewMonth,
      }).toEqual({ viewMode: 'Days', viewYear: 2026, viewMonth: 6 })
    } finally {
      await Effect.runPromise(Fiber.interrupt(calendar.fiber))
    }
  })

  it('Years mode: ArrowRight then Enter in one task opens the next year', async () => {
    const calendar = mountCalendar(
      modifyFields(init({ id: calendarId, today }), { viewMode: () => 'Years' }),
    )
    try {
      await waitForGrid()
      pressKey('ArrowRight')
      pressKey('Enter')

      await vi.waitFor(() => {
        expect(calendar.latestModel()?.viewMode).toBe('Months')
      })
      expect({
        viewMode: calendar.latestModel()?.viewMode,
        viewYear: calendar.latestModel()?.viewYear,
      }).toEqual({ viewMode: 'Months', viewYear: 2027 })
    } finally {
      await Effect.runPromise(Fiber.interrupt(calendar.fiber))
    }
  })
})
