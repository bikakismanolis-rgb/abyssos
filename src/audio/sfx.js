// ---------- audio ----------
// Volume 0..1 comes from settings (effects volume); 0 silences everything, including the ambient drone.
export const SFX={ac:null,master:null,vol:1,
  init(){
    if(this.ac)return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      this.ac=new AC();this.master=this.ac.createGain();
      this.master.gain.value=0.7*this.vol;this.master.connect(this.ac.destination);
      this.ambient();
    }catch(e){this.ac=null;}
  },
  resume(){if(this.ac&&this.ac.state==='suspended')this.ac.resume();},
  setVolume(v){this.vol=Math.max(0,Math.min(1,v));if(this.master)this.master.gain.value=0.7*this.vol;},
  ambient(){
    const ac=this.ac;
    const g=ac.createGain();g.gain.value=0.16;
    const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=180;lp.Q.value=0.7;
    lp.connect(g);g.connect(this.master);
    [[55,'sine',0.7],[55.6,'sine',0.5],[82.4,'triangle',0.25]].forEach(function(p){
      const o=ac.createOscillator();o.type=p[1];o.frequency.value=p[0];
      const og=ac.createGain();og.gain.value=p[2];o.connect(og);og.connect(lp);o.start();
    });
    const lfo=ac.createOscillator();lfo.frequency.value=0.06;
    const lg=ac.createGain();lg.gain.value=70;lfo.connect(lg);lg.connect(lp.frequency);lfo.start();
    const len=ac.sampleRate*3,buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);
    let l=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;l=(l+0.02*w)/1.02;d[i]=l*3;}
    const src=ac.createBufferSource();src.buffer=buf;src.loop=true;
    const nf=ac.createBiquadFilter();nf.type='lowpass';nf.frequency.value=350;
    const ng=ac.createGain();ng.gain.value=0.5;
    src.connect(nf);nf.connect(ng);ng.connect(this.master);src.start();
  },
  tone(f,dur,type,vol,to){
    const ac=this.ac;if(!ac||this.vol<=0)return;
    const t=ac.currentTime,o=ac.createOscillator();o.type=type||'sine';
    o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
    const g=ac.createGain();g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g);g.connect(this.master);o.start(t);o.stop(t+dur+0.02);
  },
  noise(dur,vol,freq,q){
    const ac=this.ac;if(!ac||this.vol<=0)return;
    const t=ac.currentTime,len=Math.floor(ac.sampleRate*dur),buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const s=ac.createBufferSource();s.buffer=buf;
    const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=q||0.8;
    const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(f);f.connect(g);g.connect(this.master);s.start(t);
  },
  pickup(){this.tone(900+Math.random()*300,0.09,'sine',0.07,1500);},
  kill(){this.noise(0.14,0.18,600,1.2);this.tone(240,0.12,'triangle',0.07,90);},
  hurt(){this.tone(150,0.3,'sawtooth',0.14,55);this.noise(0.25,0.22,250,0.6);},
  levelup(){const s=this;[523,659,784,1046].forEach(function(f,i){setTimeout(function(){s.tone(f,0.3,'sine',0.14);},i*95);});},
  shoot(){this.tone(700,0.06,'square',0.025,300);},
  pulse(){this.tone(220,0.35,'sine',0.12,80);this.noise(0.2,0.1,300,0.5);},
  zap(){this.noise(0.14,0.28,2600,1.6);this.noise(0.08,0.15,900,0.8);this.tone(160,0.18,'square',0.04,50);},
  torpedo(){this.noise(0.4,0.3,180,0.5);this.tone(80,0.4,'sine',0.2,40);},
  sonar(){this.tone(1200,0.5,'sine',0.08,300);},
  boom(){this.noise(0.9,0.5,120,0.4);this.tone(60,0.9,'sine',0.3,30);},
  whale(){this.tone(70+Math.random()*30,3,'sine',0.13,130);}
};
