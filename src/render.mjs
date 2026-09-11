import { marked } from 'marked';
import { renderClassic } from '../templates/classic.mjs';

marked.setOptions({ gfm: true, breaks: true });

export function renderResume(profile, resume) {
  const bodyHtml = marked.parse(resume.body || '', { async: false });
  return renderClassic(profile, resume, String(bodyHtml));
}
