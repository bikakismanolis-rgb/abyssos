// ---------- render: which drawing a creature gets ----------
import {ET} from '../game/config.js';
import {drawEnemy} from './creatures.js';
import {drawShape} from './creatures2.js';
import {drawBossShape,drawBossTells} from './bosses.js';

export function drawCreature(e){
  const def=ET[e.type];
  drawBossTells(e);
  if(def.boss&&drawBossShape(e,def))return;
  if(def.shape&&drawShape(e,def))return;
  drawEnemy(e);
}
