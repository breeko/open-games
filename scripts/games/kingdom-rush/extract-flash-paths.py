"""Extract numeric opening-map paths/sites from a local publisher Flash export.

No ActionScript is copied or executed. Input SHA pins the original v1.13 SWF.
"""
import argparse,hashlib,json,re
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('scripts',type=Path);p.add_argument('swf',type=Path);args=p.parse_args()
sha=hashlib.sha256(args.swf.read_bytes()).hexdigest()
assert sha=='7b5467a3eccc17f6dd001ff2d41bdf1b03d79fd515a2a9586c42bfd982bb1e23'
levels={}
for number in [1,2]:
    text=(args.scripts/f'Level{number}.as').read_text()
    a=text.index('var _loc4_:Array = ')+len('var _loc4_:Array = ')
    roads=json.loads(re.sub(r'new Point\(([^,]+),([^\)]+)\)',r'{"x":\1,"y":\2}',text[a:text.index(';',a)]))
    point=lambda x,y:dict(x=round(float(x)*1.28+62.4,6),y=round(float(y)*1.28,6))
    holders=[dict(id=i+1,pos=point(x,y),rally=point(rx,ry)) for i,(x,y,rx,ry) in enumerate(re.findall(r'new TowerHolder\(([^,]+),([^,]+),new Point\(([^,]+),([^\)]+)\)\)',text[:a]))]
    paths=[dict(lanes=[[point(p['x'],p['y']) for p in lane] for lane in road],start=0,end=len(road[0])-7,activeStart=10,activeEnd=len(road[0])-11) for road in roads]
    levels[str(number)]=dict(holders=holders,paths=paths)
out=dict(edition='Armor Games Flash v1.13',sha256=sha,factsOnly=True,scale=1.28,offsetX=62.4,levels=levels)
(Path(__file__).resolve().parents[3]/'src/games/kingdom-rush/reference/flash-opening-paths.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print({n:[len(r['lanes'][0]) for r in data['paths']] for n,data in levels.items()})
