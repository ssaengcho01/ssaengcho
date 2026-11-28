/* 이미지 → 폰트(OTF) 변환 엔진 — 브라우저/Node 공용
 * 원본: image-to-fonts 스킬의 pipeline.js (윤곽 정수화 패치 포함)
 * + 파이썬 후처리(이름 표 정리, GPOS 커닝)를 자바스크립트로 옮김 */
(function(root, factory){
  if(typeof module==="object" && module.exports) module.exports=factory(require("./opentype.min.js"));
  else root.FontCore=factory(root.opentype);
})(typeof self!=="undefined"?self:this, function(opentype){
"use strict";
const clamp = (v,a,b)=>Math.min(b,Math.max(a,v));

/* ================= 윤곽 추적 ================= */
function traceBinary(bin, W, H){
  const ink=(x,y)=>(x>=0&&x<W&&y>=0&&y<H)?bin[y*W+x]:0;
  const seen=new Set(), loops=[];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(ink(x,y)&&!ink(x-1,y)&&!seen.has(x+","+y)){
      let cx=x, cy=y, dir=2;
      const sx=x, sy=y, sdir=2, pts=[[cx,cy]];
      let guard=W*H*4;
      do{
        if(dir===2) seen.add(cx+","+cy);
        if(dir===0) cy--; else if(dir===1) cx++; else if(dir===2) cy++; else cx--;
        const valid=nd=>{
          if(nd===0) return ink(cx-1,cy-1)&&!ink(cx,cy-1);
          if(nd===1) return ink(cx,cy-1)&&!ink(cx,cy);
          if(nd===2) return ink(cx,cy)&&!ink(cx-1,cy);
          return ink(cx-1,cy)&&!ink(cx-1,cy-1);
        };
        const cand=[(dir+3)%4, dir, (dir+1)%4];
        const nd=cand.find(valid);
        if(nd===undefined) break;
        if(nd!==dir) pts.push([cx,cy]);
        dir=nd;
      } while((cx!==sx||cy!==sy||dir!==sdir) && --guard>0);
      if(pts.length>=4) loops.push(pts);
    }
  }
  return loops;
}
function rdp(pts, eps){
  if(pts.length<3) return pts;
  const keep=new Array(pts.length).fill(false);
  keep[0]=keep[pts.length-1]=true;
  const stack=[[0,pts.length-1]];
  while(stack.length){
    const [a,b]=stack.pop();
    let dmax=0, idx=-1;
    const [x1,y1]=pts[a], [x2,y2]=pts[b];
    const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy)||1;
    for(let i=a+1;i<b;i++){
      const d=Math.abs(dy*pts[i][0]-dx*pts[i][1]+x2*y1-y2*x1)/len;
      if(d>dmax){dmax=d;idx=i;}
    }
    if(dmax>eps){ keep[idx]=true; stack.push([a,idx],[idx,b]); }
  }
  return pts.filter((_,i)=>keep[i]);
}
function rdpClosed(pts, eps){
  if(pts.length>1){
    const a=pts[0], b=pts[pts.length-1];
    if(a[0]===b[0]&&a[1]===b[1]) pts=pts.slice(0,-1);
  }
  if(pts.length<4) return pts;
  let far=1, dm=-1;
  for(let i=1;i<pts.length;i++){
    const d=(pts[i][0]-pts[0][0])**2+(pts[i][1]-pts[0][1])**2;
    if(d>dm){dm=d;far=i;}
  }
  const p1=rdp(pts.slice(0,far+1),eps);
  const p2=rdp(pts.slice(far).concat([pts[0]]),eps);
  return p1.slice(0,-1).concat(p2.slice(0,-1));
}
function cornerFlags(pts){
  const n=pts.length, out=new Array(n).fill(false);
  for(let i=0;i<n;i++){
    const p=pts[(i-1+n)%n], v=pts[i], q=pts[(i+1)%n];
    const a=[v[0]-p[0],v[1]-p[1]], b=[q[0]-v[0],q[1]-v[1]];
    const la=Math.hypot(a[0],a[1])||1, lb=Math.hypot(b[0],b[1])||1;
    out[i] = (a[0]*b[0]+a[1]*b[1])/(la*lb) < 0.32; /* 약 71도 이상 꺾일 때만 각진 코너로 처리 → 나머지는 부드러운 곡선 */
  }
  return out;
}
function glyphFromCrop(bin, W, H, baselinePx, scale, leftSB, rightSB){
  leftSB = leftSB||50; rightSB = (rightSB===undefined?leftSB:rightSB);
  let minx=1e9, has=false;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(bin[y*W+x]){ has=true; if(x<minx)minx=x; }
  if(!has) return null;
  const loops=[];
  let maxxEm=0;
  traceBinary(bin,W,H).forEach(raw=>{
    let bx0=1e9,bx1=-1e9,by0=1e9,by1=-1e9;
    raw.forEach(([x,y])=>{bx0=Math.min(bx0,x);bx1=Math.max(bx1,x);by0=Math.min(by0,y);by1=Math.max(by1,y);});
    if(bx1-bx0<3 && by1-by0<3) return;
    const simp=rdpClosed(raw, Math.max(1.15, H*0.004));
    if(simp.length<3) return;
    let pts=simp.map(([x,y])=>{
      const ex=Math.round((x-minx)*scale)+leftSB, ey=Math.round((baselinePx-y)*scale);
      if(ex>maxxEm) maxxEm=ex;
      return [ex,ey];
    });
    /* em 좌표로 확대할 때 점마다 독립적으로 반올림하면서 생기는 미세한 어긋남(계단 현상) 제거.
       원본 픽셀 좌표에서는 완벽히 일직선이던 구간이, 5~6배 확대 후 각 점을 따로 반올림하면
       서로 다른 방향으로 반올림돼 미세한 지그재그가 생긴다. 반올림 이후 한 번 더 아주 작은
       허용오차로 단순화해서 이 지그재그를 제거한다(진짜 곡선/코너는 이 정도 오차보다 크므로 안 지워짐). */
    pts = rdpClosed(pts, 2.2);
    loops.push({pts, corners:cornerFlags(pts)});
  });
  if(!loops.length) return null;
  return {adv:maxxEm+rightSB, loops};
}
function loopsToPath(pathObj, loops){
  loops.forEach(({pts,corners})=>{
    const n=pts.length; if(n<3) return;
    const mid=i=>[Math.round((pts[i][0]+pts[(i+1)%n][0])/2),Math.round((pts[i][1]+pts[(i+1)%n][1])/2)];
    const r=Math.round;
    let pen=mid(n-1);
    pathObj.moveTo(pen[0],pen[1]);
    for(let i=0;i<n;i++){
      const v=pts[i], m=mid(i);
      if(corners[i]){ pathObj.lineTo(v[0],v[1]); pathObj.lineTo(m[0],m[1]); }
      else{
        pathObj.curveTo(r(pen[0]+2/3*(v[0]-pen[0])), r(pen[1]+2/3*(v[1]-pen[1])),
                        r(m[0]+2/3*(v[0]-m[0])),   r(m[1]+2/3*(v[1]-m[1])),  m[0], m[1]);
      }
      pen=m;
    }
    pathObj.close();
  });
}
function buildTracedFont(tr, name){
  const glyphs=[new opentype.Glyph({name:".notdef",unicode:0,advanceWidth:600,path:new opentype.Path()})];
  glyphs.push(new opentype.Glyph({name:"space",unicode:32,advanceWidth:tr.spaceAdv||330,path:new opentype.Path()}));
  Object.keys(tr.glyphs).forEach(ch=>{
    const g=tr.glyphs[ch], p=new opentype.Path();
    loopsToPath(p, g.loops);
    glyphs.push(new opentype.Glyph({name:ch, unicode:ch.charCodeAt(0), advanceWidth:g.adv, path:p}));
  });
  const font=new opentype.Font({familyName:"CustomFont", styleName:"Regular",
    unitsPerEm:1000, ascender:760, descender:-240, glyphs});
  if(name){
    const psName = "CF" + Array.from(name).map(c=>c.codePointAt(0).toString(36)).join("").slice(0,24) + "-Regular";
    font.names.fontFamily={en:name}; font.names.fullName={en:name+" Regular"};
    font.names.postScriptName={en:psName};
    font.names.uniqueID={en:"CustomFonts:"+name+":"+Date.now()};
  }
  return font;
}
function glyphBBox(g){
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  g.loops.forEach(l=>l.pts.forEach(([x,y])=>{
    if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
  }));
  return {x0,x1,y0,y1,h:y1-y0};
}

