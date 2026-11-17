---
name: "stopmotion-collage-edit"
description: "사용자가 준 영상을 스톱모션 + 종이 콜라주 스크랩북 스타일(12fps 끊김, 오린 단어 조각, 거친 낙서, 낡은 폴라로이드)로 편집할 때 쓴다."
---

# 스톱모션 콜라주 편집

사용자가 준 영상을 **스톱모션 + 종이 콜라주 스크랩북** 스타일로 편집한다. 12fps로 뚝뚝 끊기는 화면, 찢어진 종이, 오려 붙인 단어 조각, 박자마다 바뀌는 거친 손낙서, 낡은 폴라로이드, 손글씨, 낮은 화질과 종이 질감이 특징이다. 목표는 **수정 없이 한 번에** 이 느낌이 나오는 것이다. 아래 규칙은 실제 수정 요청을 모은 것이니 하나도 빼먹지 않는다.

**이 스킬은 스토리보드를 만들지 않는다.** video-storyboard 스킬을 부르지 않고, 스토리보드 아티팩트·씬 카드·적용 버튼도 만들지 않는다. 1번 질문이 확정되면 바로 영상(mp4)으로 렌더해서 원본과 폰용 작은 버전을 함께 준다. 수정 요청은 채팅으로 받아 고친 부분만 다시 렌더한다.

## 1. 먼저 네 가지를 확정한다

영상을 받으면 바로 만들지 말고 한 번의 답장으로 묻고 제안한다. **네 가지가 모두 확정되면** 진행한다. 이미 정해 준 것은 다시 묻지 않는다.

**질문은 전부 객관식으로 낸다.** 서술형으로 묻지 않는다.
- 질문마다 번호(1, 2, 3…)를 달고, 보기는 A/B/C로 2~4개. 추천 보기에 '(추천)'을 붙인다. 마지막 보기는 '알아서'(내가 정함)로 둘 수 있다.
- 맨 끝에 "예: 1A 2B 3A 4A 5A처럼 짧게 답해 주세요"라고 답하는 법을 한 줄로 적는다. 객관식 선택 카드 기능이 있으면 그걸 써도 된다.
- 원본 영상 비율도 객관식으로 묻는다: A 세로 9:16(릴스, 피사체 따라 잘라 냄) / B 원본 비율 그대로(가로면 가로).
- 가사가 잘 안 들리면 들린 후보를 보기로 내고(A 후보1 / B 후보2 / C 정확한 가사를 직접 붙여 줌), 안 들리는 구간은 짐작으로 채우지 않는다고 적는다.

1. **주제**: 무엇을 알리는 영상인지(가게·상품·행사·브이로그 등)와 꼭 들어갈 이름.
2. **컬러**: 영상 색을 보고 팔레트 2~3안(색 이름+HEX). 밝은 파스텔 3~4색 + 글자용 진한 잉크색 1개 구성. 예: 흰·연노랑 #FFF0A6·하늘 #A8D8F5·연보라 #CFC0F2 + 잉크 #2B2440.
3. **음악**: 쓸 음악 파일. 가사가 있으면 가사도 받는다. 없으면 받을 때까지 기다린다(박자와 길이의 기준이라 필수).
4. **영문 위주 / 한글 위주**: 꼭 묻는다(A 영문 / B 한글).

주제도 보기로 낸다(예: A 노래·가수 홍보 / B 댄스 챌린지 / C 가게·상품 홍보 / D 알아서).

폰트는 묻지 않고 기본값을 쓴다(사용자가 지정하면 따름). 상업 무료만.
- 영문 위주: 손글씨 Homemade Apple + 굵은 세리프 Abril Fatface.
- 한글 위주: 손글씨 Gamja Flower 또는 Gaegu + 굵은 제목 Black Han Sans 또는 Song Myung.
- 나눔손글씨(Nanum Pen Script) 계열은 절대 금지. 가늘어서 안 읽히는 필기체도 금지.

## 2. 분석

- 영상: ffprobe로 길이·크기, `select='gt(scene,0.3)'`로 컷 시각, 씬마다 대표 프레임 jpg(360폭)와 **영상 첫 프레임 jpg**(first.jpg).
- 음악: librosa beat_track으로 BPM·박자 시각. 가사가 있으면 faster-whisper(단어별 시각)로 타이밍을 잡는다.
- 길이는 **음악 길이에 맞춘다.** 영상이 짧으면 마지막 씬을 0.7~0.8배속으로 늘려 음악 끝과 맞춘다.
- 음악이 원본 영상에 들어 있는 노래면 그 소리를 그대로 쓴다. 따로 받은 음악이면 원본 소리 0.12 + 음악으로 섞는다.
- 씬마다 **주요 피사체가 어디 있는지**(음식·얼굴·동물·제품) 적어 둔다. 낙서와 글자를 놓을 빈 자리를 정하기 위해서다.

