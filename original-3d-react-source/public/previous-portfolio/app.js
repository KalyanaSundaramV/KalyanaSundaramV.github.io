/* KSV portfolio reconstruction — vanilla JavaScript, no server or external dependencies.
   All copy & project records: content.js | All theme colors: styles.css */
(() => {
  "use strict";
  const D = window.PORTFOLIO;
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const safe = value => String(value ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");
  let toastTimeout, lastFocused = null;
  const themes = [
    {id:"crimson", label:"DARK NIGHT & CRIMSON",bg:"#061726",accent:"#D73139"},
    {id:"ocean",label:"DEEP OCEAN & TOXIC",bg:"#041226",accent:"#78E825"},
    {id:"cyan",label:"MIDNIGHT & CYAN",bg:"#010310",accent:"#23A9BD"},
    {id:"cream",label:"COLONIAL & WATERLOO",bg:"#FFF0BA",accent:"#111808"},
    {id:"mauve",label:"BERRY & MAUVE",bg:"#441541",accent:"#ECDCFA"},
    {id:"fuchsia",label:"NAVY & FUCHSIA",bg:"#100E55",accent:"#FF90FD"},
    {id:"yellow",label:"OBSIDIAN & SUNBURST",bg:"#240E4E",accent:"#FFE956"}
  ];
  const sections = ["work","about","capabilities","tools","experience","resume","contact"];
  const menuConfig = {
    work: {k:"01 / SELECTED WORK",title:"ENGINEERED<br/>TO PLAY.",desc:"Explore mobile games, prototyping experiments, and practical desktop tools.",links:[["All featured work","#work"],["Ludo Demolition","#work","ludo-demolition"],["King Cube","#work","king-cube"],["ProjectPulse","#work","projectpulse"]]},
    about: {k:"02 / INTRODUCTION",title:"BUILDING<br/>SYSTEMS.",desc:"Game and tools engineer based in Bengaluru. From working prototype to testable system.",links:[["About me","#about"],["Destruction pipeline","#pipeline"],["Get in touch","#contact"]]},
    capabilities:{k:"03 / CORE SKILLS",title:"HOW I<br/>BUILD.",desc:"Gameplay, native apps, editor tooling, procedural generation, and iterative prototypes.",links:[["Gameplay systems","#capabilities"],["Procedural generation","#capabilities"],["Unity tools","#capabilities"],["Native applications","#capabilities"]]},
    tools:{k:"04 / TOOLS I BUILT",title:"UTILITY<br/>FIRST.",desc:"Local-first engineering tools and Windows products, designed around real workflows.",links:[["All tools","#tools"],["AssetForge / PackTriage","#tools","assetforge"],["Wallpaper Workbench","#tools","wallpaper-workbench"],["Money Planner","#tools","money-planner"]]},
    experience:{k:"05 / EXPERIENCE",title:"TEN YEARS<br/>IN MOTION.",desc:"From independent games to engineering teams, product systems, and rapid prototypes.",links:[["Career timeline","#experience"],["Qila Games","#experience"],["Bombay Play","#experience"],["Education","#experience"]]},
    resume:{k:"06 / RESUME",title:"THE FULL<br/>RECORD.",desc:"Experience, skills, selected work, and education in one place.",links:[["Resume overview","#resume"],["Core skills","#capabilities"],["Selected projects","#work"],["Request PDF","#contact"]]},
    contact:{k:"07 / CONTACT",title:"LET'S BUILD<br/>SOMETHING.",desc:"For gameplay systems, engineering tools, full-time opportunities, and selected collaborations.",links:[["Email me","#contact"],["Contact section","#contact"],["Project index","#work"]]}
  };

  function renderContent(){
    $("#about-copy").textContent = D.about;
    $("#contact-line").textContent = D.contactLine;
    $("#degree-title").textContent = D.degree;
    $("#college-name").textContent = D.college;
    $("#email-link").href = "mailto:" + encodeURIComponent(D.email);
    $("#email-link").innerHTML = "✉ &nbsp; " + safe(D.email.toUpperCase()) + " ↗";
    $("#stats").innerHTML = D.stats.map((s,i)=>`<div class="stat reveal"><div class="stat-number" data-target="${s.value}" data-suffix="${safe(s.suffix)}">${prefersReduced.matches ? s.value+s.suffix : "0"+s.suffix}</div><div class="stat-caption">${safe(s.label)}</div></div>`).join("");
    $("#project-grid").innerHTML = D.projects.map((p,i)=>`
      <button type="button" class="project-card reveal" data-id="${safe(p.id)}" data-category="${safe(p.category)}" aria-label="View ${safe(p.name)} case study" style="transition-delay:${(i%2)*.08}s">
        <span class="project-number" aria-hidden="true">${safe(p.number)}</span><span class="project-arrow" aria-hidden="true">↗</span>
        <span class="project-title">${safe(p.name)}</span><span class="project-kicker">${safe(p.kicker)}</span>
        <span class="project-desc">${safe(p.summary)}</span>
        <span class="project-chips">${p.tags.map(t=>`<span class="chip">${safe(t)}</span>`).join("")}</span>
      </button>`).join("");
    $("#pipeline").innerHTML = D.pipeline.map(([title,desc])=>`<div class="pipeline-node"><strong>${safe(title)}</strong><p>${safe(desc)}</p></div>`).join("");
    const marqueeUnit = D.skills.map((s,i)=>`<span>${safe(s)}</span><b>✳</b>`).join("");
    $("#marquee-inner").innerHTML = `<div style="display:flex;align-items:center;gap:26px;padding-right:26px" aria-hidden="true">${marqueeUnit}</div><div style="display:flex;align-items:center;gap:26px;padding-right:26px" aria-hidden="true">${marqueeUnit}</div>`;
    $("#cap-grid").innerHTML = D.skills.map((s,i)=>{
      const associated = D.capabilities.find(([c])=>s.toLowerCase().includes(c.toLowerCase().split(" ")[0]));
      return `<article class="capability reveal"><span>${String(i+1).padStart(2,"0")}</span><h3>${safe(s)}</h3><p>${associated ? safe(associated[1]) : "SKILLS & ENGINEERING PRACTICE"}</p></article>`;
    }).join("");
    $("#tools-grid").innerHTML = D.projects.filter(p=>p.category==="Tool").map((p,i)=>`
      <button class="tool-card reveal" type="button" data-id="${safe(p.id)}" aria-label="Read about ${safe(p.name)}"><span class="eyebrow">${safe(p.kicker)}</span>
      <span class="tool-number" aria-hidden="true">${safe(p.number)}</span><h3>${safe(p.name)}</h3><p>${safe(p.summary)}</p></button>`).join("");
    $("#experience-list").innerHTML = D.experience.map((e,i)=>`<article class="timeline-row reveal"><div class="timeline-date">${safe(e.when)}</div><div><h3>${safe(e.title)}</h3><div class="timeline-company">${safe(e.company)}</div><p>${safe(e.text)}</p></div></article>`).join("");
    $("#resume-projects").innerHTML = D.projects.map(p=>`<li><span>${safe(p.number)}</span>${safe(p.name)}</li>`).join("");
    $("#resume-brief").innerHTML = `
      <div class="resume-brief-block"><h4>ABOUT</h4><p>Game and tools engineering; mobile gameplay, rapid prototypes, native products, editor pipelines, and automation.</p></div>
      <div class="resume-brief-block"><h4>RECENT EXPERIENCE</h4>${D.experience.slice(0,3).map(e=>`<p>${safe(e.title)} · <strong>${safe(e.company)}</strong> <small>${safe(e.when)}</small></p>`).join("")}</div>
      <div class="resume-brief-block"><h4>EDUCATION</h4><p>${safe(D.degree)} — ${safe(D.college)}</p></div>`;
    if(D.social.resumePdf){
      const a=$("#resume-pdf");a.hidden=false;a.href=D.social.resumePdf;a.setAttribute("target","_blank");a.setAttribute("rel","noopener noreferrer");$(".resume-note").hidden=true;
    }
    $("#filter-buttons").addEventListener("click",e=>{
      const b=e.target.closest("button[data-filter]");if(!b)return;
      $$("#filter-buttons button").forEach(x=>x.classList.toggle("active",x===b));
      const filter=b.dataset.filter;
      $$(".project-card").forEach(x=>x.hidden=filter!=="all" && x.dataset.category!==filter);
    });
  }

  function paintThemeOptions(){
    $("#theme-options").innerHTML = themes.map(t=>`<button type="button" class="theme-option" data-theme-option="${t.id}" aria-pressed="${document.body.dataset.theme===t.id}"><span class="theme-swatch" style="--sw-bg:${t.bg};--sw-accent:${t.accent}"></span>${safe(t.label)} <em>${document.body.dataset.theme===t.id ? "✓" : ""}</em></button>`).join("");
  }
  function applyTheme(id){
    if(!themes.some(t=>t.id===id))return;
    document.body.dataset.theme=id;
    document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.body).getPropertyValue("--bg").trim();
    try{localStorage.setItem("ksv-theme",id)}catch(e){}
    paintThemeOptions();
    updateParticleColor();
  }
  function initTheme(){
    let saved;try{saved=localStorage.getItem("ksv-theme")}catch(e){}
    applyTheme(themes.some(t=>t.id===saved)?saved:"crimson");
    $("#theme-orb").addEventListener("click",()=>{
      closeLiquid();
      const open=!$("#theme-menu").classList.contains("open");
      $("#theme-menu").classList.toggle("open",open);
      $("#theme-menu").setAttribute("aria-hidden",String(!open));
      $("#theme-orb").setAttribute("aria-expanded",String(open));
    });
    $("#theme-options").addEventListener("click",e=>{
      const opt=e.target.closest("[data-theme-option]");if(!opt)return;
      applyTheme(opt.dataset.themeOption);
      closeTheme();
      toast("THEME UPDATED — " + themes.find(t=>t.id===opt.dataset.themeOption).label);
    });
  }
  function closeTheme(){
    const el=$("#theme-menu");if(!el.classList.contains("open"))return;
    el.classList.remove("open");el.classList.add("closing");
    el.setAttribute("aria-hidden","true");$("#theme-orb").setAttribute("aria-expanded","false");
    setTimeout(()=>el.classList.remove("closing"),380);
  }

  // Organic, tab-anchored navigation inspired by the reference video.
  // The visual map represents portfolio topics; all destinations stay real and editable.
  const visualTopics = {
    work: ["GAMEPLAY","PROTOTYPES","TOOLS","SYSTEMS"],
    about: ["BUILD","TEST","ITERATE","SHIP"],
    capabilities: ["MECHANICS","PROCEDURAL","UNITY","NATIVE"],
    tools: ["EDITOR","WINDOWS","ANDROID","AUTOMATION"],
    experience: ["STUDIO","TEAMS","PROTOTYPES","INDEPENDENT"],
    resume: ["EXPERIENCE","PROJECTS","SKILLS","EDUCATION"],
    contact: ["GAMES","TOOLS","SYSTEMS","COLLABORATE"]
  };
  const shapeMarkup = (idx) => {
    if(idx===3) return `<svg viewBox="0 0 90 90" aria-hidden="true" focusable="false"><defs><linearGradient id="ring-g" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="var(--ink)" stop-opacity=".84"/><stop offset=".5" stop-color="var(--accent-hot)" stop-opacity=".48"/><stop offset="1" stop-color="var(--bg)"/></linearGradient></defs><ellipse cx="45" cy="45" rx="24" ry="36" fill="none" stroke="url(#ring-g)" stroke-width="15" transform="rotate(-23 45 45)"/><ellipse cx="45" cy="45" rx="17" ry="32" fill="none" stroke="var(--ink)" stroke-opacity=".34" stroke-width="2" transform="rotate(-23 45 45)"/><path d="M23 34 Q37 8 58 18" fill="none" stroke="white" stroke-opacity=".44" stroke-width="3" stroke-linecap="round"/></svg>`;
    const faces = [
      `<polygon points="45,4 80,24 81,65 45,86 9,65 9,24" fill="var(--chip-bg)" stroke="var(--border-strong)" stroke-width="1"/>
       <polygon points="45,4 80,24 51,41" fill="var(--ink)" opacity=".69"/><polygon points="45,4 51,41 9,24" fill="var(--accent-hot)" opacity=".35"/><polygon points="9,24 51,41 9,65" fill="var(--ink)" opacity=".2"/><polygon points="51,41 80,24 81,65" fill="var(--accent-hot)" opacity=".14"/><polygon points="9,65 51,41 45,86" fill="var(--ink)" opacity=".5"/><polygon points="51,41 81,65 45,86" fill="var(--accent-hot)" opacity=".45"/><path d="M9 24L80 24 M9 65L81 65 M45 4L45 86" stroke="var(--ink)" opacity=".08" fill="none"/>`,
      `<polygon points="45,6 82,44 44,82 7,44" fill="var(--panel-strong)" stroke="var(--border-strong)"/><polygon points="45,6 44,82 7,44" fill="var(--accent-hot)" opacity=".36"/><polygon points="45,6 82,44 44,82" fill="var(--ink)" opacity=".4"/><polygon points="7,44 45,26 82,44 44,65" fill="var(--chip-bg)"/><path d="M45 6V26 M44 65V82 M7 44L45 26L82 44" fill="none" stroke="var(--ink)" stroke-opacity=".34"/>`,
      `<polygon points="45,4 81,28 81,66 45,86 9,66 9,28" fill="var(--panel-strong)" stroke="var(--border-strong)"/><polygon points="9,28 45,4 45,46 9,66" fill="var(--accent-hot)" opacity=".32"/><polygon points="81,28 45,4 45,46 81,66" fill="var(--ink)" opacity=".43"/><polygon points="9,66 45,46 81,66 45,86" fill="var(--ink)" opacity=".19"/><path d="M9 28L45 46L81 28" stroke="var(--ink)" stroke-opacity=".25" fill="none"/>`
    ];
    return `<svg viewBox="0 0 90 90" aria-hidden="true" focusable="false">${faces[idx]}</svg>`;
  };
  function navVisual(id) {
    const labels = visualTopics[id] || visualTopics.work;
    return `<div class="drop-visual" aria-hidden="true">
      <svg class="drop-network" viewBox="0 0 360 232" preserveAspectRatio="none">
        <path d="M94 62H266V173H94V62 M94 62L266 173 M266 62L94 173" fill="none" stroke="var(--accent-hot)" stroke-opacity=".24" stroke-width="1.1" stroke-dasharray="5 9"/>
        <circle cx="180" cy="117" r="17" stroke="var(--accent-hot)" stroke-opacity=".18" fill="none"/>
        <circle cx="180" cy="117" r="3" fill="var(--accent-hot)" opacity=".7"/>
      </svg>
      ${labels.map((label,i)=>`<div class="drop-node drop-node-${i+1}" style="--node-index:${i}">
        <span class="drop-shape">${shapeMarkup(i)}</span>
        <span class="drop-node-label">${safe(label)}</span>
      </div>`).join("")}
      <i class="drop-satellite drop-satellite-1"></i><i class="drop-satellite drop-satellite-2"></i><i class="drop-satellite drop-satellite-3"></i>
      <span class="drop-visual-caption">EXPLORE / ${safe(id.toUpperCase())}</span>
    </div>`;
  }
  let activeMenu=null, closeDelay=0, menuCloseToken=0;
  function placeLiquid(trigger){
    // The dropdown's seed is the underline, not the mouse location.
    // Both the underline and the clipped glass panel use the tab's measured position.
    const el=$("#liquid-menu"), shell=$(".nav-shell"), underline=$("#nav-underline");
    if(!trigger||!el||!shell||!underline)return;
    const sr=shell.getBoundingClientRect(), tr=trigger.getBoundingClientRect();
    const width=Math.max(0,Math.min(738,sr.width-4));
    const tabCenter=tr.left-sr.left+tr.width/2;
    const left=Math.min(Math.max(tabCenter-width*.50,2),Math.max(2,sr.width-width-2));
    const origin=Math.min(width-20,Math.max(20,tabCenter-left));
    const lineWidth=Math.max(25,tr.width-21);
    const lineY=tr.bottom-sr.top+1;
    el.style.left=left+"px";
    el.style.width=width+"px";
    el.style.top=lineY+"px";
    el.style.setProperty("--nav-origin",origin+"px");
    el.style.setProperty("--seed-half",(lineWidth/2)+"px");
    underline.style.left=(tabCenter-lineWidth/2)+"px";
    underline.style.width=lineWidth+"px";
    underline.style.top=lineY+"px";
  }
  function openLiquid(id,trigger){
    if(window.innerWidth<=760 || !menuConfig[id])return;
    const el=$("#liquid-menu");
    clearTimeout(closeDelay);
    menuCloseToken++;
    closeTheme();
    trigger=trigger||$(`.nav-link[data-menu="${id}"]`);
    placeLiquid(trigger);
    $("#nav-underline").classList.add("lit");
    if(activeMenu===id && el.classList.contains("open"))return;
    const switching=el.classList.contains("open");
    activeMenu=id;
    const m=menuConfig[id];
    $("#menu-content").innerHTML=`<div class="drop-layout">
      <div class="drop-gallery">
        <span class="drop-kicker">${safe(m.k)} <b>✳</b></span>
        ${navVisual(id)}
      </div>
      <div class="drop-info">
        <div class="drop-info-top"><span>QUICK ACCESS</span><span>↗ NAVIGATION</span></div>
        <h2 class="drop-headline">${m.title}</h2>
        <p class="drop-description">${safe(m.desc)}</p>
        <div class="drop-actions">${m.links.map(([title,href,project],i)=>`<a href="${safe(href)}" ${project?`data-project="${safe(project)}"`:""} style="--item-index:${i}" class="drop-action">${safe(title)}<span>↗</span></a>`).join("")}</div>
      </div>
    </div>`;
    decorateMotionTitles($("#menu-content"),true);
    // Line-driven expansion: the glass surface unfolds from the active underline.
    el.classList.remove("closing");
    if(switching){
      el.classList.remove("is-switching");
      void el.offsetWidth; // replay a brief content dissolve when moving across tabs
      el.classList.add("is-switching");
    } else el.classList.remove("is-switching");
    el.classList.add("open");
    el.setAttribute("aria-hidden","false");
    el.removeAttribute("inert");
    el.setAttribute("aria-label",`${id} expanded navigation`);
    $$(".nav-link").forEach(b=>{
      const active=b.dataset.menu===id;
      b.classList.toggle("active",active);
      b.setAttribute("aria-expanded",String(active));
    });
  }
  function closeLiquid(){
    const el=$("#liquid-menu");if(!el.classList.contains("open"))return;
    const token=++menuCloseToken;
    activeMenu=null;
    el.classList.remove("open","is-switching");
    el.classList.add("closing");
    $("#nav-underline").classList.remove("lit");
    el.setAttribute("aria-hidden","true");
    el.setAttribute("inert","");
    $$(".nav-link").forEach(b=>{b.classList.remove("active");b.setAttribute("aria-expanded","false")});
    setTimeout(()=>{if(token===menuCloseToken)el.classList.remove("closing")},520);
  }
  function initNav(){
    $$(".nav-link").forEach(b=>{
      b.addEventListener("mouseenter",()=>openLiquid(b.dataset.menu,b));
      b.addEventListener("focus",()=>openLiquid(b.dataset.menu,b));
      b.addEventListener("click",()=>activeMenu===b.dataset.menu?closeLiquid():openLiquid(b.dataset.menu,b));
    });
    $(".nav-shell").addEventListener("mouseleave",()=>{closeDelay=setTimeout(closeLiquid,180)});
    $(".nav-shell").addEventListener("mouseenter",()=>clearTimeout(closeDelay));
    $("#menu-content").addEventListener("click",e=>{
      const a=e.target.closest("a");if(!a)return;
      closeLiquid();
      if(a.dataset.project){e.preventDefault();openModal(a.dataset.project)}
    });
    // On smaller screens, retain the same nested information as expanding accordions.
    $("#mobile-links").innerHTML=sections.map((id,i)=>{
      const m=menuConfig[id];
      return `<div class="mobile-group" style="--group-index:${i}">
        <button type="button" class="mobile-group-toggle" data-mobile-section="${id}" aria-expanded="false" aria-controls="mobile-sub-${id}">${safe(id)}<span>+</span></button>
        <div class="mobile-sub" id="mobile-sub-${id}" aria-hidden="true"><div class="mobile-sub-inner">
          <a href="#${id}" class="mobile-jump">VIEW ${safe(id.toUpperCase())} ↗</a>
          ${m.links.map(([title,href,project])=>`<a href="${safe(href)}" ${project?`data-project="${safe(project)}"`:""}>${safe(title)} <span>↗</span></a>`).join("")}
        </div></div>
      </div>`;
    }).join("");
    $("#mobile-links").addEventListener("click",e=>{
      const btn=e.target.closest("[data-mobile-section]");
      if(btn){
        const open=btn.getAttribute("aria-expanded")!=="true";
        $$(".mobile-group-toggle").forEach(b=>b.setAttribute("aria-expanded","false"));
        $$(".mobile-sub").forEach(s=>s.setAttribute("aria-hidden","true"));
        btn.setAttribute("aria-expanded",String(open));
        $(`#mobile-sub-${btn.dataset.mobileSection}`).setAttribute("aria-hidden",String(!open));
        return;
      }
      const link=e.target.closest("a");
      if(link){
        setMobile(false);
        if(link.dataset.project){e.preventDefault();openModal(link.dataset.project)}
      }
    });
    $("#mobile-toggle").addEventListener("click",()=>setMobile(!$("#mobile-overlay").classList.contains("open")));
    $("#mobile-links").addEventListener("click",e=>{if(e.target.closest("a"))setMobile(false)});
    document.addEventListener("click",e=>{
      if(!e.target.closest(".nav-shell")){closeLiquid();closeTheme()}
    });
    document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeLiquid();closeTheme();setMobile(false);closeModal()}});
    window.addEventListener("resize",()=>{
      if(window.innerWidth<=760){closeLiquid();return}
      if(activeMenu)placeLiquid($(`.nav-link[data-menu="${activeMenu}"]`));
    },{passive:true});
    $("#back-to-top").addEventListener("click",()=>window.scrollTo({top:0,behavior:prefersReduced.matches?"instant":"smooth"}));
    let ticking=false;
    window.addEventListener("scroll",()=>{
      if(ticking)return;ticking=true;
      requestAnimationFrame(()=>{
        const max=document.documentElement.scrollHeight-window.innerHeight;
        $("#scroll-progress").style.width=(max>0?window.scrollY/max*100:0)+"%";
        $("#site-header").classList.toggle("scrolled",window.scrollY>50);
        ticking=false;
      });
    },{passive:true});
  }
  function setMobile(open){
    const el=$("#mobile-overlay"),btn=$("#mobile-toggle");
    el.classList.toggle("open",open);el.setAttribute("aria-hidden",String(!open));
    btn.classList.toggle("active",open);btn.setAttribute("aria-expanded",String(open));
    btn.setAttribute("aria-label",open?"Close navigation":"Open navigation");
    document.body.style.overflow=open?"hidden":"";
    if(open){closeTheme();closeLiquid()}
  }

  function openModal(id){
    const p=D.projects.find(p=>p.id===id);if(!p)return;
    lastFocused=document.activeElement;
    $("#modal-num").textContent = `${p.number} — CASE STUDY`;
    $("#modal-body").innerHTML = `
      <h2 class="modal-title" id="modal-title">${safe(p.name)}</h2>
      <div class="modal-subtitle">${safe(p.kicker)} / ${safe(p.stack)}</div>
      <p class="modal-summary">${safe(p.summary)}</p>
      <div class="modal-divider"></div>
      <p class="modal-section-heading">WHAT IT DOES</p>
      <ol class="modal-features">${p.details.map((f,i)=>`<li><strong>${String(i+1).padStart(2,"0")}</strong>${safe(f)}</li>`).join("")}</ol>
      <div class="modal-meta">${p.tags.map(t=>`<span class="chip">${safe(t)}</span>`).join("")}</div>
      <p class="modal-role"><strong>ROLE</strong> ${safe(p.role)} &nbsp; · &nbsp; <strong>STATUS</strong> ${safe(p.status)}</p>
      <div class="modal-actions"><a class="pill primary" href="mailto:${encodeURIComponent(D.email)}?subject=${encodeURIComponent("Question about "+p.name)}">ASK ABOUT THIS ↗</a><button class="pill ghost" data-close-modal type="button">CLOSE ×</button></div>
      <div class="modal-watermark" aria-hidden="true">${safe(p.number)}</div>`;
    decorateMotionTitles($("#modal-body"),true);
    const m=$("#modal");
    m.classList.add("open");m.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
    setTimeout(()=>$(".round-close").focus(),60);
  }
  function closeModal(){
    const m=$("#modal");if(!m.classList.contains("open"))return;
    m.classList.remove("open");m.setAttribute("aria-hidden","true");
    document.body.style.overflow="";
    if(lastFocused?.focus)lastFocused.focus();
  }
  function initModals(){
    document.addEventListener("click",e=>{
      const card=e.target.closest(".project-card, .tool-card");
      if(card?.dataset.id){openModal(card.dataset.id);return}
      if(e.target.closest("[data-close-modal]")){closeModal();return}
      const social=e.target.closest("[data-social]");
      if(social){
        const label=social.dataset.social,url=D.social[label];
        if(url){window.open(url,"_blank","noopener,noreferrer")}
        else toast("ADD YOUR "+label.toUpperCase()+" LINK IN CONTENT.JS");
      }
    });
    $("#modal").addEventListener("keydown",e=>{
      if(e.key!=="Tab")return;
      const focusable=$$('button:not([disabled]),a[href]', $("#modal")).filter(x=>x.getClientRects().length);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey && document.activeElement===first){last.focus();e.preventDefault()}
      else if(!e.shiftKey && document.activeElement===last){first.focus();e.preventDefault()}
    });
  }
  function toast(text){
    const el=$("#toast");el.textContent=text;el.classList.add("show");
    clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove("show"),3200);
  }
  function initEmail(){
    $("#copy-email").addEventListener("click",async()=>{
      let ok=false;
      try{await navigator.clipboard.writeText(D.email);ok=true}catch(e){
        const inp=document.createElement("textarea");inp.value=D.email;inp.style.position="fixed";inp.style.opacity=0;
        document.body.appendChild(inp);inp.select();try{ok=document.execCommand("copy")}catch(e2){}inp.remove();
      }
      toast(ok?"COPIED! "+D.email:"EMAIL: "+D.email);
      $("#copy-email").textContent=ok?"COPIED ✓":"COPY EMAIL ⧉";
      setTimeout(()=>$("#copy-email").textContent="COPY EMAIL ⧉",2100);
    });
  }
  function initScrollReveals(){
    if(prefersReduced.matches){$$(".reveal").forEach(x=>x.classList.add("in-view"));return}
    const obs = new IntersectionObserver(items=>items.forEach(({target,isIntersecting})=>{
      if(isIntersecting){target.classList.add("in-view");obs.unobserve(target)}
    }),{threshold:.07,rootMargin:"0px 0px -35px 0px"});
    $$(".reveal").forEach(x=>obs.observe(x));
    const statsObserver=new IntersectionObserver(entries=>{
      if(!entries[0].isIntersecting)return;
      $$(".stat-number").forEach((el,i)=>{
        const target=Number(el.dataset.target),suffix=el.dataset.suffix;
        const dur=1450,st=performance.now();
        const run=now=>{
          const fraction=Math.min(1,(now-st)/dur),eased=1-Math.pow(1-fraction,4);
          el.textContent=Math.round(target*eased)+suffix;
          if(fraction<1)requestAnimationFrame(run);
        };
        requestAnimationFrame(run);
      });
      statsObserver.disconnect();
    },{threshold:.2});
    statsObserver.observe($("#stats"));
  }
  function initProjectTilt(){
    if(coarsePointer.matches || prefersReduced.matches)return;
    $$(".project-card").forEach(el=>{
      el.addEventListener("pointermove",e=>{
        const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
        el.style.setProperty("--x",(x*100)+"%");el.style.setProperty("--y",(y*100)+"%");
        el.style.setProperty("--rx",((.5-y)*3).toFixed(2)+"deg");
        el.style.setProperty("--ry",((x-.5)*4).toFixed(2)+"deg");
      });
      el.addEventListener("pointerleave",()=>{
        el.style.setProperty("--rx","0deg");el.style.setProperty("--ry","0deg")
      });
    });
  }
  function initCustomCursor(){
    if(coarsePointer.matches || prefersReduced.matches)return;
    const cur=$("#cursor");
    let x=-100,y=-100,tx=-100,ty=-100,active=false;
    document.addEventListener("pointermove",e=>{
      tx=e.clientX;ty=e.clientY;cur.style.opacity="1";
      const hover=e.target.closest(".project-card,.tool-card");
      cur.classList.toggle("active",!!hover);
      $("#cursor-label").textContent=hover?"VIEW":"";
    },{passive:true});
    document.documentElement.addEventListener("pointerleave",()=>cur.style.opacity="0");
    const loop=()=>{x+=(tx-x)*.22;y+=(ty-y)*.22;cur.style.left=x+"px";cur.style.top=y+"px";requestAnimationFrame(loop)};
    requestAnimationFrame(loop);
    $$(".magnet").forEach(el=>{
      el.addEventListener("pointermove",e=>{
        const r=el.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
        el.style.transform=`translate(${x*.11}px,${y*.2}px)`;
      });
      el.addEventListener("pointerleave",()=>el.style.transform="");
    });
  }
  // Motion graphics for all editorial headings and dynamically rendered title cards.
  // Keep the original content in aria-label while the visible glyphs animate.
  const titleSelector=[
    "h2.display","h3.medium-title",".project-title",
    ".tool-card h3",".capability h3",".timeline-row h3",
    ".education h3",".resume-card h3",".drop-headline",".modal-title"
  ].join(",");
  const typeObserver=(!prefersReduced.matches && "IntersectionObserver" in window)
    ? new IntersectionObserver(entries=>{
        for(const entry of entries){
          if(entry.isIntersecting){
            entry.target.classList.add("motion-visible");
            typeObserver.unobserve(entry.target);
          }
        }
      },{threshold:.12,rootMargin:"0px 0px -4% 0px"})
    : null;

  function decorateMotionTitles(root=document, immediate=false){
    root.querySelectorAll(titleSelector).forEach(el=>{
      if(el.dataset.motionReady)return;
      el.dataset.motionReady="yes";
      if(prefersReduced.matches || !typeObserver)return;
      const label=(el.innerText || el.textContent || "").replace(/\s+/g," ").trim();
      if(el.matches("h2,h3"))el.setAttribute("aria-label",label);
      el.classList.add("motion-heading");
      let count=0;
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      const textNodes=[];
      while(walker.nextNode())textNodes.push(walker.currentNode);
      for(const node of textNodes){
        if(!node.nodeValue.trim())continue;
        const fragment=document.createDocumentFragment();
        const parts=node.nodeValue.match(/\s+|[^\s]+/g)||[];
        for(const part of parts){
          if(/^\s+$/.test(part)){fragment.appendChild(document.createTextNode(part));continue}
          const word=document.createElement("span");
          word.className="motion-word";
          word.setAttribute("aria-hidden","true");
          const graphemes=(typeof Intl.Segmenter==="function")
            ? Array.from(new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(part),x=>x.segment)
            : Array.from(part);
          for(const letter of graphemes){
            const glyph=document.createElement("span");
            glyph.className="motion-char";
            glyph.textContent=letter;
            glyph.style.setProperty("--glyph-step",String(Math.min(count++,32)));
            word.appendChild(glyph);
          }
          fragment.appendChild(word);
        }
        node.replaceWith(fragment);
      }
      if(immediate){
        requestAnimationFrame(()=>el.classList.add("motion-visible"));
      }else{
        typeObserver.observe(el);
      }
    });
  }

  function initKineticType(){
    // Preserve accessibility: visual spans are aria-hidden while parent has an accessible label.
    $$(".kinetic").forEach(el=>{
      const punctuation=el.querySelector(".punctuation");
      const word=el.childNodes[0]?.textContent??"";
      el.innerHTML=[...word].map((ch,i)=>`<span class="letter" aria-hidden="true" style="transition-delay:${i*17}ms">${safe(ch)}</span>`).join("")+(punctuation?`<span class="punctuation" aria-hidden="true">.</span>`:"");
    });
    $("#lens-toggle").addEventListener("click",()=>{
      const on=!$("#media-stage").classList.contains("lens-on");
      $("#media-stage").classList.toggle("lens-on",on);$("#lens-toggle").setAttribute("aria-pressed",String(on));
      toast(on?"MOVE YOUR CURSOR OVER THE IMAGE TO REVEAL":"LENS MODE OFF");
    });
    $("#media-stage").addEventListener("pointermove",e=>{
      const r=e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty("--lensX",(e.clientX-r.left)+"px");
      e.currentTarget.style.setProperty("--lensY",(e.clientY-r.top)+"px");
    });
  }
  let particleColor="rgba(233,25,92,.8)";
  let particleCanvas,particleCtx,particles=[],particleWidth=0,particleHeight=0;
  function updateParticleColor(){
    const css=getComputedStyle(document.body);
    particleColor=css.getPropertyValue("--accent-hot").trim() || "#e91b58";
  }
  function initParticles(){
    if(prefersReduced.matches)return;
    particleCanvas=$("#particle-canvas");particleCtx=particleCanvas.getContext("2d",{alpha:true});
    const resize=()=>{
      const rect=particleCanvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
      particleWidth=rect.width;particleHeight=rect.height;
      particleCanvas.width=Math.round(particleWidth*dpr);particleCanvas.height=Math.round(particleHeight*dpr);
      particleCtx.setTransform(dpr,0,0,dpr,0,0);
      const count=Math.min(100,Math.max(30,Math.round(particleWidth*particleHeight/14000)));
      particles=Array.from({length:count},()=>({x:Math.random()*particleWidth,y:Math.random()*particleHeight,r:Math.random()*1.3+.28,vy:(Math.random()-.5)*.2,vx:(Math.random()-.5)*.16,alpha:Math.random()*.5+.2}));
    };
    window.addEventListener("resize",resize,{passive:true});resize();
    let last=0;
    function frame(t){
      requestAnimationFrame(frame);
      if(document.hidden || t-last<33)return;last=t;
      particleCtx.clearRect(0,0,particleWidth,particleHeight);
      particleCtx.fillStyle=particleColor;
      for(const pt of particles){
        pt.x+=pt.vx;pt.y+=pt.vy;
        if(pt.x<0)pt.x=particleWidth;if(pt.x>particleWidth)pt.x=0;
        if(pt.y<0)pt.y=particleHeight;if(pt.y>particleHeight)pt.y=0;
        particleCtx.globalAlpha=pt.alpha;
        particleCtx.beginPath();particleCtx.arc(pt.x,pt.y,pt.r,0,Math.PI*2);particleCtx.fill();
      }
      particleCtx.globalAlpha=1;
    }
    requestAnimationFrame(frame);
  }
  function initLoader(){
    const el=$("#preloader");
    if(prefersReduced.matches){el.remove();return}
    let finished=false;
    function finish(){
      if(finished)return;finished=true;
      el.classList.add("hiding");
      setTimeout(()=>el.remove(),1150);
    }
    $("#skip-intro").addEventListener("click",finish);
    const start=performance.now(),duration=1750;
    function loop(time){
      if(finished)return;
      const p=Math.min(1,(time-start)/duration);
      $(".loader-track span").style.width=Math.round(p*100)+"%";
      $("#load-count").textContent=String(Math.round(p*100)).padStart(2,"0")+"%";
      if(p===1)finish();else requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  function initClock(){
    const update=()=>{
      $("#local-time").textContent="BENGALURU / "+new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date())+" IST";
    };
    update();setInterval(update,60000);
  }
  function main(){
    renderContent();decorateMotionTitles();initTheme();initNav();initModals();initEmail();initKineticType();
    initScrollReveals();initProjectTilt();initCustomCursor();initParticles();initClock();initLoader();
    // Clicking inline links outside the modal closes expanded navigation.
    document.addEventListener("click",e=>{
      if(e.target.closest('a[href^="#"]')){closeLiquid();closeTheme()}
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",main);
  else main();
})();
