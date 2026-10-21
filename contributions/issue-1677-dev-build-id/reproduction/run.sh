#!/usr/bin/env bash
# Usage: bash run.sh <foldkit worktree, already built> [default|fixed|explicit-per-session]
# Packs foldkit and @foldkit/vite-plugin from the worktree, installs them from
# the tarballs (not a workspace link, so Vite serves foldkit from node_modules
# with its immutable cache headers), and runs repro.mjs.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
worktree="$(cd "$1" && pwd)"
scratch="$(mktemp -d /tmp/fk1677-run-XXXXXX)"
mkdir -p "$scratch/tarballs"
(cd "$worktree" && pnpm --filter foldkit pack --pack-destination "$scratch/tarballs" >/dev/null)
(cd "$worktree" && pnpm --filter @foldkit/vite-plugin pack --pack-destination "$scratch/tarballs" >/dev/null)
mv "$scratch"/tarballs/foldkit-0*.tgz "$scratch/tarballs/foldkit.tgz"
mv "$scratch"/tarballs/foldkit-vite-plugin-*.tgz "$scratch/tarballs/foldkit-vite-plugin.tgz"
cp -R "$here/app" "$scratch/app"
(cd "$scratch/app" && npm install --no-audit --no-fund --silent)
node "$here/repro.mjs" "$scratch/app" "${2:-default}"
