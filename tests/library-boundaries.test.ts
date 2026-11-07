import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { GAMES } from '../src/games/catalog';

const root=resolve(import.meta.dir,'..');
function imports(file:string):string[]{
  return [...readFileSync(file,'utf8').matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g)].map(match=>match[1]);
}
function typescriptFiles(directory:string):string[]{
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?typescriptFiles(join(directory,entry.name)):entry.name.endsWith('.ts')?[join(directory,entry.name)]:[]);
}
test('each listing points to an independent game page, source folder and owned cover asset',()=>{
  assert.equal(new Set(GAMES.map(game=>game.id)).size,GAMES.length);
  for(const game of GAMES){
    assert.equal(game.href,`/games/${game.id}/`);
    assert.ok(existsSync(resolve(root,`games/${game.id}/index.html`)),game.id);
    assert.ok(existsSync(resolve(root,`src/games/${game.id}`)),game.id);
    assert.ok(game.cover.startsWith(`/games/${game.id}/`));
    assert.ok(existsSync(resolve(root,`public${game.cover}`)),game.cover);
  }
});
test('the library import graph never loads a game implementation or Phaser',()=>{
  const seen=new Set<string>();
  function visit(file:string):void{
    if(seen.has(file))return;seen.add(file);
    const inGames=file.startsWith(resolve(root,'src/games')+'/');
    assert.ok(!inGames || file===resolve(root,'src/games/catalog.ts'),file);
    for(const dependency of imports(file)){
      assert.notEqual(dependency,'phaser');
      if(!dependency.startsWith('.'))continue;
      const target=resolve(dirname(file),dependency)+'.ts';
      if(existsSync(target))visit(target);
    }
  }
  visit(resolve(root,'src/main.ts'));
});
test('games do not import another game implementation',()=>{
  for(const game of GAMES){
    const owner=resolve(root,`src/games/${game.id}`)+'/';
    for(const file of typescriptFiles(owner))for(const dependency of imports(file)){
      if(!dependency.startsWith('.'))continue;
      const target=resolve(dirname(file),dependency);
      if(target.startsWith(resolve(root,'src/games')+'/'))assert.ok(target.startsWith(owner),`${file} imports ${dependency}`);
    }
  }
});
