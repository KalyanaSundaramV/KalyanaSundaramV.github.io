/* KSV immersive intro: a self-contained WebGL ray-marched 3D reactor.
   No CDN, Three.js, WebGL textures or external requests.
   Falls back to CSS artwork on restricted / reduced-motion devices. */
(() => {
  "use strict";
  let canvas=document.getElementById("intro-webgl");
  const loader=document.getElementById("preloader");
  if(!canvas || !loader || matchMedia("(prefers-reduced-motion: reduce)").matches)return;

  let gl=null;
  try{gl=canvas.getContext("webgl",{alpha:true,antialias:false,depth:false,stencil:false,powerPreference:"low-power",preserveDrawingBuffer:false});}catch(e){}
  if(!gl){loader.classList.add("intro-no-webgl");initCanvas2D();return;}

  /* True 3D rotation and perspective projection drawn on Canvas 2D when WebGL
     is disallowed. Rotating rings, wire lattice, star tunnel and core. */
  function initCanvas2D(){
    const ctx=canvas.getContext("2d",{alpha:true});
    if(!ctx)return;
    canvas.classList.add("webgl-ready");
    let w=0,h=0,last=0,mouse={x:.5,y:.5},on=true;
    const phi=(1+Math.sqrt(5))/2;
    const ico=[
      [-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],
      [0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],
      [phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]
    ];
    const edges=[];
    for(let i=0;i<ico.length;i++)for(let j=i+1;j<ico.length;j++){
      const d=Math.hypot(...ico[i].map((v,k)=>v-ico[j][k]));
      if(d<2.02)edges.push([i,j]);
    }
    const stars=Array.from({length:85},(_,i)=>({
      a:Math.sin(i*12.9898)*16.8,b:Math.cos(i*78.233)*10.7,
      z:((i*37)%97)/97, size:(i%4===0?1.7:.7)
    }));
    loader.addEventListener("pointermove",e=>{mouse.x=e.clientX/window.innerWidth;mouse.y=e.clientY/window.innerHeight},{passive:true});
    function resize(){
      const r=canvas.getBoundingClientRect();
      const scale=Math.min(1,1050/Math.max(r.width,1),730/Math.max(r.height,1));
      const a=Math.max(1,Math.round(r.width*scale)),b=Math.max(1,Math.round(r.height*scale));
      if(a!==w||b!==h){w=canvas.width=a;h=canvas.height=b;}
    }
    function rotate([x,y,z],t){
      let a=t*.33+(mouse.x-.5)*.32,b=t*.19+(mouse.y-.5)*.26,c=t*.24;
      let cs=Math.cos(a),sn=Math.sin(a);
      [x,z]=[x*cs+z*sn,z*cs-x*sn];
      cs=Math.cos(b);sn=Math.sin(b);
      [y,z]=[y*cs-z*sn,y*sn+z*cs];
      cs=Math.cos(c);sn=Math.sin(c);
      return [x*cs-y*sn,x*sn+y*cs,z];
    }
    function project(v,t,scale=1){
      const [x,y,z]=rotate(v,t),p=3.75/(4.5-z*.52);
      return [w*.67+x*Math.min(w,h)*.25*p*scale,
              h*.50+y*Math.min(w,h)*.25*p*scale,z,p];
    }
    function color(){
      const s=getComputedStyle(document.body).getPropertyValue("--accent-hot").trim();
      return /^#[\da-f]{6}$/i.test(s)?s:"#ef0c50";
    }
    function frame(now){
      if(!on||!loader.isConnected||loader.classList.contains("hiding"))return;
      requestAnimationFrame(frame);
      // MOBILE_POLISH_V3_FX: animation resumes automatically on demo close.
      if(document.hidden || document.body.classList.contains("mobile-demo-focus") || now-last<25)return;
      last=now;resize();
      const t=now*.001,accent=color();
      ctx.clearRect(0,0,w,h);
      ctx.globalCompositeOperation="screen";
      for(const star of stars){
        let z=(star.z+t*.033)%1;
        const x=(star.a/17)*w*.6+w*.67, y=(star.b/12)*h*.7+h*.5;
        ctx.globalAlpha=.08+z*.28;
        ctx.fillStyle="#bcd0ee";ctx.beginPath();ctx.arc(x,y,star.size*(.6+z*.7),0,7);ctx.fill();
      }
      ctx.globalAlpha=1;
      // Rotating 3D wire orbits, foreshortened with perspective.
      for(let ring=0;ring<5;ring++){
        const pts=[];
        for(let k=0;k<=130;k++){
          const theta=k/130*Math.PI*2;
          let v;
          const r=1.30+(ring-2)*.115;
          if(ring%3===0)v=[r*Math.cos(theta),r*Math.sin(theta),.10];
          else if(ring%3===1)v=[r*Math.cos(theta),.08,r*Math.sin(theta)];
          else v=[.05,r*Math.cos(theta),r*Math.sin(theta)];
          pts.push(project(v,t+ring*.3));
        }
        ctx.save();ctx.lineWidth=ring===0?1.65:1;ctx.strokeStyle=accent;
        ctx.shadowColor=accent;ctx.shadowBlur=ring===0?25:9;
        ctx.globalAlpha=ring===0?.75:.35;
        ctx.beginPath();pts.forEach(([x,y],k)=>k?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
        ctx.restore();
      }
      // Icosahedral 3D core, with depth-tinted edges.
      const v=ico.map(pt=>project(pt.map(a=>a*.52),-t*.72));
      for(const [i,j] of edges){
        let depth=(v[i][2]+v[j][2])*0.5;
        ctx.lineWidth=depth>0?1.7:1;
        ctx.globalAlpha=Math.max(.18,Math.min(.91,.57+depth*.26));
        ctx.strokeStyle=accent;ctx.shadowColor=accent;ctx.shadowBlur=11;
        ctx.beginPath();ctx.moveTo(v[i][0],v[i][1]);ctx.lineTo(v[j][0],v[j][1]);ctx.stroke();
      }
      ctx.shadowBlur=0;
      // Moving energy core, depth-driven and softly radiant.
      const centre=project([0,0,0],t);
      const glow=ctx.createRadialGradient(centre[0],centre[1],0,centre[0],centre[1],Math.min(w,h)*.22);
      glow.addColorStop(0,accent+"70");glow.addColorStop(.25,accent+"20");glow.addColorStop(1,accent+"00");
      ctx.globalAlpha=.8;ctx.fillStyle=glow;ctx.beginPath();ctx.arc(centre[0],centre[1],Math.min(w,h)*.22,0,7);ctx.fill();
      ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
    }
    requestAnimationFrame(frame);
    new MutationObserver(()=>{if(!loader.isConnected||loader.classList.contains("hiding"))on=false})
      .observe(loader,{attributes:true,attributeFilter:["class"]});
  }

  const vsrc=`attribute vec2 a_pos;
    void main(){gl_Position=vec4(a_pos,0.,1.);}`;
  const fsrc=`
    precision highp float;
    uniform vec2 u_res;
    uniform float u_t;
    uniform float u_progress;
    uniform vec2 u_mouse;
    uniform vec3 u_color;
    #define PI 3.14159265
    mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
    float sdTorus(vec3 p,vec2 t){return length(vec2(length(p.xz)-t.x,p.y))-t.y;}
    float sdOcta(vec3 p,float s){p=abs(p);return (p.x+p.y+p.z-s)*.57735;}
    vec2 scene(vec3 p){
      p.xz*=rot(u_t*.17+u_mouse.x*.27);
      p.xy*=rot(u_t*.12-u_mouse.y*.19);
      vec3 q=p;
      float outer=sdTorus(q,vec2(1.05,.085));
      q.xy*=rot(1.16+u_t*.27);
      float inner=sdTorus(q,vec2(.78,.07));
      q.yz*=rot(.87-u_t*.38);
      float inner2=sdTorus(q,vec2(.59,.048));
      float core=sdOcta(q,.67);
      float lattice=abs(sdTorus(p,vec2(1.38,.013)))-.006;
      float d=min(min(min(outer,inner),inner2),core);
      float id=core<outer&&core<inner&&core<inner2?2.:1.;
      if(lattice<d){d=lattice;id=3.;}
      return vec2(d,id);
    }
    vec3 norm(vec3 p){
      vec2 e=vec2(.006,0.);
      return normalize(vec3(scene(p+e.xyy).x-scene(p-e.xyy).x,
       scene(p+e.yxy).x-scene(p-e.yxy).x,
       scene(p+e.yyx).x-scene(p-e.yyx).x));
    }
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){
      vec2 uv=(gl_FragCoord.xy-.5*u_res)/min(u_res.x,u_res.y);
      vec2 mouse=u_mouse-.5;
      vec3 ro=vec3(mouse.x*.31,mouse.y*.22,4.7-u_progress*.43);
      vec3 rd=normalize(vec3(uv.x,uv.y,-1.47));
      rd.xy*=rot(u_t*.014);
      float travel=0.,last=10.,glow=0.,id=0.;
      vec3 p=ro;
      for(int i=0;i<57;i++){
        p=ro+rd*travel;
        vec2 hit=scene(p);
        float d=hit.x;
        glow+=.0075/(.055+abs(d))*exp(-travel*.18);
        if(d<.005){id=hit.y;break;}
        travel+=max(d*.73,.026);
        last=d;
        if(travel>10.)break;
      }
      vec3 col=vec3(.005,.009,.021);
      // Volumetric aura and orbital arcs behind the solid form.
      float radius=length(uv-vec2(.04,.0));
      col+=u_color*.07*exp(-radius*radius*2.);
      col+=u_color*min(.52,glow*.016)*(.45+.25*sin(u_t*.8));
      if(id>.5&&travel<10.){
        vec3 n=norm(p);
        vec3 light=normalize(vec3(-.4,.8,.9));
        float diff=max(dot(n,light),.06);
        float rim=pow(1.-max(dot(n,-rd),0.),2.1);
        vec3 steel=vec3(.06,.09,.15);
        if(id>1.5&&id<2.5) steel=mix(steel,u_color,.38);
        if(id>2.5)steel=u_color*.65;
        col+=steel*(.24+diff*.76)+u_color*rim*(id>1.5?.96:1.5);
        col+=vec3(.88,.93,1.)*pow(max(dot(reflect(-light,n),-rd),0.),24.)*.67;
        col+=u_color*max(0.,sin(p.x*18.+p.y*14.+u_t))* .052;
      }
      // Stars belong to a distant 3D starfield.
      vec2 grid=floor((uv+u_t*.003)*vec2(260.,205.));
      float star=step(.9985,hash(grid));
      float sparkle=.58+.42*sin(u_t*1.5+hash(grid+12.)*8.);
      col+=star*sparkle*vec3(.23,.4,.49);
      // Fine scan interference, controlled not distracting.
      col*=.97+.03*sin(gl_FragCoord.y*.7+u_t*2.);
      col=col/(1.+col);
      col=pow(col,vec3(.79));
      // Transparent feather so editorial text remains the focal point.
      float alpha=(1.0-smoothstep(.18,1.30,radius))*.96;
      gl_FragColor=vec4(col,alpha);
    }`;
  function shader(type,source){
    const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){throw new Error(gl.getShaderInfoLog(s)||"Shader compilation failed");}
    return s;
  }
  let program;
  try{
    program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,vsrc));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fsrc));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error("WebGL link error");
  }catch(error){
    console.warn("3D intro fallback:",error);
    loader.classList.add("intro-no-webgl");
    const replacement=document.createElement("canvas");
    replacement.id="intro-webgl";
    canvas.replaceWith(replacement);
    canvas=replacement;
    initCanvas2D();
    return;
  }
  gl.useProgram(program);
  const vert=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vert);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const a=gl.getAttribLocation(program,"a_pos");
  gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  const uniforms={
    res:gl.getUniformLocation(program,"u_res"),
    t:gl.getUniformLocation(program,"u_t"),
    progress:gl.getUniformLocation(program,"u_progress"),
    mouse:gl.getUniformLocation(program,"u_mouse"),
    color:gl.getUniformLocation(program,"u_color")
  };
  const pointer={x:.5,y:.5,targetX:.5,targetY:.5};
  loader.addEventListener("pointermove",e=>{
    pointer.targetX=e.clientX/window.innerWidth;
    pointer.targetY=1-e.clientY/window.innerHeight;
  },{passive:true});
  function resize(){
    const bounds=canvas.getBoundingClientRect();
    // Cap pixel count, keeping the mobile intro responsive and battery aware.
    const scale=Math.min(1,1100/Math.max(1,bounds.width),750/Math.max(1,bounds.height));
    const width=Math.max(1,Math.round(bounds.width*scale));
    const height=Math.max(1,Math.round(bounds.height*scale));
    if(canvas.width!==width || canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);
  }
  function hexColor(str){
    const match=(str||"").match(/#[\da-fA-F]{6}/);
    if(!match)return [.94,.07,.31];
    const h=match[0].slice(1);
    return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255);
  }
  let last=0,active=true;
  function frame(now){
    if(!active || !loader.isConnected || loader.classList.contains("hiding"))return;
    requestAnimationFrame(frame);
    if(document.hidden || document.body.classList.contains("mobile-demo-focus") || now-last<25)return;last=now;
    resize();
    pointer.x+=(pointer.targetX-pointer.x)*.035;
    pointer.y+=(pointer.targetY-pointer.y)*.035;
    const color=hexColor(getComputedStyle(document.body).getPropertyValue("--accent-hot"));
    gl.uniform2f(uniforms.res,canvas.width,canvas.height);
    gl.uniform1f(uniforms.t,now*.001);
    gl.uniform1f(uniforms.progress,parseFloat(loader.style.getPropertyValue("--intro-progress")||"0"));
    gl.uniform2f(uniforms.mouse,pointer.x,pointer.y);
    gl.uniform3f(uniforms.color,...color);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  canvas.classList.add("webgl-ready");
  requestAnimationFrame(frame);
  const clean=()=>{if(!active)return;active=false;try{gl.getExtension("WEBGL_lose_context")?.loseContext();}catch(_){}};
  new MutationObserver(()=>{if(!loader.isConnected || loader.classList.contains("hiding"))clean()})
    .observe(loader,{attributes:true,attributeFilter:["class"]});
  window.addEventListener("pagehide",clean,{once:true});
})();
