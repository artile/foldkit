---
name: maintainer-driver
description: Hourly CAFE Maintainer loop that moves every open contribution in .maintainer/contributions to its next state, from analysis through a ready-for-review pull request, in any maintain or pr repository of the registry, without asking Taras. Use when the driver schedule fires or when asked to continue the in-flight contributions.
---

# maintainer-driver

Keep every contribution moving. Read `/Users/tao/Tools/foldkit/.maintainer/AGENTS.md` and `state/autonomy.toml` first.

## 1. List

For each directory in `/Users/tao/Tools/foldkit/.maintainer/contributions/`, read the state line and the `Repository:` line in `status.md`. A missing `Repository:` line means `foldkit`. Read that repository's `repos/<repo>.toml` for `upstream`, `fork`, `push_remote`, `path`, `worktrees`, and `default_branch`. Skip:

- `analysis: concluded`, any `<stage>: abandoned`, and `evaluation: promoted round N` or `tracking: open` whose pull request is merged or closed.
- `tracking: open` with no open proposal for it: no entry in `state/proposals.toml` with `target = "contribution:<slug>"` and `state = "open"`.
- A contribution with a `.lock` younger than 3 hours.

## 2. Route

Order the rest by `priority` (recorded in `state/claim.toml` or the contribution's `status.md`), then by age. Work through at most 3 per run. For each one, take the contribution lock per "Locks" in `AGENTS.md`, run `node /Users/tao/Tools/foldkit/.maintainer/skills/maintainer-contribution/scripts/check.ts <dir>`, then run `maintainer-contribution` with the slug. It routes by state per its Handoffs table and decides through the gates in "Autonomy".

| State | What the run does |
|---|---|
| `analysis: in progress` | Resume analysis to its Decision and through publication |
| `analysis: published` | Read new maintainer replies in the thread. With a reply, resume analysis. Without one for 14 days, set `analysis: abandoned` |
| `analysis: assignment ready` | Implementation to a draft pull request |
| `implementation: delivered round N` | Evaluation. Member review comments on the draft go into that round's `outcome.md` as Must-fix items for the next fix round |
| `evaluation: failed round N` | Implementation fix round. After round 4 fails, set `evaluation: abandoned` with the scores; the draft closes per "Autonomous mode" |
| `evaluation: promoted round N` | Nothing; `maintainer-pr-keeper` owns the open pull request |
| `<stage>: escalated` | Per "Autonomous mode" in `maintainer-contribution` |
| `tracking: open` with an open proposal | Apply the proposal (below) |

### Apply a proposal to a tracked pull request

`maintainer-release-radar` writes `bridge` proposals against a tracked contribution, such as a new `foldkit` release for a pull request that depends on it. Handle each open proposal for the slug, oldest `created` first:

1. Read every step in `status.md` and follow the rules the contributor set there, such as which upstream change triggers which migration. A missing clone at the repository's `path` goes into the digest with "run `bin/setup-repos.sh`"; skip that repository for this run.
2. Use the contribution's recorded worktree (see "Clones and worktrees" in `AGENTS.md`). Without one, add `<worktree root>/cafe-<slug>` from `<push_remote>/<head branch>`, record it in a step, and set it up as "Workspace" in `maintainer-contribution` says. When `git -C <path> worktree list` shows the head branch checked out in another worktree, skip the proposal and list it in the digest.
3. Make the change the proposal and the rules call for in a new commit on the head branch. Never amend or force-push. Update the design document in the pull request when the change alters it.
4. Run the tests the change touches, then the pre-push review gate from "Autonomy" in `AGENTS.md` on `git diff upstream/<default_branch>...HEAD`. Check the `pushes` limit, then push to `push_remote` with `--no-verify`.
5. Add a step to `status.md` with the proposal, the commit, and the test and review results. Under the state lock, set the proposal's `state = "done"` in `state/proposals.toml`; when the release needs no change, set it to `"dropped"` and say why in the step. When the change needs a decision the recorded rules do not cover, record the question as a step, keep the proposal `open`, and list it first in the digest.

The proposal is complete when the push succeeds, or the proposal is dropped, and the step and the proposal record agree. Keep `tracking: open`.

Release the lock when the contribution reaches a state that waits for something outside this run (CI, a maintainer reply) or when the run ends.

## 3. awesome-foldkit

After the contributions, check the triggers in step 1 of `maintainer-awesome-curator`: the radar issue changed since `last_issue_update` in `state/awesome.toml`, `queue` has entries, a `watch` decision is due, or `last_review` is older than 30 days. When one is true and `.maintainer/.awesome-lock/` is free, run `maintainer-awesome-curator`. When none is true, do nothing. The check costs one `gh issue list` call.

## 4. Report

Commit the changed `contributions/` files, `state/autonomy.toml`, `state/repo-counts.toml`, and `state/proposals.toml` on `maintainer` (not `.lock`), push, and append to `digests/driver/<YYYY-MM-DD>.md` per the digest format in `AGENTS.md`. Name the repository of each item. When nothing moved, reply in one line.
