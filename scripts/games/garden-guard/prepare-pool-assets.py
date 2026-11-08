"""Export pool artwork and numerical swimming gait from the same pinned checkout.
Usage: python3 scripts/games/garden-guard/prepare-pool-assets.py SOURCE_CHECKOUT
Existing exports are left untouched.
"""
import importlib.util,json,sys,xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image
spec=importlib.util.spec_from_file_location('garden_art',Path(__file__).with_name('prepare-reference-sprites.py'))
art=importlib.util.module_from_spec(spec);spec.loader.exec_module(art)
art.save_pose('lilypad',art.pose('LilyPad',0,('blink',)),(128,90))
three=art.pose('ThreePeater',124,('blink',))
for frame in [15,56,97]:three.alpha_composite(art.pose('ThreePeater',frame,('blink',)))
art.save_pose('threepeater',three,(128,144))
art.save_pose('squash',art.pose('Squash',5,('blink',)),(104,128))
art.save_pose('tanglekelp',art.pose('Tanglekelp',5,('blink',)),(108,88))
art.save_pose('jalapeno',art.pose('Jalapeno',5,('blink',)),(96,128))
# Match the walking export's ~1.66 raster factor for each cropped state;
# fitting every cropped head into a full-width canvas would enlarge its face.
for key,frame,size in [('zombie-snorkel',22,(128,240)),('zombie-snorkel-swim',78,(90,80)),('zombie-snorkel-eat',97,(110,148))]:
 art.save_pose(key,art.pose('Zombie_snorkle',frame,('anim_head_lips','anim_head_jaw','anim_head_snorkle')) ,size)
exclude=('flag','screendoor','whitewater','mustache','tongue','bucket','cone','hair')
tube=art.pose('Zombie',260,only=['Zombie_duckytube']);tube_box=tube.getbbox()
if not tube_box:raise RuntimeError('Missing original duck tube track')
poses=[]
for key,gear in [('zombie-swim',None),('zombie-swim-cone','anim_cone'),('zombie-swim-bucket','anim_bucket')]:
 im=art.pose('Zombie',260,exclude)
 if gear:im.alpha_composite(art.pose('Zombie',260,only=[gear]))
 poses.append((key,im))
boxes=[im.getbbox() for _,im in poses]
crop=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),tube_box[1]+round((tube_box[3]-tube_box[1])*.72))
for key,im in poses:art.save_pose(key,im,(128,240),crop)
# Canvas path in PoolEffect::PoolEffectDraw places the original pool at (34,278)
# in the 800x600 camera view (background source crop starts at X=220).
background=Image.open(art.base/'images/background3.jpg').convert('RGBA')
background.alpha_composite(Image.open(art.base/'images/pool.jpg').convert('RGBA'),(254,278))
background.crop((220,0,1020,600)).resize((1280,960),Image.Resampling.LANCZOS).convert('RGB').save(art.out/'pool.png')
path=Path('src/games/garden-guard/reference/art-manifest.json');manifest=json.loads(path.read_text());manifest['sprites'].update(art.manifest);path.write_text(json.dumps(manifest,indent=2)+'\n')
root=ET.fromstring('<root>'+(art.layers/'Zombie.reanim').read_text()+'</root>')
ground=next(t for t in root.findall('track') if t.findtext('name')=='_ground')
state={};values=[]
for frame in ground.findall('t'):
 state.update({c.tag:c.text for c in frame});values.append(float(state.get('x',0)))
path=Path('src/games/garden-guard/reference/ground-tracks.json');tracks=json.loads(path.read_text());tracks['swim']={'file':'Zombie','clip':'anim_swim','start':250,'frameCount':42,'groundX':values[250:292]};path.write_text(json.dumps(tracks,indent=2)+'\n')
root=ET.fromstring('<root>'+(art.layers/'Zombie_snorkle.reanim').read_text()+'</root>')
ground=next(t for t in root.findall('track') if t.findtext('name')=='_ground')
state={};values=[]
for frame in ground.findall('t'):
 state.update({c.tag:c.text for c in frame});values.append(float(state.get('x',0)))
tracks['snorkelWalk']={'file':'Zombie_snorkle','clip':'anim_walk','start':22,'frameCount':37,'groundX':values[22:59]}
path.write_text(json.dumps(tracks,indent=2)+'\n')
print('Exported Lily Pad, Squash, shared duck-tube poses, pool board and swimming ground track.')
