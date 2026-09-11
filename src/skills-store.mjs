import { mkdir, readFile, readdir, rm, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './markdown.mjs';
import { slugify, WorkspaceError } from './workspace.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const builtinRoot = path.join(appRoot, 'skills');

export async function listSkills(workspaceRoot, { includeDisabled = true } = {}) {
  const disabled = await loadDisabled(workspaceRoot);
  const builtin = await readSkillDir(builtinRoot, 'builtin');
  const user = await readSkillDir(path.join(workspaceRoot, 'skills'), 'user');
  const bySlug = new Map();
  for (const skill of builtin) bySlug.set(skill.slug, skill);
  for (const skill of user) bySlug.set(skill.slug, skill);
  const skills = [...bySlug.values()]
    .map((skill) => ({ ...skill, enabled: !disabled.has(skill.slug) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (includeDisabled) return skills;
  return skills.filter((skill) => skill.enabled);
}

export async function loadSkill(workspaceRoot, slug) {
  const disabled = await loadDisabled(workspaceRoot);
  const userFile = path.join(workspaceRoot, 'skills', slug, 'SKILL.md');
  if (await exists(userFile)) {
    return { ...await parseSkillFile(userFile, slug, 'user'), enabled: !disabled.has(slug) };
  }
  const builtinFile = path.join(builtinRoot, slug, 'SKILL.md');
  if (await exists(builtinFile)) {
    return { ...await parseSkillFile(builtinFile, slug, 'builtin'), enabled: !disabled.has(slug) };
  }
  throw new WorkspaceError(`Skill not found: ${slug}`, 404);
}

export async function setSkillEnabled(workspaceRoot, slug, enabled) {
  await loadSkill(workspaceRoot, slug);
  const disabled = await loadDisabled(workspaceRoot);
  if (enabled) disabled.delete(slug);
  else disabled.add(slug);
  await saveDisabled(workspaceRoot, disabled);
  return loadSkill(workspaceRoot, slug);
}

export async function createSkill(workspaceRoot, input) {
  const name = String(input?.name || '').trim();
  if (!name) throw new WorkspaceError('A skill name is required.');
  const slug = slugify(input.slug || name);
  if (!slug) throw new WorkspaceError('Invalid skill name.');
  const builtinFile = path.join(builtinRoot, slug, 'SKILL.md');
  if (await exists(builtinFile)) {
    throw new WorkspaceError(`"${slug}" is a built-in skill. Choose another name.`, 409);
  }
  const file = path.join(workspaceRoot, 'skills', slug, 'SKILL.md');
  if (await exists(file)) throw new WorkspaceError(`Skill already exists: ${slug}`, 409);
  const markdown = String(input.markdown || '').trim() || starterSkill(name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, markdown, 'utf8');
  return parseSkillFile(file, slug, 'user');
}

export async function saveSkill(workspaceRoot, slug, input) {
  const current = await loadSkill(workspaceRoot, slug);
  if (current.source === 'builtin') {
    throw new WorkspaceError('Built-in skills cannot be edited. Duplicate it as a custom skill.', 403);
  }
  const markdown = String(input?.markdown || '').trim();
  if (!markdown) throw new WorkspaceError('Skill Markdown is required.');
  const file = path.join(workspaceRoot, 'skills', slug, 'SKILL.md');
  await writeFile(file, markdown, 'utf8');
  return parseSkillFile(file, slug, 'user');
}

export async function deleteSkill(workspaceRoot, slug) {
  const current = await loadSkill(workspaceRoot, slug);
  if (current.source === 'builtin') {
    throw new WorkspaceError('Built-in skills cannot be deleted.', 403);
  }
  await rm(path.join(workspaceRoot, 'skills', slug), { recursive: true, force: true });
}

async function readSkillDir(dir, source) {
  try {
    await access(dir);
  } catch {
    return [];
  }
  const entries = await readdir(dir, { withFileTypes: true });
  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      skills.push(await parseSkillFile(path.join(dir, entry.name, 'SKILL.md'), entry.name, source));
    } catch {
      // skip
    }
  }
  return skills;
}

async function parseSkillFile(file, slug, source) {
  const markdown = await readFile(file, 'utf8');
  const { meta, body } = parseFrontmatter(markdown);
  const heading = body.match(/^#\s+(.+)$/m);
  const paragraph = body.split(/\n\n+/).map((block) => block.trim()).find((block) => block && !block.startsWith('#'));
  return {
    slug,
    source,
    name: meta.name || heading?.[1] || slug,
    description: meta.description || (paragraph ? paragraph.replace(/\n/g, ' ').slice(0, 180) : ''),
    markdown,
    body,
  };
}

function starterSkill(name) {
  return `---
name: ${name}
description: Describe when the agent should use this skill.
---

# ${name}

Instructions for the resume agent. Be specific about process, tone, and what not to invent.
`;
}

function disabledFile(workspaceRoot) {
  return path.join(workspaceRoot, 'skills', 'disabled.json');
}

async function loadDisabled(workspaceRoot) {
  try {
    const payload = JSON.parse(await readFile(disabledFile(workspaceRoot), 'utf8'));
    const list = Array.isArray(payload) ? payload : payload.disabled;
    return new Set((list || []).map(String));
  } catch {
    return new Set();
  }
}

async function saveDisabled(workspaceRoot, disabled) {
  const file = disabledFile(workspaceRoot);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify({ disabled: [...disabled].sort() }, null, 2)}\n`, 'utf8');
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
