import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import visuals from '../../../src/games/kingdom-rush/reference/visuals.json';
import metadata from '../../../public/games/kingdom-rush/assets/sprites.json';
import provenance from '../../../docs/games/kingdom-rush/reference-manifest.json';

test('the repacked atlas contains every visible default sprite and all required animation frames',()=>{
  const frames:Record<string,{page:number;region:number[];original:number[];trim:number[]}>=metadata.frames;
  const lookup:Record<string,string>=metadata.lookup;
  const animations:Record<string,{prefix:string;frames:number[]}>=metadata.animations;
  const templates:Record<string,{name:string;prefix?:string;hidden?:boolean}[]>=visuals;
  let checked=0;
  for(const [template,sprites] of Object.entries(templates))for(const sprite of sprites){
    if(sprite.hidden)continue;
    const key=sprite.prefix?`${sprite.prefix}_${sprite.name}`:sprite.name;
    const anim=animations[key],names=anim?anim.frames.map(n=>`${anim.prefix}_${String(n).padStart(4,'0')}`):[sprite.name.replace('%04i','0001')];
    for(const name of names){assert.ok(frames[lookup[name]??name],`${template}: ${name}`);checked++;}
  }
  const prefixes=new Set(Object.values(templates).flatMap(sprites=>sprites.flatMap(s=>s.prefix?[s.prefix]:[])));
  for(const [key,animation] of Object.entries(animations)){
    if(![...prefixes].some(prefix=>key.startsWith(prefix+'_')))continue;
    for(const n of animation.frames){const name=`${animation.prefix}_${String(n).padStart(4,'0')}`;assert.ok(frames[lookup[name]??name],`${key}: ${name}`);}
  }
  assert.ok(checked>100);
  for(const f of Object.values(frames)){
    const [x,y,w,h]=f.region;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=2048&&y+h<=2048);
    const path=resolve(import.meta.dir,`../../../public/games/kingdom-rush/assets/sprites-${f.page}.png`);assert.ok(existsSync(path));
  }
  const png=readFileSync(resolve(import.meta.dir,'../../../public/games/kingdom-rush/assets/sprites-0.png'));
  assert.equal(png.readUInt32BE(16),2048);assert.equal(png.readUInt32BE(20),2048);
  assert.equal(provenance.facts.wave_schedules_identical,true);assert.equal(provenance.facts.starting_cash,300);
  assert.equal(provenance.facts.rejected_visual_export_cash,330);
});
