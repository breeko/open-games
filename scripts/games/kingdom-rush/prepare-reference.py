"""Prepare a bounded Pagras reference pack; never executes downloaded game code.

Requires Pillow. Downloads are pinned and cached outside the repository.
Run: python3 scripts/games/kingdom-rush/prepare-reference.py
"""
import ast
import concurrent.futures
import hashlib
import json
import re
import tempfile
import urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
CACHE = Path(tempfile.gettempdir()) / 'open-games-kingdom-rush' / 'source'
DATA = ROOT / 'src/games/kingdom-rush/reference'
ART = ROOT / 'public/games/kingdom-rush/assets'
DOC = ROOT / 'docs/games/kingdom-rush'
ORIGINAL = ('DanQZ/KR1-Smarter-Soldiers-Mod', 'fa84f20b6fc0cff19f5c8e13c588736fcf228fa7')
VISUAL = ('wicked-knife/KingdomRushWeb', '3e4eac4110ce0e228f1300ca145cd7c29d2dbc8a')
INPUTS = [(ORIGINAL, 'kr1/data/' + p) for p in [
    'levels/level03_data.lua', 'levels/level03_paths.lua',
    'levels/level03_grid.lua', 'waves/level03_waves_campaign.lua']]
INPUTS += [(ORIGINAL, p) for p in ['kr1/game_templates.lua', 'kr1/game_settings.lua',
    'all/templates.lua', 'all/constants.lua', 'all/path_db.lua', 'all/utils.lua',
    'all/scripts.lua', 'all/script_utils.lua', 'all/systems.lua']]
INPUTS += [(VISUAL, 'data/level03/' + p) for p in [
    'definition.json', 'animations.json', 'atlas.json', 'manifest.json'] +
    [f'atlas_{i}.png' for i in range(8)]]


def download(item):
    (repo, ref), path = item
    target = CACHE / repo.split('/')[0] / path
    # Revision is recorded beside the cached bytes; old manually populated cache
    # is accepted only after fetching pinned files again on the first run.
    stamp = target.with_name(target.name + '.revision')
    url = f'https://raw.githubusercontent.com/{repo}/{ref}/{path}'
    if not target.exists() or not stamp.exists() or stamp.read_text() != ref:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(urllib.request.urlopen(url, timeout=90).read())
        stamp.write_text(ref)
    return {'url': url, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
            'bytes': target.stat().st_size, 'cache': target}


class LuaTable:
    """A literal-only Lua table reader: rejects calls, operators and executable code."""
    def __init__(self, text):
        text = re.sub(r'--[^\n]*', '', text.lstrip('\ufeff'))
        pattern = r'\s*("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[A-Za-z_]\w*|[{}\[\]=,;])'
        self.tokens = []
        while text.strip():
            match = re.match(pattern, text)
            if not match:
                raise ValueError('Unsupported Lua literal near ' + text[:50])
            self.tokens.append(match.group(1))
            text = text[match.end():]
        self.i = 0

    def pop(self, expected=None):
        value = self.tokens[self.i]
        self.i += 1
        if expected is not None and value != expected:
            raise ValueError(f'Expected {expected}, got {value}')
        return value

    def value(self):
        t = self.pop()
        if t == '{':
            array, fields = [], {}
            while self.tokens[self.i] != '}':
                if self.tokens[self.i] == '[':
                    self.pop('['); key = self.value(); self.pop(']'); self.pop('=')
                    fields[key] = self.value()
                elif self.i + 1 < len(self.tokens) and self.tokens[self.i + 1] == '=':
                    key = self.pop(); self.pop('='); fields[key] = self.value()
                else:
                    array.append(self.value())
                if self.tokens[self.i] in [',', ';']:
                    self.pop()
            self.pop('}')
            if array and fields:
                raise ValueError('Mixed tables are not used by these inputs')
            return fields if fields else array
        if t[0] in ['"', "'"]:
            return ast.literal_eval(t)
        if t in ['true', 'false', 'nil']:
            return {'true': True, 'false': False, 'nil': None}[t]
        if re.fullmatch(r'-?\d+', t):
            return int(t)
        return float(t)

    def read(self):
        self.pop('return')
        result = self.value()
        if self.i != len(self.tokens):
            raise ValueError('Unexpected content after literal')
        return result


