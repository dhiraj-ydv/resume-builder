import { renderClassic } from '../templates/classic.mjs';

export function renderResume(profile, resume) {
  const template = resume.template || 'classic';
  if (template === 'classic') return renderClassic(profile, resume);
  return renderClassic(profile, resume);
}
