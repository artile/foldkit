# CAFE Maintainer

Tools, state, and digests for contributing, as an outside contributor, to the CAFE stack Taras builds on: [Foldkit](https://github.com/foldkit/foldkit), [Alchemy](https://github.com/alchemy-run/alchemy) (Domain), [Effect](https://github.com/Effect-TS/effect), [effect-orm](https://github.com/MapleTechLabs/effect-orm), and [Maple](https://github.com/MapleTechLabs/maple). The registry in `repos/` lists each repository and what the Maintainer may write there.

This orphan branch shares no history with Foldkit. It is mounted at `.maintainer/` inside a checkout of the Foldkit fork:

```sh
git clone https://github.com/tao-io/foldkit /home/om/TAO/Tools/foldkit
cd /home/om/TAO/Tools/foldkit
git remote add upstream https://github.com/foldkit/foldkit.git
git remote add artile https://github.com/artile/foldkit.git
git fetch artile maintainer
git worktree add .maintainer maintainer
bash .maintainer/bin/link-skills.sh .
bash .maintainer/bin/setup-repos.sh
```

`setup-repos.sh` clones the other registry repositories next to the Foldkit checkout. Agents start from `AGENTS.md`. The design is `designs/cafe-maintainer.md`. The skills under `skills/` are linked into `.claude/skills/` and `.agents/skills/` so Claude Code and Codex find them. `maintainer-contribution` is adapted from the `contribution` skill Taras supplied.
