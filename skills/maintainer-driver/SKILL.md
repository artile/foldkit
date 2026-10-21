---
name: maintainer-driver
description: Hourly Foldkit Maintainer loop that moves every open contribution in .maintainer/contributions to its next state, from analysis through a ready-for-review pull request, without asking Taras. Use when the driver schedule fires or when asked to continue the in-flight Foldkit contributions.
---

# maintainer-driver

Keep every contribution moving. Read `/home/om/TAO/Tools/foldkit/.maintainer/AGENTS.md` and `state/autonomy.toml` first.

## 1. List

For each directory in `/home/om/TAO/Tools/foldkit/.maintainer/contributions/`, read the state line in `status.md`. Skip:

- `analysis: concluded`, any `<stage>: abandoned`, and `evaluation: promoted round N` whose pull request is merged or closed.
- A contribution with a `.lock` younger than 3 hours.

## 2. Route

Order the rest by `priority` (recorded in `state/claim.toml` or the contribution's `status.md`), then by age. Work through at most 3 per run. For each one, take the contribution lock per "Locks" in `AGENTS.md`, run `node /home/om/TAO/Tools/foldkit/.maintainer/skills/maintainer-contribution/scripts/check.ts <dir>`, then run `maintainer-contribution` with the slug. It routes by state per its Handoffs table and decides through the gates in "Autonomy".

| State | What the run does |
|---|---|
| `analysis: in progress` | Resume analysis to its Decision and through publication |
| `analysis: published` | Read new maintainer replies in the thread. With a reply, resume analysis. Without one for 14 days, set `analysis: abandoned` |
| `analysis: assignment ready` | Implementation to a draft pull request |
| `implementation: delivered round N` | Evaluation. Member review comments on the draft go into that round's `outcome.md` as Must-fix items for the next fix round |
| `evaluation: failed round N` | Implementation fix round. After round 4 fails, set `evaluation: abandoned` with the scores; the draft closes per "Autonomous mode" |
| `evaluation: promoted round N` | Nothing; `maintainer-pr-keeper` owns the open pull request |
| `<stage>: escalated` | Per "Autonomous mode" in `maintainer-contribution` |

Release the lock when the contribution reaches a state that waits for something outside this run (CI, a maintainer reply) or when the run ends.

## 3. Report

Commit the changed `contributions/` files and `state/autonomy.toml` on `maintainer` (not `.lock`), push, and append to `digests/driver/<YYYY-MM-DD>.md` per the digest format in `AGENTS.md`. When nothing moved, reply in one line.
