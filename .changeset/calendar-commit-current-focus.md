---
'@foldkit/ui': minor
---

Calendar commits the focused date, month, or year from the current Model when Enter or Space follows a navigation key before the next render. Previously, the commit used the cell from the last render; in Days mode, it also moved the focused date back to that cell.

Enter and Space on the grid dispatch `PressedKeyOnGrid({ key, isShift })` in Days, Months, and Years modes. Update consumer Scene assertions, including Calendar Messages lifted through a parent `Got*` wrapper, to expect this Message instead of `ClickedDay({ date })`, `SelectedMonth({ month })`, or `SelectedYear({ year })`. `key` is `'Enter'` or `' '`, and `isShift` reflects the event modifier. The Message carries the key rather than the selected value; assert the committed value through the resulting Model or OutMessage. Handle date selection through the existing `SelectedDate` OutMessage in `foldOutMessage`. Click assertions and exhaustive Message matches need no change.

Enter and Space on a disabled focused month or year dispatch `PressedKeyOnGrid` and prevent the browser default without changing the Model or emitting an OutMessage. Space therefore does not scroll the page when the focused month or year is disabled. Replace `Scene.expectIgnored()` with `Scene.expectHandled()` for those keyboard interactions and retain assertions that no selection or mode change occurs.
