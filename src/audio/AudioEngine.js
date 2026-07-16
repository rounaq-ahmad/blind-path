import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

// A Dorian ambient music — felt-piano synthesizer, reverb, 4-bar loop
const AUDIO_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#000">
<script>
const TEMPO=68,STEP=(60/TEMPO)/2,LOOP_STEPS=32;
const midi=m=>440*Math.pow(2,(m-69)/12);
let ac,master,musicGain,musicSteps=[],musicClock=0,musicStartTime=0,musicTimer=null,started=false;

function makeIR(dur,decay){
  const len=ac.sampleRate*dur,buf=ac.createBuffer(2,len,ac.sampleRate);
  for(let ch=0;ch<2;ch++){
    const d=buf.getChannelData(ch);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);
  }
  return buf;
}

function voice(freq,t,gain,dur,pan){
  const out=ac.createGain();
  out.gain.setValueAtTime(0.0001,t);
  out.gain.linearRampToValueAtTime(gain,t+0.04);
  out.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  const lp=ac.createBiquadFilter();
  lp.type='lowpass';lp.frequency.value=2300;out.connect(lp);
  const pn=ac.createStereoPanner?ac.createStereoPanner():null;
  if(pn){pn.pan.value=pan||0;lp.connect(pn);pn.connect(musicGain);}
  else{lp.connect(musicGain);}
  [[1,1],[2,0.15],[3,0.06],[4,0.025]].forEach(([r,g])=>{
    const o=ac.createOscillator();o.type='sine';o.frequency.value=freq*r;
    const og=ac.createGain();og.gain.value=g;
    o.connect(og);og.connect(out);o.start(t);o.stop(t+dur+0.05);
  });
}

function buildMusic(){
  const bars=[
    {bass:null,chord:null,mel:[69,67,64,66]},
    {bass:45,chord:[57,60,64,67],mel:[69,67]},
    {bass:38,chord:[62,66,69],mel:[71,69]},
    {bass:43,chord:[55,59,62,67],mel:[67,64]},
  ];
  const steps=Array.from({length:LOOP_STEPS},()=>[]);
  bars[0].mel.forEach((m,i)=>{steps[i*2].push({f:midi(m),g:0.028,d:2.6,p:0});});
  bars.slice(1).forEach((b,bi)=>{
    const base=(bi+1)*8,c=b.chord;
    steps[base].push({f:midi(b.bass),g:0.04,d:3.2,p:0});
    c.forEach((m,ci)=>steps[base].push({f:midi(m),g:0.012,d:3.6,p:(ci-(c.length-1)/2)*0.16}));
    steps[base+2].push({f:midi(c[1]),g:0.014,d:2.2,p:-0.18});
    steps[base+2].push({f:midi(c[2]),g:0.014,d:2.2,p:0.18});
    steps[base+4].push({f:midi(b.bass+12),g:0.018,d:2.2,p:0});
    [c[0],c[1],c[2]].forEach((m,ci)=>steps[base+4].push({f:midi(m),g:0.011,d:2.6,p:(ci-1)*0.16}));
    steps[base+6].push({f:midi(b.mel[1]),g:0.018,d:2.0,p:0.1});
  });
  musicSteps=steps;
}

function scheduleMusic(){
  while(musicStartTime+musicClock*STEP<ac.currentTime+0.3){
    const t=musicStartTime+musicClock*STEP;
    for(const n of musicSteps[musicClock%LOOP_STEPS])
      voice(n.f,t,n.g*(0.85+Math.random()*0.3),n.d,n.p);
    musicClock++;
  }
}

function setupChain(){
  master=ac.createGain();master.gain.value=0.9;master.connect(ac.destination);
  const verb=ac.createConvolver();verb.buffer=makeIR(3.2,2.3);
  const wet=ac.createGain();wet.gain.value=0.35;
  verb.connect(wet);wet.connect(master);
  musicGain=ac.createGain();musicGain.gain.value=0;
  musicGain.connect(master);musicGain.connect(verb);
  buildMusic();
  musicStartTime=ac.currentTime+0.5;musicClock=0;
  musicGain.gain.setTargetAtTime(0.62*_musicVol,ac.currentTime,1.2);
  musicTimer=setInterval(scheduleMusic,45);
}

// ── Volume & SFX controls ─────────────────────────────────────────────────────
let _sfxMuted=false,_musicVol=1;

window.setSfxMuted=function(m){_sfxMuted=m;};

window.setMusicVol=function(v){
  _musicVol=v;
  if(!musicGain)return;
  musicGain.gain.setTargetAtTime(0.62*v,ac.currentTime,0.4);
};

// ── Sound effects ─────────────────────────────────────────────────────────────

