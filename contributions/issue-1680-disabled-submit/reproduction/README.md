# Reproduction: issue 1680

Base: `upstream/main` at `7ee214268c602967937b80f6f20d1e831f2e8ab6`.

`app/` is the minimal app from the issue: a form with `h.OnSubmit(SubmittedForm)`, one text field, and `Button.view({ type: 'submit', isDisabled: true })`. `run.mjs` serves it with Vite against the worktree's `foldkit` and `@foldkit/ui` source, runs four actions in Chromium (Playwright 1.63.0) from a fresh page each, and asserts that `SubmittedForm` is received 0 times.

Run: `node run.mjs /Users/tao/Tools/foldkit-worktrees/issue-1680-disabled-submit`

Exit code: 0 when all four pass, 1 when any fails, 2 when the run breaks.

Observed on the base (exit 1):

```
Rendered: <button aria-disabled="true" data-disabled="" type="submit" tabindex="0" id="apply">Apply</button>
FAIL  Click the disabled Apply button: SubmittedForm received 1 (expected 0)
FAIL  Focus Apply, press Enter: SubmittedForm received 1 (expected 0)
FAIL  Focus Apply, press Space: SubmittedForm received 1 (expected 0)
FAIL  Type in the text field, press Enter: SubmittedForm received 1 (expected 0)
```
