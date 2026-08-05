/* Footer newsletter sign-up — posts to the same /api/contact endpoint,
   tagged as kind:"newsletter" so it only ever notifies Pierre, never
   auto-replies to the subscriber (see api/contact.js). */
DH.register('newsletter', function initNewsletter() {
  var forms = document.querySelectorAll('[data-newsletter-form]');
  if (!forms.length) return;

  forms.forEach(function (form) {
    var button = form.querySelector('button[type="submit"]');
    var defaultLabel = button ? button.textContent : '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailInput = form.querySelector('input[type="email"]');
      var consentInput = form.parentElement.querySelector('input[name="consent"]') ||
        document.querySelector('.newsletter-consent input[name="consent"]');
      var email = emailInput ? emailInput.value.trim() : '';

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (emailInput) emailInput.focus();
        return;
      }
      if (consentInput && consentInput.required && !consentInput.checked) {
        consentInput.focus();
        return;
      }

      if (button) { button.disabled = true; button.textContent = '…'; }

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'newsletter', email: email, elapsedMs: 2000 })
      })
        .then(function (r) { return r.json(); })
        .then(function () {
          if (emailInput) emailInput.value = '';
          if (button) button.textContent = '✓';
        })
        .catch(function () {
          if (button) button.textContent = defaultLabel;
        })
        .finally(function () {
          if (button) {
            setTimeout(function () {
              button.disabled = false;
              button.textContent = defaultLabel;
            }, 2500);
          }
        });
    });
  });
});
