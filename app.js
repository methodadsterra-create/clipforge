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
  if(RTL.includes($('lang').value))lines.forEach(l=>l.reverse());
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
/* ---- AI helper: Gemini with the user's own free key ---- */
const TEXT_MODEL='gemini-3.8-flash',TTS_MODEL='gemini-3.8-flash-lite-tts',API='https://generativelanguage.googleapis.com/v1beta/models/';
try{$('key').value=localStorage.getItem('cf_key')||''}catch(e){}
$('key').oninput=()=>{try{localStorage.setItem('cf_key',$('key').value.trim())}catch(e){}};
async function gem(model,body){
  const k=$('key').value.trim(),P=window.CF_PROXY;if(!k&&!P)throw new Error('Paste your free Gemini API key first.');
  let r;try{r=await fetch(k?API+model+':generateContent':P.replace(/\/$/,'')+'/'+model,{method:'POST',headers:k?{'content-type':'application/json','x-goog-api-key':k}:{'content-type':'application/json'},body:JSON.stringify(body)})}
  catch(e){throw new Error('Could not reach Google. Check your connection.')}
  const j=await r.json().catch(()=>({}));
  if(r.status===429)throw new Error('The free limit is used up for now. Try again later, or add your own free key (see How to get your free key under More options).');
  if(!r.ok)throw new Error(j.error&&j.error.message||'Request failed ('+r.status+')');
  return j;
}
const b64=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result.split(',')[1]);r.onerror=()=>no(new Error('Could not read the video'));r.readAsDataURL(f)});
async function writeScript(){
  const f=$('ref').files[0],topic=$('topic').value.trim(),link=$('link').value.trim(),n=+$('parts').value,w=$('why'),L=$('partlist');
  if(!f&&!topic&&!link){w.textContent='Paste a TikTok link, add a reference video, or type a topic first.';return}
  if(f&&f.size>18*1048576){w.textContent='That video is over 18 MB. Pick a shorter or smaller clip.';return}
  let ok=false;$('write').disabled=true;L.textContent='';w.textContent='Working on it, this can take up to a minute…';
  try{
    let cap=CAP;
    if(link&&!cap){
      try{const r=await fetch('https://www.tiktok.com/oembed?url='+encodeURIComponent(link));const o=await r.json();cap=[o.title,o.author_name&&'creator: '+o.author_name].filter(Boolean).join(' | ')}catch(e){}
      if(!cap&&!f&&!topic){w.textContent="Could not read that link from the browser. Paste the video's caption or a short description in the topic box, then try again.";$('write').disabled=false;return}
    }
    const ctx=[cap&&'Caption of a TikTok video that did well: '+cap,topic&&'Topic or notes: '+topic].filter(Boolean).join('. ');
    const rules=`Language: ${$('lang').value||'English'}. Write exactly ${n} part${n>1?'s':''}, each about ${$('len').value} words. ${n>1?'This is a series: every part opens with its own hook, stands alone, and ends with a cliffhanger that makes people want the next part. The last part ends with a strong closing line and a call to follow.':'Open with a hook in the first sentence and end with a strong closing line and a call to action.'} Use short punchy sentences and build curiosity. Return JSON only: {"why_it_works":"2 or 3 sentences on what makes the source idea work","parts":[{"title":"short title","script":"spoken words only, no headings, no stage directions"}]}.`;
    const parts=[];
    if(f){parts.push({inline_data:{mime_type:f.type||'video/mp4',data:await b64(f)}});
      parts.push({text:`Watch this reference video and work out why it holds attention: hook, pacing, structure, ending. ${ctx} Then write completely new, original voiceover scripts on the same general theme with a fresh angle. Never copy or closely paraphrase wording from the video. ${rules}`})}
    else parts.push({text:`Create fresh, original short-video voiceover scripts inspired by this. ${ctx} Find a new angle. Never copy or closely paraphrase the wording or story beats of the source. ${rules}`});
    const j=await gem(TEXT_MODEL,{contents:[{parts}],generationConfig:{responseMimeType:'application/json'}});
    const raw=(j.candidates&&j.candidates[0].content.parts.map(x=>x.text||'').join(''))||'';
    let o;try{o=JSON.parse(raw)}catch(e){o={parts:[{title:'Script',script:raw}]}}
    const ps=(o.parts||(o.script?[{title:'Script',script:o.script}]:[])).filter(p=>p&&p.script);
    if(!ps.length)throw new Error('The AI returned no script. Try again.');
    ps.forEach((p,i)=>{const d=document.createElement('div'),b=document.createElement('button');b.className='alt';b.textContent=(ps.length>1?`Part ${i+1}: `:'')+(p.title||'Use this script');b.onclick=()=>{$('script').value=p.script.trim();$('script').scrollIntoView({behavior:'smooth'})};d.append(b);L.append(d)});
    $('script').value=ps[0].script.trim();
    w.textContent=(o.why_it_works?'Why it works: '+o.why_it_works+' ':'')+(ps.length>1?'Tap a part to load it, make its video, then load the next part.':'Script ready below. Edit it freely.');
    ok=true;
  }catch(e){w.textContent='Something went wrong: '+e.message}
  $('write').disabled=false;return ok;
}
$('write').onclick=writeScript;
function wav(n){const v=new DataView(new ArrayBuffer(44)),s=(o,x)=>[...x].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  s(0,'RIFF');v.setUint32(4,36+n,true);s(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,24e3,true);v.setUint32(28,48e3,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,'data');v.setUint32(40,n,true);return v.buffer}
async function aiVoice(text){
  const j=await gem(TTS_MODEL,{contents:[{parts:[{text}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:$('vname').value}}}}});
  const p=((j.candidates&&j.candidates[0].content.parts)||[]).find(x=>x.inlineData||x.inline_data),d=p&&(p.inlineData||p.inline_data);
  if(!d)throw new Error('The voice service returned no audio.');
  const bin=Uint8Array.from(atob(d.data),c=>c.charCodeAt(0)),m=d.mimeType||d.mime_type||'';
  return /wav/i.test(m)?new Blob([bin],{type:'audio/wav'}):new Blob([wav(bin.length),bin],{type:'audio/wav'});
}
/* ---- simple flow: link -> confirm -> video ---- */
let CAP='';const RTL=['Arabic','Hebrew','Persian','Urdu'];
let seq=0,tmr;
async function check(){
  const link=$('link').value.trim(),h=$('hint'),my=++seq;CAP='';$('confirm').hidden=true;
  if(!link){h.textContent='';return}
  if(!/^https?:\/\/([\w-]+\.)?tiktok\.com\//i.test(link)){h.textContent='Paste a full TikTok video link, starting with https://';return}
  h.textContent='Checking the video…';
  let o=null;const P=window.CF_PROXY;
  if(P){try{const r=await fetch(P.replace(/\/$/,'')+'/tiktok?url='+encodeURIComponent(link));o=await r.json()}catch(e){}}
  if(!o||o.title===undefined){try{const r=await fetch('https://www.tiktok.com/oembed?url='+encodeURIComponent(link));o=await r.json()}catch(e){o=null}}
  if(my!==seq)return;
  h.textContent='';
  const th=$('thumb');th.referrerPolicy='no-referrer';th.onerror=()=>{th.hidden=true};th.hidden=!(o&&o.thumbnail_url);th.src=(o&&o.thumbnail_url)||'';
  if(o&&o.title!==undefined){CAP=[o.title,o.author_name&&'creator: '+o.author_name].filter(Boolean).join(' | ');$('cap').textContent=o.title||'(no caption)';$('by').textContent=o.author_name||'';$('manualbox').hidden=true}
  else{$('cap').textContent="We couldn't read this link here. Short links (vm.tiktok.com) sometimes can't be read. Try the full link, or describe the video below.";$('by').textContent='';$('manualbox').hidden=false}
  $('cmsg').textContent='';$('confirm').hidden=false;
}
function showDone(r){
  $('cv').hidden=true;$('prog').hidden=true;$('done').hidden=false;$('msg').textContent='Your video is ready.';
  $('out').src=URL.createObjectURL(r.blob);
  $('dl').onclick=()=>{const x=document.createElement('a');x.href=$('out').src;x.download=r.name;x.click();$('dl').textContent='Downloaded ✓'};
  $('dl').textContent='Download video';$('work').scrollIntoView({behavior:'smooth'});
}
async function go(){
  const m=$('msg');
  if(!$('key').value.trim()&&!window.CF_PROXY){$('more').open=true;$('keyhelp').open=true;$('keyhelp').scrollIntoView({behavior:'smooth'});$('cmsg').textContent='First add your free Gemini key under More options. The guide there shows how, step by step.';return}
  $('cmsg').textContent='';$('confirm').hidden=true;$('work').hidden=false;$('done').hidden=true;$('cv').hidden=false;$('prog').hidden=true;
  m.textContent='Writing a fresh script…';$('work').scrollIntoView({behavior:'smooth'});
  if(!await writeScript()){m.textContent=$('why').textContent||'Could not write the script.';$('confirm').hidden=false;return}
  m.textContent='Creating the voiceover and video…';
  const r=await make();
  if(r)showDone(r);else $('confirm').hidden=false;
}
$('go').onclick=go;
$('keylink').onclick=e=>{e.preventDefault();$('more').open=true;$('keyhelp').open=true;$('keyhelp').scrollIntoView({behavior:'smooth'})};
$('link').oninput=()=>{clearTimeout(tmr);tmr=setTimeout(check,400)};
$('no').onclick=()=>{seq++;$('confirm').hidden=true;$('link').value='';CAP='';$('link').focus()};
$('again').onclick=()=>{$('work').hidden=true;$('done').hidden=true;$('link').value='';$('confirm').hidden=true;CAP='';scrollTo({top:0,behavior:'smooth'})};
/* ---- create ---- */
const audioEl=f=>new Promise((ok,no)=>{const a=new Audio(URL.createObjectURL(f));a.onloadedmetadata=()=>ok(a);a.onerror=()=>no(new Error('Could not read that audio file'))});
async function make(){
  const ws=words();if(!ws.length){$('msg').textContent='Write a script first.';return}
  if(!window.MediaRecorder){$('msg').textContent='This browser cannot record video. Try Chrome.';return}
  $('make').disabled=true;$('work').hidden=false;$('done').hidden=true;$('cv').hidden=false;$('prog').hidden=false;$('msg').textContent='Making your video. Keep the screen on…';
  let ok=false,wl;try{wl=await navigator.wakeLock?.request('screen')}catch(e){}
  const ac=new(window.AudioContext||window.webkitAudioContext)(),dest=ac.createMediaStreamDestination();
  try{
    let vf=$('voice').files[0];const mf=$('music').files[0];
    if(!vf&&$('useai').checked){$('msg').textContent='Creating the AI voiceover…';vf=await aiVoice(ws.join(' '))}
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
    const vrec={id,created:Date.now(),name:`clipforge-${id}.${type.includes('mp4')?'mp4':'webm'}`,blob:new Blob(parts,{type})};await put(vrec);
    $('msg').textContent='Done. Download your video below before it expires.';
    await render();ok=vrec;
  }catch(e){$('msg').textContent='Something went wrong: '+e.message}
  ac.close();wl&&wl.release();$('make').disabled=false;$('prog').hidden=true;idle();return ok;
}
$('make').onclick=async()=>{const r=await make();if(r)showDone(r)};
$('wpm').oninput=e=>$('wpmv').textContent=e.target.value;
['fmt','sub','bg'].forEach(k=>$(k).onchange=idle);
$('bgfile').onchange=e=>{const f=e.target.files[0];if(!f){bgEl=null;return idle()}const u=URL.createObjectURL(f);
  if(f.type.startsWith('video')){bgEl=document.createElement('video');Object.assign(bgEl,{muted:true,loop:true,playsInline:true,src:u});bgEl.onloadeddata=idle}
  else{bgEl=new Image();bgEl.onload=idle;bgEl.src=u}};
idle();render();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
