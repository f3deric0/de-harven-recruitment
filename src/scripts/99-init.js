/* Entry point — runs every registered module once the DOM is ready. */
DH.onReady(function () {
  if (DH.reducedMotion) document.documentElement.classList.add('reduced-motion');
  DH.modules.forEach(function (mod) {
    try { mod.initFn(); } catch (err) {
      /* A single failing module (e.g. unsupported API) must never break the rest of the page. */
      if (window.console) console.error('[DH] module failed:', mod.name, err);
    }
  });
});
