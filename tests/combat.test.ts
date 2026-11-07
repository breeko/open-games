import { test } from 'node:test';
import assert from 'node:assert/strict';
import { damageAfterArmor, inBlast } from '../src/combat';
test('armor absorbs first and overflow damage reaches the body on the same hit',()=>{
 assert.deepEqual(damageAfterArmor({hp:200,armor:10},20),{hp:190,armor:0});
 assert.deepEqual(damageAfterArmor({hp:200,armor:370},20),{hp:200,armor:350});
 assert.deepEqual(damageAfterArmor({hp:200,armor:1100},1800),{hp:0,armor:0});
 assert.deepEqual(damageAfterArmor({hp:200,armor:0},-10),{hp:200,armor:0});
});
test('cherry damage includes the diagonal edge of its 3×3 area but excludes the next row',()=>{
 assert.equal(inBlast(190,160,170),true);
 assert.equal(inBlast(20,320,170),false);
 assert.equal(inBlast(256,0,170),false);
 assert.equal(inBlast(10,160,90),false,'potato mine must not damage the adjacent lane');
});
