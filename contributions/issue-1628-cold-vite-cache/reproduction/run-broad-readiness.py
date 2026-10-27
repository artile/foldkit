import os, subprocess, sys, time
from pathlib import Path
artifact=Path(__file__).parent
repo=Path('/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache')
os.sched_setaffinity(0, sorted(os.sched_getaffinity(0))[:2])
env=os.environ|{'RAYON_NUM_THREADS':'2','PLAYWRIGHT_CHROMIUM_EXECUTABLE':'/usr/bin/chromium','npm_config_workspace_concurrency':'1'}
commands=[
 'pnpm format --threads=2',
 'pnpm format:check --threads=2',
 'pnpm check:no-claude-comments',
 'pnpm check:commit-message-line-length',
 'pnpm check:changeset-unwrapped',
 'pnpm check:skill-version',
 'pnpm check:no-major-changesets',
 'pnpm check:changeset-ignore',
 'pnpm changeset status --since=upstream/main',
 'pnpm lint',
 'node --test --test-concurrency=1 "scripts/**/*.test.mjs"',
 'pnpm check:circular-deps',
 'pnpm -r --workspace-concurrency=1 --if-present build',
 'pnpm -r --workspace-concurrency=1 --if-present typecheck',
 "pnpm -r --workspace-concurrency=1 --filter './examples/*' --filter './packages/*' run --if-present test --maxWorkers=1",
 'pnpm --filter website exec playwright test --workers=1 --retries=0',
]
start=int(sys.argv[1]) if len(sys.argv)>1 else 1
for number,command in enumerate(commands,1):
 if number<start: continue
 log=artifact/f'implementation-broad-{number:02}.log'
 print(f'RUN {number}: {command}',flush=True)
 started=time.monotonic()
 with log.open('w') as output:
  output.write(command+'\n');output.flush()
  result=subprocess.run(command,cwd=repo,env=env,shell=True,stdout=output,stderr=subprocess.STDOUT)
 print(f'EXIT {number}: {result.returncode} ({time.monotonic()-started:.1f}s)',flush=True)
 if result.returncode: sys.exit(result.returncode)
