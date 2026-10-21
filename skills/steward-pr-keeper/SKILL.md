---
name: steward-pr-keeper
description: Daily Foldkit Steward cycle that keeps Taras's open pull requests on foldkit/foldkit mergeable. Rebases conflicting branches, reports failing checks, and drafts replies to unanswered review comments. Use when the PR keeper schedule fires or when asked to check the state of artile's open Foldkit pull requests.
---

# steward-pr-keeper

Keep every open pull request by `artile` on `foldkit/foldkit` in a state the maintainer can merge. Read `/Users/tao/Tools/foldkit/.steward/AGENTS.md` first.

## 1. Collect

```sh
gh pr list -R foldkit/foldkit --author artile --state open --limit 100 \
  --json number,title,url,isDraft,headRefName,headRepositoryOwner,mergeable,mergeStateStatus,reviewDecision,updatedAt
```

For each pull request also read `gh pr checks <n> -R foldkit/foldkit` and the review threads: `gh api graphql` on `pullRequest.reviewThreads` with `isResolved`, and the issue comments. A comment is unanswered when its author is not `artile` and no later comment or reply by `artile` exists in that thread.

## 2. Act

| State | Action |
|---|---|
| `mergeable == CONFLICTING` and every commit author on the branch is `artile` or Taras Kornichuk | Rebase on `upstream/main` (below). Automatic. |
| `CONFLICTING` and someone else pushed commits (often `devinjameson`) | Do not rewrite. Put it in the digest for Taras. |
| Only `BEHIND` | Nothing. Pull requests are squash-merged, so being behind does not block a merge. |
| A failing check that `upstream/main` does not also fail | Diagnose. Put the cause and a proposed fix in the digest. Do not push a fix without approval. |
| Unanswered review comment | Draft a reply, or a fix plus a reply, in the digest. Do not post. |
| Maintainer approved and checks pass | List it as "ready, waiting for merge". |

### Rebase

1. Remote: `artile` when `headRepositoryOwner` is `artile`, `origin` when it is `tao-io`.
2. Use the existing worktree for the branch (`git worktree list`), or add one at `/Users/tao/Tools/foldkit-worktrees/pr-<n>` and run the setup from `AGENTS.md`.
3. `git fetch upstream main && git rebase upstream/main`. When a conflict needs a judgment call about behavior, run `git rebase --abort` and put it in the digest.
4. Run the checks for the touched packages: `pnpm -F <package> typecheck`, `pnpm -F <package> test`, and `pnpm lint` on the changed files.
5. `git push <remote> HEAD:<headRefName> --force-with-lease --no-verify`.

## 3. Report

Write `digests/pr-keeper/<YYYY-MM-DD>.md` per the digest format in `AGENTS.md`, commit it on `steward`, and push. Reply in the thread with only the items that need Taras.
