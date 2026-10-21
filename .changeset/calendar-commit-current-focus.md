---
'@foldkit/ui': patch
---

Calendar commits the focused cell of the current Model when Enter or Space follows a navigation key before a render, in Days, Months, and Years modes. Enter and Space on the grid dispatch `PressedKeyOnGrid` in every mode, and update decides the commit. Before, a quick ArrowRight then Enter selected the previous date, month, or year.
