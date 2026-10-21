#!/usr/bin/env bash
# Link Foldkit Steward skills and rules into a checkout of foldkit/foldkit.
# Usage: link-skills.sh [checkout]   (default: current directory)
set -euo pipefail

steward_dir="$(cd "$(dirname "$0")/.." && pwd)"
checkout="$(cd "${1:-.}" && pwd)"

mkdir -p "$checkout/.claude/skills"
for skill in "$steward_dir"/skills/*/; do
  name="$(basename "$skill")"
  ln -sfn "${skill%/}" "$checkout/.claude/skills/$name"
done

printf '@%s/AGENTS.md\n' "$steward_dir" > "$checkout/CLAUDE.local.md"

exclude="$(git -C "$checkout" rev-parse --path-format=absolute --git-common-dir)/info/exclude"
for pattern in '/.steward/' '/.claude/skills/steward-*' '/CLAUDE.local.md'; do
  grep -qxF "$pattern" "$exclude" || printf '%s\n' "$pattern" >> "$exclude"
done

echo "linked $(ls -d "$steward_dir"/skills/*/ | wc -l | tr -d ' ') skills into $checkout"
