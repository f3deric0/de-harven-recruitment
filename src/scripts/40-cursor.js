/* Custom cursor — fine pointers only, purely decorative, never intercepts input. */
DH.register('cursor', function initCursor() {
  if (DH.reducedMotion) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var dot = document.createElement('div');
  var ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(dot, ring);

  var ringX = 0, ringY = 0, mouseX = 0, mouseY = 0;

  window.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = 'translate(' + mouseX + 'px,' + mouseY + 'px) translate(-50%,-50%)';
  });

  function loop() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.transform = 'translate(' + ringX + 'px,' + ringY + 'px) translate(-50%,-50%)';
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  var targets = 'a, button, .btn, input, textarea, [role="button"]';
  document.addEventListener('mouseover', function (e) {
    if (e.target.closest(targets)) ring.classList.add('is-active');
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest(targets)) ring.classList.remove('is-active');
  });
});