## 3. 스타일 규칙

**반드시**
- 스톱모션: 시간 t를 1/12초로 끊어 그린다. 낙서 선과 단어 조각의 미세한 떨림은 초당 6번만 바뀐다.
- 낮은 화질: 영상은 324×576 버퍼에 받아 키운다. 글자·낙서는 540×960 층에 그리고 점·긁힘으로 잉크를 빼서 닳고 번지게 한다. 글씨가 선명하고 깔끔하면 실패다.
- 종이 질감: 화면 전체에 종이 섬유 텍스처를 multiply(0.7)로 덮는다.
- 색은 살린다: 빈티지여도 채도와 따뜻함을 유지한다(saturate 1.1 안팎, 따뜻한 막 7%). 회색빛이 돌면 실패다.
- 배경 영상은 0.25초마다 뚝뚝 끊기듯 살짝 흔들리고(±9px, ±0.4°) 씬 안에서 조금씩 한쪽으로 이동한다.
- 겉 프레임은 **구간마다 다르게**: 없음(영상이 화면을 꽉 채움) / 찢어진 종이 테두리 / 위아래 종이 띠만 / 넓은 여백에 기울어진 사진 / 한쪽 모서리만. 1~1.5초마다 바꾸고, 같은 종류 안에서도 0.7초마다 모양·여백·기울기를 달리한다. 첫 구간과 엔딩은 프레임 없이 꽉 채운다.
- 낙서는 거칠게: 흔들리는 선을 두세 번 겹쳐 긋고 굵기도 들쭉날쭉. 깔끔한 도형으로 그리지 않는다.
- 낙서는 **맥락에 맞게**: 그 장면의 사물이나 가사 뜻과 이어지는 것만(빵 → 감싸는 동그라미·왕관·김, 커피 → 김·커피콩, 강아지 → 뼈다귀·하트, repeat → 돌아가는 화살표).
- 낙서 타이밍은 **불규칙하게**: 박자 근처에 두되 길이와 간격을 섞는다(0.3초짜리, 1초 넘게 남는 것, 한 박자 쉬는 곳).
- 낙서와 글자는 **주요 피사체를 가리지 않는다.** 빈 곳이나 피사체 가장자리에 둔다.
- 폴라로이드와 종이는 낡게: 가장자리 울퉁불퉁, 얼룩, 바랜 사진, 마스킹 테이프.
- 글자가 프레임이나 화면 밖으로 **잘리지 않게** 한다. 프레임 여백(최대 좌우 105px, 위아래 170px) 안쪽에 둔다.
- 인스타 UI가 놓이는 **아래쪽(세로 1920 기준 y 1540 아래)** 에는 글자·낙서를 두지 않는다.
- 전환은 씬마다 다르게: 휙 밀림(잔상 7겹), 글리치(가로 조각 밀림+색 띠) 등을 0.3초 안에.

**절대 금지**
- 그림자(드롭섀도) 전부. 빛번짐, 뿌연 안개, 빛샘, 블러 글로우.
- 단색·단순 그라데이션 배경(ppt처럼 보임). 배경은 항상 영상이나 영상 프레임 사진.
- 배경이 박자마다 커졌다 작아지는 줌. 밝기 깜빡임.
- 맨 위 장식 가로줄, 접힌 종이 모서리.
- 가사와 겹치는 하단 자막 줄(단어 조각으로 이미 보여 주므로 중복).
- 눈에 띄는 흰 먼지 점(먼지는 투명도 0.1 정도로 흐리게).
- 같은 틀·같은 배치를 영상 내내 반복하는 것.

## 4. 씬 구성 공식

