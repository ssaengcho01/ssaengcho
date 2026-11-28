/* 탭 전환 · 토스트 */
window.App=(function(){
  const t=document.getElementById("toast"); let timer;
  function toast(msg){ t.textContent=msg; t.classList.add("show"); clearTimeout(timer); timer=setTimeout(()=>t.classList.remove("show"),1800); }
  function show(name){
    if(!["view","make"].includes(name)) name="view";
    document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("on", b.dataset.tab===name));
    document.getElementById("tab-view").hidden = name!=="view";
    document.getElementById("tab-make").hidden = name!=="make";
    if(location.hash!=="#"+name) history.replaceState(null,"","#"+name);
    document.body.classList.toggle("on-view", name==="view");
    window.dispatchEvent(new CustomEvent("tabchange",{detail:name}));
  }
  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-tab],[data-goto]"); if(!b) return;
    e.preventDefault(); show(b.dataset.tab||b.dataset.goto); window.scrollTo(0,0);
  });
  window.addEventListener("hashchange",()=>show(location.hash.slice(1)));
  document.addEventListener("DOMContentLoaded",()=>show(location.hash.slice(1)||"view"));
  return {toast, show};
})();
