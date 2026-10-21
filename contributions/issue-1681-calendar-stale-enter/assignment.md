# Assignment — issue-1681-calendar-stale-enter

- **Base:** `foldkit/foldkit` `upstream/main` @ `7ee214268c602967937b80f6f20d1e831f2e8ab6`
- **Branch:** `issue-1681-calendar-stale-enter`, pushed to `artile/foldkit`
- **Target branch:** `main` of `foldkit/foldkit` (`.changeset/config.json` `baseBranch`)
- **Analysis:** issue https://github.com/foldkit/foldkit/issues/1681; claim comment https://github.com/foldkit/foldkit/issues/1681#issuecomment-6319936575

## Goal

Make Enter and Space on the Calendar grid commit the cell that is the focused one in the current Model, in Days, Months, and Years modes. At present, the grid's keydown handler is built in `view` and commits the focused date, month, or year from the last render. When a navigation key and a commit key reach the grid before a render, the commit uses the old cell and, in Days mode, moves the focused date back to it. This contribution moves the commit decision for all three modes from `view` into `update`, so every grid key goes through `PressedKeyOnGrid` and `update` reads the focused cell from the Model it receives. It covers the full target state in one increment.

## Verification

Each V row is pinned by its own test that fails on the base and passes with the change. V1 to V3 are the reproduction.

| # | Given | When | Then |
|---|---|---|---|
| V1 | A Calendar mounted with `Runtime.makeElement`, id `calendar`, today 2026-05-13 as the focused date, Days mode | `ArrowRight` and `Enter` keydowns are dispatched on the grid in one task | The Model after ArrowRight has focused date 2026-05-14; the last OutMessage is `SelectedDate` with 2026-05-14; the Model after Enter has focused date 2026-05-14 |
| V2 | As V1, Months mode | `ArrowRight` and `Enter` in one task | `viewMode` is `Days`, `viewYear` 2026, `viewMonth` 6 |
| V3 | As V1, Years mode | `ArrowRight` and `Enter` in one task | `viewMode` is `Months`, `viewYear` 2027 |
| V4 | Story: Months mode, focused date 2026-05-13, `viewYear` 2026 | `PressedKeyOnGrid({ key: 'Enter', isShift: false })` | Same result as `SelectedMonth({ month: 5 })` today: `viewMode` `Days`, `viewMonth` 5, Command `FocusGrid`, no OutMessage (the month does not change) |
| V5 | Story: Months mode, after `PressedKeyOnGrid` `ArrowRight` | `PressedKeyOnGrid` with key `' '` | `viewMode` `Days`, `viewMonth` 6, Command `FocusGrid`, OutMessage `ChangedViewMonth({ year: 2026, month: 6 })` |
| V6 | Story: Months mode with `maxDate` 2026-04-30, focused date moved to a month after April | `PressedKeyOnGrid` `Enter` | Model unchanged, no Commands, no OutMessage |
| V7 | Story: Years mode, focused date 2026-05-13 | `PressedKeyOnGrid` `Enter` | Same result as `SelectedYear({ year: 2026 })`: `viewMode` `Months`, `viewYear` 2026, Command `FocusGrid` |
| V8 | Story: Years mode, after `PressedKeyOnGrid` `ArrowRight` | `PressedKeyOnGrid` with key `' '` | `viewMode` `Months`, `viewYear` 2027, Command `FocusGrid`, OutMessage `ChangedViewMonth({ year: 2027, month: 5 })` |
| V9 | Story: Years mode with `minDate` 2020-01-01, focused year before 2020 (after `PageUp` from 2026 lands on 2014) | `PressedKeyOnGrid` `Enter` | Model unchanged, no Commands, no OutMessage |

V4, V7: confirm the exact expected values against the existing `SelectedMonth` and `SelectedYear` story tests before writing them; the requirement is equality with what the matching click Message produces from the same Model. V9: confirm the year `PageUp` lands on with the existing `minDate` scene test.

