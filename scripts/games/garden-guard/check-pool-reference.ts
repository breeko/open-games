/** Compare the implemented pool ledger against a local, pinned original-source checkout.
 * bun scripts/games/garden-guard/check-pool-reference.ts SOURCE_CHECKOUT
 * No game executable is run and no original source is copied into this repository.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {deepStrictEqual,strictEqual} from 'node:assert';
import {REFERENCE,allowedZombies,ZOMBIE_RULES} from '../../../src/games/garden-guard/reference/rules';
import {PLANT_DEFS} from '../../../src/games/garden-guard/constants';
const root=process.argv[2];if(!root)throw new Error('Provide the original-source checkout path');
strictEqual(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),REFERENCE.sourcePins.corrected,'Source pin');
const challenge=readFileSync(join(root,'Lawn/Challenge.cpp'),'utf8'),zombies=readFileSync(join(root,'Lawn/Zombie.cpp'),'utf8'),plants=readFileSync(join(root,'Lawn/Plant.cpp'),'utf8');
const waveArray=challenge.match(/int gZombieWaves\[NUM_LEVELS\]\s*=\s*\{([^}]+)/)?.[1];if(!waveArray)throw new Error('Missing wave table');
const waves=[...waveArray.replace(/\/\/[^\n]*/g,'').matchAll(/\d+/g)].map(m=>Number(m[0]));
const table=new Map([...challenge.matchAll(/\{ ZOMBIE_(\w+),\s*\{\s*([01,\s]+)\}\s*\}/g)].map(m=>[m[1],[...m[2].matchAll(/[01]/g)].map(v=>Number(v[0]))]));
const names=new Map([['NORMAL','basic'],['TRAFFIC_CONE','conehead'],['POLEVAULTER','polevaulter'],['PAIL','buckethead'],['NEWSPAPER','newspaper'],['DOOR','screendoor'],['FOOTBALL','football'],['DANCER','dancer'],['SNORKEL','snorkel']]);
const levels=[21,22,23,24].map(level=>{
 strictEqual(REFERENCE.waveCounts[level-1],waves[level-1],`Level ${level} wave count`);
 const expected=[...table].filter(([name,flags])=>flags[level-1]&&!['FLAG','BACKUP_DANCER'].includes(name)).map(([name])=>names.get(name)??name).sort();
 deepStrictEqual([...allowedZombies(level)].sort(),expected,`Level ${level} enemy eligibility`);
 return {level,waves:waves[level-1],enemies:expected};
});
const snorkel=zombies.match(/\{ ZOMBIE_SNORKEL,\s*REANIM_SNORKEL,\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);if(!snorkel)throw new Error('Missing snorkel definition');
const rule=ZOMBIE_RULES.snorkel;deepStrictEqual([rule.cost,rule.startLevel,rule.firstWave,rule.weight],snorkel.slice(1).map(Number),'Snorkel picker');
for(const [symbol,key] of [['THREEPEATER','threepeater'],['TANGLEKELP','tanglekelp'],['JALAPENO','jalapeno']] as const){
 const row=plants.split('\n').find(line=>line.includes(`SeedType::SEED_${symbol},`));if(!row)throw new Error('Missing plant '+symbol);
 const values=row.match(/REANIM_\w+,\s*\d+,\s*(\d+),\s*(\d+)/);if(!values)throw new Error('Missing economy '+symbol);
 deepStrictEqual([PLANT_DEFS[key].cost,PLANT_DEFS[key].cooldownMs],[Number(values[1]),Number(values[2])*10],symbol+' economy');
}
const report={sourcePin:REFERENCE.sourcePins.corrected,checked:'wave counts, complete allowed-enemy sets, snorkel budget/weight/first wave, new plant costs and recharges',levels,snorkel:rule,result:'pass',limitation:'Rule comparison does not establish identical RNG, collision geometry, animations or human difficulty.'};
writeFileSync('docs/games/garden-guard/audit/pool-source-comparison.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
