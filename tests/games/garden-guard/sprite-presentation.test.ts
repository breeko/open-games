import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groundX,plantMuzzleX,GROUND_X} from '../../../src/games/garden-guard/sprite-presentation';
import {boardRenderScale} from '../../../src/games/garden-guard/render-quality';
test('art anchors use stems and feet, including asymmetric zombie poses',()=>{
 assert.equal(groundX('unknown'),.5);
 for(const anchor of Object.values(GROUND_X))assert.ok(anchor>0&&anchor<1);
 assert.equal(groundX('zombie-cone'),groundX('zombie'));assert.equal(groundX('zombie-football'),groundX('zombie-football-bare'));
 assert.equal(groundX('wallnut'),groundX('wallnut-broken'));
 for(const key of ['peashooter','snowpea','repeater','puffshroom','scaredyshroom'])assert.ok(Math.abs(plantMuzzleX(key)-.88+groundX(key)-.5)<1e-10);
});
test('large-board sharpness is capped while iPad and phone drawing budgets stay unchanged',()=>{
 for(const [w,h] of [[1024,768],[768,1024],[390,844],[844,390],[1280,960]])assert.equal(boardRenderScale(w,h),1);
 assert.equal(boardRenderScale(1920,1080),1.5);assert.equal(boardRenderScale(2560,1440),1.5);
 assert.equal(boardRenderScale(3840,2160),2);assert.equal(boardRenderScale(10000,8000),2);
 assert.equal(boardRenderScale(NaN,0),1);
});
