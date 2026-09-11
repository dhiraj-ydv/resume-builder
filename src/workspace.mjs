import { mkdir, readFile, readdir, rm, writeFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { constants as fsConstants } from 'node:fs';

export const SCHEMA_VERSION = 1;
export const WORKSPACE_FILE = 'resume-builder.json';
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class WorkspaceError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'WorkspaceError';
    this.status = status;
  }
}

export function emptyProfile() {
  return {
    name: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    links: [],
  };
}

export function emptyResume(slug, title = '') {
  return {
    slug,
    title: title || slug,
    status: 'draft',
    updated: monthStamp(),
    summary: '',
    tags: [],
    template: 'classic',
    skills: [{ name: 'Core skills', items: [] }],
    experience: [],
    projects: [],
    education: [],
  };
}

export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function monthStamp(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function assertSlug(slug) {
  if (!slug || !SLUG_PATTERN.test(slug)) {
    throw new WorkspaceError(`Invalid resume slug: ${slug || '(empty)'}`);
  }
}

export async function findWorkspace(startDir) {
  const dir = path.resolve(startDir || process.cwd());
  const marker = path.join(dir, WORKSPACE_FILE);
  try {
    await access(marker, fsConstants.R_OK);
  } catch {
    throw new WorkspaceError(
      `No resume workspace found in ${dir}. Run \`resume-builder init\` first.`,
      400,
    );
  }
  const markerPayload = JSON.parse(await readFile(marker, 'utf8'));
  return { root: dir, marker: markerPayload };
}

export async function initWorkspace(targetDir) {
  const root = path.resolve(targetDir || process.cwd());
  await mkdir(root, { recursive: true });
  await mkdir(path.join(root, 'resumes'), { recursive: true });
  await mkdir(path.join(root, 'dist'), { recursive: true });

  const markerPath = path.join(root, WORKSPACE_FILE);
  const profilePath = path.join(root, 'profile.json');
  const readmePath = path.join(root, 'README.md');
  const gitignorePath = path.join(root, '.gitignore');

  const alreadyWorkspace = await exists(markerPath);
  if (!alreadyWorkspace) {
    await writeJson(markerPath, {
      schemaVersion: SCHEMA_VERSION,
      created: new Date().toISOString(),
    });
  }

  if (!(await exists(profilePath))) {
    await writeJson(profilePath, emptyProfile());
  }

  if (!(await exists(readmePath))) {
    await writeFile(readmePath, dataRepoReadme(), 'utf8');
  }

  if (!(await exists(gitignorePath))) {
    await writeFile(gitignorePath, '*.log\n.DS_Store\nThumbs.db\n', 'utf8');
  }

  if (!(await exists(path.join(root, '.git')))) {
    const git = spawnSync('git', ['init'], { cwd: root, encoding: 'utf8' });
    if (git.status !== 0) {
      console.warn('Workspace created, but git init failed. You can run git init yourself.');
    }
  }

  return findWorkspace(root);
}

export async function loadProfile(root) {
  const file = path.join(root, 'profile.json');
  if (!(await exists(file))) return emptyProfile();
  return normalizeProfile(JSON.parse(await readFile(file, 'utf8')));
}

export async function saveProfile(root, profile) {
  const next = normalizeProfile(profile);
  await writeJson(path.join(root, 'profile.json'), next);
  return next;
}

export async function listResumes(root) {
  const resumesDir = path.join(root, 'resumes');
  await mkdir(resumesDir, { recursive: true });
  const entries = await readdir(resumesDir, { withFileTypes: true });
  const resumes = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const resume = await loadResume(root, entry.name);
      resumes.push(summarizeResume(resume));
    } catch {
      // skip malformed folders
    }
  }

  resumes.sort((a, b) => (b.updated || '').localeCompare(a.updated || '') || a.title.localeCompare(b.title));
  return resumes;
}

export async function loadResume(root, slug) {
  assertSlug(slug);
  const file = resumeFile(root, slug);
  if (!(await exists(file))) {
    throw new WorkspaceError(`Resume not found: ${slug}`, 404);
  }
  const payload = JSON.parse(await readFile(file, 'utf8'));
  return normalizeResume(payload, slug);
}

