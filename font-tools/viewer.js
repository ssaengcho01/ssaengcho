/* 탭 1: 내 폰트 다 모여 — 원본 페이지(my-fonts.html)를 그대로 띄움.
   설치된 폰트 읽기(local-fonts)와 클립보드 복사를 iframe에 허용해야 동작한다. */
(function(){
  let made=false;
  function mount(){
    if(made) return; made=true;
    const f=document.createElement("iframe");
    f.src="my-fonts.html"; f.title="내 폰트 다 모여";
    f.allow="local-fonts; clipboard-write";
    f.className="viewer-frame";
    document.getElementById("viewer-root").appendChild(f);
  }
  window.addEventListener("tabchange",e=>{ if(e.detail==="view") mount(); });
})();