| # | Invariant | Observed by |
|---|---|---|
| I1 | ArrowRight, a render, then Enter in Days mode selects 2026-05-14 | Control case in the new `runtime.test.ts` (passes on the base) |
| I2 | Clicking a day, a month cell, or a year cell dispatches `ClickedDay`, `SelectedMonth`, or `SelectedYear` and behaves as on the base | Existing scene and story tests |
| I3 | `selectDate` behaves as `update(model, Message.ClickedDay({ date }))` | Existing story tests for `selectDate` |
| I4 | Enter or Space on a disabled focused date, month, or year commits nothing and leaves the Model unchanged | Existing story test "Enter on a disabled date is a no-op", the two existing scene tests "pressing Enter on a disabled focused month/year does not commit", V6, V9 |
| I5 | Keys outside `NAV_KEYS` produce no Message and the browser default stands | Existing scene and story tests |
| I6 | DatePicker forwards the commit and emits its `SelectedDate` OutMessage on Enter | Existing `datePicker` scene and story tests |
| I7 | The full `@foldkit/ui` suite passes (1256 tests on the base, plus the new ones) | `pnpm --filter @foldkit/ui test` |

- **Reproduction:** `reproduction/staleCommitKey.test.ts` in the artifact directory
- **Command:** `bash reproduction/run.sh /Users/tao/Tools/foldkit-worktrees/issue-1681-calendar-stale-enter` (from the artifact directory); on the base: 3 failed, 1 passed
- **Test placement:**
  - V1 to V3 and I1: new file `packages/ui/src/calendar/runtime.test.ts`, Vitest with the `@foldkit/ui` config (happy-dom), following `packages/ui/src/dialog/runtime.test.ts` and `packages/ui/src/popover/runtime.test.ts`. Port the reproduction to repository conventions: no `T[]`, no bracket indexing (`Array.last`, `Array.get`), Effect `Array` module, braced control flow, no inline comments, describe and test names that state the behavior without reference to this issue.
  - V4 to V9: `packages/ui/src/calendar/story.test.ts`, in the existing `PressedKeyOnGrid in Months mode` and `PressedKeyOnGrid in Years mode` blocks, with named Story steps as the file already uses.

## Specification

All changes are in `packages/ui/src/calendar/index.ts`, plus the tests above.

1. **Shared focused-cell helpers.** Add two module-level functions, used by both `update` and the view builders so the two cannot disagree:
   - `toFocusedMonth(model: Model): number`: `Option.match(model.maybeFocusedDate, { onNone: () => model.viewMonth, onSome: date => (date.year === model.viewYear ? date.month : model.viewMonth) })`, the rule `buildMonthsAttributes` uses for `focusedMonth` today.
   - `toFocusedYear(model: Model): number`: `Option.match(model.maybeFocusedDate, { onNone: () => model.viewYear, onSome: date => date.year })`, the rule `buildYearsAttributes` uses for `cursorYear` today.
   - Replace the local `focusedMonth` in `buildMonthsAttributes` and `cursorYear` / `focusedYear` in `buildYearsAttributes` with calls to these helpers. Keep the local binding names the rest of each builder uses.
2. **Extract the month and year commits.** Move the bodies of the `SelectedMonth` and `SelectedYear` handlers into `selectMonth(model: Model, month: number): UpdateReturn` and `selectYear(model: Model, year: number): UpdateReturn`, unchanged, including the disabled check that returns `{ model }`. The handlers become `SelectedMonth: ({ month }) => selectMonth(model, month)` and `SelectedYear: ({ year }) => selectYear(model, year)`.
3. **`update`, `PressedKeyOnGrid`.**
   - `Days`: no change. It already commits `currentOrFallbackFocus(model)` for a commit key, with the disabled check.
   - `Months`: if `isCommitKey(key)`, return `selectMonth(model, toFocusedMonth(model))`; otherwise the existing `resolveMonthsKey` path.
   - `Years`: if `isCommitKey(key)`, return `selectYear(model, toFocusedYear(model))`; otherwise the existing `resolveYearsKey` path.
   - Use an explicit `if`/`else`, as the `Days` branch does. No `switch`, no nested ternary.
4. **View keydown handlers.** In `buildDaysAttributes`, `buildMonthsAttributes`, and `buildYearsAttributes`, `handleKeyDown` returns `Option.none()` for keys outside `NAV_KEYS` and otherwise `Option.some(Message.PressedKeyOnGrid({ key, isShift: modifiers.shiftKey }))`. Remove the commit-key branches. Narrow each return type to `Option.Option<PressedKeyOnGrid>`. Remove any import or binding that becomes unused (for example `OptionExt` stays only if other code in the file uses it, which it does).
5. **Scene tests.** In `packages/ui/src/calendar/scene.test.ts`, the two tests "pressing Enter on a disabled focused month/year does not commit (view-layer filter)" now see a handled keydown, because Enter dispatches `PressedKeyOnGrid` and `update` returns the Model unchanged. Replace `Scene.expectIgnored()` with `Scene.expectHandled()` (exported from `packages/foldkit/src/test/scene.ts`), which asserts that the keydown produced a Message; keep the heading assertions that show the mode did not change. Rename both tests so the name does not say "view-layer filter", and drop their inline comments or turn them into names, per the repository comment rules.
6. **Docs.** `packages/website/src/page/ui/calendarPage.md` already describes Enter and Space as committing the focused cell in each mode; no change is needed. Update any TSDoc in `index.ts` that says the view dispatches `ClickedDay`, `SelectedMonth`, or `SelectedYear` for a key press, if one exists.

