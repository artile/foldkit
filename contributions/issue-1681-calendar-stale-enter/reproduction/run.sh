#!/usr/bin/env bash
# Usage: run.sh <worktree>. Copies the test next to the Calendar source as an
# untracked file, runs it with the @foldkit/ui Vitest config, and removes it.
set -euo pipefail
WORKTREE="${1:?worktree path}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TARGET="$WORKTREE/packages/ui/src/calendar/staleCommitKey.repro.test.ts"
cp "$HERE/staleCommitKey.test.ts" "$TARGET"
trap 'rm -f "$TARGET"' EXIT
cd "$WORKTREE/packages/ui"
pnpm exec vitest run src/calendar/staleCommitKey.repro.test.ts
