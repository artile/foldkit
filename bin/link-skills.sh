#!/usr/bin/env bash
# Link Foldkit Steward skills and rules into a checkout of foldkit/foldkit.
# Usage: link-skills.sh [checkout]   (default: current directory)
set -euo pipefail

steward_dir="$(cd "$(dirname "$0")/.." && pwd)"
checkout="$(cd "${1:-.}" && pwd)"

for skills_dir in "$checkout/.claude/skills" "$checkout/.agents/skills"; do
  mkdir -p "$skills_dir"
  find "$skills_dir" -maxdepth 1 -name 'steward-*' -type l -delete
  for skill in "$steward_dir"/skills/*/; do
    ln -sfn "${skill%/}" "$skills_dir/$(basename "$skill")"
  done
done

printf '@%s/AGENTS.md\n' "$steward_dir" > "$checkout/CLAUDE.local.md"

exclude="$(git -C "$checkout" rev-parse --path-format=absolute --git-common-dir)/info/exclude"
mkdir -p "$(dirname "$exclude")"
for pattern in '/.steward/' '/.claude/skills/steward-*' '/.agents/skills/steward-*' '/CLAUDE.local.md'; do
  grep -qxF "$pattern" "$exclude" || printf '%s\n' "$pattern" >> "$exclude"
done

echo "linked $(ls -d "$steward_dir"/skills/*/ | wc -l | tr -d ' ') skills into $checkout"
