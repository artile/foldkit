# Evaluation

## Objective

Evaluate the draft pull request against the assignment and the bar of the maintainers through two independent fresh-context lenses (maintainer and implementation). If it meets both, promote it once the contributor approves; otherwise, return precise findings to implementation. Where a finding implicates the assignment rather than the code, escalate to the contributor.

## Inputs

Evaluation works from the artifact directory of the contribution:

```
<artifact directory>/
├── assignment.md    the specification: Verification, Compatibility, and Risks
├── reproduction/    referenced by the assignment
├── status.md        state and history
└── evaluation/      one round-N/ directory per earlier round, if any
```

Through `gh`, read the draft pull request with its description and, via the URLs in the Analysis field, the published analysis with its thread. The orchestrator names the slug; round N is the latest delivered round that `status.md` records.

## Setup

Check out the pull request in the worktree with `gh pr checkout <URL> --detach`. Confirm that it is still a draft, its diff is nonempty, and no file named in the Specification has changed upstream since the merge base of the pull request; otherwise, escalate to the contributor. Confirm that round N follows the earlier rounds under `evaluation/`. If an earlier run of this round left complete files in `evaluation/round-N/`, reuse them rather than redo them.

Wait for the CI checks on the pull request to finish (`gh pr checks <URL> --watch`); if none run, as when workflows await approval from the maintainers, escalate to the contributor. Record each check and its result in `evaluation/round-N/checks.md`, marking any failure that the latest CI run on the `upstream` default branch shares.

Write `evaluation/round-N/brief.md`, the sole input of each lens, containing only the slug, the merge base of the pull request, the round number, paths to `assignment.md`, `status.md`, and `checks.md`, and the Analysis and pull request URLs. Record any context the contributor supplies for the lenses in `status.md`, never in the brief. Do not read the diff before both lens reports exist.

## Lenses

Run two subagents in parallel and in the foreground, each in a fresh context with only its lens name, the absolute paths to `references/review-rubric.md` and the brief, and an instruction to write its report to `evaluation/round-N/<lens>.md`, and wait for both reports before going on; neither sees the report of the other. The rubric defines both lenses:

- **Maintainer lens:** judges the change as the maintainers of the project would.
- **Implementation lens:** verifies that the change does what the assignment specifies.

Lens reports stay in the artifact directory, unpublished.

## Gate

A pass requires maintainer and implementation scores of at least 95, zero critical findings, and `checks.md` recording every CI check as passing, apart from failures that the `upstream` default branch shares. The bar is fixed; if it is wrong for the project, change the rubric, never a score.

**Pass.** Write `evaluation/round-N/outcome.md` with the scores, the verdict, and a summary, and return it for review by the contributor: the two or three hunks most worth attention and why; minor and nit findings with the disposition from implementation, where recorded; and incremental-resolution context, if any. Promote the draft only once the contributor approves, then set `status.md` to `evaluation: promoted round N`. Close with a return reporting the scores and the pull request URL; final review by the contributor follows.

**Fail.** Write `evaluation/round-N/outcome.md` with the scores and failing condition; Must-fix items (critical and major findings, and every failing CI check that the `upstream` default branch does not share); Decide items (minor and nit); and a note only where the lenses disagree. Where a finding implicates the assignment, set `status.md` to `evaluation: escalated` instead and escalate to the contributor; otherwise, set it to `evaluation: failed round N`. Close with a return reporting the scores and Must-fix count.

## Out of scope

Edits to tracked files in the contribution worktree, commits, pushes, merging, and GitHub writes beyond the approved promotion.
