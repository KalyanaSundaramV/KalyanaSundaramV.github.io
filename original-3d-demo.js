/* Restores the original uploaded Three.js + Rapier game.
   No simulated replacement physics: iframe loads demo-original.html + its existing bundles.
   ES modules require localhost/HTTP rather than file://. */
(() => {
  "use strict";
  const overlay = document.getElementById("original-3d-demo");
  const frame = document.getElementById("original-demo-frame");
  const loading = document.getElementById("original-demo-loading");
  const error = document.getElementById("original-demo-error");
  const status = document.getElementById("original-demo-status");
  const fullscreenButton = document.getElementById("original-demo-fullscreen");
  const fullscreenPanel = overlay?.querySelector(".original-demo-panel");
  if (!overlay || !frame) return;
  let focusReturn = null, open = false, generation = 0, timeout = 0;
  let fullscreenWasActive = false, fullscreenExitedAt = -Infinity;
  function closeDemo() {
    if (!open) return;
    open = false;
    generation += 1;
    window.clearTimeout(timeout);
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    overlay.setAttribute("inert", "");
    document.body.classList.remove("original-demo-active");
    if(document.fullscreenElement===fullscreenPanel){
      document.exitFullscreen?.().catch(()=>{});
    }
    frame.removeAttribute("src"); // release the physics renderer and WebGL context
    loading.hidden = false;
    error.hidden = true;
    status.textContent = "STARTING ENGINE…";
    focusReturn?.focus?.({ preventScroll: true });
  }
  function openDemo() {
    if (open) return;
    focusReturn = document.activeElement;
    open = true;
    const attempt = ++generation;
    overlay.removeAttribute("inert");
    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.add("open");
    document.body.classList.add("original-demo-active");
    loading.hidden = false;
    error.hidden = true;
    status.textContent = "LOADING SOURCE…";
    overlay.querySelector(".original-demo-close").focus({ preventScroll:true });
    if (location.protocol === "file:") {
      loading.hidden = true;
      error.hidden = false;
      status.textContent = "LOCAL SERVER REQUIRED";
      return;
    }
    frame.onload = () => {
      if (!open || generation !== attempt) return;
      loading.hidden = true;
      status.textContent = "SOURCE LOADED · PHYSICS INITIALIZING";
      try {
        frame.contentWindow.addEventListener("keydown", ev => {
          if (ev.key === "Escape" && open && document.fullscreenElement!==fullscreenPanel && performance.now()-fullscreenExitedAt>500 && !frame.contentDocument?.fullscreenElement) {
            ev.preventDefault();closeDemo();
          }
        }, { capture: true });
      } catch (_) { /* same-origin only; close button always works */ }
      // The original demo HTML starts the scene automatically with ?embed=1
      // when it receives its original portfolio-demo-play-request event.
    };
    frame.onerror = () => {
      if (!open || generation !== attempt) return;
      loading.hidden = true;
      error.hidden = false;
      status.textContent = "ENGINE UNAVAILABLE";
    };
    timeout = window.setTimeout(() => {
      if (!open || generation !== attempt) return;
      if (!frame.contentWindow) {
        loading.hidden = true; error.hidden = false;
        status.textContent = "COULD NOT LOAD ENGINE";
      }
    }, 17000);
    frame.src = "demo-original.html?embed=1";
  }
  document.addEventListener("click", event => {
    if(event.target.closest("[data-open-demo]"))openDemo();
  });
  function syncFullscreen(){
    const active=document.fullscreenElement===fullscreenPanel;
    if(fullscreenWasActive && !active) fullscreenExitedAt=performance.now();
    fullscreenWasActive=active;
    if(!fullscreenButton)return;
    fullscreenButton.setAttribute("aria-pressed",String(active));
    fullscreenButton.setAttribute("aria-label",active?"Exit demo fullscreen":"Enter demo fullscreen");
    fullscreenButton.title=active?"Exit fullscreen":"Enter fullscreen";
    fullscreenButton.querySelector("span").textContent=active?"⤡":"⛶";
  }
  fullscreenButton?.addEventListener("click",async()=>{
    try{
      if(document.fullscreenElement===fullscreenPanel)await document.exitFullscreen();
      else await fullscreenPanel.requestFullscreen();
    }catch(err){
      status.textContent="FULLSCREEN UNAVAILABLE";
    }
    syncFullscreen();
  });
  document.addEventListener("fullscreenchange",syncFullscreen);
  document.addEventListener("webkitfullscreenchange",syncFullscreen);
  overlay.querySelectorAll("[data-close-demo]").forEach(button => button.addEventListener("click", closeDemo));
  document.addEventListener("keydown", ev => {
    if (ev.key === "Escape" && open && document.fullscreenElement!==fullscreenPanel && performance.now()-fullscreenExitedAt>500) { ev.preventDefault(); closeDemo(); }
  });
})();
