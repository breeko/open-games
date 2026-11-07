"""Flatten selected original Reanim poses. Source checkout supplied as argv[1]."""
import sys, math, xml.etree.ElementTree as ET, json
from pathlib import Path
from PIL import Image
base=Path(sys.argv[1]); layers=base/'SexyAppFramework/DebugVS2005/reanim';out=Path('public/assets/reference')
files={p.stem.upper():p for p in layers.glob('*.png')}
manifest={}
EXPORT_SCALE=2
def pose(name,frame,exclude=(),only=None,exclude_exact=()):
 root=ET.fromstring('<root>'+ (layers/(name+'.reanim')).read_text()+'</root>'); canvas=Image.new('RGBA',(512,512));scale=2
 for track in root.findall('track'):
  n=track.findtext('name','')
  if n in exclude_exact or any(x.lower() in n.lower() for x in exclude) or (only and n not in only):continue
  state={}
  for f in track.findall('t')[:frame+1]:state.update({c.tag:c.text for c in f})
  if 'i' not in state or float(state.get('f',0))<0:continue
  f=files.get(state['i'].replace('IMAGE_REANIM_', '').upper())
  if not f:continue
  im=Image.open(f).convert('RGBA');sx=float(state.get('sx',1));sy=float(state.get('sy',1));kx=math.radians(float(state.get('kx',0)));ky=math.radians(float(state.get('ky',0)))
  a=math.cos(kx)*sx*scale;b=-math.sin(ky)*sy*scale;c=math.sin(kx)*sx*scale;d=math.cos(ky)*sy*scale
  tx=float(state.get('x',0))*scale+128;ty=float(state.get('y',0))*scale+128;det=a*d-b*c
  if abs(det)<.0001:continue
  transformed=im.transform(canvas.size,Image.Transform.AFFINE,(d/det,-b/det,(b*ty-d*tx)/det,-c/det,a/det,(c*tx-a*ty)/det),Image.Resampling.BICUBIC)
  alpha=float(state.get('a',1))
  if alpha!=1:transformed.putalpha(transformed.getchannel('A').point(lambda p:int(p*alpha)))
  canvas.alpha_composite(transformed)
 return canvas