씬마다 아래에서 3~5가지를 골라 섞는다. 씬끼리 배치가 겹치지 않게 한다.
- **오린 단어 조각**(굵은 세리프, 찢어진 종이 바탕): 가사·문구를 단어 단위로, 그 단어가 들리는 시각에 하나씩 툭 붙인다. 바탕색은 팔레트를 돌려 쓰고 가끔 반전(잉크 바탕+닳은 흰 글자). 살짝 기울이고 서로 조금 겹친다.
- **큰 손글씨 한 단어**(팔레트의 밝은 색): 왼쪽에서 오른쪽으로 써지듯 나타난다. 밑줄은 글씨 기울기를 따라 글씨 바로 뒤를 쫓아 그어진다.
- **거친 낙서** 2~4개: 3번 규칙대로.
- **낡은 폴라로이드** 1~3장: 다른 씬의 프레임을 사진으로. 회전하며 날아와 붙는다.
- **사진 카드 씬**(영상 중반 한 번): 다른 씬 프레임을 어둡게 깐 배경 위에 현재 영상을 기울어진 종이 카드(테이프 2개)로 줄여 놓고 주변에 폴라로이드와 단어 조각.
- 음악에 가사가 없으면 주제에서 뽑은 짧은 단어(영문 위주면 영어, 한글 위주면 한글)를 박자에 맞춰 넣는다.

## 5. 엔딩

- 마지막 씬은 프레임 없이 영상이 화면을 꽉 채운다.
- 가운데에 이름(반전 단어 조각 두 줄, 박자에 한 줄씩), 그 아래 **주제와 관련된 마무리 말** 한 줄을 손글씨로 쓴다. 가게면 "see you soon"·"또 놀러 와요", 상품이면 써 보라는 말, 행사면 날짜나 "그날 만나요"처럼 주제에서 나온 말이어야 한다. 아무 데나 붙는 문구는 쓰지 않는다.
- 이름·주제 문구를 두른 원형 글자 띠가 천천히 돈다.
- **엔딩 요소는 영상 맨 끝 정지 화면까지 남는다.** 요소의 끝 시각을 영상 길이보다 넉넉히 크게(예: 99) 둔다. 페이드아웃하지 않는다.

## 6. 구현

작업 폴더에 이전에 만든 `스톱모션-콜라주-엔진/stage.js`와 `index.html`이 있으면 **그 파일을 복사해** 상수(W, H, DUR, BEATS, COL, 폰트), `SC`, `EL`, `frameMode`의 시간표만 새 영상에 맞게 바꾼다. 없으면 아래 뼈대로 새로 만든다. 모든 그림은 시간 t의 함수로 그린다(1080×1920 좌표).

