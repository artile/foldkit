# Foldkit Steward

Tools, state, and digests for contributing to [foldkit/foldkit](https://github.com/foldkit/foldkit) as an outside contributor. This orphan branch shares no history with Foldkit. It is mounted at `.steward/` inside a checkout of the fork:

```sh
git clone https://github.com/tao-io/foldkit /Users/tao/Tools/foldkit
cd /Users/tao/Tools/foldkit
git remote add upstream https://github.com/foldkit/foldkit.git
git remote add artile https://github.com/artile/foldkit.git
git fetch artile steward
git worktree add .steward steward
bash .steward/bin/link-skills.sh .
```

Agents start from `AGENTS.md`. The skills under `skills/` are linked into `.claude/skills/` so Claude Code finds them. `steward-contribution` is adapted from the `contribution` skill Taras supplied.
