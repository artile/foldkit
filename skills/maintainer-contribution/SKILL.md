---
name: maintainer-contribution
description: Guides contributions to open-source GitHub projects end to end through analysis, implementation, and evaluation stages, with the contributor at the helm. Use to address a defect, limitation, or missing capability upstream, or to resume a contribution by its slug.
---

# maintainer-contribution

Guiding a contribution to an open-source GitHub project end to end spans three stages: analysis establishes whether the reported shortcoming—a defect, limitation, or missing capability—warrants a contribution and specifies one; implementation and evaluation then alternate until the result is ready for review. Each stage owns its work, and every irreversible decision belongs to the contributor. As the single point of contact for the contributor, you set up the workspace, kick off each stage at the right moment, confirm every handoff, and interpret between the contributor and each stage: brief the contributor on only what their choices turn on, discuss it with them, and pass each stage their settled reply. You never analyze, implement, evaluate, edit files, write to GitHub, or decide for the contributor.

## Autonomous mode

When `/Users/tao/Tools/foldkit/.maintainer/state/autonomy.toml` has `mode = "autonomous"`, you act as the contributor's proxy. Wherever this skill or a stage waits for the contributor (a decision, an approval of exact text, permission to push, promotion), decide through the gates in "Autonomy" in `/Users/tao/Tools/foldkit/.maintainer/AGENTS.md` instead, relay the result to the stage as the contributor's reply, and record it in `status.md` as "decided autonomously". Respect the daily limits and `paused`: before each upstream write, check its key from the limit table in `AGENTS.md`. Where a stage or template says a permission prompt confirms a write, the gate result is the confirmation; unattended runs get no prompt.

In autonomous mode also:

- Inputs from a cycle (`maintainer-issue-claim`, `maintainer-ecosystem-miner`, `maintainer-own-apps`, `maintainer-driver`) skip the acknowledgment and summary replies. A setup failure or an unknown slug goes into the run's digest, and the run skips that contribution.
- When CI checks on the pull request have not started (for example, workflows wait for maintainer approval), do not escalate: keep the state, release the lock, and let the next driver run retry.
- An unclean contribution worktree with no unpushed commits is removed and recreated from the branch. With unpushed commits, record it in the digest and skip.
- When analysis resumes and `status.md` lacks the findings it needs (analysis keeps them only in its returns), rerun Phase 1 up to Decision against the current `upstream/main`.
- Any other escalation: add the step "escalation retry" to `status.md` and route it back to analysis. When `status.md` already has an "escalation retry" step, set the state to `<stage>: abandoned` with the reason instead.
- At any `abandoned` state, close the contribution's draft pull request if one exists (`gh pr close`).
- In each implementation round, read the review threads and comments on the contribution's pull request. Treat those from an author whose `authorAssociation` is `OWNER`, `MEMBER`, or `COLLABORATOR` as Must-fix items (evaluation also lists them in `outcome.md`): resolve them in the round and reply through the publish gate and the `review_replies` limit.

## Stages

All three stages run as fresh subagents, each guided by its own file under `stages/`:

- **Analysis** (`stages/analysis.md`) examines the shortcoming, publishes its analysis where it warrants a contribution, and issues an assignment once implementation can begin.
- **Implementation** (`stages/implementation.md`) develops the assignment into a draft pull request and then revises it round by round.
- **Evaluation** (`stages/evaluation.md`) assesses the draft pull request each round and either returns findings to implementation or promotes it to ready for review.

## Workspace

This copy is set up for `foldkit/foldkit` from the Foldkit Maintainer checkout `/Users/tao/Tools/foldkit`. Read `/Users/tao/Tools/foldkit/.maintainer/AGENTS.md` first; it overrides this file where they differ.

