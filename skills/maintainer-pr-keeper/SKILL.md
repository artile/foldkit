---
name: maintainer-pr-keeper
description: Daily Foldkit Maintainer cycle that keeps Taras's open pull requests on foldkit/foldkit mergeable. Rebases conflicting branches, reports failing checks, and drafts replies to unanswered review comments. Use when the PR keeper schedule fires or when asked to check the state of artile's open Foldkit pull requests.
---

# maintainer-pr-keeper

Keep every open pull request by `artile` on `foldkit/foldkit` in a state the maintainer can merge. Read `/Users/tao/Tools/foldkit/.maintainer/AGENTS.md` first.

## 1. Collect

```sh
gh pr list -R foldkit/foldkit --author artile --state open --limit 100 \
  --json number,title,url,isDraft,headRefName,headRepositoryOwner,mergeable,mergeStateStatus,reviewDecision,updatedAt
```

For each pull request also read `gh pr checks <n> -R foldkit/foldkit` and the review threads: `gh api graphql` on `pullRequest.reviewThreads` with `isResolved`, and the issue comments. A comment is unanswered when its author is not `artile` and no later comment or reply by `artile` exists in that thread.

## 2. Act

Skip any pull request that a contribution under `.maintainer/contributions/` holds in a state other than `evaluation: promoted round N`: `maintainer-driver` owns it. For one that a contribution holds as promoted, take its contribution lock first, per "Locks" in `AGENTS.md`.

| State | Action |
|---|---|
| `mergeable == CONFLICTING` and every commit author on the branch is `artile` or Taras Kornichuk | Rebase on `upstream/main` (below). Automatic. |
| `CONFLICTING` and someone else pushed commits (often `devinjameson`) | Do not rewrite. Put it in the digest for Taras. |
| Only `BEHIND` | Nothing. Pull requests are squash-merged, so being behind does not block a merge. |
| A failing check that `upstream/main` does not also fail | Diagnose and fix it in a new commit; push through the push gate in "Autonomy" in `AGENTS.md` and the `pushes` limit. Track tries per pull request and check name in `state/pr-keeper.toml`. After 2 failed tries, stop and list it in the digest. |
| Unanswered review comment from an author whose `authorAssociation` is `OWNER`, `MEMBER`, or `COLLABORATOR` | Make the change it asks for in a new commit when you agree, push through the push gate, then reply with what changed. When you disagree, reply with the reason. Each reply goes through the publish gate and the `review_replies` limit. When the comment asks for a direction choice only Taras can make (scope, API shape he proposed), reply that he will follow up, and list it first in the digest. |
| Unanswered comment from anyone else | Do not change code. List it in the digest with a draft reply. |
| Maintainer approved and checks pass | List it as "ready, waiting for merge". |

### Rebase

1. Remote: `artile` when `headRepositoryOwner` is `artile`, `origin` when it is `tao-io`.
2. Use the existing worktree for the branch (`git worktree list`), or add one at `/Users/tao/Tools/foldkit-worktrees/pr-<n>` and run the setup command from `skills/maintainer-contribution/SKILL.md` (Workspace). In it, `gh pr checkout <n> -R foldkit/foldkit`.
3. `git fetch upstream main && git fetch <remote> <headRefName>`. Note `<sha> = git rev-parse FETCH_HEAD`, then `git checkout -B <headRefName> FETCH_HEAD`. Run the commit-author check from the table on `upstream/main..FETCH_HEAD`.
4. `git rebase upstream/main`. When a conflict needs a judgment call about behavior, run `git rebase --abort` and put it in the digest.
5. Run the checks for the touched packages: `pnpm -F <package> typecheck`, `pnpm -F <package> test`, and `pnpm lint:ci`.
6. The repository requires a separate review after any rewritten commit: run one fresh-context subagent on `git diff upstream/main...HEAD` against the repository's `AGENTS.md`. When it finds anything, do not push; put the findings in the digest.
7. Check the `force_pushes` limit, then `git push <remote> HEAD:<headRefName> --force-with-lease=<headRefName>:<sha> --no-verify`.

## 3. Clean up

- Archive Foldkit Maintainer threads in T3 that are settled and older than 24 hours, including their subagent threads (`t3_thread_list` for the Foldkit Maintainer project, then `t3_thread_organize` with `archive`). Leave a thread that holds an open question or a pull request still in review.
- Remove worktrees under `/Users/tao/Tools/foldkit-worktrees/` whose contribution is `analysis: concluded` or `<stage>: abandoned`, or whose pull request is merged, and whose branch has no unpushed commits. Take the contribution lock first and skip the worktree when you cannot; release it after `git worktree remove`.
- Remove T3 run worktrees under `/Users/admin/.t3/worktrees/foldkit/` whose branch starts with `t3/` and whose thread in this project is settled or older than 24 hours, when they have no uncommitted changes and no unpushed commits. Leave the worktree of any thread that is still running, and any worktree of another project.
- Remove contribution locks whose `owner` time is older than 3 hours. Never remove a lock directory that has no `owner` file yet.

## 4. Report

Tag every item with its `priority` from "Maintainer priorities" in `AGENTS.md` and sort each table by priority.

Write `digests/pr-keeper/<YYYY-MM-DD>.md` per the digest format in `AGENTS.md`, commit it on `maintainer`, and push. Reply in the thread with the digest tables.
