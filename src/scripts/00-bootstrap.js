/* Bootstrap — namespace + small helpers shared by every module. */
window.DH = window.DH || { modules: [], reducedMotion: false };

DH.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

DH.register = function register(name, initFn) {
  DH.modules.push({ name, initFn });
};

DH.onReady = function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
};
