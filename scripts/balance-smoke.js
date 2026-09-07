// Deterministic gameplay simulation; not a substitute for human playtesting.
import {game} from '../tests/headless-game.js';
const maxShop={hull:5,dmg:5,speed:3,magnet:3,lamp:3,card4:1,reroll:1,slot:1};
for(const seed of [1,7])for(const mode of ['fresh idle','upgraded idle','upgraded moving']){
  const legacy=mode.startsWith('fresh')?undefined:{version:2,meta:{upgrades:maxShop}};
  const g=await game(legacy,seed),G=g.state.G,P=g.state.P;
  let frames=0;
  while(G.state!=='over'&&G.t<900&&frames++<100000){
    if(G.state==='levelup'){
      const priority=['lamp2','emergency','sonar','lamp','orbs','regen','field','torpedo','power','cool','hull','speed','magnet','harpoon'];
      const options=Array.from(g.progression.levelOptions());
      options.sort((a,b)=>(priority.indexOf(a.key)<0?99:priority.indexOf(a.key))-(priority.indexOf(b.key)<0?99:priority.indexOf(b.key)));
      g.progression.chooseOption(options[0]);if(G.pendingLevels<=0)G.state='play';continue;
    }
    if(mode.endsWith('moving')){
      let x=Math.cos(G.t*0.4)*0.5,y=Math.sin(G.t*0.4)*0.5;
      for(const e of G.enemies){const dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy)||1;if(d<220){x+=dx/d*(220-d)/80;y+=dy/d*(220-d)/80;}}
      g.move.ix=x;g.move.iy=y;
    }
    g.update.update(1/30);
  }
  console.log(JSON.stringify({seed,mode,seconds:Math.round(G.t),depth:Math.round(G.depth),ng:G.tier,bosses:G.bossKills,level:G.level,state:G.state}));
}
