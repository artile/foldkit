# Signals

A signal is a line in a web app that shows the app works around a registry package. The registry packages are the union of `packages` in every `repos/*.toml`. Read each app at its committed `HEAD` with `git grep -n`, so build output and `node_modules` stay out. The apps are local, so run each command against the app path directly.

| Kind | Find it | Counts when |
|---|---|---|
| `patch` | `ls <app>/patches/` and `pnpm.patchedDependencies` in `package.json` | The patched package is a registry package. Location: the patch file, and the hunk that changes behavior |
| `cast` | `git grep -n -E 'as any\|as unknown as\|@ts-expect-error\|@ts-ignore'` | The same line, or the line after a `@ts-*` comment, uses a name imported from a registry package |
| `copy` | Files whose header or name says "copied from", "vendored", "fork of", or a local module with the same exports as a registry module | It copies or wraps upstream code instead of importing it |
| `comment` | `git grep -n -i -E 'hack\|workaround\|fixme'` | The comment names a registry package or an API of one |
| `pin` | `package.json` versions with `=`, an exact version where siblings use `^`, `overrides`, `resolutions`, `pnpm.overrides`, and commits that revert an upgrade (`git log -i --grep=revert --grep=downgrade -- package.json`) | The pinned package is a registry package and a newer release exists |
| `friction` | `<app>/friction.toml`, format in `friction-log.md` | Every entry with a registry `package` |

For each signal record: app, `file:line`, kind, package, the matched text (one line, used to find the signal again when lines move), and the installed version of the package from the app's lockfile.

The app's lockfile is at the root of its git repository (`git -C <app path> rev-parse --show-toplevel`), which for a workspace app is above the app path. Read the version for the app's own importer, not the first match in the file.

A cast or comment that does not name a registry package is noise. Skip it without an entry.
