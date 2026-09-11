import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WorkspaceError,
  loadProfile,
  saveProfile,
  listResumes,
  loadResume,
  createResume,
  saveResume,
  deleteResume,
  SCHEMA_VERSION,
  findWorkspace,
  initWorkspace,
} from './workspace.mjs';
import { loadUserConfig, rememberVault } from './user-config.mjs';
import { renderResume } from './render.mjs';
import { pdfPaths, writeResumePdf } from './pdf.mjs';
import { listSkills, loadSkill, createSkill, saveSkill, deleteSkill, setSkillEnabled } from './skills-store.mjs';
import { loadMemory, saveMemory } from './memory.mjs';
import { handleMcpRequest, mcpSnippet } from './mcp.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(appRoot, 'web');

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.woff2', 'font/woff2'],
]);

export function startServer({ workspaceRoot, port }) {
  const state = { workspaceRoot };
  const server = http.createServer((req, res) => {
    handle(req, res, state, port).catch((error) => {
      sendError(res, error);
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({
        server,
        url: `http://127.0.0.1:${port}/`,
        mcpUrl: `http://127.0.0.1:${port}/mcp`,
      });
    });
  });
}

async function handle(req, res, state, port) {
  const workspaceRoot = state.workspaceRoot;
  const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
  const method = req.method || 'GET';
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === '/api/health' && method === 'GET') {
    return sendJson(res, { ok: true, workspace: workspaceRoot });
  }

  if (pathname === '/api/workspace' && method === 'GET') {
    const config = await loadUserConfig();
    return sendJson(res, {
      root: workspaceRoot,
      name: path.basename(workspaceRoot),
      schemaVersion: SCHEMA_VERSION,
      defaultVault: config.defaultVault || workspaceRoot,
      recentVaults: config.recentVaults || [],
    });
  }

  if (pathname === '/api/workspace' && method === 'PUT') {
    const body = await readJson(req);
    const target = String(body.root || '').trim();
    if (!target) throw new WorkspaceError('A vault path is required.');
    const workspace = body.init
      ? await initWorkspace(target)
      : await findWorkspace(target);
    state.workspaceRoot = workspace.root;
    const config = await rememberVault(workspace.root, { setDefault: body.setDefault !== false });
    return sendJson(res, {
      root: workspace.root,
      name: path.basename(workspace.root),
      schemaVersion: SCHEMA_VERSION,
      defaultVault: config.defaultVault,
      recentVaults: config.recentVaults,
    });
  }

  if (pathname === '/api/profile' && method === 'GET') {
    return sendJson(res, await loadProfile(workspaceRoot));
  }

  if (pathname === '/api/profile' && method === 'PUT') {
    const body = await readJson(req);
    return sendJson(res, await saveProfile(workspaceRoot, body));
  }

  if (pathname === '/api/mcp' && method === 'GET') {
    return sendJson(res, mcpSnippet(`http://127.0.0.1:${port}/mcp`));
  }

  if (pathname === '/mcp' && method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type, mcp-session-id, mcp-protocol-version',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    });
    res.end();
    return;
  }

  if (pathname === '/mcp') {
    const body = method === 'POST' ? await readJson(req) : undefined;
    return handleMcpRequest(req, res, body, workspaceRoot);
  }

  if (pathname === '/api/memory' && method === 'GET') {
    return sendJson(res, await loadMemory(workspaceRoot));
  }

  if (pathname === '/api/memory' && method === 'PUT') {
    const body = await readJson(req);
    return sendJson(res, await saveMemory(workspaceRoot, body));
  }

  if (pathname === '/api/skills' && method === 'GET') {
    return sendJson(res, { skills: await listSkills(workspaceRoot) });
  }

  if (pathname === '/api/skills' && method === 'POST') {
    const body = await readJson(req);
    res.statusCode = 201;
    return sendJson(res, await createSkill(workspaceRoot, body));
  }

  const skillEnabledMatch = pathname.match(/^\/api\/skills\/([^/]+)\/enabled$/);
  if (skillEnabledMatch && method === 'PUT') {
    const slug = decodeURIComponent(skillEnabledMatch[1]);
    const body = await readJson(req);
    return sendJson(res, await setSkillEnabled(workspaceRoot, slug, body.enabled !== false));
  }

  const skillMatch = pathname.match(/^\/api\/skills\/([^/]+)$/);
  if (skillMatch) {
    const slug = decodeURIComponent(skillMatch[1]);
    if (method === 'GET') return sendJson(res, await loadSkill(workspaceRoot, slug));
    if (method === 'PUT') {
      const body = await readJson(req);
      return sendJson(res, await saveSkill(workspaceRoot, slug, body));
    }
    if (method === 'DELETE') {
      await deleteSkill(workspaceRoot, slug);
      res.statusCode = 204;
      res.end();
      return;
    }
  }

  if (pathname === '/api/resumes' && method === 'GET') {
    return sendJson(res, { resumes: await listResumes(workspaceRoot) });
  }

  if (pathname === '/api/resumes' && method === 'POST') {
    const body = await readJson(req);
    res.statusCode = 201;
    return sendJson(res, await createResume(workspaceRoot, body));
  }

  const resumeMatch = pathname.match(/^\/api\/resumes\/([^/]+)(?:\/(pdf))?$/);
  if (resumeMatch) {
    const slug = decodeURIComponent(resumeMatch[1]);
    const pdf = resumeMatch[2] === 'pdf';

    if (pdf && method === 'POST') {
      const profile = await loadProfile(workspaceRoot);
      const resume = await loadResume(workspaceRoot, slug);
      const html = renderResume(profile, resume);
      const outFile = await writeResumePdf(workspaceRoot, slug, html);
      return sendJson(res, { ok: true, path: outFile });
    }

    if (pdf && method === 'GET') {
      const file = pdfPaths(workspaceRoot, slug).resumePdf;
      return sendFile(res, file, { downloadName: `${slug}.pdf` });
    }

    if (method === 'GET') return sendJson(res, await loadResume(workspaceRoot, slug));
    if (method === 'PUT') {
      const body = await readJson(req);
      return sendJson(res, await saveResume(workspaceRoot, slug, body));
    }
    if (method === 'DELETE') {
      await deleteResume(workspaceRoot, slug);
      res.statusCode = 204;
      res.end();
      return;
    }
  }

  const previewMatch = pathname.match(/^\/preview\/([^/]+)\/?$/);
  if (previewMatch && method === 'GET') {
    const slug = decodeURIComponent(previewMatch[1]);
    const profile = await loadProfile(workspaceRoot);
    const resume = await loadResume(workspaceRoot, slug);
    return sendHtml(res, renderResume(profile, resume));
  }

  if (method === 'GET') {
    return sendStatic(res, pathname);
  }

  throw new WorkspaceError('Not found', 404);
}

