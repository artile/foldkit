---
'@foldkit/ui': patch
---

Calendar commits the highlighted date, month, or year when Enter or Space follows an arrow key before the next render. Before, the commit used the cell that had focus before the arrow key, and in Days mode moved the focused date back to it. Enter and Space on the grid dispatch `PressedKeyOnGrid` in Days, Months, and Years modes, and update decides the commit from the current Model.

Enter and Space on a disabled focused month or year dispatch `PressedKeyOnGrid` and prevent the browser default without changing the Model or emitting an OutMessage. Space therefore does not scroll the page when the focused month or year is disabled.
