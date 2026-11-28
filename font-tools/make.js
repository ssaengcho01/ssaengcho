/* 탭 2: 이미지로 폰트 만들기 */
(function(){
"use strict";
const $=s=>document.querySelector(s);
const ALL="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
let meta=[], labels=[], selected=0, sheetCount=0, result=null, fontUrl=null;

function toast(msg){ window.App && App.toast(msg); }
function busy(on, text){
  let el=$("#busy");
  if(on){ if(!el){ el=document.createElement("div"); el.id="busy"; el.className="busy"; document.body.appendChild(el);} el.textContent=text||"처리 중…"; }
  else if(el) el.remove();
}
const nextFrame=()=>new Promise(r=>setTimeout(r,30));

function setStep(n){
  document.querySelectorAll(".steps li").forEach(li=>{
    const s=+li.dataset.step; li.classList.toggle("on", s===n); li.classList.toggle("done", s<n);
  });
  $("#step2").hidden = n<2; $("#step3").hidden = n<3;
}

async function loadImage(file){
  const url=URL.createObjectURL(file);
  const img=new Image(); img.src=url; await img.decode();
  let W=img.naturalWidth, H=img.naturalHeight;
  const k=Math.min(1, 3400/Math.max(W,H)); W=Math.round(W*k); H=Math.round(H*k);
  const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  const ctx=cv.getContext("2d"); ctx.fillStyle="#fff"; ctx.fillRect(0,0,W,H); ctx.drawImage(img,0,0,W,H);
  return {url, W, H, data:ctx.getImageData(0,0,W,H).data};
}

async function addFiles(files){
  files=[...files].filter(f=>f.type.startsWith("image/"));
  if(!files.length) return;
  busy(true,"글자를 찾는 중…"); await nextFrame();
  try{
    for(const f of files){
      const im=await loadImage(f);
      const th=document.createElement("img"); th.src=im.url; th.title=f.name; $("#sheetList").appendChild(th);
      const segs=FontCore.segment(im.data, im.W, im.H, sheetCount++);
      const base=meta.length;
      segs.forEach((c,j)=>{ c.i=base+j; meta.push(c); labels.push(""); });
      if(!segs.length) toast(f.name+"에서 글자를 못 찾았어요");
    }
    autoLabel();
    renderCells();
    setStep(2);
    $("#step2").scrollIntoView({behavior:"smooth", block:"start"});
  }catch(e){ console.error(e); toast("이미지를 읽지 못했어요"); }
  finally{ busy(false); }
}

/* 26/52/62개면 알파벳 순서로 자동 이름 붙이기. 여러 장이면 장마다 판단 */
function autoLabel(){
  const bySheet={};
  meta.forEach(c=>(bySheet[c.sheet]=bySheet[c.sheet]||[]).push(c));
  const sheets=Object.keys(bySheet).map(Number).sort((a,b)=>a-b);
  const used=new Set(labels.filter(Boolean));
  sheets.forEach(s=>{
    const list=bySheet[s];
    if(list.some(c=>labels[c.i])) return;
    const n=list.length;
    let seq=null;
    if(n===62) seq=ALL;
    else if(n===52) seq=ALL.slice(0,52);
    else if(n===26) seq = used.has("A") ? ALL.slice(26,52) : ALL.slice(0,26);
    else if(n===10) seq="0123456789";
    if(seq){ list.forEach((c,j)=>{ labels[c.i]=seq[j]; used.add(seq[j]); }); }
  });
  const named=labels.filter(Boolean).length;
  $("#segCount").textContent=meta.length+"칸";
  $("#segHint").textContent = named
    ? "순서대로 글자 이름을 붙였어요. 틀린 칸만 고쳐 주세요."
    : "글자 수가 표준(26·52·62개)이 아니라서 자동으로 이름을 못 붙였어요. 첫 글자 칸을 클릭하고 '선택한 칸부터 채우기'를 누른 뒤, 틀린 칸만 고쳐 주세요.";
}

function drawCrop(c){
  const cv=document.createElement("canvas"); cv.width=c.cropW; cv.height=c.cropH;
  const ctx=cv.getContext("2d"); const id=ctx.createImageData(c.cropW,c.cropH);
  for(let k=0;k<c.bin.length;k++){ const v=c.bin[k]?20:255; id.data[k*4]=id.data[k*4+1]=id.data[k*4+2]=v; id.data[k*4+3]=255; }
  ctx.putImageData(id,0,0); return cv;
}
function renderCells(){
  const box=$("#cells"); box.innerHTML="";
  let prevRow=null;
  meta.forEach((c,idx)=>{
    const d=document.createElement("div"); d.className="cell"; d.dataset.idx=idx;
    if(c.row!==prevRow) d.classList.add("rowstart"); prevRow=c.row;
    d.appendChild(drawCrop(c));
    const inp=document.createElement("input"); inp.maxLength=1; inp.value=labels[idx]; inp.setAttribute("aria-label",(idx+1)+"번 칸 글자");
    inp.addEventListener("input",()=>{ labels[idx]=inp.value.trim(); refreshFlags(); });
    inp.addEventListener("focus",()=>select(idx));
    d.appendChild(inp);
    d.addEventListener("click",e=>{ if(e.target!==inp) select(idx); });
    box.appendChild(d);
  });
  select(Math.min(selected, meta.length-1));
  refreshFlags();
}
function select(i){ selected=Math.max(0,i); document.querySelectorAll(".cell").forEach(el=>el.classList.toggle("sel", +el.dataset.idx===selected)); }
function refreshFlags(){
  const seen={};
  document.querySelectorAll(".cell").forEach(el=>{
    const i=+el.dataset.idx, v=labels[i];
    const ok=v && FontCore.isAllowed(v);
    el.classList.toggle("skip", !ok);
    el.classList.toggle("dup", !!(ok && seen[v])); if(ok) seen[v]=1;
    el.querySelector("input").value=v||"";
  });
}

function fillFrom(){
  const seq=$("#fillPreset").value;
  for(let j=0;j<seq.length && selected+j<meta.length;j++) labels[selected+j]=seq[j];
  refreshFlags();
}

async function build(){
  const name=$("#fontName").value.trim() || "My Font";
  const lab={}; labels.forEach((v,i)=>{ if(v) lab[i]=v; });
  if(!Object.keys(lab).length){ toast("글자 이름이 붙은 칸이 없어요"); return; }
  busy(true,"폰트를 만드는 중…"); await nextFrame();
  try{
    result=FontCore.buildFont(meta, lab, name);
    result.name=name;
    await showResult();
    setStep(3);
    $("#step3").scrollIntoView({behavior:"smooth", block:"start"});
  }catch(e){ console.error(e); toast("만들지 못했어요: "+e.message); }
  finally{ busy(false); }
}

async function showResult(){
  const ff=new FontFace("MadeFont", result.buffer);
  await ff.load();
  document.fonts.forEach(f=>{ if(f.family==="MadeFont" || f.family==='"MadeFont"') document.fonts.delete(f); });
  document.fonts.add(ff);
  if(fontUrl) URL.revokeObjectURL(fontUrl);
  fontUrl=URL.createObjectURL(new Blob([result.buffer],{type:"font/otf"}));
  $("#resName").textContent=result.name;
  $("#resCount").textContent=result.count+"자";
  const have=new Set(result.chars);
  const groups=[/[A-Z]/,/[a-z]/,/[0-9]/,null].map(re=>[...result.chars].filter(c=>re?re.test(c):!/[A-Za-z0-9]/.test(c)).sort().join(""));
  $("#resChars").innerHTML=groups.filter(Boolean).map(s=>s.replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))).join("<br>");
  const missing=[...ALL].filter(c=>!have.has(c)).join("");
  $("#resMissing").textContent = missing ? "빠진 글자: "+missing+" (이 글자들은 기본 글꼴로 보여요)" : "";
  const sample=[...have].some(c=>/[a-z]/.test(c)) ? "Hello World!" : "HELLO WORLD!";
  $("#tt").value=sample;
}

