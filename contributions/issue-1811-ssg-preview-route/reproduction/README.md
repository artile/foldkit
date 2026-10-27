# SSG preview initial HTML reproduction

Pinned upstream/main: `b702a5efbb74bebc056b798b414ddb923a82fbd5`.

From the contribution worktree, after its existing dependency installation:

```sh
pnpm --filter foldkit --filter @foldkit/vite-plugin --filter create-foldkit-app build
node /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1811-ssg-preview-route/reproduction/reproduce.mjs "$PWD"
```

Observed exit status: **1**, from the assertion:

```text
GET /about must serve About HTML or redirect to /about/; received Home HTML
```

The probe calls the checkout's built `createProject` helper with `Scaffold.Ssg()` and pnpm. It supplies the checkout's installed SSG dependencies through a node_modules symlink, using the freshly built Foldkit and Vite plugin distributions. It executes the generated, unchanged `pnpm build` and `pnpm preview --host 127.0.0.1 --port <available-port> --strictPort` scripts. It does not use source aliases or install the canary named in the issue. This isolates the current templates and package implementation; it does not test the CLI's registry installation step.

The temporary generated project lives under this directory while the probe runs and is removed in its finalizer. The preview process group is terminated and awaited before removal. Exit 143 in `preview.log` records that intentional shutdown. `package-build.log` records the prerequisite builds; `scaffold-build.log` records successful client/server builds and generation of both routes.

The completed run used Linux arm64, Node 22.22.3, pnpm 11.8.0, Vite 8.3.1, Effect 4.0.0, Foldkit 0.169.0, and @foldkit/vite-plugin 0.28.0. `environment.json` records the commit and resolved dependency manifests.

Observed responses, without JavaScript:

- `GET /`: 200, Home title and heading.
- `GET /about`: 200, Home title and heading. This is the failing assertion.
- `GET /about/`: 200, About title and heading.
- `GET /about/index.html`: 200, About title and heading.
- `GET /about?source=probe`: 200, Home title and heading.
- `GET /about/?source=probe`: 200, About title and heading.
- `GET /missing` and `GET /about.html`: 200, Home title and heading. These are observations of the existing fallback, not assertions of desired behavior.
- `HEAD /about`: 200 with an empty body. This alone cannot identify which document was selected.

`observed.json` contains response summaries. The sibling HTML files contain raw response bodies. `generated-html/` contains the two build outputs, so the About control can be compared with the document actually generated. `probe.log` contains all GET summaries and the assertion failure. The probe first asserts the Home, trailing-slash About, and explicit-index About controls; all passed before the route assertion failed.

Expected behavior follows the generated server entry's declared `/about` prerender path, the generated navigation's `/about` URL, and the documented SSG build/preview workflow. `/about` must return its generated About document or redirect to `/about/` and serve that document. The probe permits either resolution.

Browser hydration, deployed static hosts, Windows, custom Vite bases/output directories, and historical commits were not executed by this reproduction.
