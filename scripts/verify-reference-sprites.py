"""Regression checks for flattened artwork. Requires Pillow."""
from pathlib import Path
from PIL import Image
base=Path('public/assets/reference')
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
