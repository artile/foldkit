---
name: maintainer-issue-sweeper
description: Weekly CAFE Maintainer cycle that checks open foldkit/foldkit issues against current main and drafts comments for issues already resolved or nearly resolved. Use when the issue sweeper schedule fires or when asked which Foldkit issues are already fixed on main.
---

# maintainer-issue-sweeper

Find open issues on `foldkit/foldkit` that `main` already resolves, fully or in part, and draft a short comment for each one. Read `/Users/tao/Tools/foldkit/.maintainer/AGENTS.md` first. This cycle includes issues opened by `devinjameson`: telling the maintainer that their issue is done saves them time.

## 1. Pick the batch

- `git -C /Users/tao/Tools/foldkit fetch upstream main`. Pin the run to that commit.
- `gh issue list -R foldkit/foldkit --state open --limit 300 --json number,title,author,createdAt,updatedAt,labels,comments`.
- Skip issues listed in `state/sweeper.toml` with a `checked_at` newer than their `updatedAt`.
- Check at most 40 issues per run, oldest `updatedAt` first.

## 2. Check each issue

Read the issue and its comments. Then look for the fix:

- `git log upstream/main --since=<issue createdAt> --oneline -i --grep=<key terms>`.
- `gh pr list -R foldkit/foldkit --state merged --search "<key terms>"`, and pull requests that link the issue.
- Read the current code the issue names. Where a behavior claim can be tested quickly, run the smallest test or script that shows it, in a scratch worktree from `upstream/main` under the Foldkit worktree root, named with the `cafe-` prefix per "Clones and worktrees" in `AGENTS.md`. Remove it before the run ends.

Classify:

| Class | Meaning | Draft |
|---|---|---|
| Resolved | `main` does what the issue asks | Comment naming the commit or pull request and how to see it, and suggesting the issue be closed |
| Partly resolved | Part is done; a named part remains | Comment listing what landed and what remains |
| Open | Still reproduces or not started | None |
| Unclear | Cannot tell without the reporter | A question, only if it unblocks the issue |

A comment states facts with links at the pinned commit. One short paragraph, no greeting, no sign-off. Follow the prose rules in the repository's `AGENTS.md`.

## 3. Report

Tag every item with its `priority` from "Maintainer priorities" in `AGENTS.md`. Group by `class` as below, then sort by priority within each group.

Write `digests/issue-sweeper/<YYYY-MM-DD>.md` (Resolved and Partly resolved first, each with its draft comment), update `state/sweeper.toml` with `checked_at`, `class`, and `priority` for every checked issue, commit both on `maintainer`, and push. Then post each Resolved and Partly resolved comment that passes the publish gate in "Autonomy" in `AGENTS.md`, within the `issue_comments` limit, highest priority first: `gh issue comment <n> -R foldkit/foldkit --body-file <file>`. Record the comment URL in `state/sweeper.toml`. Never comment twice on one issue for the same class.
