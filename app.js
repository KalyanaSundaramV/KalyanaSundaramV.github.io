/* KSV portfolio reconstruction — vanilla JavaScript, no server or external dependencies.
   All copy & project records: content.js | All theme colors: styles.css */
(() => {
  "use strict";
  const D = window.PORTFOLIO;
  const originalCases = window.PORTFOLIO_ORIGINAL_CASE_STUDIES || {};
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
    {id:"yellow",label:"OBSIDIAN & SUNBURST",bg:"#240E4E",accent:"#FFE956"},
    {id:"lava",label:"DARK VOID & LIQUID LAVA",bg:"#151419",accent:"#F56E0F"},
    {id:"netflix",label:"CINEMATIC RED & CHARCOAL",bg:"#221F1F",accent:"#E50914"},
    {id:"mokoto",label:"MOKOTO RED GLASS",bg:"#000000",accent:"#DF2531"}
  ];
  const sourceTools=window.KSV_SOURCE_TOOLS || {suites:[],groups:[],systems:[]};
  const sections = ["work","about","capabilities","tools","experience","learning","resume","contact"];
  const menuConfig = {
    work: {k:"01 / SELECTED WORK",title:"ENGINEERED<br/>TO PLAY.",desc:"Explore mobile games, prototyping experiments, and practical desktop tools.",links:[["All featured work","#work"],["Ludo Demolition","#work","ludo-demolition"],["King Cube","#work","king-cube"],["ProjectPulse","#work","projectpulse"]]},
    about: {k:"02 / INTRODUCTION",title:"BUILDING<br/>SYSTEMS.",desc:"Game and tools engineer based in Bengaluru. From working prototype to testable system.",links:[["About me","#about"],["Destruction pipeline","#pipeline"],["Get in touch","#contact"]]},
    capabilities:{k:"03 / CORE SKILLS",title:"HOW I<br/>BUILD.",desc:"Gameplay, native apps, editor tooling, procedural generation, and iterative prototypes.",links:[["Gameplay systems","#capabilities"],["Procedural generation","#capabilities"],["Unity tools","#capabilities"],["Native applications","#capabilities"]]},
    tools:{k:"04 / TOOLS I BUILT",title:"UTILITY<br/>FIRST.",desc:"Local-first engineering tools and Windows products, designed around real workflows.",links:[["All tools","#tools"],["AssetForge / PackTriage","#tools","assetforge"],["Wallpaper Workbench","#tools","wallpaper-workbench"],["Money Planner","#tools","money-planner"]]},
    experience:{k:"05 / EXPERIENCE",title:"TEN YEARS<br/>IN MOTION.",desc:"From independent games to engineering teams, product systems, and rapid prototypes.",links:[["Career timeline","#experience"],["Qila Games","#experience"],["Bombay Play","#experience"],["Education","#experience"]]},
    learning:{k:"06 / LEARNING",title:"STAYING<br/>CURIOUS.",desc:"Ongoing practice in gameplay, content pipelines, and engineering workflows.",links:[["Learning overview","#learning"],["Gameplay systems","#capabilities"],["Engineering tools","#tools"],["Technical pipeline","#about"]]},
    resume:{k:"07 / RESUME",title:"THE FULL<br/>RECORD.",desc:"Experience, skills, selected work, and education in one place.",links:[["Resume overview","#resume"],["Core skills","#capabilities"],["Selected projects","#work"],["Download local PDF","#resume"]]},
    contact:{k:"08 / CONTACT",title:"LET'S BUILD<br/>SOMETHING.",desc:"For gameplay systems, engineering tools, full-time opportunities, and selected collaborations.",links:[["Email me","#contact"],["Contact section","#contact"],["Project index","#work"]]}
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
      const description=D.skillDescriptions?.[s] || D.capabilities.find(([c])=>s.toLowerCase().includes(c.toLowerCase().split(" ")[0]))?.[1] || "Applied in gameplay, tools and iterative engineering projects.";
      return `<button type="button" class="capability reveal" data-skill="${safe(s)}" aria-label="View ${safe(s)} details"><span>${String(i+1).padStart(2,"0")}</span><h3>${safe(s)}</h3><p>${safe(description)}</p></button>`;
    }).join("");
    const renderTools=(kind="standalone")=>{
      const selections=kind==="unity"?D.projects.filter(p=>p.id==="assetforge")
        :kind==="game"?D.projects.filter(p=>p.category==="Game")
        :D.projects.filter(p=>p.category==="Tool"&&p.id!=="assetforge");
      $("#tools-grid").innerHTML=selections.map(project=>`
        <button class="tool-card reveal in-view" type="button" data-id="${safe(project.id)}" aria-label="Read about ${safe(project.name)}"><span class="eyebrow">${safe(project.kicker)}</span>
        <span class="tool-number" aria-hidden="true">${safe(project.number)}</span><h3>${safe(project.name)}</h3><p>${safe(project.summary)}</p></button>`).join("");
      decorateMotionTitles($("#tools-grid"),true);
      const catalog=$("#tool-catalog");
      if(!catalog)return;
      if(kind==="unity"){
        catalog.innerHTML=`<h3 class="catalog-heading">EDITOR SUITES <span>${String(sourceTools.suites.length).padStart(2,"0")}</span></h3>
          <div class="catalog-grid">${sourceTools.suites.map((item,i)=>`<button type="button" class="catalog-card" data-tool-suite="${i}" aria-label="View ${safe(item.title)} details"><span class="catalog-kicker">${safe(item.category)}</span><strong>${safe(item.title)}</strong><p>${safe(item.result)}</p><span class="catalog-open" aria-hidden="true">VIEW ↗</span></button>`).join("")}</div>
          <h3 class="catalog-heading">EDITOR UTILITIES <span>${sourceTools.groups.reduce((sum,g)=>sum+g.tools.length,0)}</span></h3>
          <div class="catalog-groups">${sourceTools.groups.map((group,groupIndex)=>`<details class="catalog-group" ${groupIndex===0?"open":""}><summary><span>${safe(group.eyebrow)}</span><strong>${safe(group.title)}</strong><small>${group.tools.length} TOOLS <span aria-hidden="true">⌄</span></small></summary>
          <p class="catalog-group-intro">${safe(group.description)}</p><div class="catalog-grid">${group.tools.map((item,i)=>`<button class="catalog-card" type="button" data-editor-tool="${groupIndex}:${i}" aria-label="View ${safe(item.title)} details"><span class="catalog-kicker">${safe(item.status)}</span><strong>${safe(item.title)}</strong><p>${safe(item.description)}</p><span class="catalog-open" aria-hidden="true">VIEW ↗</span></button>`).join("")}</div></details>`).join("")}</div>`;
      }else if(kind==="game"){
        catalog.innerHTML=`<h3 class="catalog-heading">GAME SYSTEMS <span>${sourceTools.systems.length}</span></h3>
          <div class="catalog-grid">${sourceTools.systems.map((item,i)=>`<button class="catalog-card" type="button" data-game-system="${i}" aria-label="View ${safe(item.title)} details"><span class="catalog-kicker">${safe(item.category)}</span><strong>${safe(item.title)}</strong><p>${safe(item.summary)}</p><span class="catalog-open" aria-hidden="true">VIEW ↗</span></button>`).join("")}</div>`;
      }else catalog.innerHTML="";
    };
    $("#tool-tabs").addEventListener("click",e=>{
      const b=e.target.closest("[data-tool-tab]");if(!b)return;
      $$("#tool-tabs button").forEach(x=>{x.classList.toggle("active",x===b);x.setAttribute("aria-pressed",String(x===b))});
      renderTools(b.dataset.toolTab);
    });
    renderTools();
    $("#about-details").textContent=D.detailedOverview||"";
    $("#about-availability").textContent=D.availability||"";
    $("#experience-list").innerHTML = D.experience.map((e,i)=>`<button type="button" class="timeline-row reveal" data-experience="${i}" aria-label="Read more about ${safe(e.title)} at ${safe(e.company)}"><div class="timeline-date">${safe(e.when)}</div><div><h3>${safe(e.title)}</h3><div class="timeline-company">${safe(e.company)}</div><p>${safe(e.text)}</p></div></button>`).join("");
    $("#resume-projects").innerHTML = D.projects.map(p=>`<li><span>${safe(p.number)}</span>${safe(p.name)}</li>`).join("");
    $("#resume-brief").innerHTML = `
      <div class="resume-brief-block"><h4>ABOUT</h4><p>Game and tools engineering; mobile gameplay, rapid prototypes, native products, editor pipelines, and automation.</p></div>
      <div class="resume-brief-block"><h4>RECENT EXPERIENCE</h4>${D.experience.slice(0,3).map(e=>`<p>${safe(e.title)} · <strong>${safe(e.company)}</strong> <small>${safe(e.when)}</small></p>`).join("")}</div>
      <div class="resume-brief-block"><h4>EDUCATION</h4><p>${safe(D.degree)} — ${safe(D.college)}</p></div>`;
    if(D.social.resumePdf){
      const a=$("#resume-pdf");a.hidden=false;a.href=D.social.resumePdf;
      a.setAttribute("download","Kalyana_Sundaram_V_Resume_Public.pdf");
      a.removeAttribute("target");
      // The resume CTA is deliberately concise; keep provenance in the README only.
    }
    $("#filter-buttons").addEventListener("click",e=>{
      const b=e.target.closest("button[data-filter]");if(!b)return;
      $$("#filter-buttons button").forEach(x=>x.classList.toggle("active",x===b));
      const filter=b.dataset.filter;
      $$(".project-card").forEach(x=>x.hidden=filter!=="all" && x.dataset.category!==filter);
    });
  }

  // Five procedural full-screen metamorphoses, generated by a WebGL fragment
  // shader (Canvas fallback); never a simple edge wipe.
  const transitionEffects=[0,1,2,3,4,5,6];
  const transitionLabels=["LIQUID VORTEX","CAPILLARY INK","PRISM SHATTER","REFRACTION SHOCKWAVE","NEBULA REFORMATION","METABALL FUSION","DATA LATTICE"];
  let effectBag=[],previousEffect=-1,transitionSerial=0;
  function buildEffectBag(){
    // Draw every distinct effect before replaying one. Never repeat across bag boundaries.
    let bag=[...transitionEffects];
    for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
    if(bag[0]===previousEffect && bag.length>1)[bag[0],bag[1]]=[bag[1],bag[0]];
    return bag;
  }
  function paintThemeOptions(){
    $("#theme-options").innerHTML = themes.map(t=>`<button type="button" class="theme-option ${document.body.dataset.theme===t.id?"current":""}" data-theme-option="${t.id}" aria-pressed="${document.body.dataset.theme===t.id}"><span class="theme-swatch" style="--sw-bg:${t.bg};--sw-accent:${t.accent}"></span>${safe(t.label)} <em>${document.body.dataset.theme===t.id ? "✓" : ""}</em></button>`).join("");
  }
  function applyTheme(id){
    if(!themes.some(t=>t.id===id))return;
    document.body.dataset.theme=id;
    document.querySelector('meta[name="theme-color"]').content=getComputedStyle(document.body).getPropertyValue("--bg").trim();
    try{localStorage.setItem("ksv-theme",id)}catch(e){}
    paintThemeOptions();
    updateParticleColor();
  }
  function chooseTransitionEffect(){
    if(!effectBag.length)effectBag=buildEffectBag();
    const effect=effectBag.shift();
    previousEffect=effect;
    return effect;
  }
  function switchTheme(id,origin){
    const incoming=themes.find(t=>t.id===id);
    if(!incoming || incoming.id===document.body.dataset.theme)return;
    if(prefersReduced.matches || !window.ThemeFlux){applyTheme(id);return;}
    const r=origin?.getBoundingClientRect?.() || $("#theme-orb").getBoundingClientRect();
    const o={x:Math.min(1,Math.max(0,(r.left+r.width/2)/innerWidth)),
             y:Math.min(1,Math.max(0,(r.top+r.height/2)/innerHeight))};
    const mode=chooseTransitionEffect();
    const transition=$("#theme-transition");
    transition.dataset.effect=String(mode);
    const effectName=transitionLabels[mode];
    $("#transition-effect-name").textContent=effectName+" / "+String(mode+1).padStart(2,"0");
    $("#transition-name").textContent=incoming.label;
    $("#transition-echo").textContent=effectName;
    $("#transition-index").textContent=String(themes.findIndex(t=>t.id===id)+1).padStart(2,"0")+" / "+themes.length;
    document.documentElement.style.setProperty("--transition-accent",incoming.accent);
    document.body.classList.remove("theme-type-revealing");
    transitionSerial++;
    const serial=transitionSerial;
    ThemeFlux.run({accent:incoming.accent,bg:incoming.bg,origin:o,mode,seed:Math.random()*9999,
      onMid:()=>{
        applyTheme(id);
        if(serial!==transitionSerial)return;
        document.body.classList.remove("theme-type-revealing");
        void document.body.offsetWidth;
        document.body.classList.add("theme-type-revealing");
      },
      onEnd:()=>{if(serial===transitionSerial)setTimeout(()=>document.body.classList.remove("theme-type-revealing"),850);}
    });
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
      const selected=opt.dataset.themeOption;
      switchTheme(selected,opt);
      closeTheme();
      if(selected!==document.body.dataset.theme)toast("ATMOSPHERE — "+themes.find(t=>t.id===selected).label);
    });
    $("#theme-random").addEventListener("click",e=>{
      const choices=themes.filter(t=>t.id!==document.body.dataset.theme);
      const next=choices[Math.floor(Math.random()*choices.length)];
      switchTheme(next.id,e.currentTarget);
      closeTheme();
      toast("SURPRISE PALETTE — "+next.label);
    });
    initFontScale();
  }
  function closeTheme(){
    const el=$("#theme-menu");if(!el.classList.contains("open"))return;
    el.classList.remove("open");el.classList.add("closing");
    el.setAttribute("aria-hidden","true");$("#theme-orb").setAttribute("aria-expanded","false");
    setTimeout(()=>el.classList.remove("closing"),380);
  }
  function initFontScale(){
    const slider=$("#font-scale"),output=$("#font-scale-value");
    let saved;try{saved=Number(localStorage.getItem("ksv-font-scale"))}catch(e){}
    const initial=[85,90,95,100,105,110,115,120,125].includes(saved)?saved:100;
    const setScale=value=>{
      const v=Math.max(85,Math.min(125,Number(value)||100));
      const rounded=Math.round(v/5)*5;
      slider.value=String(rounded);
      // Preserve the existing numeric span so slider changes can count
      // up or down from the current displayed percentage.
      const motionValue=output.querySelector(".numeric-motion");
      if(motionValue)motionValue.textContent=rounded+"%";
      else output.textContent=rounded+"%";
      document.documentElement.style.setProperty("--font-scale",String(rounded/100));
      slider.style.setProperty("--fill-percent",(rounded-85)/40*100+"%");
      try{localStorage.setItem("ksv-font-scale",String(rounded))}catch(e){}
    };
    setScale(initial);
    slider.addEventListener("input",e=>setScale(e.target.value));
    $("#font-scale-reset").addEventListener("click",()=>setScale(100));
  }

  // Organic, tab-anchored navigation inspired by the reference video.
  // The visual map represents portfolio topics; all destinations stay real and editable.
  const visualTopics = {
    work: ["GAMEPLAY","PROTOTYPES","TOOLS","SYSTEMS"],
    about: ["BUILD","TEST","ITERATE","SHIP"],
    capabilities: ["MECHANICS","PROCEDURAL","UNITY","NATIVE"],
    tools: ["EDITOR","WINDOWS","ANDROID","AUTOMATION"],
    experience: ["STUDIO","TEAMS","PROTOTYPES","INDEPENDENT"],
    learning: ["RESEARCH","ITERATION","LEARNING","PRACTICE"],
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
      b.addEventListener("click",()=>{const alreadyOpen=activeMenu===b.dataset.menu;b.blur();if(alreadyOpen)closeLiquid();else openLiquid(b.dataset.menu,b)});
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

  // Only public details already authored in the supplied original React source are shown.
  function relatedPublicProjects(skill){
    const label=skill.toLowerCase();
    return D.projects.filter(p=>{
      const source=originalCases[p.name] || {};
      const all=[...(source.technologies||[]),...(p.tags||[]),p.stack].join(" ").toLowerCase();
      if(label==="game development" || label==="gameplay programming")return p.category==="Game";
      if(label==="developer tools")return p.category==="Tool";
      if(label==="android and java")return /android|java/.test(all);
      if(label==="testing and automation")return /automated|automation|testing/.test((source.longSummary||"")+" "+(source.caseStudySections||[]).map(x=>x.body).join(" "));
      if(label===".net and winui 3")return /\.net|winui/.test(all);
      return all.includes(label);
    });
  }
  function projectDetailMarkup(p){
    const r=originalCases[p.name] || {};
    const sections=r.caseStudySections||[];
    const metrics=r.metrics||[];
    const links=(r.links||[]).filter(l=>/^https?:\/\//i.test(l.href||""));
    return `<h2 class="modal-title" id="modal-title">${safe(p.name)}</h2>
      <div class="modal-subtitle">${safe(p.kicker)} / ${safe(p.stack)}</div>
      <p class="modal-summary">${safe(r.longSummary||p.summary)}</p>
      ${metrics.length?`<div class="modal-metric-grid">${metrics.map(m=>`<div class="modal-metric"><b>${safe(m.label)}</b><span>${safe(m.value)}</span></div>`).join("")}</div>`:""}
      <div class="modal-detail-section"><h3>PROJECT CONTEXT</h3><p>${safe(p.summary)}</p>
        <p><strong>ROLE</strong> ${safe(r.role||p.role)} · <strong>STATUS</strong> ${safe(r.status||p.status)}</p>
      </div>
      ${sections.length?sections.map(s=>`<section class="modal-detail-section"><h3>${safe(s.kicker)}</h3><h4>${safe(s.title)}</h4><p>${safe(s.body)}</p></section>`).join(""):`<div class="modal-detail-section"><h3>WHAT IT DOES</h3><ol class="modal-features">${p.details.map((f,i)=>`<li style="--reveal-index:${i}"><strong>${String(i+1).padStart(2,"0")}</strong><span>${safe(f)}</span></li>`).join("")}</ol></div>`}
      ${(r.technologies?.length||p.tags?.length)?`<section class="modal-detail-section"><h3>TECHNOLOGIES</h3><div class="modal-meta">${(r.technologies?.length?r.technologies:p.tags).map(v=>`<span class="chip">${safe(v)}</span>`).join("")}</div></section>`:""}
      ${r.notice?`<p class="modal-notice">${safe(r.notice)}</p>`:""}
      ${links.length?`<section class="modal-detail-section"><h3>PUBLIC LINKS</h3><div class="modal-linked-projects">${links.map(l=>`<a class="pill ghost" href="${safe(l.href)}" target="_blank" rel="noopener noreferrer">${safe(l.label)} ↗</a>`).join("")}</div></section>`:""}
      ${p.id==="ludo-demolition"?`<section class="modal-detail-section original-development-timeline">
        <h3>DEVELOPMENT TIMELINE</h3>
        <ol>
          <li><span>CURRENT BUILD</span><div><h4>Contract-driven demolition loop</h4><p>Tool selection, dice and tactical phases, destructible parts, objectives, rewards, economy, and progression share a testable Unity runtime.</p></div></li>
          <li><span>WORLD SYSTEMS</span><div><h4>Procedural settlements with validation</h4><p>Planner-driven layouts preserve road access, facade orientation, deterministic seeds, and regression-friendly checks.</p></div></li>
          <li><span>ENGINEERING BOUNDARY</span><div><h4>Mobile-first performance and readable architecture</h4><p>Physics, pooling, mesh generation, configuration, and automated checks remain visible as the prototype moves toward device validation.</p></div></li>
        </ol>
      </section>`:""}
      ${p.id==="ludo-demolition"?'<div class="modal-detail-section"><h3>INTERACTIVE EVIDENCE</h3><button type="button" class="pill primary" data-open-demo>PLAY ORIGINAL 3D SANDBOX ↗</button></div>':""}
      <div class="modal-watermark" aria-hidden="true">${safe(p.number)}</div>`;
  }
  function skillDetailMarkup(skill){
    const i=D.skills.indexOf(skill);
    const related=relatedPublicProjects(skill);
    const desc=D.skillDescriptions?.[skill] || D.capabilities.find(([name])=>name===skill)?.[1] || "";
    return `<h2 class="modal-title" id="modal-title">${safe(skill)}</h2>
      <div class="modal-subtitle">CAPABILITIES / ${String(i+1).padStart(2,"0")}</div>
      <p class="modal-summary">${safe(desc)}</p>
      ${related.length?`<section class="modal-detail-section"><h3>PROJECTS USING THIS AREA</h3><div class="modal-linked-projects">${related.map(p=>`<button type="button" data-modal-project="${safe(p.id)}">${safe(p.name)} ↗</button>`).join("")}</div>
        ${related.map(p=>`<p><strong>${safe(p.name)}</strong> — ${safe(p.summary)}</p>`).join("")}</section>`:""}
      <div class="modal-detail-section"><h3>CORE PRACTICE</h3><p>${safe(desc)}</p></div>
      <div class="modal-watermark" aria-hidden="true">${String(i+1).padStart(2,"0")}</div>`;
  }
  function experienceDetailMarkup(index){
    const e=D.experience[index];if(!e)return "";
    const matches=index===0?D.projects.filter(p=>["ludo-demolition","assetforge","projectpulse"].includes(p.id))
      :index===1?D.projects.filter(p=>p.id==="ludo-hero")
      :index===3?D.projects.filter(p=>p.id==="king-cube"):[];
    const technologies=[...new Set(matches.flatMap(p=>originalCases[p.name]?.technologies||[]))];
    return `<h2 class="modal-title" id="modal-title">${safe(e.title)}</h2>
      <div class="modal-subtitle">${safe(e.company)} / ${safe(e.when)}</div>
      <p class="modal-summary">${safe(e.text)}</p>
      <div class="modal-metric-grid"><div class="modal-metric"><b>TIMELINE</b><span>${safe(e.when)}</span></div>
        <div class="modal-metric"><b>ORGANIZATION</b><span>${safe(e.company)}</span></div></div>
      <section class="modal-detail-section"><h3>WORK & CONTRIBUTION</h3><p>${safe(e.text)}</p></section>
      ${matches.length?`<section class="modal-detail-section"><h3>RELATED DOCUMENTED PROJECTS</h3><div class="modal-linked-projects">${matches.map(p=>`<button type="button" data-modal-project="${safe(p.id)}">${safe(p.name)} ↗</button>`).join("")}</div>
        ${matches.map(p=>`<p><strong>${safe(p.name)}</strong> — ${safe(p.summary)}</p>`).join("")}</section>`:""}
      ${technologies.length?`<section class="modal-detail-section"><h3>TECHNOLOGIES IN DOCUMENTED WORK</h3><div class="modal-meta">${technologies.map(v=>`<span class="chip">${safe(v)}</span>`).join("")}</div></section>`:""}
      <div class="modal-watermark" aria-hidden="true">${String(index+1).padStart(2,"0")}</div>`;
  }
  // Detailed tools and systems come directly from the uploaded original tools.ts.
  function sourceToolMarkup(id,kind){
    const indexes=String(id).split(":").map(Number);
    const item=kind==="suite"?sourceTools.suites[indexes[0]]
      :kind==="editor-tool"?sourceTools.groups[indexes[0]]?.tools[indexes[1]]
      :sourceTools.systems[indexes[0]];
    if(!item)return "";
    const group=kind==="editor-tool"?sourceTools.groups[indexes[0]]:null;
    const subtitle=kind==="suite"?item.category:kind==="editor-tool"?`${group.title} / ${item.status}`:item.category;
    const intro=item.summary||item.description||item.problem||"";
    return `<h2 class="modal-title" id="modal-title">${safe(item.title)}</h2>
      <div class="modal-subtitle">${safe(subtitle)}</div>
      <p class="modal-summary">${safe(intro)}</p>
      ${item.problem?`<section class="modal-detail-section"><h3>PROBLEM</h3><p>${safe(item.problem)}</p></section>`:""}
      ${item.solution?`<section class="modal-detail-section"><h3>APPROACH</h3><p>${safe(item.solution)}</p></section>`:""}
      ${item.description && item.description!==intro?`<section class="modal-detail-section"><h3>WHAT IT DOES</h3><p>${safe(item.description)}</p></section>`:""}
      ${item.result?`<section class="modal-detail-section"><h3>RESULT</h3><p>${safe(item.result)}</p></section>`:""}
      ${item.technologies?.length?`<section class="modal-detail-section"><h3>TECHNOLOGIES</h3><div class="modal-meta">${item.technologies.map(t=>`<span class="chip">${safe(t)}</span>`).join("")}</div></section>`:""}
      ${group?`<section class="modal-detail-section"><h3>TOOL GROUP</h3><p>${safe(group.description)}</p></section>`:""}`;
  }
  function educationDetailMarkup(){
    return `<h2 class="modal-title" id="modal-title">${safe(D.degree)}</h2><div class="modal-subtitle">EDUCATION / COMPUTER SCIENCE</div>
      <p class="modal-summary">${safe(D.college)}</p>
      <section class="modal-detail-section"><h3>QUALIFICATION</h3><p>${safe(D.degree)}</p></section>
      <section class="modal-detail-section"><h3>INSTITUTION</h3><p>${safe(D.college)}</p></section>`;
  }
  function openModal(id,kind="project"){
    const p=kind==="project"?D.projects.find(p=>p.id===id):null;
    if(kind==="project"&&!p)return;
    if(kind==="skill"&&!D.skills.includes(id))return;
    if(kind==="experience"&&!D.experience[Number(id)])return;
    if(["suite","editor-tool","game-system"].includes(kind) && !sourceToolMarkup(id,kind))return;
    const m=$("#modal"), panel=$(".modal-panel");
    if(!m.classList.contains("open"))lastFocused=document.activeElement;
    const sourceItem=kind==="suite"?sourceTools.suites[Number(id)]
      :kind==="editor-tool"?sourceTools.groups[Number(String(id).split(":")[0])]?.tools[Number(String(id).split(":")[1])]
      :kind==="game-system"?sourceTools.systems[Number(id)]:null;
    const modalSubject=p?.name || sourceItem?.title ||
      (kind==="skill"?id:kind==="experience"?D.experience[Number(id)].title:D.degree);
    $("#modal-num").textContent=kind==="project"?`${p.number} — CASE STUDY`
      :kind==="skill"?"CAPABILITY — DETAIL"
      :kind==="experience"?`${String(Number(id)+1).padStart(2,"0")} — EXPERIENCE`
      :kind==="education"?"EDUCATION — DETAIL":"ENGINEERING — DETAIL";
    $("#modal-body").innerHTML=kind==="project"?projectDetailMarkup(p)
      :kind==="skill"?skillDetailMarkup(id)
      :kind==="experience"?experienceDetailMarkup(Number(id))
      :kind==="education"?educationDetailMarkup():sourceToolMarkup(id,kind);
    $("#modal-actions").innerHTML=`<a class="pill primary" href="mailto:${encodeURIComponent(D.email)}?subject=${encodeURIComponent("Question about "+modalSubject)}">ASK ABOUT THIS <span aria-hidden="true">↗</span></a>
      <button class="pill ghost" data-close-modal type="button">CLOSE <span aria-hidden="true">×</span></button>`;
    decorateMotionTitles($("#modal-body"),true);
    panel.classList.remove("detail-revealing");
    void panel.offsetWidth;
    panel.classList.add("detail-revealing");
    $("#modal-scroll").scrollTop=0;panel.scrollTop=0;
    m.removeAttribute("inert");m.classList.add("open");m.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
    requestAnimationFrame(()=>{
      $("#modal-scroll").scrollTop=0;
      $(".round-close").focus({preventScroll:true});
      document.dispatchEvent(new Event("ksv:cursor-refresh"));
    });
  }
  function closeModal(){
    const m=$("#modal");if(!m.classList.contains("open"))return;
    m.classList.remove("open");m.setAttribute("aria-hidden","true");
    m.setAttribute("inert","");
    document.body.style.overflow=$("#mobile-overlay").classList.contains("open")?"hidden":"";
    if(lastFocused?.focus && lastFocused.isConnected)lastFocused.focus({preventScroll:true});
    requestAnimationFrame(()=>document.dispatchEvent(new Event("ksv:cursor-refresh")));
  }
  function initModals(){
    document.addEventListener("click",e=>{
      const linked=e.target.closest("[data-modal-project]");
      if(linked){openModal(linked.dataset.modalProject);return}
      const card=e.target.closest(".project-card, .tool-card");
      if(card?.dataset.id){openModal(card.dataset.id);return}
      const suite=e.target.closest("[data-tool-suite]");
      if(suite){openModal(suite.dataset.toolSuite,"suite");return}
      const utility=e.target.closest("[data-editor-tool]");
      if(utility){openModal(utility.dataset.editorTool,"editor-tool");return}
      const system=e.target.closest("[data-game-system]");
      if(system){openModal(system.dataset.gameSystem,"game-system");return}
      if(e.target.closest("[data-modal-education]")){openModal("education","education");return}
      const skill=e.target.closest(".capability[data-skill]");
      if(skill){openModal(skill.dataset.skill,"skill");return}
      const timeline=e.target.closest(".timeline-row[data-experience]");
      if(timeline){openModal(timeline.dataset.experience,"experience");return}
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
    // All visible numeric values, including these four stats, are animated
    // by numeric-motion.js after the preloader finishes (not behind it).
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
    window.LiquidPointer?.start();
    if(coarsePointer.matches || prefersReduced.matches)return;
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
    if(!el)return;
    // Respect the user's OS motion preference: no full-screen blocking animation.
    if(prefersReduced.matches){el.remove();document.dispatchEvent(new Event("ksv:intro-finished"));return}
    let finished=false;
    let settleTimer;
    const fill=$(".loader-track span",el),count=$("#load-count"),status=$("#intro-status");
    function finish(skipped=false){
      if(finished)return;
      finished=true;
      clearTimeout(settleTimer);
      el.classList.add("hiding");
      el.setAttribute("aria-hidden","true");
      if(skipped){
        const target=$("#hero");
        target.setAttribute("tabindex","-1");
        target.focus({preventScroll:true});
      }
      setTimeout(()=>{el.remove();document.dispatchEvent(new Event("ksv:intro-finished"));},1050);
    }
    $("#skip-intro").addEventListener("click",()=>finish(true));
    el.addEventListener("keydown",e=>{
      if(e.key==="Escape"){e.preventDefault();finish(true)}
    });
    // Editorial countdown, not an artificial wait for networking or app data.
    const duration=2550,start=performance.now();
    function loop(now){
      if(finished)return;
      const p=Math.min(1,Math.max(0,(now-start)/duration));
      const eased=1-Math.pow(1-p,1.75);
      const percent=Math.round(eased*100);
      fill.style.width=percent+"%";
      count.textContent=String(percent).padStart(2,"0")+"%";
      if(p<.32)status.textContent="COMPOSING EXPERIENCE";
      else if(p<.70)status.textContent="ALIGNING SYSTEMS";
      else status.textContent="READY TO EXPLORE";
      el.style.setProperty("--intro-progress",String(p));
      if(p>=1)finish();
      else requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    // Bounded fallback if a browser throttles animation frames unexpectedly.
    settleTimer=setTimeout(finish,duration+700);
  }

  function initAmbientOrnaments(){
    // Theme-colored, non-interactive motion graphics throughout the page.
    const targets=$$(".work-section,.about-section,.capabilities-section,.tools-section,.experience-section,.learning-section,.resume-section,.contact-section");
    targets.forEach((section,i)=>{
      const art=document.createElement("div");
      art.className="section-orbit";
      art.setAttribute("aria-hidden","true");
      art.style.setProperty("--orbit-index",i);
      art.innerHTML=`<span class="section-orbit-ring"></span><span class="section-orbit-ring"></span><span class="section-orbit-core">✳</span><span class="section-orbit-text">SYS / ${String(i+1).padStart(2,"0")}</span>`;
      section.prepend(art);
    });
    if(prefersReduced.matches)return;
    let ticking=false;
    window.addEventListener("scroll",()=>{
      if(ticking)return;ticking=true;
      requestAnimationFrame(()=>{
        document.documentElement.style.setProperty("--scroll-orbit",`${(window.scrollY*.085)%360}deg`);
        document.documentElement.style.setProperty("--scroll-drift",`${Math.sin(window.scrollY/340)*12}px`);
        ticking=false;
      });
    },{passive:true});
  }

  function initClock(){
    const update=()=>{
      $("#local-time").textContent="BENGALURU / "+new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date())+" IST";
    };
    update();setInterval(update,60000);
  }
  function main(){
    renderContent();decorateMotionTitles();initTheme();initNav();initModals();initEmail();initKineticType();
    initScrollReveals();initProjectTilt();initCustomCursor();initParticles();initAmbientOrnaments();initClock();initLoader();
    // Clicking inline links outside the modal closes expanded navigation.
    document.addEventListener("click",e=>{
      if(e.target.closest('a[href^="#"]')){closeLiquid();closeTheme()}
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",main);
  else main();
})();