window.playTap=function(){
  if(!ac||!master||_sfxMuted)return;
  const t=ac.currentTime;
  const o=ac.createOscillator(),g=ac.createGain(),f=ac.createBiquadFilter();
  f.type='bandpass';f.frequency.value=820;f.Q.value=1.2;
  o.type='sine';o.frequency.value=820;
  o.connect(f);f.connect(g);g.connect(master);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(0.08,t+0.007);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.065);
  o.start(t);o.stop(t+0.07);
};

window.playCollision=function(){
  if(!ac||!master||_sfxMuted)return;
  const bufLen=Math.floor(ac.sampleRate*0.09);
  const buf=ac.createBuffer(1,bufLen,ac.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<bufLen;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/bufLen,2.5);
  const src=ac.createBufferSource();src.buffer=buf;
  const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=160;
  const g=ac.createGain();g.gain.value=0.28;
  src.connect(lp);lp.connect(g);g.connect(master);
  src.start();
};

window.playChime=function(){
  if(!ac||!master||_sfxMuted)return;
  const t=ac.currentTime;
  [880,1108,1320].forEach(function(freq,i){
    const o=ac.createOscillator(),g=ac.createGain();
    o.type='sine';o.frequency.value=freq;
    o.connect(g);g.connect(master);
    const s=t+i*0.09;
    g.gain.setValueAtTime(0,s);
    g.gain.linearRampToValueAtTime(0.055-i*0.012,s+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,s+0.45);
    o.start(s);o.stop(s+0.5);
  });
};

window.playComplete=function(){
  if(!ac||!master||_sfxMuted)return;
  const t=ac.currentTime;
  [440,554.37,659.25,880].forEach(function(freq,i){
    const o=ac.createOscillator(),g=ac.createGain(),lp=ac.createBiquadFilter();
    lp.type='lowpass';lp.frequency.value=3200;
    o.type='sine';o.frequency.value=freq;
    o.connect(lp);lp.connect(g);g.connect(master);
    const del=i*0.06;
    g.gain.setValueAtTime(0,t+del);
    g.gain.linearRampToValueAtTime(i===3?0.05:0.13,t+del+0.45);
    g.gain.exponentialRampToValueAtTime(0.0001,t+del+2.1);
    o.start(t+del);o.stop(t+del+2.2);
  });
};

// Soft ascending chime — played when player collects a wisp
window.playWisp=function(){
  if(!ac||!master||_sfxMuted)return;
  const t=ac.currentTime;
  [660,880,1100].forEach(function(freq,i){
    const o=ac.createOscillator(),g=ac.createGain();
    o.type='sine';o.frequency.value=freq;
    o.connect(g);g.connect(master);
    const s=t+i*0.06;
    g.gain.setValueAtTime(0,s);
    g.gain.linearRampToValueAtTime(0.038-i*0.009,s+0.022);
    g.gain.exponentialRampToValueAtTime(0.0001,s+0.28);
    o.start(s);o.stop(s+0.32);
  });
};

// ── Autoplay ──────────────────────────────────────────────────────────────────

window.startAudio=function(){
  if(started)return;started=true;
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC){started=false;return;}
    ac=new AC();
    if(ac.state==='suspended'){
      ac.resume().then(setupChain).catch(function(){started=false;});
    } else {
      setupChain();
    }
  }catch(e){started=false;}
};

setTimeout(function(){window.startAudio();},300);
</script>
</body></html>`;

const AudioEngine = forwardRef(({ muted = false, musicVol = 1 }, ref) => {
  const webRef = useRef(null);

  const inj = (js) => webRef.current?.injectJavaScript(js + ';true;');

  useEffect(() => {
    inj(muted ? 'setSfxMuted(true)' : 'setSfxMuted(false)');
  }, [muted]);

  useEffect(() => {
    inj(`setMusicVol(${musicVol})`);
  }, [musicVol]);

  useImperativeHandle(ref, () => ({
    resume:        () => inj('if(!started){startAudio();}else if(ac&&ac.state==="suspended"){ac.resume().then(function(){if(!musicTimer)setupChain();})}'),
    playTap:       () => inj('playTap()'),
    playCollision: () => inj('playCollision()'),
    playChime:     () => inj('playChime()'),
    playComplete:  () => inj('playComplete()'),
    playWisp:      () => inj('playWisp()'),
  }));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: 2, height: 2 }}>
      <WebView
        ref={webRef}
        source={{ html: AUDIO_HTML }}
        style={{ width: 2, height: 2, opacity: 0 }}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        originWhitelist={['*']}
        onLoad={() => {
          setTimeout(() => {
            webRef.current?.injectJavaScript('startAudio();true;');
            if (muted) webRef.current?.injectJavaScript('setSfxMuted(true);true;');
            webRef.current?.injectJavaScript(`setMusicVol(${musicVol});true;`);
          }, 200);
        }}
      />
    </View>
  );
});

export default AudioEngine;
