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
let MEDIA=[],STOCK=[],VIS=[],PP=[];
function slide(m,p,a){const W=cv.width,H=cv.height;if(!m.w||!m.h)return;const s=Math.max(W/m.w,H/m.h)*(1+.1*p);ctx.globalAlpha=a;ctx.drawImage(m.el,(W-m.w*s)/2,(H-m.h*s)/2,m.w*s,m.h*s);ctx.globalAlpha=1}
function drawBg(t,D){
  const W=cv.width,H=cv.height,c=GR[$('bg').value],g=ctx.createLinearGradient(0,0,W*.3,H);
  g.addColorStop(0,c[0]);g.addColorStop(1,c[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(let i=0;i<3;i++){const a=t*.35+i*2.1,x=W*(.5+.38*Math.sin(a+i)),y=H*(.5+.38*Math.cos(a*.8+i*1.7)),r=Math.max(W,H)*.5,rg=ctx.createRadialGradient(x,y,0,x,y,r);rg.addColorStop(0,'rgba(255,255,255,.18)');rg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=rg;ctx.fillRect(0,0,W,H)}
  const L=MEDIA.length?MEDIA:STOCK,n=L.length;
  if(n){const seg=D/n,i=Math.min(n-1,Math.floor(t/seg)),el=t-i*seg,m=L[i];
    L.forEach((x,k)=>{if(x.video&&k!==i&&k!==i-1&&!x.el.paused)x.el.pause()});
    if(m.video&&m.el.paused)m.el.play().catch(()=>{});
    if(i>0&&el<.5){slide(L[i-1],1,1);slide(m,el/seg,el/.5)}else slide(m,el/seg,1);
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(0,0,W,H);if(m.credit)credit(m.credit,W,H)}
}
function frame(t,ws,ends){
  const W=cv.width,H=cv.height;
  const D=ends[ends.length-1]||1;drawBg(t,D);
  ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(0,H-8,W*Math.min(1,t/D),8);
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
const TEXT_MODELS=['gemini-3.5-flash-lite','gemini-3.1-flash-lite','gemini-3.8-flash'],TTS_MODEL='gemini-3.8-flash-lite-tts',API='https://generativelanguage.googleapis.com/v1beta/models/';
try{$('key').value=localStorage.getItem('cf_key')||''}catch(e){}
$('key').oninput=()=>{try{localStorage.setItem('cf_key',$('key').value.trim())}catch(e){}};
async function gem(model,body){
  const k=$('key').value.trim(),P=window.CF_PROXY;if(!k&&!P)throw new Error('Paste your free Gemini API key first.');
  const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),150000);let r;
  try{r=await fetch(k?API+model+':generateContent':P.replace(/\/$/,'')+'/'+model,{method:'POST',signal:ctl.signal,headers:k?{'content-type':'application/json','x-goog-api-key':k}:{'content-type':'application/json'},body:JSON.stringify(body)})}
  catch(e){clearTimeout(to);throw new Error(e.name==='AbortError'?'Google took too long to answer. Try a shorter clip, or try again in a minute.':'Could not reach Google. Check your connection.')}
  clearTimeout(to);
  const j=await r.json().catch(()=>({})),d=(j.error&&j.error.message)||'';
  if(!r.ok){const e=new Error(r.status===429?'The free limit is used up for now ('+d.slice(0,120)+'). Try again later, or add your own free key (see How to get your free key under More options).':(d||'Request failed ('+r.status+')'));e.status=r.status;e.detail=d;throw e}
  return j;
}
async function genText(body){let last;for(const m of TEXT_MODELS){try{return await gem(m,body)}catch(e){last=e;if(e.status!==429&&e.status!==404)throw e}}throw last}
const b64=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result.split(',')[1]);r.onerror=()=>no(new Error('Could not read the video'));r.readAsDataURL(f)});
async function writeScript(){
  const f=$('ref').files[0]||((MEDIA.find(m=>m.video&&m.file.size<=18*1048576)||{}).file),topic=$('topic').value.trim(),link=urlOf($('link').value),n=+$('parts').value,w=$('why'),L=$('partlist');
  if(!f&&!topic&&!link){w.textContent='Paste a TikTok link, add a reference video, or type a topic first.';return}
  if(f&&f.size>18*1048576){w.textContent='That video is over 18 MB. Pick a shorter or smaller clip.';return}
  NOTE=false;let ok=false;$('write').disabled=true;L.textContent='';w.textContent='Working on it, this can take up to a minute…';
  try{
    let cap=CAP;
    if(link&&!cap){
      try{const r=await fetch('https://www.tiktok.com/oembed?url='+encodeURIComponent(link));const o=await r.json();cap=[o.title,o.author_name&&'creator: '+o.author_name].filter(Boolean).join(' | ')}catch(e){}
      NOTE=!cap&&!f&&!topic&&!THUMB;
    }
    const ctx=[cap&&'Caption of a TikTok video that did well: '+cap,topic&&'Topic or notes: '+topic].filter(Boolean).join('. ')||(f||THUMB?'':'No caption was available. Choose an interesting, original topic yourself, such as a surprising fact, a short story or a useful tip.');
    const rules=`Language: ${$('lang').value||'English'}. Write exactly ${n} part${n>1?'s':''}, each about ${$('len').value} words. ${n>1?'This is a series: every part opens with its own hook, stands alone, and ends with a cliffhanger that makes people want the next part. The last part ends with a strong closing line and a call to follow.':'Open with a hook in the first sentence and end with a strong closing line and a call to action.'} Use short punchy sentences and build curiosity. Return JSON only: {"why_it_works":"2 or 3 sentences on what makes the source idea work","visuals":["3 or 4 short English search phrases for generic stock photos that match what the script talks about, in order"],"people_places":["up to 3 real people, places or events named in the script, written as Wikimedia Commons search phrases, or an empty list"],"parts":[{"title":"short title","script":"spoken words only, no headings, no stage directions"}]}.`;
    const parts=[];
    if(f){parts.push({inline_data:{mime_type:f.type||'video/mp4',data:await b64(f)}});
      parts.push({text:`Watch this reference video and work out why it holds attention: hook, pacing, structure, ending. ${ctx} Then write completely new, original voiceover scripts on the same general theme with a fresh angle. Never copy or closely paraphrase wording from the video. ${rules}`})}
    else{const th=!cap&&!topic&&THUMB;if(th)parts.push({inline_data:{mime_type:THUMB.mime,data:THUMB.data}});
      parts.push({text:`Create fresh, original short-video voiceover scripts inspired by this. ${th?'The image is the thumbnail of a TikTok video. Work out what the video is probably about from what you can see (scene, objects, place, event) and never identify real people from their faces. ':''}${ctx} Find a new angle. Never copy or closely paraphrase the wording or story beats of the source. ${rules}`})}
    const j=await genText({contents:[{parts}],generationConfig:{responseMimeType:'application/json'}});
    const raw=(j.candidates&&j.candidates[0].content.parts.map(x=>x.text||'').join(''))||'';
    let o;try{o=JSON.parse(raw)}catch(e){o={parts:[{title:'Script',script:raw}]}}
    VIS=Array.isArray(o.visuals)?o.visuals.filter(x=>typeof x==='string'&&x.trim()).slice(0,4):[];
    PP=Array.isArray(o.people_places)?o.people_places.filter(x=>typeof x==='string'&&x.trim()).slice(0,3):[];
    const ps=(o.parts||(o.script?[{title:'Script',script:o.script}]:[])).filter(p=>p&&p.script);
    if(!ps.length)throw new Error('The AI returned no script. Try again.');
    ps.forEach((p,i)=>{const d=document.createElement('div'),b=document.createElement('button');b.className='alt';b.textContent=(ps.length>1?`Part ${i+1}: `:'')+(p.title||'Use this script');b.onclick=()=>{$('script').value=p.script.trim();$('script').scrollIntoView({behavior:'smooth'})};d.append(b);L.append(d)});
    $('script').value=ps[0].script.trim();
    w.textContent=(o.why_it_works?'Why it works: '+o.why_it_works+' ':'')+(ps.length>1?'Tap a part to load it, make its video, then load the next part.':'Script ready below. Edit it freely.');
    ok=true;lastKey=inputKey();
  }catch(e){w.textContent='Something went wrong: '+e.message}
  $('write').disabled=false;return ok;
}
$('write').onclick=writeScript;
function wav(n){const v=new DataView(new ArrayBuffer(44)),s=(o,x)=>[...x].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  s(0,'RIFF');v.setUint32(4,36+n,true);s(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,24e3,true);v.setUint32(28,48e3,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,'data');v.setUint32(40,n,true);return v.buffer}
async function aiVoice(text){
  const tbody={contents:[{parts:[{text}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:$('vname').value}}}}};
  let j;try{j=await gem(TTS_MODEL,tbody)}catch(e){if(e.status===429&&!/per ?day/i.test(e.detail||'')){await new Promise(r=>setTimeout(r,25000));j=await gem(TTS_MODEL,tbody)}else throw e}
  const p=((j.candidates&&j.candidates[0].content.parts)||[]).find(x=>x.inlineData||x.inline_data),d=p&&(p.inlineData||p.inline_data);
  if(!d)throw new Error('The voice service returned no audio.');
  const bin=Uint8Array.from(atob(d.data),c=>c.charCodeAt(0)),m=d.mimeType||d.mime_type||'';
  return /wav/i.test(m)?new Blob([bin],{type:'audio/wav'}):new Blob([wav(bin.length),bin],{type:'audio/wav'});
}
/* ---- simple flow: link -> confirm -> video ---- */
let CAP='';const RTL=['Arabic','Hebrew','Persian','Urdu'];
let seq=0,tmr,creepT,lastP=-1,lastL='',FLOW=false,NOTE=false,lastKey='',SURPRISE=false,THUMB=null;
function inputKey(){return [urlOf($('link').value),$('topic').value.trim(),$('lang').value,$('len').value,$('parts').value,($('ref').files[0]||{}).name,MEDIA.map(m=>m.file&&m.file.name+m.file.size).join(',')].join('|')}
function setP(p,l){p=Math.min(100,Math.max(0,p));const r=Math.round(p);if(r===lastP&&l===lastL)return;lastP=r;lastL=l;$('prog').hidden=false;$('prog').value=p/100;$('msg').textContent=l+' · '+r+'%'}
function stopCreep(){clearInterval(creepT)}
function creep(a,b,l){stopCreep();let p=a;setP(p,l);creepT=setInterval(()=>{p+=(b-p)*.05;setP(p,l)},700)}
const hasInfo=o=>!!(o&&(o.title!==undefined||o.author_name||o.thumbnail_url||o.html));
function urlOf(s){const m=(s||'').match(/https?:\/\/[^\s]+/i);return m?m[0]:(s||'').trim()}
async function check(){
  const link=urlOf($('link').value),h=$('hint'),my=++seq;CAP='';$('confirm').hidden=true;
  if(!link){h.textContent='';return}
  if(!/^https?:\/\/([\w-]+\.)?tiktok\.com\//i.test(link)){h.textContent='Paste a full TikTok video link, starting with https://';return}
  h.textContent='Checking the video…';
  let o=null,dbg=[];const P=window.CF_PROXY;
  if(P){try{const r=await fetch(P.replace(/\/$/,'')+'/tiktok?url='+encodeURIComponent(link));o=await r.json();if(!hasInfo(o))dbg.push('relay: '+((o.error&&o.error.message)||o.message||('status '+r.status+' '+JSON.stringify(o).slice(0,140))))}catch(e){dbg.push('relay: '+e.message)}}else dbg.push('relay address not set');
  if(!hasInfo(o)){try{const r=await fetch('https://www.tiktok.com/oembed?url='+encodeURIComponent(link));o=await r.json()}catch(e){o=null;dbg.push('direct: '+e.message)}}
  if(my!==seq)return;
  h.textContent='';
  THUMB=(o&&o.thumb_b64)?{mime:o.thumb_mime||'image/jpeg',data:o.thumb_b64}:null;
  const th=$('thumb');th.referrerPolicy='no-referrer';th.onerror=()=>{th.hidden=true};th.hidden=!(o&&o.thumbnail_url);th.src=(o&&o.thumbnail_url)||'';
  if(hasInfo(o)){CAP=[o.title,o.author_name&&'creator: '+o.author_name].filter(Boolean).join(' | ');$('cap').textContent=o.title||'Video found';$('by').textContent=o.author_name||'';}
  else{$('cap').textContent="We couldn't read this link here. Short links (vm.tiktok.com) sometimes can't be read. Try the full link, or describe the video below.";$('by').textContent='';$('manualbox').hidden=false}
  const em=$('embed');em.textContent='';const sm=o&&o.html&&String(o.html).match(/src="(https:\/\/www\.tiktok\.com\/(?:player|embed)[^"]*)"/i);
  if(sm&&!(o&&o.thumbnail_url)){const f=document.createElement('iframe');f.src=sm[1].replace(/&amp;/g,'&');f.setAttribute('allow','fullscreen');f.setAttribute('loading','lazy');em.append(f)}
  $('cmsg').textContent=hasInfo(o)?'':'Details: '+dbg.join(' | ');$('surprise').hidden=!!(CAP||THUMB);$('confirm').hidden=false;
}
function showDone(r){
  $('cv').hidden=true;$('prog').hidden=true;$('done').hidden=false;$('msg').textContent='Your video is ready.'+(NOTE?' No caption was found, so the AI chose its own topic. Add a note next time to steer it.':'')+((MEDIA.length||STOCK.length)?'':' Tip: stock visuals are not set up yet. Add your own footage on the confirm card so there is video behind the subtitles.');$('tip').hidden=true;
  $('out').src=URL.createObjectURL(r.blob);
  const cr=MEDIA.length?[]:[...new Set(STOCK.map(s=>s.credit))];$('creditbox').hidden=!cr.length;$('credits').value=cr.join('\n');
  $('dl').onclick=()=>{const x=document.createElement('a');x.href=$('out').src;x.download=r.name;x.click();$('dl').textContent='Downloaded ✓'};
  $('dl').textContent='Download video';$('work').scrollIntoView({behavior:'smooth'});
}
async function go(){
  const m=$('msg');
  if(!$('key').value.trim()&&!window.CF_PROXY){$('more').open=true;$('keyhelp').open=true;$('keyhelp').scrollIntoView({behavior:'smooth'});$('cmsg').textContent='First add your free Gemini key under More options. The guide there shows how, step by step.';return}
  if(MEDIA.length&&!$('rights').checked){$('cmsg').textContent='Tick the box to confirm you own this footage or have permission to use it.';return}
  if(!CAP&&!$('topic').value.trim()&&!MEDIA.some(m=>m.video)&&!THUMB&&!SURPRISE){$('cmsg').textContent='ClipForge could not read this video, so it does not know what it is about. Type one sentence about it in the note box, or add the video under Your footage. Or tap Surprise me to let the AI pick any topic.';$('surprise').hidden=false;return}
  $('cmsg').textContent='';$('confirm').hidden=true;$('work').hidden=false;$('done').hidden=true;$('cv').hidden=false;$('tip').hidden=false;lastP=-1;
  FLOW=true;creep(2,27,'Writing a fresh script');$('work').scrollIntoView({behavior:'smooth'});
  let okS=true;if(!($('script').value.trim()&&lastKey===inputKey()))okS=await writeScript();
  stopCreep();
  if(!okS){FLOW=false;$('prog').hidden=true;m.textContent=$('why').textContent||'Could not write the script.';$('confirm').hidden=false;return}
  setP(29,'Script ready');
  if(!MEDIA.length){setP(30,'Finding visuals');await getStock(VIS,PP)}
  const r=await make();FLOW=false;
  if(r)showDone(r);else{$('prog').hidden=true;$('confirm').hidden=false}
}
$('go').onclick=go;
$('surprise').onclick=async()=>{SURPRISE=true;await go();SURPRISE=false};
$('keylink').onclick=e=>{e.preventDefault();$('more').open=true;$('keyhelp').open=true;$('keyhelp').scrollIntoView({behavior:'smooth'})};
$('link').oninput=()=>{lastKey='';clearTimeout(tmr);tmr=setTimeout(check,400)};
$('no').onclick=()=>{seq++;$('confirm').hidden=true;$('link').value='';CAP='';$('link').focus()};
$('again').onclick=()=>{$('work').hidden=true;$('done').hidden=true;$('link').value='';$('confirm').hidden=true;CAP='';scrollTo({top:0,behavior:'smooth'})};
async function commons(q){
  const u='https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch='+encodeURIComponent(q+' filetype:bitmap')+'&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1000';
  const j=await (await fetch(u)).json(),pages=Object.values((j.query&&j.query.pages)||{}).sort((a,b)=>a.index-b.index),out=[];
  for(const p of pages){
    const ii=p.imageinfo&&p.imageinfo[0];if(!ii||!/^image\/(jpeg|png)$/.test(ii.mime)||ii.width<500||!ii.thumburl)continue;
    const x=ii.extmetadata||{},lic=(x.LicenseShortName&&x.LicenseShortName.value)||'',art=((x.Artist&&x.Artist.value)||'').replace(/<[^>]*>/g,'').trim().slice(0,50);
    if(!lic||/non-?free|fair use/i.test(lic))continue;
    out.push({src:ii.thumburl,credit:(art?art+' · ':'')+lic+' · Wikimedia Commons'});if(out.length>=3)break;
  }
  return out;
}
async function commonsVideo(q){
  const u='https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=10&gsrsearch='+encodeURIComponent(q+' filetype:video')+'&prop=videoinfo&viprop=url|size|mime|extmetadata|derivatives';
  const j=await (await fetch(u)).json(),pages=Object.values((j.query&&j.query.pages)||{}).sort((a,b)=>a.index-b.index),tv=document.createElement('video');
  for(const p of pages){
    const ii=p.videoinfo&&p.videoinfo[0];if(!ii)continue;
    const x=ii.extmetadata||{},lic=(x.LicenseShortName&&x.LicenseShortName.value)||'',art=((x.Artist&&x.Artist.value)||'').replace(/<[^>]*>/g,'').trim().slice(0,50);
    if(!lic||/non-?free|fair use/i.test(lic))continue;
    const ds=(ii.derivatives||[]).filter(d=>d.src&&d.type&&tv.canPlayType(d.type)).sort((a,b)=>a.width-b.width),d=ds.find(d=>d.width>=360)||ds[ds.length-1];
    if(d)return{src:d.src,credit:(art?art+' · ':'')+lic+' · Wikimedia Commons (video)'};
  }
  return null;
}
function loadClip(c){return new Promise(res=>{
  const v=document.createElement('video');v.crossOrigin='anonymous';v.muted=true;v.loop=true;v.playsInline=true;v.preload='auto';
  let tm;const done=ok=>{clearTimeout(tm);res(ok?{el:v,video:true,w:v.videoWidth,h:v.videoHeight,credit:c.credit}:null)};
  tm=setTimeout(()=>done(false),12000);v.onloadeddata=()=>done(v.videoWidth>0);v.onerror=()=>done(false);v.src=c.src;
})}
async function getStock(vis,pp){
  STOCK.forEach(s=>{if(s.video){s.el.pause();s.el.removeAttribute('src');s.el.load()}});STOCK=[];
  const base=(window.CF_PROXY||'').replace(/\/$/,''),A=[],B=[];
  try{(await Promise.all((pp||[]).slice(0,3).map(q=>commons(q).catch(()=>[])))).forEach(a=>A.push(...a.slice(0,2)))}catch(e){}
  let vc=[];try{vc=(await Promise.all((pp||[]).slice(0,2).map(q=>commonsVideo(q).catch(()=>null)))).filter(Boolean)}catch(e){}
  if(base&&vis&&vis.length){try{const j=await (await fetch(base+'/stock?q='+encodeURIComponent(vis.slice(0,4).join('|')))).json();(j.photos||[]).slice(0,6).forEach(p=>B.push({src:base+'/img?u='+encodeURIComponent(p.src),credit:'Photo: '+(p.by||'Pexels')+' · Pexels'}))}catch(e){}}
  const seq=[];let ai=0;for(const c of vc){seq.push(...A.slice(ai,ai+2));ai+=2;seq.push({clip:c})}seq.push(...A.slice(ai),...B);
  const use=seq.slice(0,12);let done=0;
  await Promise.all(use.map(async(p,i)=>{
    try{
      if(p.clip)STOCK[i]=await loadClip(p.clip);
      else{const bmp=await createImageBitmap(await (await fetch(p.src)).blob()),k=Math.min(1,1280/Math.max(bmp.width,bmp.height)),c=document.createElement('canvas');
        c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);bmp.close&&bmp.close();STOCK[i]={el:c,w:c.width,h:c.height,credit:p.credit}}
    }catch(e){}
    done++;setP(30+14*done/use.length,'Finding visuals');
  }));
  STOCK=STOCK.filter(Boolean);return STOCK.length>0;
}
function credit(s,W,H){let fs=Math.round(W*.032);ctx.font='500 '+fs+'px system-ui,sans-serif';while(ctx.measureText(s).width>W-32&&fs>11){fs--;ctx.font='500 '+fs+'px system-ui,sans-serif'}
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.8)';ctx.strokeText(s,16,H-24);ctx.fillStyle='rgba(255,255,255,.92)';ctx.fillText(s,16,H-24)}
/* ---- create ---- */
const audioEl=f=>new Promise((ok,no)=>{const a=new Audio(URL.createObjectURL(f));a.onloadedmetadata=()=>ok(a);a.onerror=()=>no(new Error('Could not read that audio file'))});
async function make(){
  const ws=words();if(!ws.length){$('msg').textContent='Write a script first.';return}
  if(MEDIA.length&&!$('rights').checked){$('work').hidden=false;$('msg').textContent='Tick the box to confirm you own this footage or have permission to use it.';return}
  if(!window.MediaRecorder){$('msg').textContent='This browser cannot record video. Try Chrome.';return}
  $('make').disabled=true;$('work').hidden=false;$('done').hidden=true;$('cv').hidden=false;const lo=FLOW?45:0,span=FLOW?55:100;lastP=-1;setP(lo+1,'Getting ready');
  let ok=false,wl;try{wl=await navigator.wakeLock?.request('screen')}catch(e){}
  const ac=new(window.AudioContext||window.webkitAudioContext)(),dest=ac.createMediaStreamDestination();
  try{
    let vf=$('voice').files[0];const mf=$('music').files[0];
    if(!vf&&$('useai').checked){creep(lo+span*.03,lo+span*.37,'Creating the voiceover');vf=await aiVoice(ws.join(' '));stopCreep()}
    const voice=vf?await audioEl(vf):null,music=mf?await audioEl(mf):null;
    if(voice)ac.createMediaElementSource(voice).connect(dest);
    if(music){music.loop=true;const g=ac.createGain();g.gain.value=voice?.12:.5;ac.createMediaElementSource(music).connect(g).connect(dest)}
    let orig=null;const kv=MEDIA.find(m=>m.video);
    if($('keepaudio').checked&&kv){orig=new Audio(kv.url);orig.loop=true;const og=ac.createGain();og.gain.value=.15;ac.createMediaElementSource(orig).connect(og).connect(dest)}
    const D=(voice?voice.duration:ws.length/$('wpm').value*60)+.6,ends=times(ws,D-.6);
    idle();
    const stream=cv.captureStream(30);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
    const mt=['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||'';
    const rec=new MediaRecorder(stream,{mimeType:mt,videoBitsPerSecond:2.5e6}),parts=[];
    rec.ondataavailable=e=>e.data.size&&parts.push(e.data);
    const done=new Promise(r=>rec.onstop=r);
    rec.start(1000);[...MEDIA,...STOCK].forEach(m=>{if(m.video)m.el.currentTime=0});voice&&voice.play();music&&music.play();orig&&orig.play();
    setP(lo+span*.4,'Making the video');
    const t0=performance.now();
    await new Promise(ok=>{(function loop(){const t=(performance.now()-t0)/1e3;if(t>=D)return ok();frame(t,ws,ends);setP(lo+span*(.4+.58*t/D),'Making the video');requestAnimationFrame(loop)})()});
    rec.stop();await done;setP(lo+span*.99,'Saving your video');
    voice&&voice.pause();music&&music.pause();orig&&orig.pause();[...MEDIA,...STOCK].forEach(m=>m.video&&m.el.pause());
    const type=(mt.split(';')[0]||'video/webm'),id=String(Date.now());
    const vrec={id,created:Date.now(),name:`clipforge-${id}.${type.includes('mp4')?'mp4':'webm'}`,blob:new Blob(parts,{type})};await put(vrec);
    $('msg').textContent='Done. Download your video below before it expires.';
    await render();ok=vrec;
  }catch(e){$('msg').textContent='Something went wrong: '+e.message}
  stopCreep();ac.close();wl&&wl.release();$('make').disabled=false;$('prog').hidden=true;idle();return ok;
}
$('make').onclick=async()=>{const r=await make();if(r)showDone(r)};
$('wpm').oninput=e=>$('wpmv').textContent=e.target.value;
['fmt','sub','bg'].forEach(k=>$(k).onchange=idle);
$('bgfile').onchange=async e=>{
  MEDIA=[];$('mediainfo').textContent='Loading…';
  for(const f of [...e.target.files].slice(0,8)){
    if(f.type.startsWith('video')){const v=document.createElement('video');const u=URL.createObjectURL(f);Object.assign(v,{muted:true,loop:true,playsInline:true,src:u});await new Promise(r=>{v.onloadeddata=r;v.onerror=r});MEDIA.push({el:v,video:true,url:u,file:f,w:v.videoWidth,h:v.videoHeight})}
    else{const bmp=await createImageBitmap(f).catch(()=>null);if(!bmp)continue;const k=Math.min(1,1280/Math.max(bmp.width,bmp.height)),c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);bmp.close&&bmp.close();MEDIA.push({el:c,file:f,w:c.width,h:c.height})}
  }
  $('mediainfo').textContent=MEDIA.length?MEDIA.length+' file(s) added. They play one after another in your video.':'Without these, the video uses a moving colour background. Only use media you own or may use.';idle();
};
idle();render();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
