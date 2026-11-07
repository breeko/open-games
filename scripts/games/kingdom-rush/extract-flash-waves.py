"""Extract factual Pagras wave parameters from a local JPEXS script export.

No ActionScript is executed or included in the runtime. Requires the publisher's
Flash v1.13 file and its locally exported scripts; neither is committed.
"""
import argparse
import re,json,hashlib
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('scripts',type=Path,help='Local JPEXS scripts directory')
parser.add_argument('swf',type=Path,help='Publisher-served v1.13 SWF, for hash verification')
args=parser.parse_args()
expected='7b5467a3eccc17f6dd001ff2d41bdf1b03d79fd515a2a9586c42bfd982bb1e23'
if hashlib.sha256(args.swf.read_bytes()).hexdigest()!=expected:
    parser.error('SWF does not match the pinned Armor Games v1.13 reference')
p=args.scripts
s=(p/'Level3.as').read_text().split('override public function loadCampaign()')[1].split('override public function loadHeroic()')[0]
s=re.sub(r'\s+','',s)
names={'EnemyGoblin':'enemy_goblin','EnemyFatOrc':'enemy_fat_orc','EnemyWolfSmall':'enemy_wolf_small','EnemyShaman':'enemy_shaman','EnemyOgre':'enemy_ogre','':''}
groups=[]
for m in re.finditer(r'newWave\(\[(.*?)\],(\d+),(\d+)',s,re.S):
 chunks=[]
 for c in re.finditer(r'newWaveSpawn\("([^"]*)","([^"]*)",(\d+),(\d+),(\d+),(\d+),(true|false),(\d+)\)',m[1]):
  a,b,n,count,interval,gap,fixed,lane=c.groups()
  chunk=dict(interval=int(interval),max_same=int(n),fixed_sub_path=int(fixed=='true'),creep=names[a],path=int(lane)+1,interval_next=int(gap),max=int(count))
  if b:chunk['creep_aux']=names[b]
  chunks.append(chunk)
 if int(m[2])>0:groups.append(dict(interval=int(m[2]),waves=[]))
 groups[-1]['waves'].append(dict(delay=0,path_index=int(m[3])+1,spawns=chunks))
assert len(groups)==11
assert [sum(c['max'] for w in g['waves'] for c in w['spawns']) for g in groups]==[24,10,12,40,35,10,31,39,63,23,42]
out=dict(edition='Armor Games Flash v1.13',url='https://armorgames.com/play/12141/kingdom-rush',swf='https://cache.armorgames.com/files/games/kingdom-rush-12141.swf?v=1379178890',sha256='7b5467a3eccc17f6dd001ff2d41bdf1b03d79fd515a2a9586c42bfd982bb1e23',factsOnly=True,groups=groups)
(Path(__file__).resolve().parents[3]/'src/games/kingdom-rush/reference/flash-pagras.json').write_text(json.dumps(out,indent=2)+'\n')
print([sum(c['max'] for w in g['waves'] for c in w['spawns']) for g in groups])