/* ================= 시트 분해 ================= */
function binarize(data, W, H){
  const lum=new Float32Array(W*H);
  for(let i=0;i<W*H;i++) lum[i]=0.299*data[i*4]+0.587*data[i*4+1]+0.114*data[i*4+2];
  const sample=[];
  for(let i=0;i<W*H;i+=7) sample.push(lum[i]);
  sample.sort((a,b)=>a-b);
  const white=sample[Math.floor(sample.length*0.9)];
  const black=sample[Math.floor(sample.length*0.02)];
  const th=black + (white-black)*0.5;
  const bin=new Uint8Array(W*H); let inkN=0;
  for(let i=0;i<W*H;i++){ bin[i]=lum[i]<th?1:0; inkN+=bin[i]; }
  if(inkN>W*H*0.5){ for(let i=0;i<W*H;i++) bin[i]^=1; }
  return bin;
}
function components(bin, W, H){
  const lbl=new Int32Array(W*H).fill(-1);
  const comps=[]; const qx=new Int32Array(W*H), qy=new Int32Array(W*H);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(!bin[y*W+x]||lbl[y*W+x]>=0) continue;
    const id=comps.length;
    let head=0, tail=0;
    qx[tail]=x; qy[tail]=y; tail++;
    lbl[y*W+x]=id;
    let x0=x,x1=x,y0=y,y1=y,area=0;
    while(head<tail){
      const px=qx[head], py=qy[head]; head++;
      area++;
      if(px<x0)x0=px; if(px>x1)x1=px; if(py<y0)y0=py; if(py>y1)y1=py;
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
        const nx=px+dx, ny=py+dy;
        if(nx<0||ny<0||nx>=W||ny>=H) continue;
        const ii=ny*W+nx;
        if(bin[ii]&&lbl[ii]<0){ lbl[ii]=id; qx[tail]=nx; qy[tail]=ny; tail++; }
      }
    }
    comps.push({x0,x1,y0,y1,area});
  }
  return comps;
}
function segmentSheet(data, W, H){
  const bin=binarize(data,W,H);
  let comps=components(bin,W,H);
  comps=comps.filter(c=>{
    const w=c.x1-c.x0+1, h=c.y1-c.y0+1;
    if(w/h>12 || h/w>25) return false;
    if(c.area<12) return false;
    return true;
  });
  if(!comps.length) return null;
  comps.forEach((c,i)=>c.id=i);

  /* 진짜 글자 크기: 면적 상위 조각들의 높이 중앙값 */
  const byArea=comps.slice().sort((a,b)=>b.area-a.area);
  const topN=byArea.slice(0, Math.max(8, Math.min(30, Math.floor(comps.length*0.35))));
  const th2=topN.map(c=>c.y1-c.y0+1).sort((a,b)=>a-b);
  const bigH=th2[th2.length>>1];

  /* 점·끊긴 조각 병합 (작은 것만 큰 것에 흡수) */
  let merged=true;
  while(merged){
    merged=false;
    outer:
    for(let i=0;i<comps.length;i++) for(let j=i+1;j<comps.length;j++){
      const a=comps[i], b=comps[j];
      const ov=Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0);
      const minW=Math.min(a.x1-a.x0, b.x1-b.x0)+1;
      const vgap=Math.max(a.y0,b.y0)-Math.min(a.y1,b.y1);
      const small=Math.min(a.area,b.area), big=Math.max(a.area,b.area);
      if(small<big*0.3 && ov>minW*0.35 && vgap<bigH*0.45){
        a.x0=Math.min(a.x0,b.x0); a.x1=Math.max(a.x1,b.x1);
        a.y0=Math.min(a.y0,b.y0); a.y1=Math.max(a.y1,b.y1);
        a.area+=b.area;
        comps.splice(j,1); merged=true; break outer;
      }
    }
  }

  /* 행 클러스터링 */
  comps.forEach(c=>c.cy=(c.y0+c.y1)/2);
  comps.sort((a,b)=>a.cy-b.cy);
  const rows=[];
  comps.forEach(c=>{
    const r=rows[rows.length-1];
    if(r && Math.abs(c.cy-r.cy)<bigH*0.7){ r.items.push(c); r.cy=(r.cy*(r.items.length-1)+c.cy)/r.items.length; }
    else rows.push({cy:c.cy, items:[c]});
  });
  rows.forEach(r=>{
    const rh=r.items.map(c=>c.y1-c.y0+1).sort((a,b)=>a-b);
    r.medH=rh[rh.length>>1];
  });
  /* 헤더·설명·초대형 샘플 행 제거 */
  const keptRows=rows.filter(r=>r.medH>bigH*0.5 && r.medH<bigH*1.28);

  const out=[];
  keptRows.forEach((r,ri)=>{
    r.items.sort((a,b)=>a.x0-b.x0);
    const bots=r.items.map(c=>c.y1).sort((a,b)=>a-b);
    const baseline=bots[bots.length>>1];
    r.items.forEach(c=>{ c.row=ri; c.baseline=baseline; out.push(c); });
  });
  if(!out.length) return null;
  return {bin, W, H, comps:out};
}
function cropComp(seg, c){
  const pad=2;
  const x0=Math.max(0,c.x0-pad), y0=Math.max(0,c.y0-pad);
  const x1=Math.min(seg.W-1,c.x1+pad), y1=Math.min(seg.H-1,c.y1+pad);
  const w=x1-x0+1, h=y1-y0+1;
  const out=new Uint8Array(w*h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++)
    out[y*w+x]=seg.bin[(y0+y)*seg.W+(x0+x)];
  return {bin:out, w, h, offX:x0, offY:y0};
}

