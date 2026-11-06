/* Kalyana / Liquid Lab — shader-generated theme metamorphoses and viscous pointer.
   No dependencies or network requests. Touch devices/reduced motion remain native. */
(() => {
"use strict";
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
const fine=matchMedia("(hover: hover) and (pointer: fine)");
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rgba=(hex)=>{const s=hex.replace("#","");return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255)};
const rgbCss=(hex,a=1)=>{const c=rgba(hex).map(v=>Math.round(v*255));return `rgba(${c.join(",")},${a})`};
const canvas=document.getElementById("theme-shader");
const holder=document.getElementById("theme-transition");
let active=null,gl=null,program=null,loc={},useGL=false,ctx2d=null;
const vert=`attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.,1.);}`;
const frag=`
precision highp float;
uniform vec2 u_res,u_origin;
uniform float u_progress,u_time,u_mode,u_seed;
uniform vec3 u_base,u_accent;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){
vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.12+vec2(12.3,7.1);a*=.5;}return v;}
vec3 palette(float k){
vec3 c=u_accent;
return mix(u_base,c,clamp(k,0.,1.));
}
void main(){
vec2 uv=gl_FragCoord.xy/u_res;
float aspect=u_res.x/u_res.y;
vec2 p=(uv-.5)*vec2(aspect,1.);
vec2 o=(u_origin-.5)*vec2(aspect,1.);
vec2 w=p-o;
float rad=length(w),ang=atan(w.y,w.x);
float t=u_time,phase=u_progress;
float seed=u_seed;
float n=fbm(p*6.+vec2(t*.32+seed*.13,-t*.27+seed*.07));
float detail=0.;
float mode=u_mode;
if(mode<.5){ // VORTEX: spiral eddies and twisted radial liquid
  float twist=ang+rad*17.-t*5.4+sin(rad*21.-t*3.)*.35;
  detail=.5+.28*sin(twist*4.+fbm(p*9.)*7.)+.22*fbm(vec2(rad*9.,twist*1.2));
}else if(mode<1.5){ // INK: branching reaction-diffusion like blooms
  vec2 warped=p+vec2(fbm(p*5.+t*.27),fbm(p*5.-t*.21))*.27;
  detail=smoothstep(.2,.77,fbm(warped*10.+vec2(t*.4,-t*.5))+.20*sin(warped.x*16.+warped.y*19.));
}else if(mode<2.5){ // PRISM: irregular shattered glass and crystalline interference
  vec2 q=p*10.+vec2(t*.28,t*.13);
  vec2 ip=floor(q);vec2 f=fract(q)-.5;
  float dist=2.;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
    vec2 g=vec2(float(x),float(y));
    vec2 rnd=vec2(hash(ip+g),hash(ip+g+17.));
    dist=min(dist,length(g+rnd*.78-f));
  }
  detail=clamp((1.-dist)*.71+fbm(p*5.)*.45+.22*sin(rad*29.-t*8.),0.,1.);
}else if(mode<3.5){ // SHOCKWAVE: liquid rings collide and refract
  vec2 o2=vec2(-.37*aspect,.3);
  float d1=length(p-o),d2=length(p-o2);
  detail=.5+.23*sin(d1*44.-t*11.+fbm(p*8.)*4.)+.22*sin(d2*36.-t*8.)+.14*n;
}else if(mode<4.5){ // NEBULA: billowing plasma turbulence and scintillation
  vec2 warp=vec2(fbm(p*4.+vec2(t*.30,0.)),fbm(p*4.+vec2(8.,-t*.25)));
  detail=fbm((p+warp*.3)*10.+vec2(t*.32,-t*.40));
  detail=clamp(detail*.93+.18*sin((p.x+p.y)*30.+t*6.),0.,1.);
}else if(mode<5.5){ // METABALL: cohesive drops merge into bright membranes
  float field=0.;
  for(int i=0;i<9;i++){
    float fi=float(i);
    vec2 center=o+vec2(sin(fi*2.4+t*.62),cos(fi*3.11-t*.44))*(.18+fi*.028);
    float rr=length(p-center);
    field+=.018/(rr*rr+.006);
  }
  detail=smoothstep(1.35,3.45,field+fbm(p*8.+t*.28)*.9);
}else{ // LATTICE: ordered scan lines fracture into a liquid data mesh
  vec2 q=p*vec2(17.,14.)+vec2(t*.9,-t*.45);
  vec2 cell=fract(q)-.5;
  float grid=exp(-23.*min(abs(cell.x),abs(cell.y)));
  float digit=step(.67,hash(floor(q)+floor(seed)))*.65;
  float slope=sin((p.x*11.+p.y*17.)+t*5.)*.16;
  detail=clamp(grid*.6+digit*.43+fbm(p*4.)*.25+slope,0.,1.);
}
detail=clamp(detail,0.,1.);
float energy=1.-abs(phase*2.-1.);
float f=energy+(detail-.5)*.76-.45;
float alpha=smoothstep(0.,.32,f);
if(mode>4.5 && mode<5.5)alpha*=.86;
if(mode>5.5)alpha*=.79;
alpha*=.78; // preserve a visible impression of the previous page beneath the effect
if(alpha<.001){gl_FragColor=vec4(0.);return;}
float rim=(1.-smoothstep(.0,.24,abs(f-.10)))*.55;
float veins=pow(max(0.,sin(detail*67.+t*5.+rad*36.)),16.)*.15;
vec3 color=palette(.16+.50*detail+.32*sin(rad*17.-t*3.)*.5);
color+=u_accent*(rim*.7+veins);
color+=vec3(.14,.18,.23)*pow(1.-detail,4.);
color=clamp(color,0.,1.);
gl_FragColor=vec4(color,alpha);
}`;
function createGL(){
  try{
    gl=canvas.getContext("webgl",{alpha:true,premultipliedAlpha:false,depth:false,antialias:false,powerPreference:"low-power",preserveDrawingBuffer:false});
    if(!gl)return false;
    const compile=(type,src)=>{
      const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
      if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;
    };
    program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vert));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const ap=gl.getAttribLocation(program,"a_pos");gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,2,gl.FLOAT,false,0,0);
    ["u_res","u_origin","u_progress","u_time","u_mode","u_seed","u_base","u_accent"].forEach(name=>loc[name]=gl.getUniformLocation(program,name));
    return true;
  }catch(err){console.warn("Theme shader fallback:",err.message);return false;}
}
function resize(){
  const ratio=Math.min(devicePixelRatio||1,1.2);
  const scale=Math.min(1,Math.sqrt(1350000/(innerWidth*innerHeight*ratio*ratio)));
  canvas.width=Math.max(1,Math.round(innerWidth*ratio*scale));
  canvas.height=Math.max(1,Math.round(innerHeight*ratio*scale));
  if(useGL)gl.viewport(0,0,canvas.width,canvas.height);
}
function drawFallback(progress,fx){
  if(!ctx2d)return;
  const W=canvas.width,H=canvas.height,t=performance.now()*.001;
  const energy=1-Math.abs(progress*2-1);
  ctx2d.clearRect(0,0,W,H);
  if(energy<=0)return;
  const opacity=clamp((energy-.23)*3.4,0,1);
  // Cover the old page in the middle, then produce shape-specific 2D fluid.
  if(opacity>0){
    ctx2d.fillStyle=rgbCss(fx.bg,opacity*.28);
    ctx2d.fillRect(0,0,W,H);
  }
  const ox=fx.origin.x*W,oy=fx.origin.y*H,scale=Math.hypot(W,H);
  const accent=fx.accent;
  ctx2d.save();
  ctx2d.globalAlpha=clamp(energy*1.3,0,1);
  // 0: vortex spirals, 1: diffusing ink, 2: crystalline shards,
  // 3: colliding circular shockwaves, 4: billowing nebula bubbles.
  if(fx.mode===0){
    for(let j=0;j<17;j++){
      const turns=2.7+j*.03,rot=t*1.05+j*.38;
      ctx2d.beginPath();
      for(let k=0;k<=65;k++){
        const u=k/65,r=(.008+u*u*.40)*scale;
        const a=rot+u*Math.PI*2*turns;
        const x=ox+Math.cos(a)*r,y=oy+Math.sin(a)*r;
        if(k===0)ctx2d.moveTo(x,y);else ctx2d.lineTo(x,y);
      }
      ctx2d.lineWidth=1+j%4*2;
      ctx2d.strokeStyle=rgbCss(accent,.10+(j%5)*.07);
      ctx2d.shadowColor=rgbCss(accent,.7);ctx2d.shadowBlur=22;
      ctx2d.stroke();
    }
  }else if(fx.mode===2){
    for(let j=0;j<115;j++){
      const a=j*2.39996+t*.18;
      const r=(.06+((j*29)%97)/97*.48)*scale;
      const x=ox+Math.cos(a)*r,y=oy+Math.sin(a)*r;
      const size=8+((j*13)%57);
      ctx2d.beginPath();ctx2d.moveTo(x,y-size);
      ctx2d.lineTo(x+size*.9,y+size*.7);
      ctx2d.lineTo(x-size*.8,y+size*.4);ctx2d.closePath();
      ctx2d.lineWidth=1.5;ctx2d.strokeStyle=rgbCss(accent,.22+((j%5)/13));
      ctx2d.stroke();ctx2d.fillStyle=rgbCss(accent,.025+(j%4)*.024);ctx2d.fill();
    }
  }else if(fx.mode===3){
    for(let j=0;j<25;j++){
      const r=((j+1)/25)*scale*.64+Math.sin(t*3+j)*14;
      const source=j%2===0?[ox,oy]:[W*.22,H*.8];
      ctx2d.beginPath();ctx2d.arc(source[0],source[1],r,0,Math.PI*2);
      ctx2d.strokeStyle=rgbCss(accent,.10+.14*(1-j/25));
      ctx2d.shadowColor=rgbCss(accent,.7);ctx2d.shadowBlur=20;
      ctx2d.lineWidth=1+(j%5)*1.8;ctx2d.stroke();
    }
  }
  if(fx.mode===5){
    // Viscous metaball field: converging globules with translucent veils.
    ctx2d.save();ctx2d.globalCompositeOperation="lighter";
    for(let j=0;j<11;j++){
      const a=j*2.4+t*.65,r=(.12+.045*(j%6))*scale;
      const x=ox+Math.cos(a)*r,y=oy+Math.sin(a*1.32)*r;
      const radius=(36+(j%5)*22)*(0.65+energy);
      const g=ctx2d.createRadialGradient(x,y,2,x,y,radius);
      g.addColorStop(0,rgbCss(accent,.18));g.addColorStop(.5,rgbCss(accent,.11));g.addColorStop(1,rgbCss(accent,0));
      ctx2d.fillStyle=g;ctx2d.beginPath();ctx2d.arc(x,y,radius,0,Math.PI*2);ctx2d.fill();
    }
    ctx2d.restore();
  }else if(fx.mode===6){
    // Data lattice: binary light cells reassemble into the new color system.
    const cell=34;
    for(let row=0;row<Math.ceil(H/cell);row++)for(let col=0;col<Math.ceil(W/cell);col++){
      const key=(col*177+row*71+(fx.seed||0))%137;
      if(key>49)continue;
      const shift=Math.sin(t*2+key)*8;
      ctx2d.fillStyle=rgbCss(accent,.07+(key%7)*.012);
      ctx2d.fillRect(col*cell+shift,row*cell,cell*.75,cell*.75);
      if(key%3===0){ctx2d.strokeStyle=rgbCss(accent,.23);ctx2d.strokeRect(col*cell,row*cell,cell*.8,cell*.8);}
    }
  }
  // Refraction clouds: different flow topology for each effect.
  const count=fx.mode===2?34:fx.mode===1?90:66;
  for(let i=0;i<count;i++){
    const a=i*2.399963+fx.mode*.6,seed=i*17.77;
    const spread=.12+((i*23)%97)/97*.43;
    const drift=fx.mode===4?.18:fx.mode===1?.11:.045;
    const x=W*.5 + Math.cos(a+t*drift+Math.sin(seed))*(spread*scale)+Math.sin(t*1.4+i)*15;
    const y=H*.48 + Math.sin(a+t*drift*.7)*(spread*scale*.68)+Math.cos(t+i)*13;
    const rr=(fx.mode===4?48:fx.mode===1?32:18)+(i%9)*10;
    const radius=rr*(.4+energy*1.8);
    const gradient=ctx2d.createRadialGradient(x,y,0,x,y,radius);
    gradient.addColorStop(0,rgbCss(accent,fx.mode===4?.27:.39));
    gradient.addColorStop(.45,rgbCss(accent,.12));
    gradient.addColorStop(1,rgbCss(accent,0));
    ctx2d.shadowBlur=0;ctx2d.fillStyle=gradient;
    ctx2d.beginPath();ctx2d.arc(x,y,radius,0,Math.PI*2);ctx2d.fill();
  }
  // Irregular luminous interfaces make the surface appear refractive.
  for(let k=0;k<21;k++){
    const sx=(.06+((k*31)%83)/83*.9)*W;
    const sy=(.05+((k*17)%91)/91*.9)*H;
    const bend=Math.sin(t*2+k)*35;
    ctx2d.beginPath();
    ctx2d.moveTo(sx-33,sy-18);
    ctx2d.quadraticCurveTo(sx+bend,sy-35,sx+43,sy+Math.sin(k+t)*24);
    ctx2d.lineWidth=1+(k%3)*.7;ctx2d.strokeStyle=rgbCss(accent,.09+energy*.16);
    ctx2d.stroke();
  }
  ctx2d.restore();
}

