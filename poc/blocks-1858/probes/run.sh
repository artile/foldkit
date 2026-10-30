#!/usr/bin/env bash
# Runs each type probe and prints the first errors. Run from poc/blocks-1858.
set -u
root=$(pwd)
tsc="$root/node_modules/.bin/tsc"

echo "### b-missing.ts (missing child Layer, missing service)"
"$tsc" -p tsconfig.probe.json 2>&1 | grep "error TS" | cut -c1-240

for file in b-spread-on.ts b-parent-on.ts; do
  echo "### $file"
  "$tsc" --ignoreConfig --noEmit --strict "probes/$file" 2>&1 | cut -c1-240
done

for patch in probes/a-*.patch; do
  echo "### $patch"
  work=$(mktemp -d)
  cp -R domain a-preview tsconfig.a.json tsconfig.json "$work/"
  ln -s "$root/node_modules" "$work/node_modules"
  (cd "$work" && patch -s -p1 < "$root/$patch" && "$tsc" -p tsconfig.a.json 2>&1 | grep "error TS" | cut -c1-240)
  rm -rf "$work"
done
