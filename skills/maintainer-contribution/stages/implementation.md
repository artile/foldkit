# Implementation

## Objective

Implement the assignment exactly as specified, test-first, in the current style of the codebase; once every Verification row passes and every invariant holds, deliver a draft pull request that evaluation can assess without further context. Where the specification cannot be met as written, escalate to the contributor rather than improvise.

## Inputs

Implementation works from the artifact directory of the contribution:

```
<artifact directory>/
├── assignment.md                        the specification
├── reproduction/                        referenced by the assignment
├── status.md                            state and history
└── evaluation/round-<N−1>/outcome.md    fix rounds only
```

Read the published analysis, any revision comment, and the replies in its thread through `gh` from the URLs in the Analysis field; escalate to the contributor if a maintainer response conflicts with the assignment. The orchestrator names the slug; round N is one past the latest round under `evaluation/`, or 1 if there is none.

## Setup

Compare the freshly fetched `upstream/<default>` with the Base of the assignment. If it has moved without changing any file named in the Specification, proceed, branching from the new head in the first round and recording it in `status.md`; if it has changed one, escalate to the contributor, as the analysis may no longer hold. In the first round, create the Branch named in the assignment from `upstream/<default>` in the worktree, or continue on it if an earlier assignment created it; in fix rounds, check it out again and continue on it. Never work on the default branch or one carrying unrelated commits.

## Baseline

In the first round, run the Reproduction with its Command on the clean base; it must fail. If it passes, either the shortcoming no longer exists or the assignment is wrong; escalate to the contributor rather than deliver a no-op pull request. Read the files named in the Specification, their importers, and neighboring tests to learn current naming, factoring, and testing conventions. Record the base, branch, and Reproduction result in `status.md`.

## Implementation

Write the tests first: one per Verification row, placed per Test placement and observed failing. Confirm each invariant with an existing or new test, observed passing. Then implement the Specification until every row passes and every invariant holds, and finish with the release bookkeeping from Completion, modeled on the most recent examples in the repository.

The assignment is the design: root cause, files, names, and public API changes are exactly as specified, however appealing an alternative may seem. Escalate to the contributor whenever the specification cannot be met as written (for example, code that will not compile, a missing file, a Verification row requiring a change excluded by Compatibility, or a behavior change absent from it) or would need a workaround.

Favor house style over personal preference: naming, layout, export and error-handling conventions, comment density, and test structure match the surrounding code or, where inconsistent, the latest commits of the maintainers. Keep to one concern, reporting unrelated findings to the contributor only when actionable. Leave no debug output, TODOs, or commented-out code, and no formatting churn in untouched lines.

**Fix round.** Resolve every Must-fix item; resolve each Decide item or record a one-line reason in `status.md`. A finding resolvable only by changing the root cause, Compatibility, or Boundaries means the assignment is wrong; escalate to the contributor. Where the evaluation lenses disagree, follow the maintainer lens unless the assignment says otherwise, and record the choice. Do not relitigate findings; note any objection in `status.md` for the next round.

## Readiness

Create a commit with `--author="Taras Kornichuk <dread9ko@gmail.com>"`, a Conventional Commit subject, and a body that explains what was wrong before stating what changed, plus the release note the repository requires. The files in `rules` of `repos/<repo>.toml` govern commit, release note, and description rules and override this file where they differ. For `foldkit`, the release note is a changeset (`pnpm changeset add --empty` when no published behavior changes); where `CONTRIBUTING.md` and the Commits and Releases section of `AGENTS.md` differ, `AGENTS.md` wins: verification goes in the first pull request comment, not the description; and `.claude/skills/make-pr` is the maintainer's own bot workflow, so leave it alone. Then run the tests the change touches, including those for every Verification row and invariant; all must pass. Finally, read the full diff against `upstream/<default>...HEAD` in one pass for stray files, leftover debug output, leaked renames, and tests that assert nothing. This hygiene pass does not evaluate the change. The repository requires a separate agent to review the committed diff before every push: run one fresh-context subagent on `git diff upstream/<default>...HEAD` against the repository's `rules` files, fix every finding in a new commit, and repeat on the whole range until a review comes back clean. Evaluation after delivery still runs in full.

## Delivery

Pull request template and conventions of the repository, as recently merged pull requests show, govern form, including the title; `references/pull-request-template.md` supplies content. Like the analysis, the description stands alone, free of local paths and workflow terms, and stays concise. Where the repository squash-merges, the description becomes the commit body on `<default>`, so it holds no verification notes. The contributor approves the Validation comment text together with the description; post it as the first pull request comment right after opening the draft. Push the Branch to the `artile` remote without local hooks (`--no-verify`), as CI on the pull request runs the gates, and open a draft pull request against the Target branch only once the contributor approves the description. In fix rounds, add a new commit to the same Branch and push it the same way to update the draft, never amending or force-pushing, and seek renewed approval for any description change. Before every push, request permission from the contributor per `references/push-request-template.md` and push only once they grant it.

Record the pull request URL and the outcome in `status.md`: `implementation: delivered round N`. Close with a return reporting the slug, Branch, base, pull request URL, and the tests Readiness ran.

## Out of scope

Edits to the assignment, pull request promotion, and GitHub writes beyond the approved draft pull request and its approved Validation comment.