export async function createResume(root, input) {
  const title = String(input?.title || '').trim();
  if (!title) throw new WorkspaceError('A resume title is required.');
  const slug = slugify(input.slug || title);
  assertSlug(slug);

  const file = resumeFile(root, slug);
  if (await exists(file)) {
    throw new WorkspaceError(`A resume with slug "${slug}" already exists.`, 409);
  }

  const resume = emptyResume(slug, title);
  await mkdir(path.dirname(file), { recursive: true });
  await writeJson(file, resume);
  return resume;
}

export async function saveResume(root, slug, input) {
  assertSlug(slug);
  const current = await loadResume(root, slug);
  const next = normalizeResume({ ...current, ...input, slug, updated: monthStamp() }, slug);
  await writeJson(resumeFile(root, slug), next);
  return next;
}

export async function deleteResume(root, slug) {
  assertSlug(slug);
  const dir = path.join(root, 'resumes', slug);
  if (!(await exists(dir))) {
    throw new WorkspaceError(`Resume not found: ${slug}`, 404);
  }
  await rm(dir, { recursive: true, force: true });
  const centralPdf = path.join(root, 'dist', `${slug}.pdf`);
  if (await exists(centralPdf)) {
    await rm(centralPdf, { force: true });
  }
}

function resumeFile(root, slug) {
  return path.join(root, 'resumes', slug, 'resume.json');
}

function summarizeResume(resume) {
  return {
    slug: resume.slug,
    title: resume.title,
    status: resume.status,
    updated: resume.updated,
    summary: resume.summary,
    tags: resume.tags,
    template: resume.template,
  };
}

function normalizeProfile(input = {}) {
  const profile = emptyProfile();
  profile.name = String(input.name || '');
  profile.headline = String(input.headline || '');
  profile.email = String(input.email || '');
  profile.phone = String(input.phone || '');
  profile.location = String(input.location || '');
  profile.website = String(input.website || '');
  profile.linkedin = String(input.linkedin || '');
  profile.github = String(input.github || '');
  profile.links = Array.isArray(input.links)
    ? input.links
        .map((link) => ({
          label: String(link?.label || '').trim(),
          url: String(link?.url || '').trim(),
        }))
        .filter((link) => link.label || link.url)
    : [];
  return profile;
}

function normalizeResume(input = {}, slug) {
  const resume = emptyResume(slug, input.title);
  resume.title = String(input.title || slug);
  resume.status = ['draft', 'active', 'archived'].includes(input.status) ? input.status : 'draft';
  resume.updated = String(input.updated || monthStamp());
  resume.summary = String(input.summary || '');
  resume.tags = asStringArray(input.tags);
  resume.template = input.template === 'classic' ? 'classic' : 'classic';
  resume.skills = Array.isArray(input.skills)
    ? input.skills.map((group) => ({
        name: String(group?.name || 'Skills'),
        items: asStringArray(group?.items),
      }))
    : resume.skills;
  resume.experience = Array.isArray(input.experience)
    ? input.experience.map((item) => ({
        company: String(item?.company || ''),
        role: String(item?.role || ''),
        location: String(item?.location || ''),
        start: String(item?.start || ''),
        end: String(item?.end || ''),
        bullets: asStringArray(item?.bullets),
      }))
    : [];
  resume.projects = Array.isArray(input.projects)
    ? input.projects.map((item) => ({
        name: String(item?.name || ''),
        url: String(item?.url || ''),
        summary: String(item?.summary || ''),
        bullets: asStringArray(item?.bullets),
      }))
    : [];
  resume.education = Array.isArray(input.education)
    ? input.education.map((item) => ({
        school: String(item?.school || ''),
        degree: String(item?.degree || ''),
        year: String(item?.year || ''),
        details: String(item?.details || ''),
      }))
    : [];
  return resume;
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function dataRepoReadme() {
  return `# Resume workspace

This folder is **your resume data**, not the Resume Builder app.

- \`profile.json\` — shared name, contact details, and links
- \`resumes/<slug>/resume.json\` — each role-specific resume
- Generated PDFs land in \`resumes/<slug>/dist/resume.pdf\` and \`dist/<slug>.pdf\`

Edit everything in the local web UI:

\`\`\`bash
resume-builder
\`\`\`

Keep this directory in its own git repo so your content stays separate from the app.
`;
}
