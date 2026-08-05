/* Hero: mask-line reveal on load + subtle parallax on the background mark. */
DH.register('hero', function initHero() {
  var hero = document.querySelector('.hero');
  if (!hero) return;

  requestAnimationFrame(function () {
    hero.classList.add('is-ready');
  });

  if (DH.reducedMotion) return;

  var mark = hero.querySelector('.hero-bg-mark');
  if (!mark || window.matchMedia('(hover: none)').matches) return;

  var raf = null;
  hero.addEventListener('mousemove', function (e) {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      var rect = hero.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      mark.style.transform =
        'translateY(calc(-50% + ' + (y * -14) + 'px)) translateX(' + (x * -14) + 'px)';
      raf = null;
    });
  });
});
