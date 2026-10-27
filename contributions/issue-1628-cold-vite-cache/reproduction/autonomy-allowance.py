import os, re, sys, tomllib
from pathlib import Path
from datetime import datetime, timezone
root=Path('/home/om/TAO/Tools/foldkit/.maintainer')
action,key=sys.argv[1:]
assert action in ('reserve','refund','check') and key in ('pushes','pull_requests_opened')
lock=root/'.state-lock'
lock.mkdir()
try:
 (lock/'owner').write_text('thread:delegated-task:command%3Amcp%3A0ee74966-d70b-45d6-bf18-b65ddfac8f16%3Adelegate-task%3Aclaim-352aabb3-implementation-1628-finalgate\n'+datetime.now(timezone.utc).isoformat()+'\n')
 path=root/'state/autonomy.toml'
 text=path.read_text();data=tomllib.loads(text)
 assert data['mode']=='autonomous' and not data['paused'], 'Autonomy write gate unavailable'
 prefix,counts_text=text.split('[counts]',1)
 today=datetime.now(timezone.utc).date().isoformat()
 if data['counts']['day']!=today:
  counts_text=re.sub(r'day = "[^"]+"',f'day = "{today}"',counts_text)
  for count_key in data['counts']:
   if count_key!='day': counts_text=re.sub(rf'(?m)^{re.escape(count_key)} = \d+',f'{count_key} = 0',counts_text)
  data['counts']={count_key:0 for count_key in data['counts'] if count_key!='day'}|{'day':today}
 if action=='reserve':
  assert data['counts'][key]<data['limits'][key], f'Daily {key} limit reached'
  next_count=data['counts'][key]+1
 elif action=='refund':
  assert data['counts'][key]>0
  next_count=data['counts'][key]-1
 else: next_count=data['counts'][key]
 counts_text=re.sub(rf'(?m)^{re.escape(key)} = \d+',f'{key} = {next_count}',counts_text)
 next_text=prefix+'[counts]'+counts_text
 if next_text!=text:
  temporary=path.with_suffix('.toml.implementation-tmp');temporary.write_text(next_text);os.replace(temporary,path)
 print(f'{action}: {key}={next_count}/{data["limits"][key]} on {today}; autonomous/unpaused')
finally:
 (lock/'owner').unlink(missing_ok=True);lock.rmdir()
