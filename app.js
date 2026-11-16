const $=id=>document.getElementById(id);
const TTL=864e5,cv=$('cv'),ctx=cv.getContext('2d');
const GR={night:['#0f2027','#2c5364'],sunset:['#ff512f','#dd2476'],ocean:['#2193b0','#6dd5ed'],forest:['#134e5e','#71b280'],gold:['#f7971e','#c9a400'],dark:['#111','#3a3a3a']};
const SZ={'9:16':[720,1280],'1:1':[720,720],'16:9':[1280,720]};
let bgEl=null;
/* ---- storage: IndexedDB, wiped after 24h ---- */
const open=()=>new Promise((ok,no)=>{const r=indexedDB.open('clipforge',1);r.onupgradeneeded=()=>r.result.createObjectStore('v',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
async function tx(mode,fn){const d=await open();return new Promise((ok,no)=>{const t=d.transaction('v',mode);const q=fn(t.objectStore('v'));t.oncomplete=()=>{d.close();ok(q&&q.result)};t.onerror=()=>no(t.error)})}
const put=v=>tx('readwrite',s=>s.put(v)),del=id=>tx('readwrite',s=>s.delete(id)),all=()=>tx('readonly',s=>s.getAll());
async function purge(){for(const v of (await all())||[])if(Date.now()-v.created>TTL)await del(v.id)}
function left(v){const l=v.created+TTL-Date.now(),h=Math.floor(l/36e5);return{l,t:`Deletes in ${h}h ${Math.floor(l%36e5/6e4)}m`}}
async function render(){
  await purge();
  const a=((await all())||[]).sort((x,y)=>y.created-x.created),L=$('list');
  L.textContent='';
  if(!a.length){L.textContent='No videos yet. Create one above.';return}
  for(const v of a){
    const u=URL.createObjectURL(v.blob),d=document.createElement('div'),c=left(v);
    d.className='item'+(c.l<72e5?' low':'');d.dataset.id=v.id;d.dataset.c=v.created;
    d.innerHTML=`<video src="${u}" controls playsinline></video><p class="cd">${c.t}</p>`;
    const b=document.createElement('button');b.textContent='Download';
    b.onclick=()=>{const x=document.createElement('a');x.href=u;x.download=v.name;x.click();b.textContent='Downloaded ✓'};
    const r=document.createElement('button');r.className='alt';r.textContent='Delete now';
    r.onclick=async()=>{await del(v.id);render()};
    d.append(b,r);L.append(d);
  }
}
setInterval(()=>{let exp=0;document.querySelectorAll('.item').forEach(d=>{const c=left({created:+d.dataset.c});if(c.l<=0)exp=1;d.querySelector('.cd').textContent=c.t;d.classList.toggle('low',c.l<72e5)});if(exp)render()},3e4);
/* ---- drawing ---- */
function times(ws,D){const w=ws.map(x=>x.length+2),s=w.reduce((a,b)=>a+b,0);let t=0;return w.map(x=>(t+=x/s*D))}
function frame(t,ws,ends){
  const W=cv.width,H=cv.height;
  const g=ctx.createLinearGradient(0,0,W*.3,H),c=GR[$('bg').value];g.addColorStop(0,c[0]);g.addColorStop(1,c[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(bgEl){const iw=bgEl.videoWidth||bgEl.naturalWidth,ih=bgEl.videoHeight||bgEl.naturalHeight;if(iw){const s=Math.max(W/iw,H/ih);ctx.drawImage(bgEl,(W-iw*s)/2,(H-ih*s)/2,iw*s,ih*s);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,0,W,H)}}
  if(!ws.length)return;
  let i=ends.findIndex(e=>t<e);if(i<0)i=ws.length-1;
  const st=$('sub').value,sz=Math.round(Math.min(W,H)*.085),gap=sz*.3,s0=Math.floor(i/3)*3,ch=ws.slice(s0,s0+3);
  ctx.font=`800 ${sz}px system-ui,sans-serif`;ctx.textBaseline='middle';ctx.textAlign='left';ctx.lineJoin='round';
  const wd=ch.map(w=>ctx.measureText(w).width),tot=wd.reduce((a,b)=>a+b+gap,-gap);
  const lines=tot>W*.9?ch.map((_,k)=>[k]):[ch.map((_,k)=>k)],lh=sz*1.3,y0=H*.68-(lines.length-1)*lh/2;
  lines.forEach((ln,li)=>{
    let x=(W-ln.reduce((a,k)=>a+wd[k]+gap,-gap))/2;const y=y0+li*lh;
    ln.forEach(k=>{
      const cur=s0+k===i;
      if(st==='box'&&cur){ctx.fillStyle='#7c5cff';ctx.fillRect(x-10,y-sz*.62,wd[k]+20,sz*1.24)}
      ctx.lineWidth=sz*.16;ctx.strokeStyle='#000';ctx.strokeText(ch[k],x,y);
      ctx.fillStyle=cur&&st==='karaoke'?'#ffe14d':'#fff';ctx.fillText(ch[k],x,y);x+=wd[k]+gap;
    });
  });
}
const words=()=>$('script').value.trim().split(/\s+/).filter(Boolean);
function idle(){const[w,h]=SZ[$('fmt').value];cv.width=w;cv.height=h;const s='Your words appear here one by one'.split(' ');frame(0,s,times(s,3))}
/* ---- create ---- */
const audioEl=f=>new Promise((ok,no)=>{const a=new Audio(URL.createObjectURL(f));a.onloadedmetadata=()=>ok(a);a.onerror=()=>no(new Error('Could not read that audio file'))});
async function make(){
  const ws=words();if(!ws.length){$('msg').textContent='Write a script first.';return}
  if(!window.MediaRecorder){$('msg').textContent='This browser cannot record video. Try Chrome.';return}
  $('make').disabled=true;$('prog').hidden=false;$('msg').textContent='Making your video. Keep the screen on…';
  let wl;try{wl=await navigator.wakeLock?.request('screen')}catch(e){}
  const ac=new(window.AudioContext||window.webkitAudioContext)(),dest=ac.createMediaStreamDestination();
  try{
    const vf=$('voice').files[0],mf=$('music').files[0];
    const voice=vf?await audioEl(vf):null,music=mf?await audioEl(mf):null;
    if(voice)ac.createMediaElementSource(voice).connect(dest);
    if(music){music.loop=true;const g=ac.createGain();g.gain.value=voice?.12:.5;ac.createMediaElementSource(music).connect(g).connect(dest)}
    const D=(voice?voice.duration:ws.length/$('wpm').value*60)+.6,ends=times(ws,D-.6);
    idle();
    const stream=cv.captureStream(30);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
    const mt=['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||'';
    const rec=new MediaRecorder(stream,{mimeType:mt,videoBitsPerSecond:2.5e6}),parts=[];
    rec.ondataavailable=e=>e.data.size&&parts.push(e.data);
    const done=new Promise(r=>rec.onstop=r);
    rec.start(1000);voice&&voice.play();music&&music.play();bgEl&&bgEl.play&&bgEl.play();
    const t0=performance.now();
    await new Promise(ok=>{(function loop(){const t=(performance.now()-t0)/1e3;if(t>=D)return ok();frame(t,ws,ends);$('prog').value=t/D;requestAnimationFrame(loop)})()});
    rec.stop();await done;
    voice&&voice.pause();music&&music.pause();
    const type=(mt.split(';')[0]||'video/webm'),id=String(Date.now());
    await put({id,created:Date.now(),name:`clipforge-${id}.${type.includes('mp4')?'mp4':'webm'}`,blob:new Blob(parts,{type})});
    $('msg').textContent='Done. Download your video below before it expires.';
    await render();
  }catch(e){$('msg').textContent='Something went wrong: '+e.message}
  ac.close();wl&&wl.release();$('make').disabled=false;$('prog').hidden=true;idle();
}
$('make').onclick=make;
$('wpm').oninput=e=>$('wpmv').textContent=e.target.value;
['fmt','sub','bg'].forEach(k=>$(k).onchange=idle);
$('bgfile').onchange=e=>{const f=e.target.files[0];if(!f){bgEl=null;return idle()}const u=URL.createObjectURL(f);
  if(f.type.startsWith('video')){bgEl=document.createElement('video');Object.assign(bgEl,{muted:true,loop:true,playsInline:true,src:u});bgEl.onloadeddata=idle}
  else{bgEl=new Image();bgEl.onload=idle;bgEl.src=u}};
idle();render();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
