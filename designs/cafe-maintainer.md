# Design: CAFE Maintainer

Status: accepted by Taras on 2026-10-27. This file is the spec for the rename and the new cycles.

## What changes

Foldkit Maintainer becomes CAFE Maintainer. It keeps everything it does for Foldkit and adds the rest of the stack Taras builds on.

| Repo | Upstream | Fork | `mode` | What the maintainer does |
| --- | --- | --- | --- | --- |
| foldkit | `foldkit/foldkit` | `artile/foldkit` | `maintain` | Everything it does today (stream A) |
| awesome-foldkit | `foldhub/awesome-foldkit` | (owner) | `curate` | Curator, as today |
| alchemy | `alchemy-run/alchemy` | `artile/alchemy` | `pr` | Stream B: issues and PRs; keep alchemy#2700 alive |
| effect-orm | `MapleTechLabs/effect-orm` | `artile/effect-orm` | `pr` | Stream B: issues and PRs |
| effect | `Effect-TS/effect` | none | `issue` | Stream B: issues only |
| maple | `MapleTechLabs/maple` | none | `issue` | Stream B: issues only |

Kept as is, to avoid breaking the live T3 schedules on macair: the branch name `maintainer`, the mount path `.maintainer/`, and the skill ids `maintainer-*`. Only the project name and prose change. Moving to a repository of its own is a later step.

## Three streams

- **A. Maintain.** The existing Foldkit cycles: issue-claim, driver, pr-keeper, issue-sweeper, ecosystem-miner, awesome-curator. No change, except that driver and pr-keeper also serve contributions and pull requests in other `pr`-mode repos.
- **B. Upstream-out (friction miner).** Find friction in Taras's web apps, decide which layer causes it, check for duplicates, reproduce it with that one library, then open an issue (`issue` mode) or start a contribution that ends in a PR (`pr` mode, and `maintain` for foldkit). Replaces the old own-apps cycle.
- **C. Downstream-in (release radar).** When a repo in the registry releases, compare the release with what Taras's web apps use, and report what to adopt, what breaks, what it unblocks, and what is deprecated. Web apps only for now.

## Registry

One file per repo: `repos/<name>.toml`.

```toml
name = "effect-orm"
upstream = "MapleTechLabs/effect-orm"
fork = "artile/effect-orm"        # omit for issue-only repos
path = "/home/om/TAO/Tools/effect-orm"
mode = "pr"                        # maintain | curate | pr | issue
merge_method = "merge"             # squash | merge | rebase; pr and maintain repos only
default_branch = "main"
release_tags = "v*"                # git tag glob for stream C
packages = ["effect-orm"]          # npm names to find in app lockfiles
rules = ["AGENTS.md", "CONTRIBUTING.md"]   # files every write must follow, if present
owner_plan_authors = []            # issue authors whose issues are the maintainer's own plan: never claim
clone = "full"                     # full | blobless
[limits]                           # per ISO week, on top of the daily limits
issues_opened = 2
pull_requests_opened = 2
```

Effect and maple: `clone = "blobless"` (`git clone --filter=blob:none`), `issues_opened = 1` per week, no fork.

Every clone: `main` (the default branch) mirrors `upstream`; never commit on it. Each contribution gets a worktree at `/home/om/TAO/Tools/<name>-worktrees/<slug>` (foldkit keeps `foldkit-worktrees`). Stream B reproduces on `upstream/<default_branch>` HEAD; stream C reads release tags.

## Apps

`state/apps.toml` gets `kind = "web"` on each app. Streams B and C read only `kind = "web"` apps. `allow_pr = false` by default: stream C reports and does not push to app repos until Taras sets it.

## Stream B details

Signals in an app, with file and line:

- `patches/` entries (pnpm patch) for a registry package.
- Casts at a library boundary: `as any`, `as unknown as`, `@ts-expect-error`, `@ts-ignore` on a line that uses a registry package.
- A local copy or wrapper of upstream code.
- `HACK`, `workaround`, `FIXME` comments that name a registry package.
- A pinned or held-back version of a registry package.
- `friction.toml` at the app root: lines that agents and Taras append while working (format in the skill).

Per signal: triage the layer (the repro must use only that library; if it reproduces without Foldkit, it belongs to Effect, and so on), dedup against open and closed issues, PRs, and the changelog since the app's version, then reproduce on upstream HEAD. Already fixed upstream means it goes to stream C, not to an issue. Then the publish gate, then an issue or a contribution. Record each filed item in `state/workarounds.toml` with the app location it would let us remove.

## Stream C details

Daily. For each registry repo with `packages`: list release tags newer than `state/releases.toml`. For each web app that depends on one of the packages, find the installed version (lockfile, via `ssh macmax`), read the changelog and diff between the installed version and the release, and classify:

| Class | Meaning | Output |
| --- | --- | --- |
| `unblock` | A release fixes an item in `state/workarounds.toml` | the workaround to remove, with location |
| `break` | A breaking change touches app code | the call sites |
| `adopt` | A new API replaces local code | the local code and the new API |
| `deprecate` | The app uses something marked for removal | the call sites |
| other | Nothing in the app is affected | digest line only |

Only `unblock`, `break`, and `adopt` with a concrete location become proposals in `state/proposals.toml`. A proposal becomes a branch and PR in the app repo only when the app has `allow_pr = true`.

Stream C also watches bridges: alchemy#2700 depends on `foldkit`. A new `foldkit` release, or the merge of foldkit/foldkit#1655, becomes a proposal against the contribution that owns alchemy#2700.

## Effect source in Codex runs

The `effect-ts` skill asks for `.vendor/effect`. In upstream checkouts, never create it. Use `node_modules/effect`; for full source, `/home/om/TAO/Tools/foldkit/repos/effect` is a read-only copy pinned to an Effect tag. Every task brief to a Codex child says so in its first line.