function download(){
  if(!fontUrl) return;
  const safe=(result.name||"MyFont").replace(/[\\/:*?"<>|]/g,"").trim()||"MyFont";
  const a=document.createElement("a"); a.href=fontUrl; a.download=safe+".otf"; document.body.appendChild(a); a.click(); a.remove();
}

function init(){
  const drop=$("#drop"), inp=$("#fileIn");
  inp.addEventListener("change",()=>{ addFiles(inp.files); inp.value=""; });
  ["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault(); drop.classList.add("over");}));
  ["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault(); drop.classList.remove("over");}));
  drop.addEventListener("drop",e=>addFiles(e.dataTransfer.files));
  $("#fillBtn").addEventListener("click",fillFrom);
  $("#clearBtn").addEventListener("click",()=>{ labels=labels.map(()=> ""); refreshFlags(); });
  $("#buildBtn").addEventListener("click",build);
  $("#dlBtn").addEventListener("click",download);
  $("#fontName").addEventListener("input",e=>{ $("#nameWarn").hidden=!/[^\x00-\x7F]/.test(e.target.value); });
  $("#copyPrompt").addEventListener("click",()=>{ navigator.clipboard.writeText($("#promptText").textContent).then(()=>toast("프롬프트를 복사했어요")); });
  const sz=$("#ttSize"); sz.addEventListener("input",()=>{ $("#tt").style.fontSize=sz.value+"px"; $("#ttSizeV").textContent=sz.value+"px"; });
}
document.addEventListener("DOMContentLoaded", init);
})();
