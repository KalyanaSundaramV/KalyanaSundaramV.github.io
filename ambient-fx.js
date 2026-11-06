/* Theme-aware current lines that move behind the content, not on top of it.
   They use simple 2D flow-field integration to avoid a heavy shader on mobile. */
(() => {
"use strict";
const canvas=document.getElementById("flow-field-canvas");
if(!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches)return;
const ctx=canvas.getContext("2d",{alpha:true,desynchronized:true});
if(!ctx)return;
const low=matchMedia("(pointer:coarse)").matches;
let ratio=1,w=0,h=0,last=0,particles=[],pointer={x:-999,y:-999},color="#D73139",frame=0;
const count=low?18:104;
const random=(a,b)=>a+Math.random()*(b-a);
function reset(p,initial=false){
 p.x=random(0,w);p.y=random(0,h);p.age=0;p.max=random(90,270);
 p.speed=random(.2,.85);p.alpha=random(.065,.18);
 p.prevX=p.x;p.prevY=p.y;
 if(initial)p.age=random(0,p.max);
}
function resize(){
 ratio=Math.min(devicePixelRatio||1,low?1:1.3);
 w=Math.max(1,innerWidth);h=Math.max(1,innerHeight);
 canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
 ctx.setTransform(ratio,0,0,ratio,0,0);
 particles=Array.from({length:count},()=>{const p={};reset(p,true);return p;});
}
resize();
window.addEventListener("resize",resize,{passive:true});
window.addEventListener("pointermove",e=>{pointer.x=e.clientX;pointer.y=e.clientY},{passive:true});
function tick(t){
 requestAnimationFrame(tick);
 if(document.hidden || document.body.classList.contains("mobile-demo-focus") || t-last<(low?66:24))return;
 last=t;frame++;
 ctx.clearRect(0,0,w,h);
 const newColor=getComputedStyle(document.body).getPropertyValue("--accent-hot").trim();
 if(/^#[\da-f]{6}$/i.test(newColor))color=newColor;
 const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16);
 // A slowly changing solenoidal field: lines curl and never dominate the work.
 const phase=t*.00016;
 for(const p of particles){
  const px=p.x,py=p.y;
  const nx=px/w,ny=py/h;
  const theta=Math.sin(nx*9+phase*2.4)*1.6+Math.cos(ny*8-phase*1.9)*1.25+Math.sin((nx+ny)*5.2+phase)*.48;
  let dx=Math.cos(theta)*p.speed*1.6,dy=Math.sin(theta)*p.speed*1.6;
  const dis=Math.hypot(px-pointer.x,py-pointer.y);
  if(dis<135 && dis>2 && !low){
    const force=(1-dis/135)*.68;
    dx+=(px-pointer.x)/dis*force;dy+=(py-pointer.y)/dis*force;
  }
  p.x+=dx;p.y+=dy;p.age++;
  const fade=Math.min(1,p.age/25,(p.max-p.age)/25);
  ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(p.x,p.y);
  ctx.lineWidth=p.alpha>.13?1.2:.7;
  ctx.strokeStyle=`rgba(${r},${g},${b},${Math.max(0,p.alpha*fade)})`;
  ctx.stroke();
  if(p.age>p.max || p.x<0 || p.x>w || p.y<0 || p.y>h) reset(p);
 }
 // One slow, crisp orbital line travels across the page.
 ctx.save();ctx.strokeStyle=`rgba(${r},${g},${b},.062)`;
 ctx.lineWidth=1;
 const cx=w*(.5+.25*Math.sin(phase*.9)),cy=h*(.5+.24*Math.cos(phase*1.1));
 ctx.beginPath();ctx.ellipse(cx,cy,Math.min(w*.34,420),Math.min(h*.31,290),phase*.11,0,Math.PI*2);
 ctx.stroke();ctx.restore();
}
requestAnimationFrame(tick);
})();