```js
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)), lerp=(a,b,k)=>a+(b-a)*k, prog=(t,s,d)=>clamp((t-s)/d), ease=x=>1-Math.pow(1-clamp(x),3);
function rng(seed){let s=(seed*2654435761)>>>0||7;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
let BOIL=0, VB=null, OV=null, PAPER=null, VBstep=-1;
// 찢어진 종이 다각형
function tornRect(x,y,w,h,seed,j=6){const r=rng(seed),p=[],st=14;for(let u=0;u<w;u+=st)p.push([x+u,y+(r()-.5)*j]);for(let u=0;u<h;u+=st)p.push([x+w+(r()-.5)*j,y+u]);for(let u=w;u>0;u-=st)p.push([x+u,y+h+(r()-.5)*j]);for(let u=h;u>0;u-=st)p.push([x+(r()-.5)*j,y+u]);return p;}
// 거친 펜: 촘촘히 나눈 점을 흔들어 두 번 겹쳐 긋는다. BOIL이 바뀔 때마다 선이 다시 떨린다
function wob(pts,seed,amp){const r=rng(seed);let ox=0,oy=0;return pts.map(q=>{ox=ox*.72+(r()-.5)*amp;oy=oy*.72+(r()-.5)*amp;return[q[0]+ox,q[1]+oy];});}
function pen(ctx,strokes,p,color,w,seed){if(p<=0)return;const n=strokes.length;ctx.save();ctx.lineCap=ctx.lineJoin='round';ctx.strokeStyle=color;
  for(let i=0;i<n;i++){const sp=clamp(p*n-i);if(sp<=0)break;for(let k=0;k<2;k++){ctx.globalAlpha=k?.7:.95;ctx.lineWidth=w*(k?.55:1);strokePts(ctx,partial(wob(dense(strokes[i]),seed+i*7+k*131+BOIL*977,w*(k?2.2:1.1)),sp));}}ctx.restore();}
// 크레용은 같은 선을 4번, 투명도 .5, 굵기 w*(.45~.95), 위치를 w*.7만큼 흩어 겹친다
// 한 구간만 보이는 낙서: flash(t, 시작, 끝, 그려지는 시간)
const flash=(t,s,e,d=.22)=>(t>=s&&t<e)?prog(t,s,d):0;
// 겉 프레임 종류 시간표: 0 없음 / 1 찢어진 테두리 / 2 위아래 띠 / 3 넓은 여백 기울어진 사진 / 4 왼쪽+아래 / 5 오른쪽+위
function frameMode(t){const P=[[0,0],[1.2,1],[2.25,2],[3.6,0],[5.04,3],[6.7,4],[8.08,0],[10.54,5],[11.5,1],[12.5,0]];let m=0;for(const p of P)if(t>=p[0]-1e-6)m=p[1];return m;}
function paperFrame(ctx,seed,mode){if(!mode)return;const r=rng(seed*31+5+mode*97),j=9+r()*11;let mx=36+r()*24,my=60+r()*28,ang=(r()-.5)*.022,x,y,w,h;
  if(mode===1){x=mx;y=my;w=W-mx*2;h=H-my*2;}else if(mode===2){my=110+r()*50;x=-90;w=W+180;y=my;h=H-my*2;}
  else if(mode===3){mx=78+r()*26;my=128+r()*40;x=mx;y=my;w=W-mx*2;h=H-my*2;ang=(r()>.5?1:-1)*(.018+r()*.02);}
  else if(mode===4){x=58+r()*26;y=-90;w=W+90-x;h=H+90-(84+r()*40);}else{x=-90;y=70+r()*36;w=W+90-(56+r()*26);h=H+90-y;}
  const cs=Math.cos(ang),sn=Math.sin(ang),pts=tornRect(x,y,w,h,seed+mode,j); // 여기에 1~3군데 안쪽으로 10~32px 파인 큰 찢김을 더한다
  ctx.save();ctx.fillStyle='#F1ECE1';ctx.beginPath();ctx.rect(0,0,W,H);polyPath(ctx,pts.map(q=>[W/2+(q[0]-W/2)*cs-(q[1]-H/2)*sn,H/2+(q[0]-W/2)*sn+(q[1]-H/2)*cs]));ctx.fill('evenodd');ctx.restore();}

function drawFrame(ctx,tReal,video,imgs){
  const step=Math.floor(tReal*12+1e-6), t=step/12;      // 스톱모션: 초당 12장
  BOIL=Math.floor(tReal*6+1e-6);                        // 낙서 떨림: 초당 6번
  const sc=sceneAt(tReal);
  if(!VB){VB=mk(324,576);OV=mk(540,960);PAPER=makePaper();}
  // 영상은 낮은 해상도 버퍼에, 스텝이 바뀔 때만 받는다
  if(video&&step!==VBstep){const v=VB.getContext('2d');v.filter='brightness(.98) contrast(1.06) saturate(1.12)';v.drawImage(video,0,0,324,576);v.filter='none';VBstep=step;}
  let src=video?VB:null;
  if(!video&&imgs.first&&imgs.first.complete){VB.getContext('2d').drawImage(imgs.first,0,0,324,576);VBstep=-1;src=VB;} // 재생 전에는 첫 장면 사진
  ctx.save();ctx.clearRect(0,0,W,H);ctx.imageSmoothingQuality='low';
  if(src){ // 뚝뚝 끊기는 흔들림(0.25초마다) + 살짝 이동. 줌은 고정
    const hr=rng(700+Math.floor(step/3)*7+sc.id*91),hx=(hr()-.5)*18+(t-sc.s)*5,hy=(hr()-.5)*14,ha=(hr()-.5)*.014;
    ctx.save();ctx.translate(W/2+hx,H/2+hy);ctx.rotate(ha);ctx.scale(1.06,1.06);ctx.drawImage(src,-W/2,-H/2,W,H);ctx.restore();
  }
  // 바랜 인쇄물: 검정을 살짝 들뜨게 + 따뜻한 막 (회색이 되지 않게 약하게)
  ctx.save();ctx.globalCompositeOperation='lighten';ctx.fillStyle='#1d1712';ctx.fillRect(0,0,W,H);ctx.restore();
  ctx.fillStyle='rgba(255,214,150,.07)';ctx.fillRect(0,0,W,H);
  // 글자·낙서·폴라로이드는 낮은 해상도 층에 그리고 잉크를 빼서 닳게 한다
  const o=OV.getContext('2d');o.setTransform(1,0,0,1,0,0);o.clearRect(0,0,540,960);o.setTransform(.5,0,0,.5,0,0);
  for(const el of EL)if(tReal>=el.s&&tReal<el.e)el.draw(o,t,imgs);
  {const r=rng(5150+BOIL*13);o.save();o.globalCompositeOperation='destination-out';
   for(let i=0;i<2600;i++){o.globalAlpha=.35+r()*.65;o.fillRect(r()*W,r()*H,1.5+r()*4.5,1.5+r()*4.5);}
   o.lineWidth=2;for(let i=0;i<70;i++){o.globalAlpha=.5+r()*.5;const x=r()*W,y=r()*H,an=r()*6.3,ln=10+r()*40;o.beginPath();o.moveTo(x,y);o.lineTo(x+Math.cos(an)*ln,y+Math.sin(an)*ln);o.stroke();}o.restore();}
  ctx.save();ctx.globalAlpha=.96;ctx.drawImage(OV,0,0,W,H);ctx.restore();
  // 종이 섬유 질감 (270×480 밝은 회백색 잡음 + 가는 섬유 900가닥), 자리만 조금씩 바뀜
  {const r=rng(88+BOIL);ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.7;ctx.drawImage(PAPER,r()*40,r()*40,230,430,0,0,W,H);ctx.restore();}
  grain(ctx,t);   // 먼지: 흰 점 rgba(255,250,235,.10), 어두운 점 rgba(40,26,18,.16), 900개
  paperFrame(ctx,sc.id*7+Math.floor(tReal/.7)*13,frameMode(tReal));
  ctx.restore();
}
```

