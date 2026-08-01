/* council-view-collapse.js — 전문가 카드 관점 본문 접기/펼치기 */
(function () {
  "use strict";
  if (window.__councilViewCollapse) return;
  window.__councilViewCollapse = true;
  function injectStyle() {
    if (document.getElementById("councilViewCollapseStyle")) return;
    var s = document.createElement("style"); s.id = "councilViewCollapseStyle";
    s.textContent = "#v-council .cl-view{cursor:pointer;position:relative;max-height:4.8em;overflow:hidden;transition:max-height .18s ease;padding-right:18px}#v-council .cl-view::after{content:'클릭하여 펼치기';position:absolute;right:0;bottom:0;padding:2px 0 0 12px;font-size:11px;font-weight:600;color:var(--dawn,#9a7b2f);background:linear-gradient(90deg,transparent,var(--panel,#fff) 28%)}#v-council .cl-view.is-expanded{max-height:2000px}#v-council .cl-view.is-expanded::after{content:'클릭하여 접기';background:none}";
    document.head.appendChild(s);
  }
  function mount(root) {
    var nodes = (root || document).querySelectorAll("#v-council .cl-view");
    for (var i=0;i<nodes.length;i++) {
      var el=nodes[i]; if (el.dataset.viewCollapseBound) continue;
      el.dataset.viewCollapseBound="1"; el.setAttribute("role","button"); el.setAttribute("tabindex","0"); el.setAttribute("aria-expanded","false"); el.title="클릭하여 전문가 관점을 펼치거나 접습니다";
      el.addEventListener("click",function(e){e.stopPropagation();var open=this.classList.toggle("is-expanded");this.setAttribute("aria-expanded",open?"true":"false");});
      el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();this.click();}});
    }
  }
  function boot(){injectStyle();mount(document);var t=document.getElementById("v-council");if(t)new MutationObserver(function(){mount(t);}).observe(t,{childList:true,subtree:true});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();