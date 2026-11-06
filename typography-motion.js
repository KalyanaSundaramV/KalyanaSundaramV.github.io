/* Subtle typography entrances throughout the editable portfolio.
   Text remains real DOM text; no rewrapping, letter scrambling or layout shifts. */
(() => {
  "use strict";
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  if(reduced.matches)return;
  const selectors=[
    ".site-header .brand",".desktop-nav .nav-link",
    "main h1","main h2","main h3","main h4",
    "main p","main li","main .eyebrow","main .section-index",
    "main .stat-number","main .stat-caption",
    "main .project-kicker","main .chip",
    "main .timeline-company","main .timeline-when",
    "main .hero-buttons .pill","main .filter-bar button",
    "main .tool-tabs button","main .marquee-caption",
    "footer h2","footer h3","footer p","footer a",
    ".modal-body h2",".modal-body h3",".modal-body h4",
    ".modal-body p",".modal-body li",".modal-body .chip",
    ".modal-body .modal-metric",".modal-top-label",
    ".modal-actions .pill",".menu-content h2",".menu-content p"
  ].join(",");
  const exclusions=".preloader,.original-demo-overlay,.theme-transition,.motion-char,.marquee-inner,.liquid-pointer";
  let armed=false;
  const pending=new Set();
  const observer=("IntersectionObserver" in window)
    ?new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        entry.target.classList.add("type-visible");
        observer.unobserve(entry.target);
        pending.delete(entry.target);
      }
    },{threshold:.04,rootMargin:"0px 0px -8px 0px"}):null;
  function stage(el){
    if(el.classList.contains("type-entrance")||el.closest(exclusions))return;
    // Avoid animating an invisible or non-rendered UI control until it opens.
    el.classList.add("type-entrance");
    const parent=el.parentElement;
    const idx=parent?Array.prototype.indexOf.call(parent.children,el):0;
    el.style.setProperty("--type-delay",`${Math.min(idx%5,4)*38}ms`);
    pending.add(el);
    if(armed){
      if(observer)observer.observe(el);
      else el.classList.add("type-visible");
    }
  }
  function scan(root){
    if(!root || root.nodeType!==1)return;
    if(root.matches(selectors))stage(root);
    root.querySelectorAll(selectors).forEach(stage);
  }
  function activate(){
    if(armed||document.getElementById("preloader"))return;
    armed=true;
    for(const el of pending){
      if(!el.isConnected){pending.delete(el);continue;}
      if(observer)observer.observe(el);
      else el.classList.add("type-visible");
    }
    pending.clear();
  }
  function init(){
    scan(document.body);
    document.addEventListener("ksv:intro-finished",activate);
    if(!document.getElementById("preloader"))activate();
    // Cards, theme menus and case studies are created dynamically.
    const mutations=new MutationObserver(records=>{
      for(const change of records){
        for(const node of change.addedNodes){
          if(node.nodeType===1 && !node.closest(exclusions))scan(node);
        }
      }
    });
    mutations.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
