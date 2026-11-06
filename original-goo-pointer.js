/* Goo-pointer physics extracted and adapted from the user's uploaded
   Kalyana_Liquid_Portfolio_v3 / experience-v3.js.
   Maintains the current ~52px pearl head; imports the old orbital/spring behavior,
   gooey SVG merger, accelerative splashes and tapered falling drips.
   No pointer interception; disable on touch & reduced motion. */
(() => {
"use strict";
const fine=matchMedia('(hover:hover) and (pointer:fine)');
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const $=(s,r=document)=>r.querySelector(s);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function rgbHex(hex){
 const value=(hex.trim()||'#D73139').replace('#','');
 const full=value.length===3?value.split('').map(c=>c+c).join(''):value;
 if(!/^[a-f0-9]{6}$/i.test(full))return [215,49,57];
 return [0,2,4].map(n=>parseInt(full.substring(n,n+2),16));
}
function initLiquidPointer(){
 if(!fine.matches||reduce.matches)return;
 const cursor=document.createElement('div');cursor.id='cursor';cursor.className='v3-pearl-cursor';
 cursor.setAttribute('aria-hidden','true');
 const label=document.createElement('span');label.id='cursor-label';cursor.append(label);
 document.body.append(cursor);
 const defs=document.createElementNS('http://www.w3.org/2000/svg','svg');
 defs.setAttribute('width','0');defs.setAttribute('height','0');defs.setAttribute('aria-hidden','true');
 defs.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
 defs.innerHTML='<defs><filter id="ksv-pointer-goo" x="-130%" y="-130%" width="360%" height="360%"><feGaussianBlur in="SourceGraphic" stdDeviation="6.5" result="soft"/><feColorMatrix in="soft" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 23 -11" result="liquid"/></filter></defs>';
 document.body.append(defs);
 const matter=document.createElement('div');matter.className='v3-cursor-matter';
 matter.setAttribute('aria-hidden','true');matter.innerHTML='<i></i><i></i><i></i><i></i><i></i>';
 const orbs=[...matter.children].map((el,i)=>({el,x:-120,y:-120,rate:[.36,.23,.16,.11,.075][i],s:[.88,.59,.49,.38,.27][i]}));
 document.body.append(matter);
 const trail=document.createElement('canvas');trail.className='v3-cursor-trail';trail.setAttribute('aria-hidden','true');
 document.body.append(trail);const ctx=trail.getContext('2d',{alpha:true});
 let w=innerWidth,h=innerHeight,pr=1,trace=[];
 function resize(){pr=Math.min(devicePixelRatio||1,1.4);w=innerWidth;h=innerHeight;trail.width=Math.round(w*pr);trail.height=Math.round(h*pr);ctx.setTransform(pr,0,0,pr,0,0)}
 resize();addEventListener('resize',resize,{passive:true});
 let x=-120,y=-120,tx=-120,ty=-120,visible=false,moving=0,lastX=0,lastY=0,lastSpawn=0,accent=[215,49,57];
 function applyAccent(){accent=rgbHex(getComputedStyle(document.body).getPropertyValue('--accent-hot').trim()||'#D73139')}
 applyAccent();document.addEventListener('ksv:theme',applyAccent);
 function refreshCursorLabel(){
   if(!visible)return;
   let target=document.elementFromPoint(tx,ty);
   const modal=document.getElementById('modal'),modalOpen=modal?.classList.contains('open');
   if(modalOpen && !target?.closest?.('#modal')){
     // Visibility transitions can briefly leave the underlying card hit-testable.
     // The open overlay takes precedence even before its first painted frame.
     const rect=modal.querySelector('.modal-panel')?.getBoundingClientRect();
     const overPanel=rect && tx>=rect.left&&tx<=rect.right&&ty>=rect.top&&ty<=rect.bottom;
     const actionable=overPanel?[...modal.querySelectorAll('button,a[href]')].find(el=>{
       const r=el.getBoundingClientRect();
       return tx>=r.left&&tx<=r.right&&ty>=r.top&&ty<=r.bottom;
     }):null;
     if(actionable)target=actionable;
     else{
       label.textContent=overPanel?'':'CLOSE';
       cursor.classList.toggle('active',!overPanel);
       return;
     }
   }
   if(!modalOpen && target?.closest?.('#modal')){
     target=document.elementsFromPoint(tx,ty).find(el=>!el.closest?.('#modal'));
   }
   if(!target){cursor.classList.remove('active');label.textContent='';return}
   const action=target.closest?.('button,a[href],.project-card,.tool-card,.capability,.timeline-row,[data-modal-project],[role="button"],[data-close-modal],.modal-scrim');
   let text='';
   if(action){
     if(action.matches('[data-close-modal],.round-close,.modal-scrim,[data-close-demo],.original-demo-close'))text='CLOSE';
     else if(action.matches('.project-card,.tool-card,.capability,.timeline-row,[data-modal-project]'))text='VIEW';
     else if(action.matches('[data-open-demo]'))text='PLAY';
     else if(action.matches('a[download]'))text='SAVE';
     else if(action.matches('a[href]')){
       const href=action.getAttribute('href')||'';
       text=/^mailto:/i.test(href)?'EMAIL':(/^(https?:)?\/\//i.test(href) || action.target==='_blank'?'OPEN':'GO');
     }else if(action.matches('button,[role="button"]')){
       const name=(action.getAttribute('aria-label')||action.textContent||'').trim().toLowerCase();
       text=/close|dismiss|exit/.test(name)?'CLOSE':/copy/.test(name)?'COPY':/download/.test(name)?'SAVE':'CLICK';
     }
   }
   cursor.classList.toggle('active',Boolean(text));
   cursor.classList.toggle('on-navigation',Boolean(target.closest?.('.nav-link,.theme-orb')));
   label.textContent=text;
 }
 document.addEventListener('ksv:cursor-refresh',refreshCursorLabel);
 document.addEventListener('scroll',refreshCursorLabel,{passive:true,capture:true});
 document.addEventListener('focusin',()=>requestAnimationFrame(refreshCursorLabel));
 document.addEventListener('pointermove',e=>{
   if(e.pointerType==='touch')return;
   // Keep the custom pointer over the demo title bar and its controls,
   // but leave the actual 3D playfield to its own native/game pointer.
   if(document.body.classList.contains('original-demo-active') &&
      !e.target.closest?.('.original-demo-toolbar')){
     visible=false;cursor.style.opacity='0';matter.classList.remove('visible');
     cursor.classList.remove('active');label.textContent='';
     return;
   }
   tx=e.clientX;ty=e.clientY;
   const speed=Math.hypot(tx-lastX,ty-lastY);moving=clamp(speed/55);
   if(!visible){x=tx;y=ty;orbs.forEach(o=>{o.x=tx;o.y=ty})}
   visible=true;cursor.style.opacity='1';matter.classList.add('visible');
   refreshCursorLabel();
   lastX=tx;lastY=ty;
   const now=performance.now();
   if(speed>8&&now-lastSpawn>33){
     const count=speed>36?2:1;
     for(let i=0;i<count;i++){
       trace.push({x:tx+(Math.random()-.5)*17,y:ty+(Math.random()-.5)*17,
        vx:(Math.random()-.5)*.85,vy:.15+Math.random()*.5,
        r:1.8+moving*4+Math.random()*2,age:0,life:650+Math.random()*790,drip:Math.random()>.46});
     }
     if(trace.length>170)trace.splice(0,trace.length-170);
     lastSpawn=now;
   }
 },{passive:true});
 document.documentElement.addEventListener('pointerleave',()=>{visible=false;cursor.style.opacity='0';matter.classList.remove('visible')});
 document.getElementById('original-demo-frame')?.addEventListener('pointerenter',()=>{
   visible=false;cursor.style.opacity='0';matter.classList.remove('visible');
   cursor.classList.remove('active');label.textContent='';
 });
 let last=0,frameCount=0;
 function draw(t){
   requestAnimationFrame(draw);
   if(document.hidden)return;
   const dt=last?Math.min(36,t-last):16;last=t; if((frameCount%12)===0)applyAccent();
   const step=dt/16.66;frameCount++;
   const resting=t*.001,fluidity=.05+moving*.2;
   x+=(tx-x)*clamp(.3*step);
   y+=(ty-y)*clamp(.3*step);
   if(visible){
     cursor.style.left=x+'px';cursor.style.top=y+'px';
     const squeeze=Math.sin(resting*2.1)*.035;
     cursor.style.borderRadius=`${47+squeeze*80}% ${53-squeeze*80}% ${55+squeeze*50}% ${45-squeeze*50}%`;
   }
   orbs.forEach((o,i)=>{
     const angle=resting*(i%2?1.1:-.9)+i*1.35;
     const orbit=(i===0?0:8+i*4)+(2+4*Math.sin(resting*1.3+i));
     const ox=x+Math.cos(angle)*orbit+(x-tx)*i*.10;
     const oy=y+Math.sin(angle*1.16)*orbit+(y-ty)*i*.1;
     o.x+=(ox-o.x)*clamp(o.rate*step);
     o.y+=(oy-o.y)*clamp(o.rate*step);
     const breathe=1+.18*Math.sin(resting*2.45+i*1.43)+moving*.19;
     o.el.style.transform=`translate3d(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px,0) translate(-50%,-50%) scale(${(o.s*breathe).toFixed(3)})`;
   });
   moving*=Math.pow(.84,step);
   if(frameCount%2!==0)return;
   ctx.clearRect(0,0,w,h);
   for(let i=trace.length-1;i>=0;i--){
     const p=trace[i];p.age+=dt*2;p.vy+=p.drip?.024*step:0;
     p.x+=p.vx*step;p.y+=p.vy*step;
     const z=clamp(1-p.age/p.life);
     if(z<=0){trace.splice(i,1);continue}
     const r=p.r*(.13+.87*z);
     const a=.32*z;
     ctx.beginPath();
     if(p.drip){
       ctx.moveTo(p.x,p.y-r*4*(1-z));ctx.bezierCurveTo(p.x-r*.7,p.y-r*.8,p.x+r*.7,p.y+r,p.x,p.y+r);
     }else ctx.arc(p.x,p.y,r,0,Math.PI*2);
     ctx.strokeStyle=`rgba(${accent[0]},${accent[1]},${accent[2]},${a.toFixed(3)})`;
     ctx.lineWidth=clamp(r*.43,.45,2.3);ctx.stroke();
     if(z>.34){ctx.fillStyle=`rgba(${accent[0]},${accent[1]},${accent[2]},${(a*.23).toFixed(3)})`;ctx.fill()}
   }
 }
 requestAnimationFrame(draw);
}

initLiquidPointer();
})();
