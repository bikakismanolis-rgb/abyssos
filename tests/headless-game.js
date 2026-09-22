import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
// Execute real gameplay modules with only device/UI effects replaced.
export async function game(legacy,seed=1){
  const root=fileURLToPath(new URL('../src/',import.meta.url));
  const storage=new Map(legacy?[['abyssos-save',JSON.stringify(legacy)]]:[]);
  const randomMath=Object.create(Math);
  randomMath.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const move={ix:0,iy:0};
  const context=vm.createContext({Math:randomMath,move,console,setTimeout:()=>0,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
  const stubs={
    'render/canvas.js':'export const W=390,H=844;',
    'ui/hud.js':'export const setNg=()=>{},showBanner=()=>{},hideBanner=()=>{},showBossBar=()=>{},hideBossBar=()=>{};',
    'ui/screens.js':"import {G} from '../game/state.js';export const openLevelUp=()=>{G.state='levelup';},gameOver=()=>{G.state='over';},showEnding=()=>{G.state='ending';};",
    'ui/input.js':'export const readMove=()=>move;',
    'audio/sfx.js':'export const SFX=new Proxy({},{get:()=>()=>{}});',
    'settings.js':'export const settings=()=>({dmgNumbers:false}),buzz=()=>{};'
  };
  const cache=new Map();
  function module(path){
    if(cache.has(path))return cache.get(path);
    const relative=path.slice(root.length).replaceAll('\\','/').replace(/^\//,'');
    const source=stubs[relative]??readFileSync(path,'utf8');
    const m=new vm.SourceTextModule(source,{context,identifier:path});cache.set(path,m);return m;
  }
  const driver=new vm.SourceTextModule(`
    export * as state from './game/state.js';export * as combat from './game/combat.js';
    export * as enemies from './game/enemies.js';export * as update from './game/update.js';
    export * as save from './save.js';export * as achievements from './game/achievements.js';
    export * as progression from './game/progression.js';
    export * as weapons from './game/weapons.js';export * as hazards from './game/hazards.js';
    export * as shop from './game/shop.js';export * as places from './game/places.js';export * as config from './game/config.js';
  `,{context,identifier:resolve(root,'driver.js')});
  await driver.link((specifier,ref)=>module(resolve(dirname(ref.identifier),specifier)));
  await driver.evaluate();
  const g=driver.namespace;g.save.load();g.state.newGame('play');return {...g,move};
}

