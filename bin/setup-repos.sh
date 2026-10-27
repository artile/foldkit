#!/usr/bin/env bash
# Clone every registry repo (repos/*.toml) that is missing on this host, add its
# remotes, and create its worktrees directory. Safe to run again: existing clones
# keep their remotes and URLs; only missing remotes are added. Never pushes and
# never creates forks.
# Usage: setup-repos.sh [--dry-run] [repos dir]   (default: repos/ beside bin/)
set -euo pipefail

dry_run=0
if [ "${1:-}" = "--dry-run" ]; then
  dry_run=1
  shift
fi

maintainer_dir="$(cd "$(dirname "$0")/.." && pwd)"
repos_dir="${1:-$maintainer_dir/repos}"

run() {
  if [ "$dry_run" = 1 ]; then
    printf '+ %s\n' "$*"
  else
    "$@"
  fi
}

github_url() {
  printf 'https://github.com/%s.git' "$1"
}

ensure_remote() {
  local path="$1" remote="$2" repo="$3" current
  if [ "$dry_run" = 1 ] && [ ! -d "$path" ]; then
    printf '+ git -C %s remote add %s %s\n' "$path" "$remote" "$(github_url "$repo")"
  elif current="$(git -C "$path" remote get-url "$remote" 2>/dev/null)"; then
    if [ "$current" != "$(github_url "$repo")" ]; then
      echo "note: $path remote $remote is $current, expected $(github_url "$repo"); left as is"
    fi
  else
    run git -C "$path" remote add "$remote" "$(github_url "$repo")"
  fi
}

check_fork() {
  local fork="$1" upstream="$2"
  if [ "$dry_run" = 1 ]; then
    echo "+ check that $fork exists on GitHub"
  elif ! command -v gh >/dev/null 2>&1; then
    echo "note: gh not found; cannot check that $fork exists"
  elif ! gh repo view "$fork" --json name >/dev/null 2>&1; then
    echo "action: $fork does not exist on GitHub; run: gh repo fork $upstream --clone=false"
  fi
}

shopt -s nullglob
files=("$repos_dir"/*.toml)
if [ "${#files[@]}" = 0 ]; then
  echo "no registry files in $repos_dir" >&2
  exit 1
fi

# One line per file: name, upstream, fork, path, clone, mode, split by the unit
# separator (a tab would merge an empty field with its neighbor).
python3 -I -c '
import sys, tomllib
for file in sys.argv[1:]:
    with open(file, "rb") as handle:
        repo = tomllib.load(handle)
    fields = [repo.get(key, "") for key in ("name", "upstream", "fork", "path", "clone", "mode")]
    if not (fields[0] and fields[1] and fields[3]):
        sys.exit(f"{file}: name, upstream, and path are required")
    print("\x1f".join(fields))
' "${files[@]}" |
while IFS=$'\x1f' read -r name upstream fork path clone mode; do
  echo "== $name ($upstream)"

  # A curate repo belongs to Taras: its remote is origin and it has no worktrees.
  upstream_remote=upstream
  if [ "$mode" = curate ]; then
    upstream_remote=origin
  fi

  cloned=0
  if [ -e "$path" ]; then
    if git -C "$path" rev-parse --git-dir >/dev/null 2>&1; then
      echo "exists: $path"
    else
      echo "skip: $path exists and is not a git repository"
      continue
    fi
  else
    case "$clone" in
      blobless) filter=(--filter=blob:none) ;;
      full | "") filter=() ;;
      *)
        echo "skip: unknown clone = \"$clone\" in $name.toml"
        continue
        ;;
    esac
    run mkdir -p "$(dirname "$path")"
    run git clone ${filter[@]+"${filter[@]}"} --origin "$upstream_remote" "$(github_url "$upstream")" "$path"
    cloned=1
  fi

  if [ "$cloned" = 0 ]; then
    ensure_remote "$path" "$upstream_remote" "$upstream"
  fi
  if [ -n "$fork" ]; then
    ensure_remote "$path" "${fork%%/*}" "$fork"
    check_fork "$fork" "$upstream"
  fi

  worktrees="$(dirname "$path")/$name-worktrees"
  if [ "$mode" != curate ] && [ ! -d "$worktrees" ]; then
    run mkdir -p "$worktrees"
  fi
done
