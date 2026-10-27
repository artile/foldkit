import os, shlex, subprocess, sys, time
from pathlib import Path
artifact=Path(__file__).parent
repo=Path('/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache')
os.sched_setaffinity(0,sorted(os.sched_getaffinity(0))[:2])
env=os.environ|{'RAYON_NUM_THREADS':'2','PLAYWRIGHT_CHROMIUM_EXECUTABLE':'/usr/bin/chromium','npm_config_workspace_concurrency':'1'}
commands=[
 'node --test --test-concurrency=1 scripts/example-client-dependencies.test.mjs scripts/plan-examples-e2e.test.mjs',
 'pnpm --filter @foldkit/examples-e2e typecheck',
 'pnpm --filter @foldkit/vite-plugin exec vitest run test/resolution.test.ts test/devToolsOverlay.test.ts --maxWorkers=1',
 *[f'EXAMPLE_SLUG={slug} pnpm --filter @foldkit/examples-e2e test:e2e --workers=1 --retries=0' for slug in ['api-cache-query','counter','ui-showcase','ssr','ssg']],
 *[f'pnpm -C examples/{slug} exec vite build' for slug in ['counter','api-cache-query','ui-showcase']],
 'pnpm --workspace-concurrency=1 --filter counter-example --filter api-cache-query-example --filter ui-showcase --filter ssr-example --filter ssg-example typecheck',
 "pnpm exec oxfmt --threads=2 --check examples/vite.dependencies.ts 'examples/*/vite.config.ts' scripts/example-client-dependencies.test.mjs scripts/plan-examples-e2e.mjs scripts/plan-examples-e2e.test.mjs .changeset/example-client-dependencies.md",
 'pnpm lint:ci',
 'pnpm check:dead-code',
 'pnpm typecheck:scripts',
 'pnpm check:effect-prebundle',
 'pnpm check:ui-subpath-exports',
]
start=int(sys.argv[1]) if len(sys.argv)>1 else 1
for number,command in enumerate(commands,1):
 if number<start: continue
 log=artifact/f'implementation-readiness-{number:02}.log'
 print(f'RUN {number}: {command}',flush=True)
 started=time.monotonic()
 with log.open('w') as output:
  output.write(command+'\n');output.flush()
  result=subprocess.run(command,cwd=repo,env=env,shell=True,stdout=output,stderr=subprocess.STDOUT)
 print(f'EXIT {number}: {result.returncode} ({time.monotonic()-started:.1f}s)',flush=True)
 if result.returncode: sys.exit(result.returncode)
