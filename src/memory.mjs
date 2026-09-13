import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { atomicWriteFile } from './atomic-write.mjs';

export async function loadMemory(root) {
  const file = memoryFile(root);
  try {
    const markdown = await readFile(file, 'utf8');
    return { markdown };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { markdown: starterMemory() };
  }
}

export async function saveMemory(root, input) {
  const markdown = typeof input?.markdown === 'string' ? input.markdown : starterMemory();
  await mkdir(root, { recursive: true });
  await atomicWriteFile(memoryFile(root), markdown, 'utf8');
  return { markdown };
}

export async function appendMemory(root, note) {
  const current = await loadMemory(root);
  const stamp = new Date().toISOString().slice(0, 10);
  const next = `${current.markdown.trim()}\n\n## ${stamp}\n\n${String(note || '').trim()}\n`;
  return saveMemory(root, { markdown: next });
}

export function searchMemory(markdown, query) {
  const text = String(markdown || '');
  const q = String(query || '').trim().toLowerCase();
  if (!q) return text.slice(0, 4000);
  const chunks = text.split(/\n(?=## )/);
  const hits = chunks.filter((chunk) => chunk.toLowerCase().includes(q));
  return (hits.length ? hits.join('\n') : text).slice(0, 4000);
}

function memoryFile(root) {
  return path.join(root, 'memory.md');
}

function starterMemory() {
  return `# Memory

Durable facts the resume agent should remember. Prefer verified career facts, preferences, and constraints.

## Preferences

- Tone:
- Roles I am targeting:

## Facts

- 
`;
}
