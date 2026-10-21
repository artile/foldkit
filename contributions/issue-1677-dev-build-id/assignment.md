# Assignment — issue-1677-dev-build-id

- **Base:** `foldkit/foldkit` `upstream/main` @ `7ee214268c602967937b80f6f20d1e831f2e8ab6`
- **Branch:** `issue-1677-dev-build-id`
- **Target branch:** `main` of `foldkit/foldkit`, from the `artile/foldkit` fork
- **Analysis:** https://github.com/foldkit/foldkit/issues/1677#issuecomment-6318984226

## Goal

Fix issue #1677. When the Vite dev server restarts and the browser reloads normally, `Runtime.hydrate` must hydrate the page that the running dev server rendered. At present the browser keeps `foldkit/dist/buildToken.js?v=<browserHash>` in its `immutable` cache, so the client carries the build id of an earlier dev server session and refuses the page. This occurs for the generated per-session id and also for an explicit `buildId` or `FOLDKIT_BUILD_ID` that changes between restarts. In serve mode, the plugin must send the build id to the client through a module that Vite revalidates on each load, and not as a literal in the framework module. The scope is serve mode of `@foldkit/vite-plugin` only.

## Verification

| # | Given | When | Then |
|---|---|---|---|
| V1 | An aggregate `foldkit({ ssr: { serverEntry, clientEntry } })` dev server with no configured id, and `foldkit` served from `node_modules` | The dev server restarts and the browser reloads normally with its cache intact | The page hydrates and the body has no `data-foldkit-refused` (reproduction, `default` mode) |
| V2 | The same app with `FOLDKIT_BUILD_ID=release-<session>`, a different value in each session | The dev server restarts and the browser reloads normally | The page hydrates (reproduction, `explicit-per-session` mode) |
| V3 | Two aggregate dev servers started one after the other on the same root with no configured id | The client environment transforms Foldkit's `buildToken.js` in each server | The transformed code is identical in both servers and contains neither server's id. This is the content a browser reuses from its immutable cache. New test in `test/ssr.test.ts` |
| V4 | One aggregate dev server | The client requests `/@id/__x00__virtual:foldkit/development-build-id` over HTTP | The response is 200 with `Cache-Control: no-cache`, it has no `immutable`, and its body exports the id stamped in `data-foldkit-build` on `/`. New test in `test/ssr.test.ts` |
| V5 | A dev server whose server environment is `ssr` with discovery, or a named server environment with or without `noExternal` | The server renders and the client resolves its build id | The client id that resolves through the virtual module equals the server's `injectedBuildId`. Update `expectClientBuildId` in `test/resolution.test.ts` |

| # | Invariant | Observed by |
|---|---|---|
| I1 | Each aggregate dev server has its own opaque UUID, and two dev servers get different ids (documented in `packages/website/src/page/core/serverRendering.md` "Development build ids") | `compiles one fresh identity into Foldkit for each aggregate dev server` in `test/ssr.test.ts`, with `automaticIdentityFrom` updated to read the client id through the virtual module |
| I2 | A configured `buildId` or `FOLDKIT_BUILD_ID` takes priority in serve and build | `test/buildToken.test.ts` `buildIdForCommand` cases; `compiles a configured build id when used as a standalone plugin` in `test/ssr.test.ts` |
| I3 | `vite build` output inlines the build id literal and has no import of `virtual:foldkit/development-build-id` | `test/build.test.ts` and `test/buildToken.test.ts` build cases, which pass unchanged. Add an assertion that built client and server output does not contain `development-build-id` |
| I4 | A Foldkit copy that the transform never touched has `injectedBuildId === undefined` and fails with `MissingBuildId` | Existing hydration and server tests in `packages/foldkit` (untouched) |
| I5 | The `import.meta.env.FOLDKIT_BUILD_ID` define values from the `config` hooks do not change | `test/buildToken.test.ts`, `test/ssr.test.ts` (`data-foldkit-build="development"` for the standalone `foldkitSsr`) |
| I6 | Server-side dev rendering in every environment (`ssr` runner, named and discovery environments) gets the same id as the client | `test/resolution.test.ts` `Foldkit packages in every environment` |

- **Reproduction:** `reproduction/` in the artifact directory (`run.sh`, `repro.mjs`, `app/`, observed output in `result.txt`)
- **Command:** `pnpm --filter foldkit build && pnpm --filter @foldkit/vite-plugin build`, then `bash /Users/tao/Tools/foldkit/.steward/contributions/issue-1677-dev-build-id/reproduction/run.sh <worktree> default`. Repeat with `explicit-per-session` and `fixed` against the installed app (`node repro.mjs <scratch app> <mode>`). Each mode must print `PASSED` and exit 0. On the base, `default` and `explicit-per-session` exit 1. The script refuses to run when port 5179 is taken, and it kills the Vite process group.
- **Test placement:** Vitest in `packages/vite-plugin-foldkit/test/` (`pnpm --filter @foldkit/vite-plugin test`). V3, V4 and I1 go in `ssr.test.ts` and reuse `startAutomaticIdentityServer`, `automaticIdentityFrom` and `FOLDKIT_BUILD_TOKEN_URL`. V5 goes in `resolution.test.ts` (`expectClientBuildId`, `renderServerEntry`). I3 goes in `build.test.ts` or `buildToken.test.ts`. The browser reproduction stays out of the repository.

