#!/usr/bin/env bash
# Usage: reproduction/run.sh <effect-version>
# Installs @foldkit/vite-plugin 0.28.0, foldkit 0.169.0, vite 8.3.2 and the given
# effect in a temp dir, starts a dev server, and exits 0 only when the DevTools
# MCP relay logs "MCP relay listening at".
# Observed on 21-10-2026 (upstream/main 7ee214268):
#   4.0.0, 4.0.2 -> "relay started", exit 0
#   4.0.3, 4.0.4, 4.0.5 -> "relay did NOT start", exit 1, nothing on stderr
# Direct check on effect 4.0.4: relayId dies with
#   TypeError: yield* (intermediate value) is not iterable
set -euo pipefail
version="${1:?effect version}"
here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d)"
cat > "$work/package.json" <<JSON
{
  "name": "relay-repro",
  "private": true,
  "type": "module",
  "dependencies": {
    "@foldkit/vite-plugin": "0.28.0",
    "foldkit": "0.169.0",
    "vite": "8.3.2",
    "effect": "$version"
  },
  "overrides": { "effect": "$version" }
}
JSON
cp "$here/repro.mjs" "$work/"
(cd "$work" && npm install --silent --no-audit --no-fund --legacy-peer-deps >/dev/null)
cd "$work" && node repro.mjs
