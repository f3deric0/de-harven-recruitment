/* Preloader dismissal (with a hard fallback so it can never trap the user)
   and a short curtain wipe on internal link navigation. */
DH.register('transitions', function initTransitions() {
  var preloader = document.querySelector('.preloader');
  if (preloader) {
    var hide = function () { preloader.classList.add('is-hidden'); };
    var minShow = setTimeout(hide, DH.reducedMotion ? 0 : 500);
    var hardFallback = setTimeout(hide, 3000);
    window.addEventListener('load', function () {
      clearTimeout(minShow);
      setTimeout(hide, DH.reducedMotion ? 0 : 350);
    });
    preloader.addEventListener('transitionend', function () {
      clearTimeout(hardFallback);
    });
  }

  if (DH.reducedMotion) return;

  var curtain = document.querySelector('.curtain');
  if (!curtain) return;

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    var url;
    try { url = new URL(href, window.location.href); } catch (err) { return; }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname) return;

    e.preventDefault();
    curtain.classList.add('is-active');
    setTimeout(function () { window.location.href = url.href; }, 420);
  });
});
