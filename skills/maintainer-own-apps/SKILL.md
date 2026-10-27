---
name: maintainer-own-apps
description: Old name of the CAFE Maintainer friction miner cycle. Use when the own apps schedule fires; it runs maintainer-friction-miner.
---

# maintainer-own-apps

`maintainer-friction-miner` replaced this cycle. The schedule in `cycles/own-apps.toml` calls `$maintainer-own-apps`, so this skill stays as a redirect.

Read `/Users/tao/Tools/foldkit/.maintainer/skills/maintainer-friction-miner/SKILL.md` and run that skill now, with the same inputs, and follow it to its end, including "End of every run" in `/Users/tao/Tools/foldkit/.maintainer/AGENTS.md`. Write the digest under `digests/friction-miner/`, not `digests/own-apps/`.