- 오린 단어 `label`: 굵은 세리프, 찢어진 종이 바탕(tornRect, 거칠기 11), 종이 섬유 선 26가닥과 얼룩, 글자를 살짝 어긋나게 두 번 찍어 번진 느낌, 0.14초에 1.5배에서 툭 내려앉음, BOIL마다 ±2.5px·±0.8° 떨림.
- 손글씨 `calli`: 왼쪽에서 오른쪽으로 넓어지는 클립으로 써지듯 나타남.
- `polaroid`: 종이색 #F3EFE6, 가장자리 tornRect 3.5, 얼룩, 사진에 따뜻한 막과 가장자리 어둡게, 긁힌 선, 테이프. 그림자 없음.
- 페이지에서는 `video`를 숨겨 두고 캔버스에 그린다. 폰은 재생 전에 영상 첫 장면을 그려 주지 않으므로 `started`(playing 이벤트)가 되기 전이고 t<0.05이면 video 대신 null을 넘겨 first.jpg가 보이게 한다. 안 그러면 첫 화면이 갈색으로 나온다.
- 헤드리스 확인은 Playwright로 여러 시각을 찍어 본다(Chromium은 h264를 못 읽으니 확인용 webm 복사본 사용).

## 7. 올리기 전 점검표

올리기 전에 0초, 각 씬 중간, 맨 끝(마지막 0.05초)을 찍어 직접 보고 전부 확인한다.
- 첫 화면이 갈색·검정이 아니라 영상 첫 장면인가
- 그림자·빛번짐·뿌연 효과가 하나도 없는가
- 낙서·글자가 주요 피사체를 가리지 않는가, 아래쪽 UI 자리가 비었는가
- 글자가 프레임이나 화면 가장자리에 잘리지 않는가
- 겉 프레임이 구간마다 다른가, 첫 구간과 엔딩은 꽉 찼는가
- 화면이 회색빛이 아닌가, 글씨가 너무 선명하지 않은가
- 엔딩 요소가 맨 끝 프레임까지 남는가, 마무리 말이 주제와 이어지는가
- 음악이 영상에 합쳐져 video 하나로만 재생되는가
- 폰용 작은 mp4도 만들었는가

완성 답장에 팔레트, 폰트, 가사 타이밍이 추정인지, 가사가 안 들려 내가 채운 단어, 내가 정한 것을 짧게 적는다.

## 8. 영상으로 뽑기

확정되면 바로 렌더한다. 무대만 그리는 페이지를 Playwright로 띄워 1/12초마다 `drawFrame`을 찍고(영상 프레임은 ffmpeg로 jpg로 뽑아 넘김, Chromium은 h264를 못 읽음), ffmpeg로 30fps에 맞춰 이어 붙인다. 세로면 1080×1920, 가로면 1920×1080. 그림은 12fps로 끊겨 보이는 그대로 둔다. 음악을 입히고, 폰용 작은 버전도 만든다. 사용자 PC에 원본이 있으면 PC에 저장한다.