/* ================= 글자 허용 범위 ================= */
const SYMBOLS="!@#$%^&*()-+_=~[]{}'\";:.,<>/?|\\`";
function isAllowed(v){ return typeof v==="string" && v.length===1 && (/[A-Za-z0-9]/.test(v) || SYMBOLS.includes(v)); }
function glyphName(ch){
  if(/[A-Za-z]/.test(ch)) return ch;
  return "uni"+ch.charCodeAt(0).toString(16).toUpperCase().padStart(4,"0");
}

/* ================= 시트 분해 (브라우저용) ================= */
function segment(rgba, W, H, sheetIndex){
  const seg=segmentSheet(rgba, W, H);
  if(!seg) return [];
  return seg.comps.map((c,i)=>{
    const crop=cropComp(seg,c);
    return {i, sheet:sheetIndex||0, row:(sheetIndex||0)*1000+c.row, x0:c.x0, y0:c.y0, x1:c.x1, y1:c.y1,
      baseline:c.baseline, cropW:crop.w, cropH:crop.h, offX:crop.offX, offY:crop.offY, bin:crop.bin};
  });
}

/* ================= 빌드 ================= */
function trace(meta, labels){
  const used={};
  const picked=[];
  meta.forEach(c=>{
    const v=labels[String(c.i)];
    if(!v || v==="?" || !isAllowed(v)) return;
    if(used[v]) return;   /* 중복 라벨은 첫 번째만 */
    used[v]=1;
    picked.push({...c, label:v});
  });
  if(!picked.length) throw new Error("글자 이름이 붙은 칸이 하나도 없어요");

  /* ---- 각 글자 이진 데이터 로드 + 위/아래 끝 평평함 판정 (데이터 기반, 글자 목록 하드코딩 없음) ---- */
  function loadBin(c){ return c.bin; }
  function bandWidth(bin, W, H, y0, y1){
    let xlo=W, xhi=-1;
    for(let y=Math.max(0,y0); y<Math.min(H,y1); y++)
      for(let x=0;x<W;x++) if(bin[y*W+x]){ if(x<xlo)xlo=x; if(x>xhi)xhi=x; }
    return xhi>=xlo ? xhi-xlo+1 : 0;
  }
  picked.forEach(c=>{
    c.bin = loadBin(c);
    const W=c.cropW, H=c.cropH;
    let topY=H; for(let y=0;y<H;y++){ let has=false; for(let x=0;x<W;x++) if(c.bin[y*W+x]){has=true;break;} if(has){topY=y;break;} }
    c.nativeH = Math.max(1, c.baseline - c.offY - topY); /* 기준선까지의 실제 잉크 높이(px) */
    const baselineRow = Math.min(H-1, Math.max(0, c.baseline-c.offY));
    /* 평평함 판정: "맨 끝 폭"과 "살짝 안쪽 폭"의 비율로 판정.
       평평(기둥형)하면 끝까지 폭이 거의 그대로 유지되고, 둥글거나 뾰족하면 끝에서 급격히 좁아진다.
       (기존 방식은 몇 px 두께 밴드를 평균내서 라운드/뾰족 형태를 오판했음) */
    /* 세리프 브래킷(획 시작의 완만한 곡선)을 지나친 지점부터 측정해야 오판이 없다 */
    const thin = Math.max(2, Math.round(H*0.03));   /* 브래킷을 지난 얕은 샘플 */
    const deep = Math.max(3, Math.round(H*0.15));   /* 기둥 안쪽 샘플 */
    const topThin = bandWidth(c.bin, W, H, topY, topY+thin);
    const topDeep = bandWidth(c.bin, W, H, topY, topY+deep);
    const botThin = bandWidth(c.bin, W, H, Math.max(0,baselineRow-thin+1), baselineRow+1);
    const botDeep = bandWidth(c.bin, W, H, Math.max(0,baselineRow-deep+1), baselineRow+1);
    c.topFlat = topDeep>0 && (topThin/topDeep) > 0.62;
    c.botFlat = botDeep>0 && (botThin/botDeep) > 0.62;
    c.hasDescender = (baselineRow < H-3) && bandWidth(c.bin,W,H,baselineRow+3,H) > 0;
  });

  /* 대문자/소문자 각각 "위아래 다 평평한" 글자만으로 기준 높이 산출 (둥근 글자가 중앙값을 왜곡하지 않도록) */
  function refHeight(list){
    const flat = list.filter(c=>c.topFlat && c.botFlat && !c.hasDescender).map(c=>c.nativeH);
    const pool = flat.length ? flat : list.map(c=>c.nativeH); /* 평평한 게 하나도 없으면 전체 중앙값으로 폴백 */
    pool.sort((a,b)=>a-b);
    return pool[pool.length>>1];
  }
  const upperList = picked.filter(c=>/[A-Z0-9]/.test(c.label));
  const lowerList = picked.filter(c=>/[a-z]/.test(c.label));
  const capNativeRef = upperList.length ? refHeight(upperList) : refHeight(picked);
  const scale = 700/Math.max(10, capNativeRef);
  const CAP_TARGET = 700;
  const X_TARGET = lowerList.length ? scale*refHeight(lowerList) : CAP_TARGET*0.7;
  const OVERSHOOT_ROUND = 0.012;  /* 위아래 다 둥근/뾰족한 글자(o,e,c,s 등): 1.2% 더 크게 */
  const OVERSHOOT_HALF  = 0.007;  /* 한쪽만 둥근/뾰족한 글자: 0.7% 더 크게 */

  /* 자간 실측: 원본 시트의 인접 글자 간격 중앙값 → 사이드베어링 */
  const gaps=[];
  const byRow2={};
  meta.forEach(c=>{ (byRow2[c.row]=byRow2[c.row]||[]).push(c); });
  Object.values(byRow2).forEach(row=>{
    row.sort((a,b)=>a.x0-b.x0);
    for(let i=0;i<row.length-1;i++){
      const gap=row[i+1].x0-row[i].x1;
      if(gap>0 && gap<capNativeRef) gaps.push(gap*scale);
    }
  });
  gaps.sort((a,b)=>a-b);
  const LSB = gaps.length ? clamp(Math.round(gaps[gaps.length>>1]*0.66/2), 8, 34) : 26; /* 견본은 넓게 조판되므로 보정 (0.78→0.66: 전반적으로 더 좁게) */

  const CAP_EXTRA = 0; /* 대문자 균일 보너스는 제거함 — U-Z처럼 원래 여백 넉넉한 대각선 글자가 과하게 벌어지는 부작용이 있었음.
                            대문자 사이 간격 조정은 아래 커닝 단계에서 쌍(pair)별로 처리한다. */

  /* 광학 사이드베어링: 좌/우 가장자리가 곡선(안쪽으로 파임)이면 그만큼 여백이 이미 있어 보이므로
     사이드베어링을 살짝 줄여 시각적 간격을 균일하게 맞춘다. */
  function edgeCurviness(bin, W, H){
    /* 상하 중앙 70% 구간에서 왼쪽/오른쪽 잉크 경계가 직선(기둥)인지 곡선인지 표준편차로 판정 */
    const y0=Math.floor(H*0.15), y1=Math.ceil(H*0.85);
    const lefts=[], rights=[];
    for(let y=y0;y<y1;y++){
      let l=-1,r=-1;
      for(let x=0;x<W;x++) if(bin[y*W+x]){ if(l<0)l=x; r=x; }
      if(l>=0){ lefts.push(l); rights.push(r); }
    }
    const std=arr=>{ if(!arr.length) return 0; const m=arr.reduce((a,b)=>a+b,0)/arr.length;
      return Math.sqrt(arr.reduce((a,b)=>a+(b-m)**2,0)/arr.length); };
    return {leftStd:std(lefts), rightStd:std(rights)};
  }

  /* x-height 정밀 정렬: 어센더/디센더가 전혀 없는 순수 x-height 글자들만 자연스러운 "높이 간격"으로
     군집화해서(하드코딩 없이), 그 군집 안에서는 top 위치를 완전히 통일한다.
     어센더(b,d,f,h,i,j,k,l 등)는 이 군집에 절대 섞이지 않으므로 눌리는 사고가 재발하지 않는다. */
  /* nativeH는 baseline부터 top까지의 거리라 디센더(기준선 아래로 내려가는 부분) 유무와는 무관하다.
     y,g,j,p,q도 top은 x-height 수준일 수 있으므로 후보에서 제외하면 안 된다(이전 버그: 이들을
     통째로 제외해서 v,w,x,z와 정렬 대상에서 빠짐 → "v-z 정렬 안 맞음" 재현의 실제 원인이었음). */
  const lowerCandidates = picked.filter(c=>/[a-z]/.test(c.label));
  let xHeightSet = new Set();
  if(lowerCandidates.length>=3){
    const sorted = lowerCandidates.slice().sort((a,b)=>a.nativeH-b.nativeH);
    let big=0, bigIdx=0;
    for(let i=1;i<sorted.length;i++){
      const gap = sorted[i].nativeH - sorted[i-1].nativeH;
      if(gap>big){ big=gap; bigIdx=i; }
    }
    /* 가장 큰 간격을 기준으로 아래쪽(작은 값들) 군집 = x-height 후보. 이 군집이 절반 이상을 차지할 때만 채택 */
    const lowerCluster = sorted.slice(0, bigIdx);
    if(lowerCluster.length >= sorted.length*0.35){
      lowerCluster.forEach(c=>xHeightSet.add(c.i));
    }
  }
  const xHeightMembers = lowerCandidates.filter(c=>xHeightSet.has(c.i));
  const xHeightTopRef = xHeightMembers.length ?
    (()=>{ const hs=xHeightMembers.map(c=>c.nativeH).sort((a,b)=>a-b); return hs[hs.length>>1]; })() : null;

  const glyphs={};
  if(false) picked.filter(c=>/[a-z]/.test(c.label)).forEach(c=>{
    console.error(c.label, 'topFlat='+c.topFlat, 'botFlat='+c.botFlat, 'nativeH='+c.nativeH,
      'xHeightCluster='+xHeightSet.has(c.i));
  });
  picked.forEach(c=>{
    const isCap = /[A-Z]/.test(c.label);
    /* 중요: 원본 이미지의 실제 비율(어센더/디센더/x-height 상대 크기)은 절대 건드리지 않는다.
       전역 scale은 그대로 쓰고, 둥근/뾰족한 글자에만 아주 작은 배율을 곱해서 착시만 보정한다.
       (예전 버전은 모든 소문자를 x-height 기준 목표높이로 강제 재조정해서 어센더까지
        눌러버리는 심각한 버그가 있었음 — 그 방식 폐기) */
    const flatBoth = c.topFlat && c.botFlat;
    const overshootMul = flatBoth ? 1 : (c.topFlat||c.botFlat ? 1+OVERSHOOT_HALF : 1+OVERSHOOT_ROUND);
    /* x-height 군집에 속한 글자(어센더/디센더 없는 v,w,x,y,z,n,m,u,o,c,e,s,a 등)만
       공통 기준 높이로 정밀 정렬해서 미세한 상단 들쭉날쭉함을 제거한다.
       군집 밖 글자(어센더·디센더)는 절대 건드리지 않고 전역 scale 그대로 쓴다(원본 비율 보존). */
    const gScale = (xHeightTopRef && xHeightSet.has(c.i))
      ? (scale * xHeightTopRef / Math.max(10, c.nativeH)) * overshootMul
      : scale * overshootMul;
    const baseLSB = isCap ? LSB+CAP_EXTRA : LSB;
    const {leftStd,rightStd} = edgeCurviness(c.bin, c.cropW, c.cropH);
    const curveThresh = c.cropW*0.02; /* 이 이상 흔들리면 "곡선 가장자리"로 판단 */
    /* 좌우를 독립적으로 계산한다 — 한쪽만 곡선인 글자(j의 왼쪽 고리, f/z/q의 오른쪽 곡선 등)가
       반대쪽까지 억울하게 좁아지는 걸 방지. 곡선 쪽만 줄이고 직선 쪽은 원래 값을 유지한다. */
    const gLeftSB  = leftStd  > curveThresh ? Math.round(baseLSB*0.72) : baseLSB;
    const gRightSB = rightStd > curveThresh ? Math.round(baseLSB*0.72) : baseLSB;
    const g=glyphFromCrop(c.bin, c.cropW, c.cropH, c.baseline-c.offY, gScale, gLeftSB, gRightSB);
    if(g) glyphs[c.label]=g;
  });
  const traced={glyphs, spaceAdv:Math.max(160, Math.round(LSB*5.4)), lsb:LSB};

  /* 옵티컬 커닝: 윤곽 좌우 프로파일로 쌍별 시각 간격 계산 → .fea 파일 */
  function profiles(g){
    const B=26, y0=-260, y1=760;
    const L=new Array(B).fill(Infinity), R=new Array(B).fill(-Infinity);
    g.loops.forEach(l=>{
      const n=l.pts.length;
      for(let i=0;i<n;i++){
        const a=l.pts[i], b=l.pts[(i+1)%n];
        const steps=Math.max(1, Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/25));
        for(let s2=0;s2<=steps;s2++){
          const x=a[0]+(b[0]-a[0])*s2/steps, y=a[1]+(b[1]-a[1])*s2/steps;
          const bi=Math.floor((y-y0)/(y1-y0)*B);
          if(bi<0||bi>=B) continue;
          if(x<L[bi])L[bi]=x; if(x>R[bi])R[bi]=x;
        }
      }
    });
    return {L,R};
  }
  const prof={};
  Object.keys(glyphs).forEach(ch=>prof[ch]=profiles(glyphs[ch]));
  const target=LSB*2, feaLines=[], kernPairs=[];
  const chars=Object.keys(glyphs);
  chars.forEach(a=>chars.forEach(b=>{
    const pa=prof[a], pb=prof[b];
    let minGap=Infinity;
    for(let i=0;i<26;i++){
      if(pa.R[i]===-Infinity || pb.L[i]===Infinity) continue;
      const gap=(glyphs[a].adv - pa.R[i]) + pb.L[i];
      if(gap<minGap) minGap=gap;
    }
    if(minGap===Infinity) return;
    let k=Math.round(target - minGap);
    if(k < -3){ /* 더 많은 쌍을 당김 대상으로 삼음(기존 -6 → -3): U-V, V-W 같은 대각선 쌍도 포함 */
      k=Math.max(k, -190);
      feaLines.push(1); kernPairs.push([a,b,k]);
    }
  }));
  return {traced, kernPairs};
}