## Compatibility

- **Public API:** no change. The `Message` union, `OutMessage` union, `update`, `view`, `selectDate`, and `focusDate` keep their signatures. `ClickedDay`, `SelectedMonth`, and `SelectedYear` stay; clicks dispatch them.
- **Observable behavior:**
  - Enter or Space on the grid now dispatches `PressedKeyOnGrid` in all three modes, not `ClickedDay`, `SelectedMonth`, or `SelectedYear`. OutMessages and the resulting Model are the same as before for a key pressed after a render, and are now correct for a key pressed before a render.
  - In Months and Years modes, Enter or Space on a disabled focused cell now dispatches `PressedKeyOnGrid` and calls `preventDefault`, as Days mode already does. Before, no Message was dispatched, so Space scrolled the page.
- **Version impact:** patch for `@foldkit/ui` (bug fix). The Changesets `fixed` group moves `foldkit` and `@foldkit/devtools` with it. A parent that inspects the Calendar's Messages through its `Got*` wrapper to detect a keyboard commit sees `PressedKeyOnGrid` instead. That crosses the Submodel boundary; the supported signal is the `SelectedDate` OutMessage, which is unchanged, so no `!` in the title.

## Boundaries

- Do not change `ClickedDay`, `SelectedMonth`, `SelectedYear`, the `OutMessage` union, `commitSelection`, `applyFocusMove`, or the navigation key maps.
- Do not touch DatePicker source; only its existing tests must pass.
- Do not include the disabled `minDate` / `maxDate` focus fix of PR #1542 or the `toDateLocal` fix of PR #1544. Both are open and touch nearby code; this branch is based on `upstream/main` alone.
- Issue #1670 (DragAndDrop keydown reading the Model from the last render) has the same class of fault in another component and is out of scope.
- No website, example, or skill changes.

## Completion

- Add a changeset: `patch` for `@foldkit/ui`, one sentence in the repository's changeset style, for example "Calendar commits the cell that has focus in the current Model when Enter or Space follows a navigation key before a render, in Days, Months, and Years modes." Follow the em dash and prose rules in `AGENTS.md`.
- Commit subject in Conventional Commits with scope `ui`, for example `fix(ui): commit the current Calendar focused cell on Enter`. Author `Taras Kornichuk <dread9ko@gmail.com>`. No AI mention or co-author trailer.
- Pull request against `main`; title is the commit subject; description is the squash commit body, one source line per paragraph, leading with the consumer impact, with `Closes #1681`. Verification notes go in the first pull request comment, not the description (`AGENTS.md` prevails over any template that asks otherwise).
- Run before push: `pnpm --filter @foldkit/ui test`, `pnpm --filter @foldkit/ui typecheck`, `pnpm lint`, `pnpm format`, `pnpm changeset status`. The pre-push hook runs the whole suite; the steward `AGENTS.md` pre-push review gate applies.

## Risks

- **Critical:** any path where a keyboard commit still reads a value captured in `view`. Every commit key in every mode must reach `update` as `PressedKeyOnGrid`, and `update` must derive the cell only from its `model` argument.
- **Critical:** `toFocusedMonth` and `toFocusedYear` must give the same cell the view highlights through `aria-activedescendant`. A difference would commit a cell other than the one the user sees.
- **Critical:** V1 to V3 must fail on the base. Mutation check: restore one mode's view commit branch and confirm the matching test fails.
- Disabled commits in Months and Years now call `preventDefault`. Confirm no existing test depends on the browser default for Enter or Space on the grid.
- PR #1542 edits `calendar/index.ts` near `applyFocusMove`. The candidate change applied cleanly on its head `2fadeab33` during analysis; recheck for conflicts if #1542 merges first.
- The reproduction test is a session artifact; the ported `runtime.test.ts` must not name the issue, the stale closure, or the old implementation.