- `upstream` tracks `foldkit/foldkit`. The fork is the `artile` remote (`artile/foldkit`, a personal-account fork, so the maintainer can push to pull request branches). Every mention of `origin` in this skill and its stages means the `artile` remote.
- A slug names each contribution. Its worktree is `/Users/tao/Tools/foldkit-worktrees/<slug>`. Its artifact directory is `/Users/tao/Tools/foldkit/.maintainer/contributions/<slug>/`, which is tracked on the `maintainer` branch.
- After `git worktree add`, run `pnpm install && bash scripts/cloud-session-setup.sh && bash /Users/tao/Tools/foldkit/.maintainer/bin/link-skills.sh` in the new worktree.

On entry, confirm on GitHub that `artile/foldkit` is a fork of `foldkit/foldkit` with Actions disabled. Before each stage starts, fetch both remotes; then reuse the worktree of the contribution as is if it already exists, or otherwise create one detached at `upstream/main`. If the clone or either remote is missing, or anything else fails, flag the problem for the contributor rather than work around it.

## Entry

A contribution starts from what the contributor brings, never from a guess:

| Input | Action |
|---|---|
| A new shortcoming | Settle it with the contributor as below, then route it as new |
| An issue from `maintainer-issue-claim` | The claim cycle already settled the shortcoming: use the slug it passes, or derive one as `issue-<number>-<topic>`, set up the workspace, and start analysis without the acknowledgment and summary replies |
| A slug of an existing contribution | Route it by its state |
| An unknown slug, or a resumption without one | List existing contributions to `<owner>/<repo>` and let the contributor choose |

For a new shortcoming, reply at once from `references/acknowledgment-template.md`; then quietly check whether an existing contribution to `<owner>/<repo>` already covers it, derive its slug unless one does, set up the workspace, and report from `references/summary-template.md`, routing it only once the contributor confirms: a match by its state, otherwise as new. If the contributor steers you instead, revise accordingly, moving the worktree with `git worktree move` if the slug changes, and report again from `references/summary-template.md`. Fill every template exactly, adding nothing beyond its placeholders.

## Delegation

Spawn each subagent from `references/spawn-template.md`. Subagents report only to you, ending each run—finished, paused for the contributor, or escalated—with a return from `references/return-template.md`.

When a return awaits the contributor, give them a brief digest of only what their choice turns on, including every question it asks, and share the full material on request. Present verbatim only push requests and exact text for approval, noting that a permission prompt follows for each resulting GitHub write or push. Discuss the return with the contributor as they wish. Answer their questions from what you hold—the full return, the artifact directory, and GitHub—and ask the same subagent whatever those cannot answer. Once the contributor settles, confirm with them that you understand their reply correctly, then pass it to that subagent as you see fit; the subagent picks up where it left off. While a stage runs, stay quiet, even as its background work reports progress.

## Handoffs

On entry to an existing contribution and after every return that awaits nothing, run `scripts/check.ts`, and once it passes, route by the state: on entry, the one in `status.md`; after a return, the reported one.

| State | Action |
|---|---|
| none (new shortcoming) | Start analysis |
| `analysis: in progress` | Resume analysis |
| `analysis: assignment ready` | Start implementation |
| `analysis: published` | Share the published URL; start analysis again once the contributor reports maintainer responses |
| `analysis: concluded` | Report the conclusion; the contribution ends |
| `implementation: delivered round N` | Start evaluation |
| `evaluation: failed round N` | Report the scores and the Must-fix count; start implementation |
| `evaluation: promoted round N` | Hand the pull request to the contributor for final review; the merge rests with the maintainers unless the contributor is one of them |
| `<stage>: escalated` | Present the reason; start the stage the contributor chooses |
| `<stage>: abandoned` | Report the reason; the contribution ends (autonomous mode only) |

`scripts/check.ts` runs as `node <absolute path of this skill>/scripts/check.ts <artifact directory> "<state>"`, passing the state to route by. If it fails, send its output to the subagent that just returned; on entry or if the subagent cannot resolve it, flag the problem for the contributor. Never repair a handoff yourself.
