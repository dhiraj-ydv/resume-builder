export function parseFrontmatter(text) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: source.trim() };

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const index = line.indexOf(':');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (key) meta[key] = value;
  }
  return { meta, body: match[2].replace(/^\s+/, '') };
}

export function serializeProfileMarkdown(profile) {
  return `---
name: ${String(profile.name || '').trim()}
headline: ${String(profile.headline || '').trim()}
email: ${String(profile.email || '').trim()}
phone: ${String(profile.phone || '').trim()}
location: ${String(profile.location || '').trim()}
website: ${String(profile.website || '').trim()}
linkedin: ${String(profile.linkedin || '').trim()}
github: ${String(profile.github || '').trim()}
---

${String(profile.body || '').trim()}\n`;
}

export function starterProfileMarkdown() {
  return serializeProfileMarkdown({
    name: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    body: 'Add a short bio here if you want it on every resume header page.',
  });
}

export function serializeResumeMarkdown({ title, status, tags, updated, body }) {
  const tagStr = Array.isArray(tags) ? tags.join(', ') : String(tags || '');
  return `---
title: ${String(title || '').trim()}
status: ${status || 'draft'}
tags: ${tagStr}
updated: ${updated || ''}
---

${String(body || '').trim()}\n`;
}

export function starterMarkdown(title) {
  return serializeResumeMarkdown({
    title,
    status: 'draft',
    tags: [],
    updated: '',
    body: `## Summary

Write a short professional summary.

## Skills

- Skill one
- Skill two

## Experience

### Role, Company (2022 – Present)

- What you shipped or changed
- The constraint or scale
- The result

## Projects

### Project name

What it is and why it matters.

## Education

**School** — Degree (Year)
`,
  });
}

export function jsonResumeToMarkdown(resume) {
  const parts = [];
  if (resume.summary) {
    parts.push('## Summary', '', resume.summary.trim(), '');
  }
  const skills = (resume.skills || []).filter((group) => (group.items || []).length);
  if (skills.length) {
    parts.push('## Skills', '');
    for (const group of skills) {
      if (group.name) parts.push(`### ${group.name}`, '');
      for (const item of group.items) parts.push(`- ${item}`);
      parts.push('');
    }
  }
  const experience = resume.experience || [];
  if (experience.length) {
    parts.push('## Experience', '');
    for (const item of experience) {
      const when = [item.start, item.end].filter(Boolean).join(' – ');
      const heading = [item.role, item.company].filter(Boolean).join(', ');
      parts.push(`### ${heading}${when ? ` (${when})` : ''}`, '');
      if (item.location) parts.push(item.location, '');
      for (const bullet of item.bullets || []) parts.push(`- ${bullet}`);
      parts.push('');
    }
  }
  const projects = resume.projects || [];
  if (projects.length) {
    parts.push('## Projects', '');
    for (const item of projects) {
      parts.push(`### ${item.name || 'Project'}`, '');
      if (item.summary) parts.push(item.summary, '');
      if (item.url) parts.push(item.url, '');
      for (const bullet of item.bullets || []) parts.push(`- ${bullet}`);
      parts.push('');
    }
  }
  const education = resume.education || [];
  if (education.length) {
    parts.push('## Education', '');
    for (const item of education) {
      const line = [item.school, item.degree, item.year].filter(Boolean).join(' — ');
      parts.push(`**${line}**`);
      if (item.details) parts.push('', item.details);
      parts.push('');
    }
  }

  return serializeResumeMarkdown({
    title: resume.title,
    status: resume.status,
    tags: resume.tags,
    updated: resume.updated,
    body: parts.join('\n').trim() || '## Summary\n\n',
  });
}

export function excerpt(body) {
  const line = String(body || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item && !item.startsWith('#') && !item.startsWith('- ') && !item.startsWith('* '));
  return line || '';
}
