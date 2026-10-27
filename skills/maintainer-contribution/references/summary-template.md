I’ve thought through your request. Here’s how I understand it:

> <Restate the shortcoming in at most 50 words of your own, naming where it lies and why it matters.>

<If an existing contribution already covers it, write “An existing contribution, `<slug>`, already covers this; it started on <date as DD-MM-YYYY> and is now at `<state>`.”; otherwise, write “I’ve named this contribution `<slug>`, which you can use to resume it later.”> It targets `<owner>/<repo>` through your fork `<fork owner>/<fork repo>`. The checks on both came back as follows:

| Check | Result |
|---|---|
| `upstream` and `<push remote>` exist as remotes | <“Passed” or “Failed”> |
| `<fork>` is a fork of `upstream` | <“Passed” or “Failed”> |
| `<fork>` has Actions disabled | <“Passed” or “Failed”> |

<If every check passed and the worktree was set up, write “Work will take place in the worktree `<absolute path of the worktree>`, detached at `upstream/<default branch>`, and be recorded in `<absolute path of the artifact directory>`.”; otherwise, write “I’ll set up the worktree once the problems below are resolved.”>

<If every check passed and the worktree was set up, write “Please confirm or steer me in the right direction, and I’ll start the analysis.” for a new contribution, or “Please confirm, and I’ll resume it; if you’d rather start a new contribution, just let me know.” for a match; otherwise, give the reason for each failure, then write “Please let me know once these problems are resolved, and I’ll try again.”>