/* ---- OTF 바이너리 후처리: name 표 재작성, ltag 제거, GPOS 커닝 추가 ---- */
function u16(a,o,v){a[o]=(v>>8)&255;a[o+1]=v&255;}
function u32(a,o,v){a[o]=(v>>>24)&255;a[o+1]=(v>>>16)&255;a[o+2]=(v>>>8)&255;a[o+3]=v&255;}
function r16(a,o){return (a[o]<<8)|a[o+1];}
function r32(a,o){return ((a[o]<<24)>>>0)+(a[o+1]<<16)+(a[o+2]<<8)+a[o+3];}
class W8{ constructor(){this.b=[];} u16(v){this.b.push((v>>8)&255,v&255);} s16(v){this.u16(v&0xFFFF);}
  u32(v){this.b.push((v>>>24)&255,(v>>>16)&255,(v>>>8)&255,v&255);} tag(t){for(const c of t)this.b.push(c.charCodeAt(0));}
  bytes(arr){for(const x of arr)this.b.push(x);} get len(){return this.b.length;} out(){return Uint8Array.from(this.b);} }

function asciiName(s, fallback){
  const a=(s||"").normalize("NFKD").replace(/[^A-Za-z0-9 _-]/g,"").trim();
  return a.length>=3?a:fallback;
}
function makeName(display, psName){
  const famAscii=asciiName(display, psName.split("-")[0]);
  const win={1:display,2:"Regular",3:"CustomFonts:"+psName,4:display+" Regular",5:"Version 1.000",6:psName,16:display,17:"Regular"};
  const mac={1:famAscii,2:"Regular",3:"CustomFonts:"+psName,4:famAscii+" Regular",5:"Version 1.000",6:psName,16:famAscii,17:"Regular"};
  const recs=[];
  Object.keys(mac).map(Number).sort((a,b)=>a-b).forEach(id=>{
    const s=mac[id]; recs.push({p:1,e:0,l:0,id,data:Array.from(s).map(c=>c.charCodeAt(0)&255)});
  });
  Object.keys(win).map(Number).sort((a,b)=>a-b).forEach(id=>{
    const s=win[id], d=[]; for(let i=0;i<s.length;i++){const c=s.charCodeAt(i); d.push(c>>8,c&255);}
    recs.push({p:3,e:1,l:0x409,id,data:d});
  });
  const w=new W8(); w.u16(0); w.u16(recs.length); w.u16(6+recs.length*12);
  let off=0; recs.forEach(r=>{w.u16(r.p);w.u16(r.e);w.u16(r.l);w.u16(r.id);w.u16(r.data.length);w.u16(off);off+=r.data.length;});
  recs.forEach(r=>w.bytes(r.data));
  return w.out();
}
function makeGPOS(pairs){ /* pairs: [[gidA,gidB,value],...] */
  const byFirst=new Map();
  pairs.forEach(([a,b,v])=>{ if(!byFirst.has(a)) byFirst.set(a,[]); byFirst.get(a).push([b,v]); });
  const firsts=[...byFirst.keys()].sort((a,b)=>a-b);
  /* PairPos format 1 */
  const pp=new W8();
  const nSets=firsts.length;
  const headLen=10+2*nSets;
  const covLen=4+2*nSets;
  pp.u16(1); pp.u16(headLen); pp.u16(4); pp.u16(0); pp.u16(nSets);
  let off=headLen+covLen; const sets=[];
  firsts.forEach(f=>{ const recs=byFirst.get(f).sort((a,b)=>a[0]-b[0]); sets.push(recs); pp.u16(off); off+=2+recs.length*4; });
  pp.u16(1); pp.u16(nSets); firsts.forEach(f=>pp.u16(f));
  sets.forEach(recs=>{ pp.u16(recs.length); recs.forEach(([g,v])=>{pp.u16(g);pp.s16(v);}); });
  const sub=pp.out();
  if(sub.length>65000) throw new Error("커닝 쌍이 너무 많아요");
  const w=new W8();
  /* header(10) */
  const scriptListOff=10;
  /* ScriptList: count(2)+2 records(6 each)=14; each Script: defaultLangSys off(2)+langSysCount(2)=4; LangSys: 2+2+2+2=8 */
  const scriptList=new W8();
  scriptList.u16(2);
  scriptList.tag("DFLT"); scriptList.u16(14);
  scriptList.tag("latn"); scriptList.u16(14+12);
  for(let k=0;k<2;k++){ scriptList.u16(4); scriptList.u16(0); scriptList.u16(0); scriptList.u16(0xFFFF); scriptList.u16(1); scriptList.u16(0); }
  const featureList=new W8(); featureList.u16(1); featureList.tag("kern"); featureList.u16(8);
  featureList.u16(0); featureList.u16(1); featureList.u16(0);
  const lookupList=new W8(); lookupList.u16(1); lookupList.u16(4);
  lookupList.u16(2); lookupList.u16(0); lookupList.u16(1); lookupList.u16(8);
  const sl=scriptList.out(), fl=featureList.out(), ll=lookupList.out();
  w.u16(1); w.u16(0); w.u16(scriptListOff); w.u16(scriptListOff+sl.length); w.u16(scriptListOff+sl.length+fl.length);
  w.bytes(sl); w.bytes(fl); w.bytes(ll); w.bytes(sub);
  return w.out();
}
function checksum(a){ let s=0; for(let i=0;i<a.length;i+=4){ s=(s+(((a[i]||0)<<24)>>>0)+((a[i+1]||0)<<16)+((a[i+2]||0)<<8)+(a[i+3]||0))>>>0; } return s; }
function rebuildSfnt(buf, replace){
  const a=new Uint8Array(buf);
  const ver=r32(a,0), n=r16(a,4), tables={};
  for(let i=0;i<n;i++){ const o=12+i*16; const tag=String.fromCharCode(a[o],a[o+1],a[o+2],a[o+3]);
    const off=r32(a,o+8), len=r32(a,o+12); tables[tag]=a.slice(off,off+len); }
  Object.keys(replace).forEach(t=>{ if(replace[t]===null) delete tables[t]; else tables[t]=replace[t]; });
  const tags=Object.keys(tables).sort();
  const nt=tags.length; let es=0; while((1<<(es+1))<=nt) es++;
  const sr=(1<<es)*16;
  let size=12+nt*16; tags.forEach(t=>size+=(tables[t].length+3)&~3);
  const out=new Uint8Array(size);
  u32(out,0,ver); u16(out,4,nt); u16(out,6,sr); u16(out,8,es); u16(out,10,nt*16-sr);
  let off=12+nt*16, headOff=-1;
  tags.forEach((t,i)=>{
    let d=tables[t];
    if(t==="head"){ d=d.slice(); u32(d,8,0); u32(d,4,0x00010000); headOff=off; }
    const o=12+i*16; for(let k=0;k<4;k++) out[o+k]=t.charCodeAt(k);
    u32(out,o+4,checksum(d)); u32(out,o+8,off); u32(out,o+12,d.length);
    out.set(d,off); off+=(d.length+3)&~3;
  });
  if(headOff>=0) u32(out,headOff+8,(0xB1B0AFBA-checksum(out))>>>0);
  return out.buffer;
}

