import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { renderClassic } from '../templates/classic.mjs';

marked.setOptions({ gfm: true, breaks: true });

export function renderResume(profile, resume) {
  const rendered = marked.parse(resume.body || '', { async: false });
  const bodyHtml = sanitizeHtml(String(rendered), {
    allowedTags: [
      'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4',
      'h5', 'h6', 'hr', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody',
      'td', 'th', 'thead', 'tr', 'ul',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      code: ['class'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: 'a',
        attribs: { ...attributes, target: '_blank', rel: 'noopener noreferrer' },
      }),
    },
  });
  return renderClassic(profile, resume, String(bodyHtml));
}
