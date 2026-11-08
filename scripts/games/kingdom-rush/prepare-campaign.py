"""Prepare campaign maps using pinned data/art and local original Flash facts.

Run with a local JPEXS scripts directory and publisher SWF. Downloads are literal
visual/data files only; no downloaded game code is executed.
"""
import argparse,importlib.util,json,re,hashlib,concurrent.futures
from pathlib import Path
from PIL import Image
spec=importlib.util.spec_from_file_location('reference',Path(__file__).with_name('prepare-reference.py'))
ref=importlib.util.module_from_spec(spec);spec.loader.exec_module(ref)
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('scripts',type=Path);parser.add_argument('swf',type=Path)
parser.add_argument('--levels',type=int,nargs='+',default=[1,2],choices=[1,2,4])
args=parser.parse_args()
sha=hashlib.sha256(args.swf.read_bytes()).hexdigest()
assert sha=='7b5467a3eccc17f6dd001ff2d41bdf1b03d79fd515a2a9586c42bfd982bb1e23'
names={'EnemyGoblin':'enemy_goblin','EnemyFatOrc':'enemy_fat_orc','EnemyWolfSmall':'enemy_wolf_small','EnemyShaman':'enemy_shaman','EnemyOgre':'enemy_ogre','EnemyBandit':'enemy_bandit','EnemyBrigand':'enemy_brigand'}
for number in args.levels:
    title={1:'Southport',2:'The Farmlands',4:'Twin Rivers Pass'}[number]
    stage=f'level{number:02d}'
    items=[(ref.ORIGINAL,f'kr1/data/levels/{stage}_{suffix}.lua') for suffix in ['data','paths']]
    items += [(ref.VISUAL,f'data/{stage}/{name}.json') for name in ['definition','atlas','animations']]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: fetched=list(pool.map(ref.download,items))
    original=ref.CACHE/'DanQZ/kr1/data/levels'
    layout=ref.LuaTable((original/f'{stage}_data.lua').read_text()).read()
    paths=ref.LuaTable((original/f'{stage}_paths.lua').read_text()).read()
    web=ref.CACHE/'wicked-knife/data'/stage
    definition=json.loads((web/'definition.json').read_text());atlas=json.loads((web/'atlas.json').read_text())
    sheet_names=sorted(set(frame['sheet'] for frame in atlas['frames'].values()))
    fetched += list(map(ref.download,[(ref.VISUAL,f'data/{stage}/{name}') for name in sheet_names]))
    sheets={name:Image.open(web/name).convert('RGBA') for name in sheet_names}
    flash=(args.scripts/f'Level{number}.as').read_text().split('override public function loadCampaign()')[1].split('override public function loadHeroic()')[0]
    flash=re.sub(r'\s+','',flash);groups=[]
    for match in re.finditer(r'newWave\(\[(.*?)\],(\d+),(\d+)',flash):
        chunks=[]
        for c in re.finditer(r'newWaveSpawn\("([^"]*)","([^"]*)",(\d+),(\d+),(\d+),(\d+),(true|false),(\d+)\)',match[1]):
            a,b,n,count,interval,gap,fixed,lane=c.groups()
            chunk=dict(interval=int(interval),max_same=int(n),fixed_sub_path=int(fixed=='true'),creep=names[a],path=int(lane)+1,interval_next=int(gap),max=int(count))
            if b:chunk['creep_aux']=names[b]
            chunks.append(chunk)
        if int(match[2])>0:groups.append(dict(interval=int(match[2]),waves=[]))
        groups[-1]['waves'].append(dict(delay=0,path_index=int(match[3])+1,spawns=chunks))
    point=lambda p:dict(x=p['x'],y=768-p['y'])
    exits=[point(e['pos']) for e in layout['entities_list'] if e['template']=='decal_defend_point']
    converted=[]
    for route in paths['paths']:
        lanes=[[point(p) for p in lane] for lane in route];center=lanes[0]
        first=next(i for i,p in enumerate(center) if 0<=p['x']<=1024 and 0<=p['y']<=768)
        goal=min(range(len(center)),key=lambda i:min((center[i]['x']-e['x'])**2+(center[i]['y']-e['y'])**2 for e in exits))
        converted.append(dict(lanes=lanes,start=max(0,first-10),end=goal))
    holders=[dict(id=int(e['tower.holder_id']),pos=point(e['pos']),rally=point(e['tower.default_rally_pos'])) for e in layout['entities_list'] if 'tower.holder_id' in e]
    level=dict(title=title,level=number,cash=int(re.search(r'this.cash=(\d+)',flash)[1]),lives=20,holders=sorted(holders,key=lambda h:h['id']),paths=converted,groups=groups,maxTowerLevel=1 if number==1 else 3 if number==4 else 2)
    if number==4:
        text=(args.scripts/f'Level{number}.as').read_text()
        a=text.index('var _loc4_:Array = ')+len('var _loc4_:Array = ')
        roads=json.loads(re.sub(r'new Point\(([^,]+),([^\)]+)\)',r'{"x":\1,"y":\2}',text[a:text.index(';',a)]))
        scaled=lambda x,y:dict(x=round(float(x)*1.28+62.4,6),y=round(float(y)*1.28,6))
        level['holders']=[dict(id=i+1,pos=scaled(x,y),rally=scaled(rx,ry)) for i,(x,y,rx,ry) in enumerate(re.findall(r'new TowerHolder\(([^,]+),([^,]+),new Point\(([^,]+),([^\)]+)\)\)',text[:a]))]
        level['paths']=[dict(lanes=[[scaled(p['x'],p['y']) for p in lane] for lane in road],start=0,end=len(road[0])-7,activeStart=10,activeEnd=len(road[0])-11) for road in roads]
    (ref.DATA/f'{stage}.json').write_text(json.dumps(level,separators=(',',':'))+'\n')
    art=ref.ART/stage;art.mkdir(exist_ok=True)
    frames={};needed={}
    for key,f in atlas['frames'].items():
        x,y,w,h=map(int,f['region']);crop=sheets[f['sheet']].crop((x,y,x+w,y+h))
        if key==f'stage_{number}':
            crop.resize((1365,768),Image.Resampling.LANCZOS).crop((170,0,1194,768)).save(art/'background.png',optimize=True);continue
        if f['source_group'].startswith(('gui_','ballon')):continue
        scale=f.get('ref_scale',1)
        if scale!=1:crop=crop.resize((max(1,round(w*scale)),max(1,round(h*scale))),Image.Resampling.LANCZOS)
        needed[key]=crop;frames[key]=dict(region=[],original=[v*scale for v in f['original_size']],trim=[v*scale for v in f['trim']])
    pages=[];page=Image.new('RGBA',(2048,2048));x=y=row=0
    for key,crop in sorted(needed.items(),key=lambda kv:(-kv[1].height,kv[0])):
        w,h=crop.size
        if x+w+2>2048:x=0;y+=row+2;row=0
        if y+h+2>2048:pages.append(page);page=Image.new('RGBA',(2048,2048));x=y=row=0
        page.paste(crop,(x,y));frames[key].update(page=len(pages),region=[x,y,w,h]);x+=w+2;row=max(row,h)
    pages.append(page)
    for i,page in enumerate(pages):page.save(art/f'sprites-{i}.png',optimize=True)
    lookup={k:v for k,v in atlas['lookup'].items() if v in frames}
    animations=json.loads((web/'animations.json').read_text())['animations']
    (art/'sprites.json').write_text(json.dumps(dict(frames=frames,lookup=lookup,animations=animations,pages=len(pages)),separators=(',',':'))+'\n')
    visuals={n:t['render']['sprites'] for n,t in definition['templates'].items() if 'render' in t and n.startswith(('tower_','enemy_','soldier_','re_farmer','decal_'))}
    decorations=[e for e in definition['layout']['entities_list'] if e['template'] in visuals and e['template'].startswith('decal_')]
    (art/'scene.json').write_text(json.dumps(dict(visuals=visuals,decorations=decorations),separators=(',',':'))+'\n')
    (ref.DOC/f'{stage}-manifest.json').write_text(json.dumps(dict(title=title,flashSHA256=sha,factsOnly=True,waves=len(groups),enemies=sum(c['max'] for g in groups for w in g['waves'] for c in w['spawns']),inputs=[{k:v for k,v in f.items() if k!='cache'} for f in fetched]),indent=2)+'\n')
    print(title,level['cash'],len(groups),len(holders),len(pages))
