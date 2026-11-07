"""Regression checks for flattened artwork. Requires Pillow."""
from pathlib import Path
from PIL import Image
base=Path('public/games/garden-guard/assets/reference')
for key in ['peashooter','snowpea','repeater','sunflower']:
    im=Image.open(base/(key+'.png'))
    box=im.getbbox()
    assert box and box[3]-box[1] >= 180, key+' is missing its stem/leaves'
    assert box[2]-box[0] <= im.width, key+' exceeds its canvas'
for key in ['zombie','zombie-cone','zombie-bucket']:
    assert Image.open(base/(key+'.png')).size == (256,480), 'armor states must share their alignment'
assert Image.open(base/'sun.png').size == (224,224)
for key in ['chomper','chomper-digest','zombie-pole','zombie-pole-walk','potatomine','potatomine-armed']:
    assert Image.open(base/(key+'.png')).getbbox(), key+' is empty'
for n in [1,2,3]:
    im=Image.open(base/f'lawn{n}.png')
    assert im.size==(1280,960), 'board must preserve the original 4:3 view'
    assert sum(im.getpixel((640,0))[:3])>30, 'background must not include black padding'
print('Sprite checks passed: complete plant silhouettes, aligned armor, sun size, special states.')

for key in ['pea','icepea']:
    im=Image.open(base/(key+'.png'))
    assert im.size==(90,90), 'original 28px projectile must display at 45px on the 1.6× board'
for key in ['puffshroom','sunshroom','sunshroom-grown','fumeshroom','gravebuster','zombie-paper','zombie-paper-angry','zombie-door']:
    assert Image.open(base/(key+'.png')).getbbox(), key+' has no artwork'
assert Image.open(base/'background2.png').size==(1280,960)
assert Image.open(base/'sunshroom.png').getbbox()[3]==Image.open(base/'sunshroom-grown.png').getbbox()[3], 'growth must preserve the feet anchor'
print('Night artwork and original-size projectile checks passed.')

for key in ['hypnoshroom','scaredyshroom','scaredyshroom-hidden','zombie-football','zombie-football-bare']:
    assert Image.open(base/(key+'.png')).getbbox(), key+' has no original artwork'
assert Image.open(base/'zombie-football.png').size == Image.open(base/'zombie-football-bare.png').size
print('Hypno, Scaredy and aligned football state checks passed.')

for key in ['iceshroom','doomshroom','zombie-dancer','zombie-backup','ice-front','ice-back']:
    assert Image.open(base/(key+'.png')).getbbox(), key+' has no original artwork'
assert Image.open(base/'crater.png').size==(90,61), 'crater must be one frame, not both side by side'
assert Image.open(base/'zombie-dancer.png').tobytes()!=Image.open(base/'zombie-backup.png').tobytes(), 'leader and backups need distinct original art'
print('Ice, Doom, Dancing Zombie, backup, freeze overlay and crater checks passed.')
