#!/usr/bin/env bash
# Applies each probe patch to a copy of the app and prints the type errors. Run from c-1860.
set -u
root=$(pwd)
for patch in probes/*.patch; do
  echo "### $patch"
  work=$(mktemp -d)
  cp -R app domain tsconfig.json "$work/"
  ln -s "$root/node_modules" "$work/node_modules"
  (cd "$work" && patch -s -p1 < "$root/$patch" && ./node_modules/.bin/tsc -p tsconfig.json 2>&1 | grep -A2 "error TS" | cut -c1-260)
  rm -rf "$work"
done
