import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshProgress, parseProgress, recordClear } from '../src/progress-data';
test('skipping forward records individual clears and does not claim skipped levels',()=>{
 const data=freshProgress();assert.equal(recordClear(data,8,10),true);assert.equal(data.highestCompleted,0);assert.deepEqual(data.completedLevels,[8]);
 assert.equal(recordClear(data,8,10),false);recordClear(data,1,4);assert.equal(data.highestCompleted,1);
});
test('legacy saves migrate while corrupted fields cannot break level navigation',()=>{
 assert.deepEqual(parseProgress({highestCompleted:3}).completedLevels,[1,2,3]);
 const data=parseProgress({highestCompleted:Infinity,games:'bad',completedLevels:[2,2,99,'3',null],loadouts:{2:['sunflower','chomper','__proto__'],3:'bad'}});
 assert.deepEqual(data.completedLevels,[2]);assert.deepEqual(data.loadouts['2'],['sunflower']);assert.equal(data.games,0);assert.equal(data.highestCompleted,0);
 assert.deepEqual(parseProgress(null),freshProgress());
});
