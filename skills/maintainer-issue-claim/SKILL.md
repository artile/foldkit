---
name: maintainer-issue-claim
description: CAFE Maintainer cycle that polls foldkit/foldkit for new issues from other people, triages them, reproduces the good candidates, and asks Taras to approve a claim comment before a fix starts. Use when the issue claim schedule fires or when asked to look for new Foldkit issues to take.
---

# maintainer-issue-claim

Take new issues from other people quickly, so the maintainer gets the issue and a pull request together. Read `/home/om/TAO/Tools/foldkit/.maintainer/AGENTS.md` first.

## 1. Poll

Read `state/claim.toml` (`last_poll`, and `[issues.<number>]` entries with `decision`). Then:

```sh
gh issue list -R foldkit/foldkit --state open --search "created:>=<last_poll date>" \
  --json number,title,author,assignees,labels,createdAt,body,comments,url
```

Also re-check entries with `decision = "watch"`. Set `last_poll` to the start time of this run.

## 2. Triage

Skip the issue, and record `decision = "skip"` with the reason, when any of these is true:

- The author is `devinjameson`, or the issue has an assignee, or the `has PR` or `superseded` label.
- Its entry in `state/claim.toml` already has a `slug`: `maintainer-driver` owns that contribution. Skip it without changing its entry.
- An open pull request references it: `gh pr list -R foldkit/foldkit --search "<number>" --state open`.
- Another person's open pull request already fixes its root cause, even without referencing the issue. A remaining side part qualifies only when it is `P0` to `P2` on its own.
- A comment says someone is working on it.
- It asks for a design or direction decision the maintainer has not made. Record `decision = "watch"` instead, and add it to the digest under "discussion candidates".
- It is a question, or a duplicate. Name the duplicate in the digest.

Everything else is a candidate. Tag each one with a `priority` from "Maintainer priorities" in `AGENTS.md`. Order candidates by priority, then by likely size, smallest first. Take at most 2 per run. Record `priority` in `state/claim.toml`, and fill it in for any `watch` entry that lacks one.

## 3. Reproduce

For each candidate, derive the slug `issue-<number>-<topic>` (kebab-case, not taken under `contributions/`), take the contribution lock per "Locks" in `AGENTS.md`, then run the `maintainer-contribution` skill with the issue and that slug as input (the "issue from `maintainer-issue-claim`" entry row). Its analysis stage pins `upstream/main`, writes a failing reproduction under `contributions/<slug>/reproduction/`, finds the root cause, and returns a recommendation.

- No reproduction, or the path is not Implementation: record `decision = "no-claim"` with the reason. Put it in the digest.
- Implementation path: the analysis stage is paused at Decision with `analysis: in progress`. Record `decision = "awaiting-approval"` and the slug. In supervised mode, stop here; in autonomous mode, go on to step 4.

## 4. Approve the claim

The claim comment states the pinned commit, the minimal reproduction, observed and expected results, and one line saying a pull request follows.

In autonomous mode, put the exact claim text through the publish gate in "Autonomy" in `AGENTS.md` and check the `issue_comments` limit. In supervised mode, reply in the thread with, per candidate: the issue link, a one-line summary, the reproduction result, the planned fix in two lines, and the exact claim text, and wait for Taras.

Once approved, relay the approved text to the paused analysis stage of `maintainer-contribution`. The analysis stage posts the comment, records its URL in `status.md`, writes `assignment.md`, and sets `analysis: assignment ready`. Then record `decision = "claimed"` with the comment URL here, and let `maintainer-contribution` continue into implementation in this run until `implementation: delivered round 1`. Then release the contribution lock; `maintainer-driver` runs evaluation and every later round. That opens a draft pull request from `artile/foldkit` with `Fixes #<number>`.

## 5. Report

Write `digests/issue-claim/<YYYY-MM-DD>.md` (append when it already exists), commit `state/claim.toml` and the digest on `maintainer`, and push. When nothing passed triage, reply in one line.
