import { Array, Effect, Fiber, Match, Option } from 'effect'
import * as Calendar from 'foldkit/calendar'
import type { HtmlBuilder } from 'foldkit/html'
import * as Runtime from 'foldkit/runtime'
import { modifyFields } from 'foldkit/struct'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CalendarAttributes } from './index.js'
import { Message, Model, OutMessage, init, update, view } from './index.js'

const calendarId = 'calendar'
const gridId = `${calendarId}-grid`
const today = Calendar.make(2026, 5, 13)

type RecordedUpdate = Readonly<{ message: Message; model: Model }>

const toCalendarView =
  (h: HtmlBuilder<Message>) => (attributes: CalendarAttributes) =>
    Match.value(attributes).pipe(
      Match.tagsExhaustive({
        Days: days =>
          h.div(days.root, [
            h.div(
              days.grid,
              days.weeks.map(week =>
                h.div(
                  week.attributes,
                  week.cells.map(cell =>
                    h.div(cell.cellAttributes, [cell.label]),
                  ),
                ),
              ),
            ),
          ]),
        Months: months =>
          h.div(months.root, [
            h.div(
              months.grid,
              months.cells.map(cell =>
                h.div(cell.cellAttributes, [cell.label]),
              ),
            ),
          ]),
        Years: years =>
          h.div(years.root, [
            h.div(
              years.grid,
              years.cells.map(cell => h.div(cell.cellAttributes, [cell.label])),
            ),
          ]),
      }),
    )

const mountCalendar = (initialModel: Model) => {
  const recordedUpdates: Array<RecordedUpdate> = []
  const outMessages: Array<OutMessage> = []
  const container = document.createElement('div')
  container.id = `${calendarId}-app`
  document.body.append(container)

  const program = Runtime.makeElement({
    Model,
    init: () => ({ model: initialModel }),
    update: (model, message) => {
      const calendarUpdate = update(model, message)
      recordedUpdates.push({ message, model: calendarUpdate.model })

      if (calendarUpdate.outMessage !== undefined) {
        outMessages.push(calendarUpdate.outMessage)
      }

      if (calendarUpdate.commands === undefined) {
        return { model: calendarUpdate.model }
      } else {
        return {
          model: calendarUpdate.model,
          commands: calendarUpdate.commands,
        }
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

  const modelAfterKey = (key: string): Option.Option<Model> =>
    Option.map(
      Array.findLast(
        recordedUpdates,
        ({ message }) =>
          message._tag === 'PressedKeyOnGrid' && message.key === key,
      ),
      ({ model }) => model,
    )

  const latestModel = (): Option.Option<Model> =>
    Option.map(Array.last(recordedUpdates), ({ model }) => model)

  return { fiber, outMessages, modelAfterKey, latestModel }
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

describe('Calendar grid keyboard commit', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('selects the next day when Enter follows ArrowRight after a render', async () => {
    const calendar = mountCalendar(init({ id: calendarId, today }))

    try {
      await waitForGrid()
      pressKey('ArrowRight')

      await vi.waitFor(() => {
        expect(
          document
            .getElementById(gridId)
            ?.getAttribute('aria-activedescendant'),
        ).toBe(`${calendarId}-cell-2026-5-14`)
      })
      pressKey('Enter')

      await vi.waitFor(() => {
        expect(Array.last(calendar.outMessages)).toStrictEqual(
          Option.some(
            OutMessage.SelectedDate({ date: Calendar.make(2026, 5, 14) }),
          ),
        )
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(calendar.fiber))
    }
  })

  it('selects the next day when Enter follows ArrowRight in the same task', async () => {
    const calendar = mountCalendar(init({ id: calendarId, today }))

    try {
      await waitForGrid()
      pressKey('ArrowRight')
      pressKey('Enter')

      await vi.waitFor(() => {
        expect(Array.isArrayNonEmpty(calendar.outMessages)).toBe(true)
      })

      expect({
        focusedDateAfterArrowRight: Option.flatMap(
          calendar.modelAfterKey('ArrowRight'),
          ({ maybeFocusedDate }) => maybeFocusedDate,
        ),
        lastOutMessage: Array.last(calendar.outMessages),
        focusedDateAfterEnter: Option.flatMap(
          calendar.latestModel(),
          ({ maybeFocusedDate }) => maybeFocusedDate,
        ),
      }).toStrictEqual({
        focusedDateAfterArrowRight: Option.some(Calendar.make(2026, 5, 14)),
        lastOutMessage: Option.some(
          OutMessage.SelectedDate({ date: Calendar.make(2026, 5, 14) }),
        ),
        focusedDateAfterEnter: Option.some(Calendar.make(2026, 5, 14)),
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(calendar.fiber))
    }
  })

  it('opens the next month when Enter follows ArrowRight in the same task in Months mode', async () => {
    const calendar = mountCalendar(
      modifyFields(init({ id: calendarId, today }), {
        viewMode: () => 'Months',
      }),
    )

    try {
      await waitForGrid()
      pressKey('ArrowRight')
      pressKey('Enter')

      await vi.waitFor(() => {
        expect(
          Option.map(calendar.latestModel(), ({ viewMode }) => viewMode),
        ).toStrictEqual(Option.some('Days'))
      })

      expect(
        Option.map(calendar.latestModel(), model => ({
          viewMode: model.viewMode,
          viewYear: model.viewYear,
          viewMonth: model.viewMonth,
        })),
      ).toStrictEqual(
        Option.some({ viewMode: 'Days', viewYear: 2026, viewMonth: 6 }),
      )
    } finally {
      await Effect.runPromise(Fiber.interrupt(calendar.fiber))
    }
  })

  it('opens the next year when Enter follows ArrowRight in the same task in Years mode', async () => {
    const calendar = mountCalendar(
      modifyFields(init({ id: calendarId, today }), {
        viewMode: () => 'Years',
      }),
    )

    try {
      await waitForGrid()
      pressKey('ArrowRight')
      pressKey('Enter')

      await vi.waitFor(() => {
        expect(
          Option.map(calendar.latestModel(), ({ viewMode }) => viewMode),
        ).toStrictEqual(Option.some('Months'))
      })

      expect(
        Option.map(calendar.latestModel(), model => ({
          viewMode: model.viewMode,
          viewYear: model.viewYear,
        })),
      ).toStrictEqual(Option.some({ viewMode: 'Months', viewYear: 2027 }))
    } finally {
      await Effect.runPromise(Fiber.interrupt(calendar.fiber))
    }
  })
})
