---
name: maintainer-own-apps
description: Weekly Foldkit Maintainer cycle that checks Taras's own Foldkit apps against the latest Foldkit release, lists the breaking changes each one must absorb, and turns friction found there into Foldkit DX findings. Use when the own apps schedule fires or when asked how far Taras's apps lag behind Foldkit.
---

# maintainer-own-apps

Taras's apps are the closest view of what using Foldkit costs. Read `/home/om/TAO/Tools/foldkit/.maintainer/AGENTS.md` first. This cycle does not edit the apps. It reports, and it hands each `P0` to `P2` DX finding that has no upstream issue to `maintainer-contribution` as a new shortcoming, within the daily limits.

## 1. Versions

For every app in `state/apps.toml` (when an entry has `host = "macmax"`, run each read command on that host through `ssh macmax`, for example `ssh macmax cat <path>/package.json` and `ssh macmax git -C <path> log`):

- Read the Foldkit packages and versions in its `package.json`.
- Latest version: `npm view foldkit version`, and the same for each `@foldkit/*` package it uses.
- Breaking changes between the two versions: after `git -C /home/om/TAO/Tools/foldkit fetch upstream main`, read each package changelog with `git -C /home/om/TAO/Tools/foldkit show upstream/main:packages/<package>/CHANGELOG.md` for the range, and collect entries that require consumer code changes.

## 2. Friction

For apps with commits since `last_checked`:

- Read the commits that touch Foldkit code. Look for workarounds, casts around Foldkit types, repeated helpers, and comments that blame Foldkit.
- When the app has a `CLAUDE.md` or agent notes, read the parts about Foldkit. A rule an agent needed to be told is a DX gap.

For each item, check `foldkit/foldkit` for an existing issue or fix.

## 3. Report

Tag every DX finding with its `priority` from "Maintainer priorities" in `AGENTS.md` and sort the DX findings table by priority.

Write `digests/own-apps/<YYYY-MM-DD>.md`:

| Section | Content |
|---|---|
| Version lag | App, current version, latest, number of breaking entries, a link to each |
| Migration order | Apps ordered by the smallest migration first |
| DX findings | What hurt, where, the upstream issue or "none", proposed upstream change |

Update `last_checked` in `state/apps.toml`, commit on `maintainer`, and push.
