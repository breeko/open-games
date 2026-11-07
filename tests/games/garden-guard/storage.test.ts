import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_STORAGE_KEYS, readGameStorage, writeGameStorage } from '../../../src/games/garden-guard/state/storage';
function memory(initial:Record<string,string>={}) {
  const data=new Map(Object.entries(initial));
  return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
}
test('existing progress, preferences and difficulty migrate without changing their contents',()=>{
  const legacy={
    'pvz.progress.v2':JSON.stringify({completedLevels:[1,3],games:8,loadouts:{'3':['sunflower','cherrybomb']}}),
    'pvz.settings.v1':JSON.stringify({autoCollectSuns:true,music:false}),
    'open-games.difficulty':'hard',
  };
  const storage=memory(legacy);
  for(const [store,oldKey] of [['progress','pvz.progress.v2'],['settings','pvz.settings.v1'],['difficulty','open-games.difficulty']] as const){
    assert.equal(readGameStorage(store,storage),legacy[oldKey]);
    assert.equal(storage.data.get(GAME_STORAGE_KEYS[store]),legacy[oldKey]);
    assert.equal(storage.data.get(oldKey),legacy[oldKey],'keep the original save intact');
  }
});
test('new saves win over legacy saves; writes stay inside this game namespace',()=>{
  const storage=memory({'pvz.progress.v2':'old',[GAME_STORAGE_KEYS.progress]:'new','open-games.other-game.progress.v1':'other'});
  assert.equal(readGameStorage('progress',storage),'new');
  writeGameStorage('progress','updated',storage);
  assert.equal(storage.data.get(GAME_STORAGE_KEYS.progress),'updated');
  assert.equal(storage.data.get('pvz.progress.v2'),'old');
  assert.equal(storage.data.get('open-games.other-game.progress.v1'),'other');
});
test('a failed migration write still returns the existing save',()=>{
  const storage={getItem:(key:string)=>key==='pvz.progress.v2'?'kept':null,setItem:()=>{throw new Error('quota');}};
  assert.equal(readGameStorage('progress',storage),'kept');
});
test('blocked storage does not crash the game',()=>{
  const storage={getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');}};
  assert.equal(readGameStorage('settings',storage),null);
  assert.doesNotThrow(()=>writeGameStorage('settings','{}',storage));
});