def main():
    for p in [DATA, ART, DOC]:
        p.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        fetched = list(pool.map(download, INPUTS))
    original = CACHE / 'DanQZ/kr1/data'
    level = LuaTable((original / 'levels/level03_data.lua').read_text()).read()
    paths = LuaTable((original / 'levels/level03_paths.lua').read_text()).read()
    waves = LuaTable((original / 'waves/level03_waves_campaign.lua').read_text()).read()
    web = CACHE / 'wicked-knife/data/level03'
    definition = json.loads((web / 'definition.json').read_text())
    assert waves['groups'] == definition['waves']['groups'], 'Wave schedules disagree; investigate before importing'
    assert waves['lives'] == definition['waves']['lives']
    # The newer mod raises starting cash to 330. Keep the older reference's 300.
    point = lambda p: {'x': p['x'], 'y': 768 - p['y']}
    holders = [{'id': int(e['tower.holder_id']), 'pos': point(e['pos']),
                'rally': point(e['tower.default_rally_pos'])}
               for e in level['entities_list'] if 'tower.holder_id' in e]
    converted_paths = []
    for route in paths['paths']:
        lanes = [[point(p) for p in lane] for lane in route]
        center = lanes[0]
        first = next(i for i, p in enumerate(center) if 0 <= p['x'] <= 1024 and 0 <= p['y'] <= 768)
        goal = min(range(len(center)), key=lambda i: (center[i]['x']-53)**2+(center[i]['y']-467)**2)
        converted_paths.append({'lanes': lanes, 'start': max(0, first-10), 'end': goal})
    # Original tables own geometry/waves. The newer mod export is used ONLY for
    # visual descriptors: its rules include HP/speed buffs and are not imported.
    result = {'title': 'Pagras', 'level': 3, 'cash': waves['cash'], 'lives': waves['lives'],
              'holders': sorted(holders, key=lambda h: h['id']),
              'paths': converted_paths, 'groups': waves['groups']}
    (DATA / 'level03.json').write_text(json.dumps(result, separators=(',', ':'))+'\n')
    (DATA / 'source-level03.json').write_text(json.dumps({'waves': waves, 'paths': paths,
        'placements': level}, separators=(',', ':'))+'\n')

    visual_names = [n for n in definition['templates'] if n.startswith(('tower_archer_',
        'tower_barrack_', 'tower_mage_', 'tower_engineer_', 'enemy_', 'soldier_'))]
    visual_names += ['tower_holder_grass', 're_farmer']
    visual = {n: definition['templates'][n]['render']['sprites'] for n in visual_names}
    # Keep environment decorations and their original offsets/anchors too.
    for e in definition['layout']['entities_list']:
        n = e['template']
        if n in definition['templates'] and 'render' in definition['templates'][n] and n.startswith('decal_'):
            visual[n] = definition['templates'][n]['render']['sprites']
    (DATA / 'visuals.json').write_text(json.dumps(visual, separators=(',', ':'))+'\n')
    decorations = [e for e in definition['layout']['entities_list']
                   if e['template'] in visual and e['template'].startswith('decal_')]
    (DATA / 'decorations.json').write_text(json.dumps(decorations, separators=(',', ':'))+'\n')
    atlas = json.loads((web / 'atlas.json').read_text())
    animations = json.loads((web / 'animations.json').read_text())['animations']
    # The level export is already bounded. Preserve all animation states and
    # aliases, but put its background in a separate image to reduce atlas memory.
    sheets = {f'atlas_{i}.png': Image.open(web / f'atlas_{i}.png').convert('RGBA') for i in range(8)}
    needed = {}
    frames = {}
    for key, f in atlas['frames'].items():
        if key == 'stage_3':
            x, y, w, h = map(int, f['region'])
            bg = sheets[f['sheet']].crop((x, y, x+w, y+h))
            # Preserve the 4:3 reference viewport, from the wider desktop scene.
            bg = bg.resize((1365, 768), Image.Resampling.LANCZOS)
            bg = bg.crop((170, 0, 1194, 768))
            bg.save(ART / 'pagras.png', optimize=True)
            continue
        # Remove unused balloon/UI decorations, keep all gameplay and stage art.
        if f['source_group'].startswith(('gui_', 'ballon')):
            continue
        x, y, w, h = map(int, f['region'])
        scale = f.get('ref_scale', 1)
        crop = sheets[f['sheet']].crop((x, y, x+w, y+h))
        if scale != 1:
            crop = crop.resize((max(1, round(w*scale)), max(1, round(h*scale))), Image.Resampling.LANCZOS)
        needed[key] = crop
        frames[key] = {'region': [], 'original': [v*scale for v in f['original_size']],
                       'trim': [v*scale for v in f['trim']]}
    pages = []; page = Image.new('RGBA', (2048, 2048)); x=y=row=0
    for key, crop in sorted(needed.items(), key=lambda kv: (-kv[1].height, kv[0])):
        w, h = crop.size
        if x+w+2 > 2048:
            x=0; y+=row+2; row=0
        if y+h+2 > 2048:
            pages.append(page); page=Image.new('RGBA',(2048,2048));x=y=row=0
        page.paste(crop,(x,y)); frames[key].update(page=len(pages),region=[x,y,w,h])
        x+=w+2; row=max(row,h)
    pages.append(page)
    for i, page in enumerate(pages):
        page.save(ART/f'sprites-{i}.png',optimize=True)
    lookup = {k:v for k,v in atlas['lookup'].items() if v in frames}
    (ART/'sprites.json').write_text(json.dumps({'frames': frames,'lookup':lookup,
        'animations':animations,'pages':len(pages)},separators=(',', ':'))+'\n')
    manifest = {'prepared': '2026-11-07', 'original_data_source': dict(repository=ORIGINAL[0],commit=ORIGINAL[1]),
        'visual_source':dict(repository=VISUAL[0],commit=VISUAL[1]),
        'scope':'Local Pagras reference prototype. Original Ironhide assets; redistribution permission not established.',
        'facts':{'wave_groups':len(waves['groups']),'tower_holders':len(holders),
                 'routes':len(paths['paths']),'sprite_frames':len(frames),'sprite_pages':len(pages),
                 'wave_schedules_identical':True, 'starting_cash':waves['cash'],
                 'rejected_visual_export_cash':definition['waves']['cash']},
        'inputs':[{k:v for k,v in f.items() if k!='cache'} for f in fetched]}
    (DOC/'reference-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps(manifest['facts'],indent=2))


if __name__ == '__main__':
    main()