def save_pose(key, image, size, crop=None):
 manifest[key]={'width':size[0],'height':size[1]}
 size=(size[0]*EXPORT_SCALE,size[1]*EXPORT_SCALE)
 if crop: image=image.crop(crop)
 else: image=image.crop(image.getbbox())
 factor=min((size[0]-4)/image.width,(size[1]-4)/image.height)
 image=image.resize((round(image.width*factor),round(image.height*factor)),Image.Resampling.LANCZOS)
 dest=Image.new('RGBA',size)
 dest.alpha_composite(image,((size[0]-image.width)//2,size[1]-image.height))
 dest.save(out/(key+'.png'))

# Stalk/leaf tracks end before the separately animated heads begin.
body_tracks=['backleaf','backleaf_left_tip','backleaf_right_tip','stalk_bottom','stalk_top','frontleaf','frontleaf_right_tip','frontleaf_tip_left']
for key,source in [('peashooter','PeaShooter'),('repeater','PeaShooter'),('snowpea','SnowPea')]:
 body=pose(source,11,only=body_tracks)
 head=pose(source,35,exclude=tuple(body_tracks)+('blink',)+(() if key=='repeater' else ('eyebrow',)))
 body.alpha_composite(head)
 save_pose(key,body,(108,128))
for key,name,frame,excluded,size in [
 ('sunflower','SunFlower',11,('blink',),(108,128)),
 ('wallnut','Wallnut',0,('blink',),(94,118)),
 ('cherrybomb','CherryBomb',0,(),(128,112)),
 ('chomper','Chomper',0,('Zombie_',),(128,144)),
 ('chomper-digest','Chomper',79,('Zombie_',),(128,144)),
 ('potatomine','PotatoMine',0,('blink','mashed'),(96,68)),
 ('potatomine-armed','PotatoMine',15,('blink','mashed'),(96,68)),
 ('sun','Sun',0,(),(112,112)),
 ('mower','LawnMower',0,('tricked',),(94,78))]:
 save_pose(key,pose(name,frame,excluded),size)
# Damage-state artwork keeps the same footprint as the healthy nut.
for key,source in [('wallnut-cracked','Wallnut_cracked1'),('wallnut-broken','Wallnut_cracked2')]:
 im=Image.open(files[source.upper()]).convert('RGBA')
 save_pose(key,im,(94,118))
exclude=('flag','screendoor','duck','whitewater','mustache','tongue','bucket','cone','hair')
zombie_poses=[]
for key,gear in [('zombie',None),('zombie-cone','anim_cone'),('zombie-bucket','anim_bucket')]:
 im=pose('Zombie',11,exclude)
 if gear: im.alpha_composite(pose('Zombie',11,only=[gear]))
 zombie_poses.append((key,im))
# One shared crop and scale keeps feet and body size identical after armor drops.
boxes=[im.getbbox() for _,im in zombie_poses]
shared=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
for key,im in zombie_poses:save_pose(key,im,(128,240),shared)
save_pose('zombie-pole',pose('Zombie_polevaulter',0),(260,280))
save_pose('zombie-pole-walk',pose('Zombie_polevaulter',0,exclude_exact=('Zombie_polevaulter_pole','Zombie_polevaulter_pole2')),(128,240))
# Original projectiles, sized in board coordinates rather than their source canvas.
for key,source,size in [('pea','ProjectilePea',(22,22)),('icepea','ProjectileSnowPea',(22,22))]:
 save_pose(key,Image.open(base/'images'/(source+'.png')).convert('RGBA'),size)
# Native 800×600 view: original camera shows source X 220..1020.
# Never stretch the lawn independently in X/Y or add out-of-bounds black padding.
for name in ['background1.jpg','background1unsodded.jpg']:
 im=Image.open(base/'images'/name).crop((220,0,1020,600)).resize((1280,960),Image.Resampling.LANCZOS)
 im.save(out/(Path(name).stem+'.png'))
for name in ['SeedBank.png','SeedPacket_Larger.png','SunBank.png','FlagMeter.png','FlagMeterParts.png','FlagMeterLevelProgress.png','ShovelBank.png','Shovel_hi_res.png','button_left.png','button_middle.png','button_right.png']:
 Image.open(base/'images'/name).save(out/name)
full=Image.open(out/'background1.png');dirt=Image.open(out/'background1unsodded.png')
for n,rows in [(1,[2]),(2,[1,2,3]),(3,list(range(5)))]:
 im=dirt.copy()
 for row in rows:im.paste(full.crop((64,128+row*160,1216,288+row*160)),(64,128+row*160))
 im.save(out/f'lawn{n}.png')
Path('src/reference/art-manifest.json').write_text(json.dumps({'exportScale':EXPORT_SCALE,'board':{'width':1280,'height':960,'sourceCrop':[220,0,1020,600]},'sprites':manifest},indent=2)+'\n')
# Contact sheet displays game sizes, not the oversampled texture dimensions.
keys=['peashooter','sunflower','snowpea','repeater','chomper','wallnut','potatomine-armed','cherrybomb','sun','zombie','zombie-cone','zombie-pole']
sheet=Image.new('RGB',(900,520),'#466d35')
from PIL import ImageDraw
labels=ImageDraw.Draw(sheet)
for i,key in enumerate(keys):
 im=Image.open(out/(key+'.png'));im.thumbnail((130,210),Image.Resampling.LANCZOS);x=(i%6)*150;y=(i//6)*260
 sheet.paste(im,(x+(150-im.width)//2,y+8),im)
 labels.text((x+5,y+235),key,fill='white')
sheet.save('/tmp/open-games-reference-sprites.png')
