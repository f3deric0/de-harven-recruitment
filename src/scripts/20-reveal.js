/* Scroll reveal — one shared IntersectionObserver for every [data-reveal] node. */
DH.register('reveal', function initReveal() {
  var items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  if (DH.reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  items.forEach(function (el, i) {
    if (el.closest('[data-reveal-group]')) {
      el.style.setProperty('--reveal-i', i % 8);
    }
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.01, rootMargin: '0px 0px 15% 0px' }
  );

  items.forEach(function (el) { observer.observe(el); });
});
