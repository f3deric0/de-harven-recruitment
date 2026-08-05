/* Animated stat counters — triggers once, when scrolled into view.
   Expected markup:
   <span class="stat-value" data-count-to="11">
     <span class="num">11</span><span class="suffix">+</span>
   </span>
   The static "11" already in the markup is the no-JS fallback value. */
DH.register('counters', function initCounters() {
  var stats = document.querySelectorAll('.stat-value[data-count-to]');
  if (!stats.length) return;

  function animate(el) {
    var target = parseFloat(el.getAttribute('data-count-to'));
    var numEl = el.querySelector('.num');
    if (!numEl || DH.reducedMotion || isNaN(target)) return;

    var duration = 1400;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      numEl.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(step);
      else numEl.textContent = target;
    }
    numEl.textContent = '0';
    requestAnimationFrame(step);
  }

  if (!('IntersectionObserver' in window)) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  stats.forEach(function (el) { observer.observe(el); });
});
