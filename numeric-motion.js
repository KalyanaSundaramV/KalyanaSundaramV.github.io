/* Numeric entrance/change animations for existing DOM text, with formatting retained.
   Does not intercept React/Rapier game telemetry inside its independent iframe. */
(() => {
"use strict";
const reduce=matchMedia("(prefers-reduced-motion: reduce)");
const skips="script,style,noscript,textarea,pre,code,svg,canvas,.motion-char,.kinetic,.marquee-inner,.numeric-motion,.preloader,.original-demo-overlay,[contenteditable]";
const token=/(?<![A-Za-z0-9#])([+-]?[$€£₹]?\s?)(\d+(?:[,. \u00a0]\d+)*)([KMBTkmbt%+]?)/g;
const running=new WeakMap();
let ready=false;
const waiting=new Set();
const duration=1050;
const visible=("IntersectionObserver" in window) ?
  new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting && ready){
      visible.unobserve(entry.target);
      waiting.delete(entry.target);
      start(entry.target,0,Number(entry.target.dataset.motionTarget));
    }
  }),{threshold:.02}):null;
function parse(text){
  const match=/^([+-]?[$€£₹]?\s?)(\d+(?:[,. \u00a0]\d+)*)([KMBTkmbt%+]?)$/.exec(text);
  if(!match)return null;
  const digits=match[2], dots=(digits.match(/\./g)||[]).length;
  const commas=(digits.match(/,/g)||[]).length;
  let decimal="",group="";
  if(dots&&commas){
    decimal=digits.lastIndexOf(".")>digits.lastIndexOf(",")?".":",";
    group=decimal==="."?",":".";
  }else if(commas){
    const groups=digits.split(",");
    const thousands=groups.slice(1).every(x=>x.length===3)&&groups[0].length<=3;
    if(thousands)group=",";else decimal=",";
  }else if(dots){
    const groups=digits.split(".");
    const lang=(document.documentElement.lang||"").toLowerCase();
    const grouped=groups.slice(1).every(x=>x.length===3)&&groups[0].length<=3;
    if((dots>1&&grouped)||(dots===1&&grouped&&/^(de|it|nl|pt|es)/.test(lang)))group=".";
    else decimal=".";
  }else if(/[ \u00a0]/.test(digits))group=digits.includes("\u00a0")?"\u00a0":" ";
  const decimalIndex=decimal?digits.lastIndexOf(decimal):-1;
  const precision=decimalIndex<0?0:digits.length-decimalIndex-1;
  const amount=Number(digits.replace(/[\s,.\u00a0]/g,""))/Math.pow(10,precision);
  if(!Number.isFinite(amount))return null;
  const integer=(decimalIndex<0?digits:digits.slice(0,decimalIndex)).replace(/[\s,.\u00a0]/g,"");
  return {amount:match[1].startsWith("-")?-amount:amount,prefix:match[1],suffix:match[3],
    precision,group,decimal,zeros:/^0\d/.test(integer)?integer.length:0};
}
function format(n,info){
  if(!info)return String(n);
  const value=Math.abs(Number(n)).toFixed(info.precision);
  let [integer,decimal]=value.split(".");
  if(info.zeros)integer=integer.padStart(info.zeros,"0");
  if(info.group)integer=integer.replace(/\B(?=(\d{3})+(?!\d))/g,info.group);
  return info.prefix+integer+(decimal===undefined?"":(info.decimal||".")+decimal)+info.suffix;
}
function start(el,from,to){
  const info=parse(el.dataset.motionOriginal||"");
  if(!info || !Number.isFinite(to)){return}
  if(reduce.matches){el.textContent=format(to,info);el.dataset.motionLast=el.textContent;el.dataset.motionValue=String(to);return}
  const old=running.get(el);if(old)cancelAnimationFrame(old.frame);
  const begin=performance.now();
  function frame(now){
    if(!el.isConnected){running.delete(el);return}
    const t=Math.min(1,(now-begin)/duration),ease=1-Math.pow(1-t,4);
    const next=from+(to-from)*ease;
    el.textContent=format(next,info);
    el.dataset.motionLast=el.textContent;
    if(t<1)running.set(el,{frame:requestAnimationFrame(frame)});
    else {el.textContent=format(to,info);el.dataset.motionLast=el.textContent;el.dataset.motionValue=String(to);running.delete(el)}
  }
  running.set(el,{frame:requestAnimationFrame(frame)});
}
function wrapNode(node){
  const parent=node.parentElement;
  if(!parent || parent.closest(skips) || !node.nodeValue || !/\d/.test(node.nodeValue))return;
  const stat=parent.closest(".stat-number[data-target]");
  const text=stat && parent===stat
    ? String(stat.dataset.target)+(stat.dataset.suffix||"")
    : node.nodeValue;
  const pieces=document.createDocumentFragment();
  token.lastIndex=0;let found=false,last=0,m;
  while((m=token.exec(text))!==null){
    const raw=m[0], info=parse(raw);
    if(!info || !Number.isFinite(info.amount))continue;
    if(m.index>last)pieces.append(document.createTextNode(text.slice(last,m.index)));
    const el=document.createElement("span");el.className="numeric-motion";
    el.dataset.motionOriginal=raw;el.dataset.motionTarget=String(info.amount);
    el.dataset.motionValue=String(info.amount);
    // The user sees count-up from zero only once the intro has exited
    // and the number itself enters the viewport.
    el.textContent=reduce.matches?raw:format(0,info);
    el.dataset.motionLast=el.textContent;
    pieces.append(el);found=true;
    if(!reduce.matches){
      waiting.add(el);
      if(ready){if(visible)visible.observe(el);else start(el,0,info.amount);}
    }
    last=m.index+raw.length;
  }
  if(!found)return;
  if(last<text.length)pieces.append(document.createTextNode(text.slice(last)));
  node.replaceWith(pieces);
}
function scan(node){
  if(node.nodeType===3){wrapNode(node);return}
  if(node.nodeType!==1 || node.matches(skips) || node.closest(".numeric-motion"))return;
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const text of nodes)wrapNode(text);
}
function onWrapperChanged(el){
  const str=el.textContent;
  if(str===el.dataset.motionLast)return;
  const next=parse(str);if(!next)return;
  const old=parse(el.dataset.motionOriginal||str);
  const from=parse(el.dataset.motionLast||"")?.amount ?? Number(el.dataset.motionValue||old?.amount||0);
  el.dataset.motionOriginal=str;
  el.dataset.motionTarget=String(next.amount);
  start(el,from,next.amount);
}
function arm(){
  if(ready || reduce.matches)return;
  if(document.getElementById("preloader"))return;
  ready=true;
  for(const el of waiting){
    if(!el.isConnected){waiting.delete(el);continue;}
    if(visible)visible.observe(el);
    else start(el,0,Number(el.dataset.motionTarget));
  }
  waiting.clear();
}
function init(){
 scan(document.body);
 document.addEventListener("ksv:intro-finished",arm);
 if(!document.getElementById("preloader"))arm();
 const obs=new MutationObserver(records=>{
   const seen=new Set();
   for(const record of records){
     const parent=record.target.nodeType===3?record.target.parentElement:record.target;
     const wrapper=parent?.closest?.(".numeric-motion");
     if(wrapper){seen.add(wrapper);continue}
     if(record.type==="characterData"){scan(record.target);continue}
     for(const child of record.addedNodes)scan(child);
   }
   for(const wrapper of seen)onWrapperChanged(wrapper);
 });
 obs.observe(document.body,{subtree:true,childList:true,characterData:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
