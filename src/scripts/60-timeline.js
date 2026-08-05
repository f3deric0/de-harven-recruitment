/* Scroll-linked progress line for .timeline blocks (methodology, about career). */
DH.register('timeline', function initTimelines() {
  var timelines = document.querySelectorAll('.timeline');
  if (!timelines.length) return;

  var items = document.querySelectorAll('.timeline-item');
  if ('IntersectionObserver' in window) {
    var itemObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      },
      { threshold: 0.5 }
    );
    items.forEach(function (el) { itemObserver.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  }

  if (DH.reducedMotion) return;

  function updateProgress() {
    timelines.forEach(function (tl) {
      var progress = tl.querySelector('.timeline-progress');
      if (!progress) return;
      var rect = tl.getBoundingClientRect();
      var viewportH = window.innerHeight;
      var visible = Math.min(viewportH * 0.7, rect.bottom) - rect.top;
      var pct = Math.max(0, Math.min(1, visible / rect.height));
      progress.style.height = (pct * 100) + '%';
    });
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { updateProgress(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();
});
