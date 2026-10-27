---
name: maintainer-pr-keeper
description: Daily CAFE Maintainer cycle that keeps Taras's open pull requests mergeable in every maintain or pr repository of the registry (foldkit, alchemy, effect-orm). Rebases conflicting branches, reports failing checks, and drafts replies to unanswered review comments. Use when the PR keeper schedule fires or when asked to check the state of artile's open pull requests.
---

# maintainer-pr-keeper

Keep every open pull request by `artile` in a state its maintainers can merge. Read `/Users/tao/Tools/foldkit/.maintainer/AGENTS.md` first.

## 1. Collect

The repositories are the files in `/Users/tao/Tools/foldkit/.maintainer/repos/` with `mode = "maintain"` or `mode = "pr"`. For each one, read `upstream`, `fork`, `push_remote`, `path`, `worktrees`, and `default_branch`, then:

```sh
gh pr list -R <upstream> --author artile --state open --limit 100 \
  --json number,title,url,isDraft,headRefName,headRepositoryOwner,mergeable,mergeStateStatus,reviewDecision,labels,updatedAt
```

For each pull request also read `gh pr checks <n> -R <upstream>` and the review threads: `gh api graphql` on `pullRequest.reviewThreads` with `isResolved`, and the issue comments. A comment is unanswered when its author is not `artile` and no later comment or reply by `artile` exists in that thread.

Record each pull request in `state/pr-keeper.toml` under `[pulls."<n>"]` for `foldkit` and `[pulls."<repo>#<n>"]` for another repository. In the top-level lists and counts, write a Foldkit pull request as a number and any other as the string `"<repo>#<n>"`.

## 2. Act

Skip any pull request that a contribution under `.maintainer/contributions/` holds in a state other than `evaluation: promoted round N` or `tracking: open`: `maintainer-driver` owns it. Match a contribution by the pull request URL in its `status.md`. For one held as promoted or tracked, take its contribution lock first, per "Locks" in `AGENTS.md`.

| State | Action |
|---|---|
| `mergeable == CONFLICTING` and every commit author on the branch is `artile` or Taras Kornichuk | Rebase on `upstream/<default_branch>` (below). Automatic. |
| `CONFLICTING` and someone else pushed commits (often a maintainer) | Do not rewrite. Put it in the digest for Taras. |
| Only `BEHIND` | Nothing, when `merge_method` in `repos/<repo>.toml` is `squash`, because being behind does not block a merge. Otherwise list it in the digest. |
| A failing check that `upstream/<default_branch>` does not also fail | Diagnose and fix it in a new commit; push through the push gate in "Autonomy" in `AGENTS.md` and the `pushes` limit. Track tries per pull request and check name in `state/pr-keeper.toml`. After 2 failed tries, stop and list it in the digest. |
| Unanswered review comment from an author whose `authorAssociation` is `OWNER`, `MEMBER`, or `COLLABORATOR` | Make the change it asks for in a new commit when you agree, push through the push gate, then reply with what changed. When you disagree, reply with the reason. Each reply goes through the publish gate and the `review_replies` limit. When the comment asks for a direction choice only Taras can make (scope, API shape he proposed), reply that he will follow up, and list it first in the digest. |
| Unanswered comment from anyone else | Do not change code. List it in the digest with a draft reply. |
| Maintainer approved and checks pass | List it as "ready, waiting for merge". |

### Rebase

1. Remote: the repository's `push_remote` when `headRepositoryOwner` is `artile`. With any other head owner, do not rebase; list it in the digest.
2. A missing clone at the repository's `path` goes into the digest with "run `bin/setup-repos.sh`"; skip that repository for this run. Use the worktree recorded for the pull request: the owning contribution's recorded worktree, or `worktree` in its `state/pr-keeper.toml` entry (see "Clones and worktrees" in `AGENTS.md`). Without one, add `<worktree root>/cafe-<slug>` when a contribution owns the pull request, else `<worktree root>/cafe-pr-<n>` (see "Clones and worktrees" in `AGENTS.md`), record it, and set it up as "Workspace" in `skills/maintainer-contribution/SKILL.md` says. When `git -C <path> worktree list` shows `<headRefName>` checked out in any other worktree, Taras is working on it: skip the pull request and list it in the digest. In the worktree, `gh pr checkout <n> -R <upstream>`.
3. `git fetch upstream <default_branch> && git fetch <remote> <headRefName>`. Note `<sha> = git rev-parse FETCH_HEAD`, then `git checkout -B <headRefName> FETCH_HEAD`. Run the commit-author check from the table on `upstream/<default_branch>..FETCH_HEAD`.
4. `git rebase upstream/<default_branch>`. When a conflict needs a judgment call about behavior, run `git rebase --abort` and put it in the digest.
5. Run the checks for the touched packages. For `foldkit`: `pnpm -F <package> typecheck`, `pnpm -F <package> test`, and `pnpm lint:ci`. For another repository: the typecheck, test, and lint commands its `rules` files name.
6. Run one fresh-context subagent on `git diff upstream/<default_branch>...HEAD` against the repository's `rules` files. When it finds anything, do not push; put the findings in the digest.
7. Check the `force_pushes` limit, then `git push <remote> HEAD:<headRefName> --force-with-lease=<headRefName>:<sha> --no-verify`.

## 3. Clean up

- Archive CAFE Maintainer threads in T3 that are settled and older than 24 hours, including their subagent threads (`t3_thread_list` for the T3 project of `/Users/tao/Tools/foldkit`, then `t3_thread_organize` with `archive`). Leave a thread that holds an open question or a pull request still in review.
- Remove the worktrees that a cycle recorded (in a contribution's `status.md` or in `state/pr-keeper.toml`) whose contribution is `analysis: concluded` or `<stage>: abandoned`, or whose pull request is merged, and whose branch has no unpushed commits. Leave every other worktree under the worktree roots: Taras made it. Take the contribution lock first and skip the worktree when you cannot; release it after `git worktree remove`.
- Remove T3 run worktrees under `/Users/admin/.t3/worktrees/foldkit/` whose branch starts with `t3/`, whose thread is a CAFE Maintainer cycle thread, and whose thread is settled or older than 24 hours, when they have no uncommitted changes and no unpushed commits. Leave the worktree of any thread that is still running, of Taras's own threads, and of another project.
- Remove contribution locks whose `owner` time is older than 3 hours. Never remove a lock directory that has no `owner` file yet.

## 4. Report

Tag every item with its repository and its `priority` per "Maintainer priorities" in `AGENTS.md`, and sort each table by priority.

Write `digests/pr-keeper/<YYYY-MM-DD>.md` per the digest format in `AGENTS.md`, commit it on `maintainer`, and push. Reply in the thread with the digest tables.