async function sendStatic(res, pathname) {
  let requestPath = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.resolve(webDir, `.${requestPath}`);
  if (!resolved.startsWith(webDir)) {
    throw new WorkspaceError('Forbidden', 403);
  }

  try {
    const fileStat = await stat(resolved);
    const filePath = fileStat.isDirectory() ? path.join(resolved, 'index.html') : resolved;
    const contents = await readFile(filePath);
    const type = mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(contents);
  } catch {
    const index = await readFile(path.join(webDir, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(index);
  }
}

async function sendFile(res, filePath, { downloadName } = {}) {
  try {
    const contents = await readFile(filePath);
    const headers = {
      'Content-Type': 'application/pdf',
    };
    if (downloadName) {
      headers['Content-Disposition'] = `attachment; filename="${downloadName}"`;
    }
    res.writeHead(200, headers);
    res.end(contents);
  } catch {
    throw new WorkspaceError('PDF not generated yet. Export it first.', 404);
  }
}

function sendJson(res, payload) {
  res.writeHead(res.statusCode || 200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function sendError(res, error) {
  const status = error instanceof WorkspaceError ? error.status : 500;
  const message = error instanceof WorkspaceError ? error.message : 'Internal server error';
  if (status >= 500) console.error(error);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: message }));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new WorkspaceError('Invalid JSON body');
  }
}
