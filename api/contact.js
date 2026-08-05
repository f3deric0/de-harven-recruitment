/**
 * Vercel serverless function backing the contact form and the footer
 * newsletter sign-up. Requires no configuration to "work": with no email
 * provider key set it reports { mode: 'unconfigured' } and the frontend
 * (src/scripts/80-form.js) gracefully falls back to a pre-filled mailto:.
 *
 * To send real email, set these Vercel project environment variables:
 *   RESEND_API_KEY   — API key from https://resend.com (free tier is enough)
 *   CONTACT_TO_EMAIL — defaults to deharvenpierre@gmail.com if unset
 *   RESEND_FROM      — defaults to Resend's shared sandbox sender, which
 *                       works immediately with no domain verification;
 *                       replace once a sending domain is verified.
 * See docs/README-DEPLOY.md for the full walkthrough.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = { name: 120, email: 200, phone: 40, message: 4000, type: 60 };

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendViaResend({ apiKey, from, to, replyTo, subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, text, html })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ mode: 'error', error: 'Method not allowed' });
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { payload = {}; }
  }
  payload = payload || {};

  const isNewsletter = payload.kind === 'newsletter';

  const email = clean(payload.email, MAX_LEN.email);
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ mode: 'error', error: 'A valid email is required.' });
  }

  // Basic bot resistance: a honeypot field filled in, or a form submitted
  // implausibly fast, both indicate an automated submission.
  if (payload.website) {
    return res.status(200).json({ mode: 'sent' }); // silently pretend success to the bot
  }
  if (typeof payload.elapsedMs === 'number' && payload.elapsedMs < 1200 && payload.elapsedMs > 0) {
    return res.status(200).json({ mode: 'sent' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL || 'deharvenpierre@gmail.com';
  const fromEmail = process.env.RESEND_FROM || 'de Harven Recruitment <onboarding@resend.dev>';

  if (!apiKey) {
    // No email provider configured yet — the frontend will fall back to mailto.
    return res.status(200).json({ mode: 'unconfigured' });
  }

  try {
    if (isNewsletter) {
      await sendViaResend({
        apiKey,
        from: fromEmail,
        to: toEmail,
        replyTo: email,
        subject: 'New newsletter subscriber — de Harven Recruitment',
        text: `New newsletter subscriber: ${email}`,
        html: `<p>New newsletter subscriber: <strong>${escapeHtml(email)}</strong></p>`
      });
      return res.status(200).json({ mode: 'sent' });
    }

    const firstName = clean(payload.firstName, MAX_LEN.name);
    const lastName = clean(payload.lastName, MAX_LEN.name);
    const phone = clean(payload.phone, MAX_LEN.phone);
    const type = clean(payload.type, MAX_LEN.type) || 'Not specified';
    const message = clean(payload.message, MAX_LEN.message);

    if (!firstName || !lastName || !message) {
      return res.status(400).json({ mode: 'error', error: 'Missing required fields.' });
    }

    const fullName = `${firstName} ${lastName}`.trim();

    await sendViaResend({
      apiKey,
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      subject: `Website enquiry — ${type} — ${fullName}`,
      text: [
        `Name: ${fullName}`,
        `Email: ${email}`,
        `Phone: ${phone || '—'}`,
        `Type: ${type}`,
        '',
        message
      ].join('\n'),
      html: `
        <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone || '—')}</p>
        <p><strong>Type:</strong> ${escapeHtml(type)}</p>
        <p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      `
    });

    // Best-effort confirmation to the person who wrote in. Failure here
    // must not fail the whole request — the enquiry has already landed.
    try {
      await sendViaResend({
        apiKey,
        from: fromEmail,
        to: email,
        replyTo: toEmail,
        subject: 'We received your message — de Harven Recruitment',
        text: `Hi ${firstName},\n\nThank you for reaching out to de Harven Recruitment. Pierre will get back to you shortly.\n\nBest,\nde Harven Recruitment`,
        html: `<p>Hi ${escapeHtml(firstName)},</p><p>Thank you for reaching out to de Harven Recruitment. Pierre will get back to you shortly.</p><p>Best,<br>de Harven Recruitment</p>`
      });
    } catch (confirmErr) {
      console.error('[contact] confirmation email failed:', confirmErr);
    }

    return res.status(200).json({ mode: 'sent' });
  } catch (err) {
    console.error('[contact] send failed:', err);
    return res.status(500).json({ mode: 'error', error: 'Failed to send. Please try again.' });
  }
}
