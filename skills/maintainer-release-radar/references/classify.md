# Classify a release range

## Installed version

The app's lockfile is at the root of its git repository: `ssh macmax git -C <app path> rev-parse --show-toplevel`. Read the version for the app's own importer, not the first match.

| Lockfile | Where the version is |
|---|---|
| `pnpm-lock.yaml` | `importers.<app path relative to root, or `.`>.(dev)dependencies.<package>.version` (strip the `(peer...)` suffix) |
| `package-lock.json` | `packages."<app path>/node_modules/<package>".version`, else `packages."node_modules/<package>".version` |
| `bun.lock` | `packages.<package>`, first element after the `@` |
| `yarn.lock` | the block whose header names `<package>@` and the range from the app's `package.json` |

Map the version to a tag: the tag that matches `release_tags`, names the package when the repo tags each package (`<package>@<version>`), and ends in that version. When no tag matches, use `npm view <package>@<version> gitHead`.

## Read the range

In the clone, between the installed tag and the new tag:

- Changelog: find it with `git ls-tree -r --name-only <new tag> | grep -E '(^|/)CHANGELOG.md$'`, take the file for the package, and read the entries above the installed version.
- Release notes: `gh release view <tag> -R <upstream>` for each tag in the range, when releases exist.
- Diff of the public surface: `git diff <installed tag> <new tag> --stat -- <package dir>`, then the full diff only for files that hold names the app imports. For a blobless clone (`clone = "blobless"`), keep to those files: each other file costs a download.

## App usage

```sh
ssh macmax git -C <app path> grep -n -E "from ['\"]<package>(/[^'\"]*)?['\"]"
```

List the imported names per file, then grep the call sites of each name. A change that touches no imported name is `other`.

## Classes

| Class | Evidence | Output |
|---|---|---|
| `unblock` | A `state/workarounds.toml` entry for this app whose `fixed_by` is in the range | The entry id and its `location` |
| `break` | A changelog entry marked breaking (`BREAKING`, a `!` commit, a major bump, or a minor bump before 1.0 that says consumers must change code), or a diff that removes, renames, or changes the signature of a name the app imports | Every call site, and the migration the changelog gives |
| `adopt` | A new export that does what local app code does: a `copy` or `cast` signal in `state/workarounds.toml`, or a helper in the app that wraps the package | The local code with `file:line`, and the new API |
| `deprecate` | `@deprecated` added in the diff, or a changelog entry that deprecates a name the app uses | The call sites |
| `other` | Nothing in the app uses what changed | One digest line |

A `break` that the app already handles (for example a guarded call) is still a `break` with its call site. Say so in the summary.
