---
name: steward-ecosystem-miner
description: Weekly Foldkit Steward cycle that reads public projects built with Foldkit, from awesome-foldkit and GitHub code search, to find Foldkit bugs, workarounds, DX gaps, and new projects worth listing. Use when the ecosystem miner schedule fires or when asked what other Foldkit users struggle with.
---

# steward-ecosystem-miner

Learn from code other people write with Foldkit. A workaround in someone's app is often a Foldkit bug or a missing API. Read `/Users/tao/Tools/foldkit/.steward/AGENTS.md` first.

## 1. Find projects

- The list in `foldhub/awesome-foldkit`: `gh api repos/foldhub/awesome-foldkit/readme --jq .content | base64 -d`.
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

Write `digests/ecosystem-miner/<YYYY-MM-DD>.md` with three tables:

| Section | Each row |
|---|---|
| Possible Foldkit bugs | Repository link, file and line, what they work around, existing upstream issue or "none", proposed next step |
| DX and API ideas | The pattern, which projects repeat it, a one-paragraph proposal |
| New projects | Repository link, what it is, whether it fits `awesome-foldkit` |

Update `state/ecosystem.toml`, commit both on `steward`, and push. A new upstream issue or discussion needs Taras's approval of its exact text; draft it with the templates in `steward-contribution/references/`.
