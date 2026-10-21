---
'@foldkit/vite-plugin': patch
---

Print unexpected errors from the DevTools MCP relay. Before, the dev server lost a defect in the relay fiber, so the relay could fail to start with no output, for example with `effect` 4.0.3 or later.

The dev server now prints `[foldkit:devTools] MCP relay failed with an unexpected error` followed by the defect on stderr. Stopping or restarting the dev server does not print this line.

Thanks to @Makisuo for reporting #1733.
