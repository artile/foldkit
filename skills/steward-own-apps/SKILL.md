---
name: steward-own-apps
description: Weekly Foldkit Steward cycle that checks Taras's own Foldkit apps against the latest Foldkit release, lists the breaking changes each one must absorb, and turns friction found there into Foldkit DX findings. Use when the own apps schedule fires or when asked how far Taras's apps lag behind Foldkit.
---

# steward-own-apps

Taras's apps are the closest view of what using Foldkit costs. Read `/Users/tao/Tools/foldkit/.steward/AGENTS.md` first. This cycle does not edit the apps. It reports, and it proposes upstream changes.

## 1. Versions

For every app in `state/apps.toml`:

- Read the Foldkit packages and versions in its `package.json`.
- Latest version: `npm view foldkit version`, and the same for each `@foldkit/*` package it uses.
- Breaking changes between the two versions: after `git -C /Users/tao/Tools/foldkit fetch upstream main`, read each package changelog with `git -C /Users/tao/Tools/foldkit show upstream/main:packages/<package>/CHANGELOG.md` for the range, and collect entries that require consumer code changes.

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

Update `last_checked` in `state/apps.toml`, commit on `steward`, and push.