## Specification

Only `packages/vite-plugin-foldkit/src/buildToken.ts` changes in source:

1. Add module-level constants: `DEVELOPMENT_BUILD_ID_MODULE_ID = 'virtual:foldkit/development-build-id'` (this follows `virtual:foldkit/fetch` and `virtual:foldkit/client` in `build.ts`), its resolved form `` `\0${DEVELOPMENT_BUILD_ID_MODULE_ID}` ``, and the import binding name `__foldkitDevelopmentBuildId`.
2. In `transformBuildIdentity`, when `config.command === 'serve'`, replace every `foldkitBuildIdPlaceholder()` with the binding instead of the literal. When at least one replacement was made, prepend `import { buildId as __foldkitDevelopmentBuildId } from 'virtual:foldkit/development-build-id';` with MagicString `prepend`, so the source map stays valid. When `config.command === 'build'`, keep the present literal replacement byte for byte.
3. In the `foldkit:build-token` plugin, add `resolveId` (map `DEVELOPMENT_BUILD_ID_MODULE_ID` to its resolved id, otherwise `undefined`) and `load` (for the resolved id only, return `export const buildId = <JSON literal or undefined>` from `buildIdForConfig(this.environment.getTopLevelConfig(), configuredBuildId)`). Thus every environment of one dev server reads the one id held in `developmentBuildIds`. Do not change `buildIdForConfig`, `developmentBuildIds`, `buildIdForCommand`, the `config` hooks, or the build session logic.
4. Update the comment block at the top of `buildToken.ts` so that it describes the serve path. Add a `// NOTE:` at the serve branch for the browser quirk: Vite serves `node_modules` files with `?v=<browserHash>` and `immutable`, the hash does not depend on the id, and a virtual module is served with `no-cache` and an ETag. No other new comments.
5. Tests: change `automaticIdentityFrom` (`ssr.test.ts`) and `expectClientBuildId` (`resolution.test.ts`) so that they get the client id from `client.transformRequest('\0virtual:foldkit/development-build-id')` (or from the HTTP `/@id/__x00__virtual:foldkit/development-build-id`). Each must also assert that the transformed `buildToken.js` imports that module. Add V3, V4 and I3 as specified. Replace the old literal assertions. Do not invert them.
6. Docs: the existing statements stay true (`packages/vite-plugin-foldkit/README.md` line 192, `serverRendering.md` "Development build ids"). Do not edit either unless the wording becomes inaccurate.

## Compatibility

There is no public API change: no new option, export, or type. Observable change in serve mode only: Foldkit's `buildToken.js` imports a plugin virtual module, so the dev client makes one more small request, and a dev server restart no longer causes a hydration refusal. Build output does not change. Version impact: `patch` for `@foldkit/vite-plugin` (bug fix, surface unchanged). The `foldkit` package does not change.

## Boundaries

- Do not change the `import.meta.env.FOLDKIT_BUILD_ID` define, whose serve value `"development"` differs from the injected dev UUID. That is a separate candidate and not part of this contribution.
- No change to `packages/foldkit/src/buildToken.ts`. Open PR #1750 edits that file for an unrelated export.
- Do not change optimizeDeps, noExternal, or the environment handling from #1591.
- Do not use a fixed `'development'` default id in serve mode, change `browserHash`, or override headers with middleware. These alternatives were rejected in analysis.
- No change to create-foldkit-app templates, examples, or the website, apart from the docs check in Specification step 6.

## Completion

- Add a changeset: `patch` for `@foldkit/vite-plugin`, file name descriptive (for example `.changeset/dev-build-id-revalidation.md`). Write it as release notes: what failed (refusal after a dev server restart until a hard reload, also with a changing explicit id), what the plugin now does, what stays the same (per-session ids, build output). Do not hard-wrap. Do not use em dashes. Thank the reporter, `@drobson03`, at the end.
- Conventional Commit subject with the `vite-plugin` scope, for example `fix(vite-plugin): revalidate the development build id after a dev server restart`. Author `Taras Kornichuk <dread9ko@gmail.com>`. No AI mention or co-author trailer.
- The pull request body leads with the consumer impact (P1: SSR apps installed from npm cannot hydrate after a dev server restart) and includes `Closes #1677`. No AI attribution in the title or description.
- Run `pnpm --filter @foldkit/vite-plugin test`, plus typecheck and lint for the package, and the reproduction in all three modes.
- Where they conflict, the repository's `AGENTS.md` and `CONTRIBUTING.md` prevail over this assignment on form. `.steward/AGENTS.md` prevails on workflow (remote `artile`, author identity).

## Risks

- Critical: build output must not gain the virtual import. A production client that imports `virtual:foldkit/development-build-id` would break, or would inline a dev id.
- Critical: every environment of one dev server must resolve the same id: the client, the `ssr` runner, named environments, and non-runnable or worker environments. A mismatch brings back the refusal on every load.
- Critical: the new tests must fail on the base. Check V3 and V4 against the base before you report.
- The transformed `buildToken.js` content must not depend on the per-session id. Otherwise the immutable cache gives a stale id again.
- The source map must stay valid after `prepend`.
- Any gate that starts a dev server must refuse a port that is already taken and must close the server. Use `onTestFinished` as the existing helpers do.