// Translucent relief tiles inspired by the supplied reference animation.
// Draws only near the moving wavefront; the portfolio is visible underneath.
const reliefCtx=canvas.getContext("2d",{alpha:true,desynchronized:true});
function reliefResize(){
  const scale=Math.min(devicePixelRatio||1,1.25);
  canvas.width=Math.max(1,Math.round(innerWidth*scale));
  canvas.height=Math.max(1,Math.round(innerHeight*scale));
}
function paintRelief(progress,fx){
  if(!reliefCtx)return;
  const ctx=reliefCtx,W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);
  const pixelRatio=W/Math.max(1,innerWidth), cell=Math.max(26,Math.round(43*pixelRatio));
  const cols=Math.ceil(W/cell),rows=Math.ceil(H/cell);
  const variant=fx.mode%3,phase=Math.sin(progress*Math.PI),ease=progress*progress*(3-2*progress);
  const cx=(fx.origin.x*W*.65+W*.175),cy=(fx.origin.y*H*.60+H*.20);
  const diagonal=Math.hypot(W,H);
  const radius=(.02+ease*.77)*diagonal;
  const band=Math.max(cell*2.5,diagonal*.09);
  const accent=rgba(fx.accent).map(v=>Math.round(v*255));
  const c=`${accent[0]},${accent[1]},${accent[2]}`;
  const white='255,255,255';
  // Four straight-sided facets and a depth edge create a quiet embossed tile field.
  // No full-screen fill: the underlying page remains readable at every frame.
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const px=col*cell+cell*.5,py=row*cell+cell*.5;
    const dx=px-cx,dy=py-cy;
    const dist=variant===1
      ?Math.hypot(dx*.82+dy*.17,dy*1.2)
      :variant===2
        ?Math.hypot(dx,dy)+(Math.sin(col*.67+fx.seed)*cell*.35)
        :Math.hypot(dx,dy);
    const offset=(dist-radius)/band;
    const wave=Math.exp(-offset*offset*1.45);
    const echo=Math.exp(-Math.pow((dist-(radius-band*1.65))/(band*.83),2))*0.38;
    const intensity=(wave+echo)*phase;
    if(intensity<.055)continue;
    const depth=(wave*.8-echo*.4)*cell*.26*phase;
    const shiftX=(dx/(dist+1))*depth*.16;
    const shiftY=-depth*.68;
    const x=col*cell+shiftX+1.4;
    const y=row*cell+shiftY+1.4;
    const sz=cell-2.8;
    const a=clamp(intensity,0,1);
    ctx.fillStyle=`rgba(${c},${(.024+a*.11).toFixed(3)})`;
    ctx.fillRect(x,y,sz,sz);
    // Rim lighting is deliberately faint, with only small elevation changes.
    ctx.strokeStyle=`rgba(${white},${(a*.115).toFixed(3)})`;
    ctx.lineWidth=1*pixelRatio;
    ctx.strokeRect(x+.3,y+.3,sz-.6,sz-.6);
    const bevel=clamp(Math.abs(depth)*.38,0,cell*.16);
    if(bevel>.8){
      ctx.beginPath();ctx.moveTo(x,y+sz);ctx.lineTo(x+sz,y+sz);
      ctx.lineTo(x+sz+bevel*.22,y+sz+bevel);
      ctx.lineTo(x+bevel*.22,y+sz+bevel);ctx.closePath();
      ctx.fillStyle=`rgba(${c},${(a*.075).toFixed(3)})`;ctx.fill();
      ctx.beginPath();ctx.moveTo(x+sz,y);ctx.lineTo(x+sz+bevel*.22,y+bevel*.17);
      ctx.lineTo(x+sz+bevel*.22,y+sz+bevel);
      ctx.lineTo(x+sz,y+sz);ctx.closePath();
      ctx.fillStyle=`rgba(0,0,0,${(a*.105).toFixed(3)})`;ctx.fill();
    }
  }
}
window.ThemeFlux={
  run({accent,bg,origin={x:.5,y:.5},mode=0,seed=0,onMid=()=>{},onEnd=()=>{}}){
    if(active)active.cancel();
    if(reduced.matches){onMid();onEnd();return;}
    holder.className="theme-transition tile-running";
    holder.style.setProperty("--incoming-accent",accent);
    holder.style.setProperty("--incoming-bg",bg);
    holder.style.setProperty("--origin-x",(origin.x*100)+"%");
    holder.style.setProperty("--origin-y",(origin.y*100)+"%");
    holder.dataset.effect=String(mode);
    reliefResize();
    const config={accent,bg,origin,mode,seed};
    let started=performance.now(),fired=false,id=0,dead=false;
    const cleanup=()=>{
      dead=true;
      cancelAnimationFrame(id);
      reliefCtx?.clearRect(0,0,canvas.width,canvas.height);
      holder.className="theme-transition";
      if(active===handle)active=null;
    };
    const handle={cancel:()=>{if(!fired){fired=true;onMid();}cleanup();}};
    const tick=now=>{
      if(dead)return;
      const p=clamp((now-started)/740,0,1);
      if(p>=.44&&!fired){fired=true;onMid();}
      paintRelief(p,config);
      if(p<1)id=requestAnimationFrame(tick);
      else{cleanup();onEnd();}
    };
    active=handle;
    id=requestAnimationFrame(tick);
  }
};

