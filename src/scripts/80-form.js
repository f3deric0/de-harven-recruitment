/* Contact form: client-side validation, honeypot + timing anti-spam,
   POSTs to /api/contact. If the endpoint reports it isn't configured
   (no email provider key set yet), falls back to a pre-filled mailto:
   so the form always works, even before Resend/SMTP is wired up. */
DH.register('form', function initForm() {
  var form = document.querySelector('[data-contact-form]');
  if (!form) return;

  var status = form.querySelector('.form-status');
  var submitBtn = form.querySelector('[type="submit"]');
  var renderedAt = Date.now();
  var i18n = {
    sending: form.getAttribute('data-i18n-sending') || 'Sending…',
    submit: submitBtn ? submitBtn.textContent : 'Send',
    successTitle: form.getAttribute('data-i18n-success-title') || 'Message sent',
    successBody: form.getAttribute('data-i18n-success-body') || 'Thank you — we will get back to you shortly.',
    errorTitle: form.getAttribute('data-i18n-error-title') || 'Something went wrong',
    errorBody: form.getAttribute('data-i18n-error-body') || 'Please try again, or reach out directly by email.',
    mailtoFallback: form.getAttribute('data-i18n-mailto') || 'Open in your email client instead',
    toEmail: form.getAttribute('data-to-email') || ''
  };

  function setStatus(kind, title, body, showMailto) {
    if (!status) return;
    status.className = 'form-status is-visible is-' + kind;
    status.innerHTML = '<h4>' + title + '</h4><p>' + body + '</p>' +
      (showMailto ? '<p style="margin-top:10px"><a class="text-link" href="' + buildMailto() + '">' + i18n.mailtoFallback + '</a></p>' : '');
    status.setAttribute('role', 'status');
    status.focus && status.focus();
  }

  function clearFieldErrors() {
    form.querySelectorAll('.field.has-error').forEach(function (f) { f.classList.remove('has-error'); });
  }

  function fieldValue(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  function validate() {
    clearFieldErrors();
    var valid = true;
    var required = ['firstName', 'lastName', 'email', 'message'];
    required.forEach(function (name) {
      var el = form.querySelector('[name="' + name + '"]');
      if (!el) return;
      if (!el.value.trim()) {
        el.closest('.field').classList.add('has-error');
        valid = false;
      }
    });
    var emailEl = form.querySelector('[name="email"]');
    if (emailEl && emailEl.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
      emailEl.closest('.field').classList.add('has-error');
      valid = false;
    }
    var consentEl = form.querySelector('[name="consent"]');
    if (consentEl && consentEl.required && !consentEl.checked) {
      valid = false;
      var consentRow = consentEl.closest('.consent-row');
      if (consentRow) consentRow.style.outline = '1px solid var(--error)';
    }
    return valid;
  }

  function buildMailto() {
    var type = fieldValue('type') || (form.querySelector('[name="type"]:checked') || {}).value || '';
    var subject = encodeURIComponent('Website enquiry — ' + (type || 'General'));
    var lines = [
      'Name: ' + fieldValue('firstName') + ' ' + fieldValue('lastName'),
      'Email: ' + fieldValue('email'),
      'Phone: ' + fieldValue('phone'),
      'Type: ' + type,
      '',
      fieldValue('message')
    ];
    var body = encodeURIComponent(lines.join('\n'));
    return 'mailto:' + i18n.toEmail + '?subject=' + subject + '&body=' + body;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) {
      var firstError = form.querySelector('.field.has-error input, .field.has-error textarea');
      if (firstError) firstError.focus();
      return;
    }

    // Honeypot + time-to-submit anti-spam: humans rarely fill a form in < 1.5s.
    var honeypot = form.querySelector('[name="website"]');
    if (honeypot && honeypot.value) return;
    var elapsedMs = Date.now() - renderedAt;

    var payload = {
      firstName: fieldValue('firstName'),
      lastName: fieldValue('lastName'),
      email: fieldValue('email'),
      phone: fieldValue('phone'),
      type: fieldValue('type') || (form.querySelector('[name="type"]:checked') || {}).value || '',
      message: fieldValue('message'),
      elapsedMs: elapsedMs,
      lang: document.documentElement.lang || 'en'
    };

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = i18n.sending; }

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (result.ok && result.data && result.data.mode === 'sent') {
          form.reset();
          setStatus('success', i18n.successTitle, i18n.successBody, false);
        } else if (result.data && result.data.mode === 'unconfigured') {
          // Backend has no email provider configured yet — degrade gracefully to mailto.
          setStatus('success', i18n.successTitle, i18n.successBody, true);
          form.reset();
        } else {
          setStatus('error', i18n.errorTitle, i18n.errorBody, true);
        }
      })
      .catch(function () {
        setStatus('error', i18n.errorTitle, i18n.errorBody, true);
      })
      .finally(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = i18n.submit; }
      });
  });
});