function buildFont(meta, labels, fontName){
  const {traced, kernPairs}=trace(meta, labels);
  const chars=Object.keys(traced.glyphs);
  const glyphs=[new opentype.Glyph({name:".notdef",unicode:0,advanceWidth:600,path:new opentype.Path()}),
    new opentype.Glyph({name:"space",unicode:32,advanceWidth:traced.spaceAdv||330,path:new opentype.Path()})];
  const gid={};
  chars.forEach(ch=>{
    const g=traced.glyphs[ch], p=new opentype.Path(); loopsToPath(p,g.loops);
    gid[ch]=glyphs.length;
    glyphs.push(new opentype.Glyph({name:glyphName(ch), unicode:ch.charCodeAt(0), advanceWidth:g.adv, path:p}));
  });
  const psName=(asciiName(fontName,"").replace(/[ _]/g,"") || "CF"+Array.from(fontName).map(c=>c.codePointAt(0).toString(36)).join("")).slice(0,26)+"-Regular";
  const font=new opentype.Font({familyName:asciiName(fontName,"CustomFont"), styleName:"Regular", unitsPerEm:1000, ascender:760, descender:-240, glyphs});
  font.names.postScriptName={en:psName};
  let buf=font.toArrayBuffer();
  const repl={name:makeName(fontName, psName), ltag:null};
  const kp=kernPairs.filter(([a,b])=>gid[a]&&gid[b]).map(([a,b,k])=>[gid[a],gid[b],k]);
  if(kp.length) repl.GPOS=makeGPOS(kp);
  buf=rebuildSfnt(buf, repl);
  return {buffer:buf, chars:chars.join(""), count:chars.length, kernPairs:kp.length, psName, traced};
}

return {segment, buildFont, isAllowed, SYMBOLS};
});
