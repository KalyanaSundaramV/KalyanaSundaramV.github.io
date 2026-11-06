/* Edit portfolio text, projects, and links here. No build process required. */
window.PORTFOLIO = {
  name: "Kalyana Sundaram V",
  shortName: "Kalyana Sundaram",
  role: "Game & Tools Engineer",
  location: "Bengaluru, Karnataka, India",
  email: "kalyan.wired@gmail.com",
  // Optional: add your actual public URLs below to enable the social buttons.
  social: { github: "", linkedin: "", resumePdf: "" },
  hero: {
    eyebrow: "GAME & TOOLS ENGINEER",
    first: "KALYANA",
    last: "SUNDARAM",
    intro: "I build gameplay systems, developer tools, and rapid prototypes that are practical to test and extend."
  },
  stats: [
    {value:8, suffix:"", label:"FEATURED PROJECTS"},
    {value:12, suffix:"+", label:"RAPID PROTOTYPES"},
    {value:427, suffix:"", label:"ASSET PACKS TRIAGED"},
    {value:10, suffix:"", label:"YEARS BUILDING GAMES"}
  ],
  projects: [
    {
      id:"ludo-demolition", name:"Ludo Demolition", number:"01",
      kicker:"CONTRACT-DRIVEN DEMOLITION SANDBOX", category:"Game",
      stack:"Unity / Mobile prototype", tags:["UNITY","MOBILE","DESTRUCTION"],
      summary:"A building-destruction game prototype focused on tool choice, contract goals, progression, and readable destruction feedback.",
      details:["Building-destruction gameplay prototype","Tool choice and contract-based goals","Progression and readable destruction feedback"],
      status:"Work in progress", role:"Solo game developer"
    },
    {
      id:"king-cube", name:"King Cube", number:"02",
      kicker:"PUBLISHED MOBILE ACTION-PUZZLE", category:"Game",
      stack:"Unity / Android / Google Play", tags:["UNITY","ANDROID","PUZZLE"],
      summary:"A previously published Android action-puzzle game built around grid movement, laser alignment, transforming floors, and escalating hazards.",
      details:["Grid movement and laser alignment","Transforming floor mechanics","Escalating hazards across puzzle gameplay"],
      status:"Previously published", role:"Game developer"
    },
    {
      id:"ludo-hero", name:"Ludo Hero", number:"03",
      kicker:"TEAM-BUILT BOARD GAME AND KINGDOM META", category:"Game",
      stack:"Unity / Mobile", tags:["UNITY","MULTIPLAYER","GAME SYSTEMS"],
      summary:"A team-developed mobile board game combining local and network matches, kingdom progression, social competition, and reward mini-games.",
      details:["Local and network board-game matches","Kingdom progression and social competition","Reward mini-games"],
      status:"Team project", role:"Gameplay Engineer in a four-developer team"
    },
    {
      id:"assetforge", name:"AssetForge / PackTriage", number:"04",
      kicker:"AUDITABLE UNITY ASSET INTAKE", category:"Tool",
      stack:"Unity / Unity Editor / Windows", tags:["UNITY EDITOR","PIPELINE","C#"],
      summary:"A staged Unity asset pipeline for triaging 427 packs, normalizing approved content, containing dependencies, and verifying portable exports.",
      details:["427-pack asset triage workflow","Approved-content normalization","Dependency containment and portable export verification"],
      status:"Work in progress", role:"Solo tools engineer"
    },
    {
      id:"projectpulse", name:"ProjectPulse", number:"05",
      kicker:"ENGINEERING ACTIVITY COMMAND CENTER", category:"Tool",
      stack:".NET / Windows desktop", tags:[".NET","WINUI 3","DEV TOOLS"],
      summary:"A local Windows engineering workspace connecting tickets, Git history, activity, schedules, agent handoffs, and structured AI-assisted slice review.",
      details:["Tickets, Git history, and activity in one engineering workspace","Schedule views and agent handoffs","Structured AI-assisted slice review"],
      status:"Documented work", role:"Tools engineer"
    },
    {
      id:"wallpaper-workbench", name:"Wallpaper Workbench", number:"06",
      kicker:"CUSTOM-SOURCE WALLPAPER STUDIO", category:"Tool",
      stack:".NET / Windows desktop", tags:[".NET","WINDOWS","WALLPAPERS"],
      summary:"A Wallpaper Engine-style Windows app for browsing custom sources, organizing collections, and running configurable image or video wallpapers.",
      details:["Browsing custom wallpaper sources","Organizing collections","Configurable image and video wallpapers"],
      status:"Documented work", role:"Tools engineer"
    },
    {
      id:"civitai", name:"Civitai Asset Manager", number:"07",
      kicker:"SEARCHABLE AI MODEL METADATA", category:"Tool",
      stack:".NET / Windows desktop", tags:[".NET","WINDOWS","MODEL LIBRARY"],
      summary:"A Windows model-library manager that identifies downloaded Civitai assets and surfaces tags, trigger words, base models, previews, and workflow context.",
      details:["Identification of downloaded model assets","Tags, trigger words, and base-model context","Previews and workflow metadata"],
      status:"Documented work", role:"Tools engineer"
    },
    {
      id:"money-planner", name:"Money Planner", number:"08",
      kicker:"ON-DEVICE SMS FINANCE PLANNING", category:"Tool",
      stack:"Android / Android 6.0+", tags:["ANDROID","JAVA","LOCAL-FIRST"],
      summary:"A local-first Android money planner that turns bank and card SMS into spending, EMI, debt, runway, savings, and upcoming-obligation views.",
      details:["On-device bank and card SMS parsing","Spending, EMI, and debt views","Runway, savings, and upcoming-obligation planning"],
      status:"Documented work", role:"Android developer"
    }
  ],
  about: "I'm a Bengaluru-based game and tools engineer with experience in mobile gameplay, technical leadership, rapid prototyping, native desktop products, and automation. I move from product question to working implementation, then make the result easier to test, inspect, and extend. I run that work as a multi-agent AI workflow across Claude Code, OpenAI Codex, and GitHub Copilot, with exclusive file ownership, ticketed handoffs, and build and test gates. I am available for full-time roles and focused consulting engagements.",
  capabilities: [
    ["Gameplay systems","Mechanics, AI, progression, economy, multiplayer"],
    ["Procedural generation","Settlements, roads, levels, content, validation"],
    ["Unity editor tooling","Custom editors, pipelines, automation, diagnostics"],
    ["Native applications","Windows and Android productivity products"],
    ["Rapid prototyping","Playable proofs, vertical slices, technical demos"]
  ],
  skills:["Unity","C#","Gameplay programming","Game development","Developer tools","Procedural generation",".NET and WinUI 3","Cocos Creator","TypeScript","Android and Java","Testing and automation"],
  pipeline: [
    ["INPUT","User action / Environment / Physics events / AI triggers"],
    ["DATA","Geometry / Material data / Constraints / Damage fields"],
    ["SIMULATION CORE","Fracture / Forces / State / Time iteration"],
    ["RENDERING","Fragments / Particles and dust / Shadows and GI / Post process"],
    ["OUTPUT","Visual feedback / Debris fields / Audio cues / Gameplay impact"]
  ],
  experience:[
    {when:"MAR 2026 — PRESENT",title:"Independent Game & Tools Engineer",company:"INDEPENDENT",text:"Building gameplay prototypes, Unity content pipelines, and local-first Windows and Android tools."},
    {when:"NOV 2024 — MAR 2026",title:"Gameplay Engineer",company:"QILA GAMES",text:"Contributed high-level gameplay and product systems for Ludo Hero in a four-developer team working with artists."},
    {when:"SEP 2021 — MAY 2023",title:"Prototype Team Tech Lead / SDE2",company:"BOMBAY PLAY",text:"Led engineering delivery across 12 rapid prototypes, including Word Wall and seven Match10 variations."},
    {when:"2016 — 2021",title:"Founder / Independent Developer",company:"AMEYA GAME STUDIO",text:"Ran a closed, part-time independent studio and published King Cube for Android."},
    {when:"MAR 2018 — APR 2019",title:"Game Developer",company:"URG INFOTECH",text:"Independently developed Android game prototypes and recreations of established mechanics."}
  ],
  degree:"Bachelor of Engineering in Computer Science",
  college:"Meenakshi Ramaswamy Engineering College, affiliated with Anna University.",
  contactLine:"Gameplay systems, pipelines, or tools — if it should be practical to test and extend, I want to hear about it."
};
