---
name: maintainer-ecosystem-miner
description: Weekly CAFE Maintainer cycle that reads public projects built with Foldkit, from awesome-foldkit and GitHub code search, to find Foldkit bugs, workarounds, DX gaps, and new projects worth listing. Use when the ecosystem miner schedule fires or when asked what other Foldkit users struggle with.
---

# maintainer-ecosystem-miner

Learn from code other people write with Foldkit. A workaround in someone's app is often a Foldkit bug or a missing API. Read `/Users/tao/Tools/foldkit/.maintainer/AGENTS.md` first.

## 1. Find projects

- The list in `foldhub/awesome-foldkit`: `git -C /Users/tao/Tools/awesome-foldkit fetch origin main`, then `git -C /Users/tao/Tools/awesome-foldkit show origin/main:data/projects.toml`.
- GitHub code search: `gh search code "from 'foldkit'" --language TypeScript --limit 100 --json repository,path` and `gh search code "\"foldkit\":" --filename package.json --limit 100 --json repository`.
- Drop forks of `foldkit/foldkit`, the repositories in `state/apps.toml` (Taras's own apps), and archived repositories.
- Merge with `state/ecosystem.toml`. Each repository has `last_commit_seen`. Read only repositories with new commits since then. At most 15 per run, most recently pushed first.

## 2. Read each project

Read the commits since `last_commit_seen` and the Foldkit-facing code. Look for:

- A pinned old Foldkit version, and a reverted upgrade commit. Note the version and the error that stopped it.
- `patch-package` or `pnpm patch` files for `foldkit` or `@foldkit/*`.
- Code that copies Foldkit internals, casts around a Foldkit type (`as any`, `as unknown as`), or carries a comment like "workaround", "hack", "foldkit bug", "TODO foldkit".
- Their own helpers that several projects repeat. That is a candidate for a Foldkit API.
- Issues in their repository that mention Foldkit.

For each finding, check `foldkit/foldkit` for an existing issue, discussion, or fix on `main`.

## 3. Report

Tag every row in "Possible Foldkit bugs" and "DX and API ideas" with its `priority` from "Maintainer priorities" in `AGENTS.md` and sort those two tables by priority.

Write `digests/ecosystem-miner/<YYYY-MM-DD>.md` with three tables:

| Section | Each row |
|---|---|
| Possible Foldkit bugs | Repository link, file and line, what they work around, existing upstream issue or "none", proposed next step |
| DX and API ideas | The pattern, which projects repeat it, a one-paragraph proposal |
| New projects | Repository link, what it is, whether it fits `awesome-foldkit` |

Then act, each through the publish gate in "Autonomy" in `AGENTS.md` and its daily limit, highest priority first:

- A possible bug with a reproduction you ran on `upstream/main` and no upstream issue: start `maintainer-contribution` with it as a new shortcoming. Its analysis files the issue (`issues_opened`) or, on the Implementation path, goes on to a pull request.
- A `P0` to `P2` DX idea repeated in at least two projects and not yet discussed upstream: open a discussion in the Ideas category from `maintainer-contribution/references/discussion-template.md` (`discussions_opened`).
- A new project that may fit `foldhub/awesome-foldkit` and is not in its `data/projects.toml`: add `owner/name` to `queue` in `state/awesome.toml` under the state lock. `maintainer-awesome-curator` scores it and decides. Do not open pull requests there yourself.

Update `state/ecosystem.toml` with what was filed, commit on `maintainer`, and push.
