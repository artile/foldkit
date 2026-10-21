# Evaluation — implementation — round 1

- **Score:** 60
- **Critical findings:** 2
- **Verdict:** not ready

## Findings

| # | Severity | Location | Finding | Suggested fix |
|---|---|---|---|---|
| 1 | critical | `packages/ui/src/calendar/index.ts:999`, `packages/ui/src/calendar/story.test.ts:363`, `packages/ui/src/calendar/scene.test.ts` | Invariant I5 has no test for its stated contract: keys outside `NAV_KEYS` produce no Message and preserve the browser default. The existing unknown-key Stories explicitly supply `PressedKeyOnGrid({ key: 'x', ... })` to update; they cannot detect the view dispatching that Message or calling `preventDefault`. Calendar Scenes never send an unrelated key, and the new runtime tests send only ArrowRight and Enter. Removing the view's unknown-key guard would therefore leave this invariant unprotected in all three rewritten handlers. The rubric classifies missing invariant coverage as critical. | Add event-level coverage in Days, Months, and Years modes. Dispatch a cancelable unrelated keydown, assert no Message/update occurs and `defaultPrevented` is false. Mutation-check by bypassing each handler's `NAV_KEYS` guard. |
| 2 | critical | `packages/ui/src/datePicker/story.test.ts:291`, `packages/ui/src/datePicker/scene.test.ts` | Invariant I6 has no test that DatePicker forwards a keyboard commit and emits its `SelectedDate` OutMessage on Enter. The existing `GotCalendarMessage` Stories cover a month button and ArrowRight only; selection tests use `RequestedSelectDate` or the programmatic `selectDate` helper, which follow the separate `foldCalendarSelectDate` path. DatePicker Scenes contain no keydown interaction, and the new Calendar runtime harness observes Calendar OutMessages directly without a DatePicker parent. Consequently, the cited existing tests do not establish I6 for the changed keyboard Message path. The rubric classifies missing invariant coverage as critical. | Add a DatePicker integration test that opens the picker, sends Enter to its Calendar grid, and asserts the DatePicker `SelectedDate` OutMessage with the focused date and the closed popover. Resolve the resulting focus Command. Mutation-check that dropping the Calendar selection on the `GotCalendarMessage` path fails the test; DatePicker source needs no change. |

## Notes

- Reviewed PR #1754 at `23fe6870b799cecc1f610d4d5eb5e2620abdb5c6` against merge base `7ee214268c602967937b80f6f20d1e831f2e8ab6`, including both requested `gh pr diff` forms, the published issue analysis/thread, assignment, full status, repository guidance, and surrounding source/tests. No other evaluation report was read and no tests were run.
- V1–V3 exercise the real runtime with both keys dispatched synchronously. Their expected day/month/year results contradict the base view handlers' captured values; I1 separately waits for the rendered active descendant before Enter. V4/V5/V7/V8 exercise the new update commit branches, Commands, and OutMessages. Accepted the assignment's explicit V6/V9 exception and the disabled-guard mutation evidence in status step 12; their base passes are not findings.
- Source inspection found no additional correctness or type defects. Month/year selection bodies are extracted without behavioral changes, the shared focused-cell helpers match the corresponding active-descendant calculations, and commit decisions read the update Model. The changeset and PR identify the authorized keyboard Message and disabled-event behavior changes with a minor bump and breaking title.
- `checks.md` records all 13 checks successful at the reviewed head. The two missing invariant tests cap the score at 60 under the rubric; green CI does not establish behavior that its tests do not exercise.
