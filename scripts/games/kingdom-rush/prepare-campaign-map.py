"""Extract bounded campaign navigation art from the existing pinned visual source.
Requires Pillow; never executes reference game code. Downloads cached in /tmp.
"""
import hashlib
import json
import urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
BASE = 'https://raw.githubusercontent.com/wicked-knife/KingdomRushWeb/3e4eac4110ce0e228f1300ca145cd7c29d2dbc8a/data/map_kr1/'
CACHE = Path('/tmp/kr-campaign')
OUT = ROOT / 'public/games/kingdom-rush/assets/campaign'
CACHE.mkdir(exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
sources = []
for name in ['definition.json', 'atlas.json', 'atlas_11.png']:
    path = CACHE / name
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(BASE + name, timeout=90).read())
    sources.append({'url': BASE + name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
frames = json.loads((CACHE / 'atlas.json').read_text())['frames']
sheet = Image.open(CACHE / 'atlas_11.png')
for key, name in [('map_background_kr1', 'realm.webp'), ('map_flag_0020', 'flag.png')]:
    frame = frames[key]
    x, y, w, h = map(int, frame['region'])
    crop = sheet.crop((x, y, x + w, y + h))
    crop.save(OUT / name, **({'quality': 88, 'method': 6} if name.endswith('.webp') else {}))
manifest = {'note': 'Visual reference only. Original Ironhide artwork; see credits. Navigation is authored TypeScript, with six available locations. Flag positions are adapted for touch spacing.', 'sources': sources, 'frames': ['map_background_kr1', 'map_flag_0020']}
(ROOT / 'docs/games/kingdom-rush/campaign-map-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
