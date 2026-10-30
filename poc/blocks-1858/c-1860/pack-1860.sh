#!/usr/bin/env bash
# Builds foldkit from PR #1860 (commit 893ddd46d) into vendor/foldkit-1860.tgz. Run from c-1860.
set -euo pipefail
work=$(mktemp -d)
git -C "$(git rev-parse --show-toplevel)" fetch -q https://github.com/foldkit/foldkit.git 893ddd46d0cbd5529f2170a65119118a42847e03
git -C "$(git rev-parse --show-toplevel)" worktree add -q "$work" 893ddd46d0cbd5529f2170a65119118a42847e03
(cd "$work" && pnpm install --filter foldkit... --frozen-lockfile && pnpm --filter foldkit build && cd packages/foldkit && pnpm pack --pack-destination "$work/pack")
mkdir -p vendor
cp "$work"/pack/foldkit-*.tgz vendor/foldkit-1860.tgz
git -C "$(git rev-parse --show-toplevel)" worktree remove --force "$work"
