import os, signal, socket, subprocess, time
from pathlib import Path
artifact=Path(__file__).parent
repo=Path('/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache')
command=['pnpm','--filter','@foldkit/examples-e2e','exec','playwright','test','--config',str(artifact/'local-diagnostic.config.ts')]
env=os.environ|{'RAYON_NUM_THREADS':'2','DEBUG':'vite:deps','EXAMPLE_CACHE_MODE':'warm','REPRO_OUTPUT_DIR':str(artifact/'implementation-ownership2-occupied-results')}
def is_open():
 try:
  with socket.create_connection(('localhost',5180),timeout=.1): return True
 except OSError: return False
def wait_for(predicate):
 for _ in range(100):
  if predicate(): return
  time.sleep(.1)
 raise AssertionError('Timed out waiting for owned server state')
assert not is_open()
with (artifact/'implementation-ownership2-owned-http.log').open('w') as output:
 owned=subprocess.Popen(['python','-m','http.server','5180','--bind','127.0.0.1'],stdout=output,stderr=subprocess.STDOUT,start_new_session=True)
 try:
  wait_for(is_open)
  result=subprocess.run(command,cwd=repo,env=env,capture_output=True,text=True,timeout=30)
  (artifact/'implementation-ownership2-occupied.log').write_text(result.stdout+result.stderr)
  assert result.returncode!=0
  assert 'already used' in result.stdout+result.stderr
  assert owned.poll() is None
 finally:
  os.killpg(owned.pid,signal.SIGTERM); owned.wait(timeout=10)
wait_for(lambda:not is_open())
print('Occupied port: refused without replacing owned server; owned server stopped')
env['EXAMPLE_CACHE_MODE']='cold'
env['REPRO_OUTPUT_DIR']=str(artifact/'implementation-ownership2-interrupted-results')
with (artifact/'implementation-ownership2-interrupted.log').open('w') as output:
 invocation=subprocess.Popen(command,cwd=repo,env=env,stdout=output,stderr=subprocess.STDOUT,start_new_session=True)
 try:
  wait_for(is_open)
 finally:
  if invocation.poll() is None: os.killpg(invocation.pid,signal.SIGINT)
  invocation.wait(timeout=15)
 wait_for(lambda:not is_open())
 assert invocation.returncode!=0
print('Interrupted diagnostic: invocation exited and port released')
env['REPRO_OUTPUT_DIR']=str(artifact/'implementation-ownership2-post-teardown-results')
with (artifact/'implementation-ownership2-post-teardown.log').open('w') as output:
 result=subprocess.run(command,cwd=repo,env=env,stdout=output,stderr=subprocess.STDOUT,timeout=60)
assert result.returncode==0
wait_for(lambda:not is_open())
print('Fresh diagnostic after teardown: bound successfully, 3/3 passed, port released')
