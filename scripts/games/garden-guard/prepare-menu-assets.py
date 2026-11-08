"""Decode/copy original selector assets from the pinned reference checkout.
Usage: python3 scripts/games/garden-guard/prepare-menu-assets.py SOURCE
The original JPEG color planes use companion PNG grayscale alpha masks.
No generated artwork, resizing, retouching or baked-in replacement text.
"""
from pathlib import Path
import shutil, sys
from PIL import Image
source=Path(sys.argv[1]); reanim=source/'SexyAppFramework/DebugVS2005/reanim'
out=Path('public/games/garden-guard/assets/menu');out.mkdir(parents=True,exist_ok=True)
for name in ['SelectorScreen_BG_Left','SelectorScreen_BG_Center','SelectorScreen_BG_Right']:
    image=Image.open(reanim/(name+'.jpg')).convert('RGBA')
    image.putalpha(Image.open(reanim/(name+'_.png')).convert('L'))
    image.save(out/(name+'.png'))
for name in ['SelectorScreen_BG.jpg','SelectorScreen_WoodSign1.png','SelectorScreen_Adventure_button.png','SelectorScreen_Adventure_highlight.png','SelectorScreen_Cloud1.png','SelectorScreen_Cloud2.png','SelectorScreen_Cloud4.png']:
    shutil.copyfile(reanim/name,out/name)
for name in ['SelectorScreen_Almanac.png','SelectorScreen_AlmanacHighlight.png','SelectorScreen_Options1.png','SelectorScreen_Options2.png','SelectorScreen_Help1.png','SelectorScreen_Help2.png','SelectorScreen_Quit1.png','SelectorScreen_Quit2.png']:
    shutil.copyfile(source/'images'/name,out/name)
print('Prepared original selector assets:',out)