// Canvas fluid particle system with DOM bounding-box collision approximations.
// A translucent mother blob stretches and separates near interactive surfaces;
// emitted droplets stick, drool along the surface and return to free fall.
window.LiquidPointer={
 start(){
  const canvas=document.getElementById("liquid-pointer");
  if(!canvas || !fine.matches || reduced.matches)return;
  const ctx=canvas.getContext("2d",{alpha:true,desynchronized:true});
  if(!ctx)return;
  let started=true,visible=false,tx=-400,ty=-400,x=-400,y=-400,lastMX=-400,lastMY=-400;
  let vx=0,vy=0,hovered=null,surfaceRect=null,impact=0,frames=0,last=performance.now();
  let trail=[],droplets=[],swirls=[],cached=[],lastBounds=0;
  let colorHex="#D73139",rgb=[215,49,57],dpr=1;
  const fill=a=>`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const surfacesSelector=".project-card,.tool-card,.pill,.glass,.nav-link,.theme-option,.theme-random,.capability,.modal-panel,.round-close,.mobile-toggle";
  function resize(){
   dpr=Math.min(devicePixelRatio||1,1.45);
   canvas.width=Math.floor(innerWidth*dpr);canvas.height=Math.floor(innerHeight*dpr);
   ctx.setTransform(dpr,0,0,dpr,0,0);lastBounds=0;
  }
  resize();addEventListener("resize",resize,{passive:true});addEventListener("scroll",()=>lastBounds=0,{passive:true});
  const refresh=now=>{
   if(now-lastBounds<180)return;
   lastBounds=now;
   cached=[...document.querySelectorAll(surfacesSelector)].filter(el=>el.getClientRects().length &&
     getComputedStyle(el).visibility!=="hidden").map(el=>({el,r:el.getBoundingClientRect()}))
     .filter(c=>c.r.width>18 && c.r.height>16 && c.r.bottom>-55 && c.r.top<innerHeight+55);
  };
  function surfaceAt(px,py,margin=36){
   for(let i=cached.length-1;i>=0;i--){
    const r=cached[i].r;
    if(px>r.left-margin && px<r.right+margin && py>r.top-margin && py<r.bottom+margin) return cached[i];
   }
   return null;
  }
  function collision(rect,px,py){
   if(!rect)return null;
   const r=rect.r;
   const dx=[Math.abs(px-r.left),Math.abs(px-r.right),Math.abs(py-r.top),Math.abs(py-r.bottom)];
   const edge=dx.indexOf(Math.min(...dx));
   const inside=px>=r.left && px<=r.right && py>=r.top && py<=r.bottom;
   const gap=inside?0:Math.hypot(Math.max(r.left-px,0,px-r.right),Math.max(r.top-py,0,py-r.bottom));
   const n=[[-1,0],[1,0],[0,-1],[0,1]][edge];
   return {inside,edge,gap,nx:n[0],ny:n[1],horizontal:edge>1,dist:dx[edge],r};
  }
  function setContact(el,px,py){
   if(hovered!==el){
    hovered?.classList.remove("liquid-contact");
    if(hovered)hovered.style.removeProperty("--fluid-contact");
    hovered=el;
    el?.classList.add("liquid-contact");
   }
   if(el){const r=el.getBoundingClientRect();
    el.style.setProperty("--fluid-x",`${clamp((px-r.left)/r.width*100,0,100).toFixed(1)}%`);
    el.style.setProperty("--fluid-y",`${clamp((py-r.top)/r.height*100,0,100).toFixed(1)}%`);
    el.style.setProperty("--fluid-contact","1");
   }
  }
  document.addEventListener("pointermove",e=>{
   if(e.pointerType==="touch")return;
   if(!visible){x=e.clientX;y=e.clientY;tx=x;ty=y;lastMX=x;lastMY=y;trail=[];}
   tx=e.clientX;ty=e.clientY;visible=true;
   const dist=Math.hypot(tx-lastMX,ty-lastMY);
   const m=surfaceAt(tx,ty,40);
   setContact(m?.el||null,tx,ty);
   surfaceRect=m;
   if(dist>9){
    const n=Math.min(5,Math.round(dist/23));
    for(let j=0;j<n;j++){
     const t=Math.random();
     const px=tx+(lastMX-tx)*t,py=ty+(lastMY-ty)*t;
     if(droplets.length>120)droplets.shift();
     droplets.push({
      x:px+(Math.random()-.5)*10,y:py+(Math.random()-.5)*10,
      vx:(lastMX-tx)*.016+(Math.random()-.5)*3,
      vy:(lastMY-ty)*.012-1-Math.random()*3,
      size:1.9+Math.random()*5.1,life:1,age:0,
      state:"free",stick:null,flow:0,drip:0
     });
    }
   }
   lastMX=tx;lastMY=ty;
  },{passive:true});
  document.addEventListener("pointerout",e=>{if(!e.relatedTarget){visible=false;setContact(null)}},{passive:true});
  addEventListener("blur",()=>{visible=false;setContact(null)});
  function readColor(){
   const value=getComputedStyle(document.body).getPropertyValue("--accent-hot").trim();
   if(value===colorHex)return;
   if(/^#[0-9a-f]{6}$/i.test(value)){
    colorHex=value;rgb=[0,2,4].map(i=>parseInt(value.substring(i+1,i+3),16));
   }
  }
  function blob(px,py,rx,ry,angle,alpha=1){
   ctx.save();ctx.translate(px,py);ctx.rotate(angle);
   ctx.globalAlpha=alpha;ctx.shadowBlur=25;ctx.shadowColor=fill(.55);
   const g=ctx.createRadialGradient(-rx*.35,-ry*.36,0,0,0,Math.max(rx,ry)*1.3);
   g.addColorStop(0,"rgba(255,255,255,.48)");
   g.addColorStop(.14,fill(.61));g.addColorStop(.58,fill(.45));g.addColorStop(.88,fill(.18));g.addColorStop(1,fill(0));
   ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();
   ctx.shadowBlur=0;ctx.lineWidth=1.05;ctx.strokeStyle="rgba(255,255,255,.35)";ctx.stroke();
   ctx.beginPath();ctx.ellipse(-rx*.32,-ry*.39,rx*.21,Math.max(1,ry*.085),-.25,0,Math.PI*2);
   ctx.fillStyle="rgba(255,255,255,.62)";ctx.fill();
   ctx.restore();
  }
  function paintTrail(){
   for(let i=trail.length-1;i>=0;i--){
    const p=trail[i],fade=(trail.length-i)/trail.length;
    ctx.save();ctx.globalAlpha=.22*fade;ctx.strokeStyle=fill(.62);
    ctx.lineWidth=6+fade*13;ctx.lineCap="round";ctx.shadowBlur=12;ctx.shadowColor=fill(.4);
    const next=trail[Math.max(0,i-1)];
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(next.x,next.y);ctx.stroke();ctx.restore();
   }
  }
  function paintContact(c,px,py,speed){
    if(!c || (c.gap>31 && !c.inside))return;
    const r=c.r;
    const squish=clamp((35-c.dist)/35,.12,1);
    ctx.save();ctx.globalAlpha=.55*squish;ctx.strokeStyle=fill(.54);ctx.lineWidth=3.8;
    ctx.shadowBlur=16;ctx.shadowColor=fill(.6);ctx.lineCap="round";
    let cx=clamp(px,r.left+7,r.right-7),cy=clamp(py,r.top+7,r.bottom-7);
    if(c.horizontal){const edgeY=c.edge===2?r.top:r.bottom;
      ctx.beginPath();ctx.moveTo(cx-20,edgeY);ctx.quadraticCurveTo(cx,edgeY-10*c.ny,cx+20,edgeY);ctx.stroke();
      if(speed>6){
        blob(cx-25,edgeY+c.ny*6,clamp(6+speed*.19,6,14),7,0,.42*squish);
        blob(cx+25,edgeY+c.ny*6,clamp(6+speed*.17,6,14),7,0,.42*squish);
      }
    }else{
      const edgeX=c.edge===0?r.left:r.right;
      ctx.beginPath();ctx.moveTo(edgeX,cy-26);ctx.quadraticCurveTo(edgeX-c.nx*13,cy,edgeX,cy+26);ctx.stroke();
      if(speed>6){
       blob(edgeX+c.nx*6,cy-20,6,11,0,.4*squish);
       blob(edgeX+c.nx*6,cy+20,6,11,0,.4*squish);
      }
    }
    ctx.restore();
  }
  function updateDroplet(d,dt){
   d.age+=dt;d.life-=.0063*dt;if(d.life<=0)return false;
   if(d.state==="free"){
    const oldY=d.y;
    d.vy+=.17*dt;d.vx*=.995;d.x+=d.vx*dt;d.y+=d.vy*dt;
    for(const obj of cached){
      const r=obj.r;
      if(d.x<r.left+4 || d.x>r.right-4)continue;
      // A drop sticks when falling onto a card/button/glass surface.
      if(d.vy>0 && oldY<=r.top+2 && d.y>=r.top-3 && d.y<=r.top+12){
        d.y=r.top+2;d.vy=.12;d.state="attached";d.stick=obj.el;d.flow=0;d.drip=0;
        d.size*=.86;break;
      }
    }
   }else{
    const r=d.stick?.getBoundingClientRect();
    if(!r || !r.width){d.state="free";d.stick=null;return true}
    d.flow+=dt*.19;d.drip+=dt*.6;
    d.x+=Math.sin(d.age*.08+d.size)*.12*dt;
    // Surface adhesion draws a thin thread downward before releasing.
    d.y+=clamp(.26+d.flow*.11,.15,2.6)*dt;
    if(d.y>r.bottom+3 || d.x>r.right-1 || d.x<r.left+1 || d.age>180){
      d.state="free";d.stick=null;d.vy=1.6+Math.random()*1.2;d.vx=(Math.random()-.5)*.6;
    }
   }
   return d.y<=innerHeight+65 && d.x>=-60 && d.x<=innerWidth+60;
  }
  function paintDroplet(d){
   const life=clamp(d.life,0,1),size=Math.max(.4,d.size*Math.sqrt(life));
   const length=clamp(d.state==="attached"?d.drip*.5:d.age*.19+Math.max(0,d.vy)*3,0,60);
   ctx.save();ctx.globalAlpha=life*.66;
   const gradient=ctx.createLinearGradient(d.x,d.y-length,d.x,d.y+size);
   gradient.addColorStop(0,fill(0));gradient.addColorStop(.78,fill(.45));gradient.addColorStop(1,fill(.67));
   ctx.fillStyle=gradient;ctx.shadowColor=fill(.43);ctx.shadowBlur=8;
   ctx.beginPath();ctx.moveTo(d.x-size*.13,d.y-length);
   ctx.bezierCurveTo(d.x-size*.19,d.y-length*.55,d.x-size*.72,d.y-8,d.x-size*.85,d.y);
   ctx.arc(d.x,d.y,size,Math.PI,0,true);
   ctx.bezierCurveTo(d.x+size*.72,d.y-8,d.x+size*.23,d.y-length*.57,d.x+size*.13,d.y-length);
   ctx.fill();
   ctx.restore();
   blob(d.x,d.y,size,Math.max(.8,size*.83),0,life*.58);
  }
  function animate(now){
   requestAnimationFrame(animate);
   if(document.hidden)return;
   const dt=clamp((now-last)/16.67,.25,2);last=now;
   if(!visible && !droplets.length){ctx.clearRect(0,0,innerWidth,innerHeight);return}
   frames++;if(frames%11===0)refresh(now);
   readColor();ctx.clearRect(0,0,innerWidth,innerHeight);
   if(visible){
    const oldX=x,oldY=y;
    x+=(tx-x)*Math.min(.58,.33*dt);y+=(ty-y)*Math.min(.58,.33*dt);
    vx=x-oldX;vy=y-oldY;
    const speed=Math.hypot(vx,vy),angle=Math.atan2(vy,vx);
    trail.unshift({x,y});if(trail.length>9)trail.pop();
    paintTrail();
    const c=collision(surfaceRect,x,y);
    let squish=0;let nx=0,ny=0;
    if(c && (c.inside || c.gap<29)){
      squish=c.inside?clamp(1-c.dist/45,.2,1):clamp(1-c.gap/29,0,1);
      nx=c.nx;ny=c.ny;paintContact(c,x,y,speed);
    }
    const offset=squish*6;
    const ax=x+nx*offset,ay=y+ny*offset;
    const baseR=23+(speed>12?Math.min(12,speed*.19):0);
    const rx=baseR*(1-squish*.32)+Math.min(speed*.52,12);
    const ry=23*(1-squish*.42);
    blob(ax,ay,clamp(rx,18,46),clamp(ry,10,29),angle,.93);
    if(surfaceRect?.el && surfaceRect.el.matches(".project-card,.tool-card")){
      ctx.save();ctx.font="bold 9px monospace";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle="rgba(255,255,255,.88)";ctx.fillText("VIEW",ax,ay);ctx.restore();
    }
   }else trail.length=0;
   for(let i=droplets.length-1;i>=0;i--){
    const drop=droplets[i];
    if(!updateDroplet(drop,dt))droplets.splice(i,1);else paintDroplet(drop);
   }
  }
  document.body.classList.add("liquid-pointer-ready");
  refresh(performance.now());requestAnimationFrame(animate);
 }
};

})();
