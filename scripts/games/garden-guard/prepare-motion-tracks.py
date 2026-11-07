"""Reproduce the numerical walking curves from the pinned Reanim checkout."""
import json, sys, xml.etree.ElementTree as ET
from pathlib import Path
source=Path(sys.argv[1])/'SexyAppFramework/DebugVS2005/reanim'
output=Path('src/games/garden-guard/reference/ground-tracks.json')
tracks=json.loads(output.read_text())
for track in tracks.values():
 name=track['file'][:-7] if track['file'].endswith('.reanim') else track['file']
 root=ET.fromstring('<root>'+(source/(name+'.reanim')).read_text()+'</root>')
 ground=next(t for t in root.findall('track') if t.findtext('name')=='_ground')
 state={};values=[]
 for frame in ground.findall('t'):
  state.update({c.tag:c.text for c in frame});values.append(float(state.get('x',0)))
 start=track['start'];track['groundX']=[value*track.get('direction',1) for value in values[start:start+track['frameCount']]]
output.write_text(json.dumps(tracks,indent=2)+'\n')
