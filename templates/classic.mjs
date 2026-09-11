function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(url)) return `mailto:${url}`;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(url)) return `https://${url}`;
  return '';
}

function displayUrl(value) {
  return String(value || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function icon(name) {
  const icons = {
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>',
    github: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.32 1.6.59 2.36a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.72-1.16a2 2 0 0 1 2.11-.45c.76.27 1.55.46 2.36.59A2 2 0 0 1 22 16.92z"></path></svg>',
  };
  return icons[name] || icons.web;
}

function contactLink(iconName, href, label) {
  if (!label) return '';
  const url = href ? esc(href) : '';
  const inner = `${icon(iconName)} ${esc(label)}`;
  if (url) return `<a href="${url}" class="contact-link" target="_blank" rel="noreferrer">${inner}</a>`;
  return `<span class="contact-link">${inner}</span>`;
}

export function renderClassic(profile, resume, bodyHtml = '') {
  const name = profile.name.trim() || 'Your name';
  const title = resume.title.trim() || 'Resume title';
  const contacts = [
    contactLink('mail', profile.email ? `mailto:${profile.email}` : '', profile.email),
    contactLink('phone', profile.phone ? `tel:${profile.phone}` : '', profile.phone),
    contactLink('web', safeUrl(profile.website), displayUrl(profile.website) || profile.website),
    contactLink('pin', '', profile.location),
    contactLink('linkedin', safeUrl(profile.linkedin), displayUrl(profile.linkedin) || (profile.linkedin ? 'LinkedIn' : '')),
    contactLink('github', safeUrl(profile.github), displayUrl(profile.github) || (profile.github ? 'GitHub' : '')),
    ...(profile.links || []).map((link) => contactLink('web', safeUrl(link.url), link.label || displayUrl(link.url))),
  ].filter(Boolean);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(name)} · ${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet" />
  <style>${classicCss}</style>
</head>
<body>
  <div class="resume-container">
    <main class="main-content">
      <header>
        <div class="name-title">
          <h1>${esc(name)}</h1>
          <p>${esc(title)}</p>
        </div>
        ${contacts.length ? `<div class="contact-links">${contacts.join('')}</div>` : ''}
      </header>
      <div class="markdown-body">${bodyHtml || '<p class="profile-text">Start writing in Edit mode.</p>'}</div>
    </main>
  </div>
</body>
</html>`;
}

const classicCss = `
:root {
  --bg: #f8fafc;
  --paper: #ffffff;
  --ink: #0f172a;
  --ink-soft: #334155;
  --ink-muted: #64748b;
  --line: #cbd5e1;
  --line-soft: #f1f5f9;
  --primary: #4f46e5;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: Inter, system-ui, sans-serif;
  background: radial-gradient(circle at top, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%);
  color: var(--ink);
  line-height: 1.45;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
h1, h2, h3, h4 { font-family: Outfit, Inter, sans-serif; letter-spacing: -0.02em; }
.resume-container {
  max-width: 960px;
  margin: 24px auto;
  background: var(--paper);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.02);
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid var(--line);
}
.main-content { padding: 32px 40px; }
header { margin-bottom: 16px; }
.name-title h1 { font-size: 2.3rem; line-height: 1; margin-bottom: 4px; font-weight: 800; }
.name-title p { font-size: 1rem; color: var(--primary); font-weight: 600; }
.contact-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 12px;
  padding: 6px 0;
  border-top: 1px solid var(--line-soft);
  border-bottom: 1px solid var(--line-soft);
}
.contact-link {
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: var(--ink-soft);
  font-size: 0.8rem;
  font-weight: 500;
}
.contact-link svg { width: 14px; height: 14px; flex-shrink: 0; }
.section { margin-bottom: 18px; }
.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.section-title::after {
  content: '';
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, #cbd5e1, transparent);
}
.profile-text { color: var(--ink-soft); font-size: 0.85rem; line-height: 1.5; }
.markdown-body { color: var(--ink-soft); font-size: 0.88rem; }
.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  color: var(--ink);
  margin: 1.1em 0 0.45em;
}
.markdown-body h2 {
  font-size: 1.05rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 12px;
}
.markdown-body h2::after {
  content: '';
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, #cbd5e1, transparent);
}
.markdown-body h3 { font-size: 0.95rem; }
.markdown-body p, .markdown-body ul, .markdown-body ol { margin: 0 0 0.7em; }
.markdown-body ul, .markdown-body ol { padding-left: 1.2em; }
.markdown-body a { color: var(--primary); }
.markdown-body strong { color: var(--ink); }
@media print {
  @page { size: A4; margin: 5mm 8mm; }
  body { background: white; margin: 0; font-size: 11pt; line-height: 1.3; }
  .resume-container { margin: 0; box-shadow: none; max-width: none; border-radius: 0; border: 0; }
  .main-content { padding: 0; }
  .section { page-break-inside: avoid; break-inside: avoid; }
}
@media (max-width: 768px) {
  .resume-container { margin: 16px; }
  .main-content { padding: 24px 20px; }
  .skills-grid, .projects-grid { grid-template-columns: 1fr; }
  .name-title h1, .name-title p { text-align: center; }
}
`;
