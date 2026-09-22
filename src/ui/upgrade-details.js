import {WEAPONS,PASSIVES,effLv} from '../game/config.js';
import {t} from '../i18n/index.js';

export function changeLine(label,before,after,unit=''){
  const round=n=>Number(n.toFixed(2));
  const delta=round(after-before);
  if(delta===0)return '';
  return label+' '+(delta>0?'+':'−')+Math.abs(delta)+unit+' · '+round(before)+unit+' → '+round(after)+unit;
}
export function weaponChanges(key,level,player={}){
  const def=WEAPONS[key];
  const stats=lv=>{const s=def.lv(effLv(lv,def.max));
    s.dmg*=player.dmgMul??1;if(s.cd)s.cd*=player.cdMul??1;
    if(key==='lamp'){s.range*=player.lampRange??1;s.arc*=player.lampArc??1;}return s;};
  const before=level?stats(level):null,after=stats(level+1);
  const lines=Object.keys(after).map(k=>{
    const factor=k==='arc'?180/Math.PI:1;
    const unit=k==='arc'?'°':['cd','stun'].includes(k)?' '+t('card.seconds'):'';
    // No weapon has no firing interval; do not describe a new cooldown as a slowdown.
    if(!before&&k==='cd')return t('card.cd')+': '+Number(after[k].toFixed(2))+unit;
    return changeLine(t('card.'+k),(before?before[k]:0)*factor,after[k]*factor,unit);
  }).filter(Boolean);
  return lines;
}
export function passiveChanges(key,level,player){
  const after={...player};PASSIVES[key].apply(after,level<PASSIVES[key].max?1:0.5);
  const fields={speed:['speedMul'],magnet:['magnet'],hull:['maxHp','hp'],regen:['regen'],power:['dmgMul'],cool:['cdMul']}[key];
  return fields.map(k=>{
    const percent=['speedMul','dmgMul','cdMul'].includes(k),factor=percent?100:1;
    return changeLine(t('card.'+k),player[k]*factor,after[k]*factor,percent?'%':'');
  }).filter(Boolean);
}
export function optionChanges(option,player){
  if(option.kind==='w')return weaponChanges(option.key,option.lvl,player);
  if(option.kind==='p')return passiveChanges(option.key,option.lvl,player);
  if(option.kind==='heal')return [changeLine(t('card.hp'),player.hp,player.maxHp)].filter(Boolean);
  if(option.kind==='x')return [];
  if(option.key==='overclock')return [changeLine(t('card.cdMul'),player.cdMul*100,player.cdMul*80,'%')];
  if(option.key==='shell')return [changeLine(t('card.armor'),player.armor*100,30,'%')];
  const specs={lamp2:['backBeam',0,70,'%'],emergency:['rescues',0,1,''],deathpulse:['chainDamage',0,50,'%'],lightheal:['pickupHeal',0,1,'']};
  const [label,a,b,unit]=specs[option.key];return [changeLine(t('card.'+label),a,b,unit)];
}
export function shopChanges(key,level){
  const specs={hull:['maxHp',100,5,'%'],dmg:['dmgMul',100,3,'%'],speed:['speedMul',100,3,'%'],
    lamp:['lampLevel',1,1,''],card4:['choices',3,1,''],reroll:['rerolls',0,1,''],slot:['slots',4,1,'']};
  if(key==='magnet')return changeLine(t('card.magnet'),100*Math.pow(1.1,level),100*Math.pow(1.1,level+1),'%');
  const [label,base,step,unit]=specs[key];return changeLine(t('card.'+label),base+level*step,base+(level+1)*step,unit);
}
