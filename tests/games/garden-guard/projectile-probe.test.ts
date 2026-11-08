import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ProjectileProbe} from '../../../src/games/garden-guard/playground/ProjectileProbe';
function projectile(){let callback=()=>{};return {x:400,y:400,active:true,visible:true,alpha:1,renderFlags:15,texture:{key:'pea'},once(_event:'destroy',fn:()=>void){callback=fn;},destroy(){callback();}};}
test('probe distinguishes a drawn pea, a point-blank hit before drawing, and a missing live draw',()=>{
 let now=0;const p=new ProjectileProbe(()=>now),drawn=projectile(),hit=projectile(),hidden=projectile();
 p.track(drawn);p.track(hit);p.removal(hit,'hit');hit.destroy();
 p.track(hidden);hidden.visible=false;now=20;p.afterRender([drawn,hidden]);
 const r=p.snapshot();assert.equal(r.spawned,3);assert.equal(r.drawnAtLeastOnce,1);assert.equal(r.live,2);assert.equal(r.missingDraws,1);assert.equal(r.removedBeforeFirstDraw,1);assert.equal(r.removed.hit,1);
});
test('probe ignores offscreen culling, classifies unexpected removals and bounds event history',()=>{
 const p=new ProjectileProbe(()=>10),offscreen=projectile(),unexpected=projectile();offscreen.x=1400;p.track(offscreen);p.afterRender([]);assert.equal(p.snapshot().missingDraws,0);
 p.track(unexpected);unexpected.destroy();assert.equal(p.snapshot().removed.unexpected,1);
 for(let i=0;i<50;i++){const pea=projectile();p.track(pea);p.afterRender([]);p.clear();pea.destroy();}
 assert.ok(p.snapshot().recentEvents.length<=20);assert.equal(p.snapshot().removedBeforeFirstDraw,1);assert.equal(p.snapshot().removed.cleared,50);
});
