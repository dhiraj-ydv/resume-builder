const app = document.querySelector('#app');
const workspacePath = document.querySelector('#workspace-path');
const saveStatus = document.querySelector('#save-status');
const createDialog = document.querySelector('#create-dialog');
const createForm = document.querySelector('#create-form');
const createTitle = document.querySelector('#create-title');
const createCancel = document.querySelector('#create-cancel');

let saveTimer = 0;
let editorState = null;

window.addEventListener('hashchange', render);
createCancel.addEventListener('click', () => createDialog.close());
createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = createTitle.value.trim();
  if (!title) return;
  const resume = await api('/api/resumes', { method: 'POST', body: JSON.stringify({ title }) });
  createDialog.close();
  createForm.reset();
  location.hash = `#/edit/${resume.slug}`;
});

try {
  const workspace = await api('/api/workspace');
  workspacePath.textContent = workspace.root;
  workspacePath.title = workspace.root;
} catch {
  workspacePath.textContent = 'Workspace unavailable';
}

await render();

async function render() {
  const route = parseRoute();
  if (route.name === 'edit') {
    await renderEditor(route.slug);
    return;
  }
  await renderDashboard();
}

function parseRoute() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const edit = hash.match(/^\/edit\/([^/]+)\/?$/);
  if (edit) return { name: 'edit', slug: decodeURIComponent(edit[1]) };
  return { name: 'dashboard' };
}

async function renderDashboard() {
  editorState = null;
  saveStatus.hidden = true;
  const [{ resumes }, profile] = await Promise.all([
    api('/api/resumes'),
    api('/api/profile'),
  ]);

  app.innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow">Local workspace</p>
        <h1>Your resumes</h1>
        <p class="lede">Create role-specific resumes from one profile. Data stays in your workspace repo, not in the app.</p>
      </div>
      <button class="primary" id="new-resume">New resume</button>
    </section>

    <section class="profile-card">
      <div class="row">
        <h2>Profile</h2>
        <span class="muted">Shared across every resume</span>
      </div>
      <form id="profile-form" class="profile-grid">
        ${field('Name', 'name', profile.name)}
        ${field('Headline', 'headline', profile.headline)}
        ${field('Email', 'email', profile.email)}
        ${field('Phone', 'phone', profile.phone)}
        ${field('Location', 'location', profile.location)}
        ${field('Website', 'website', profile.website)}
        ${field('LinkedIn', 'linkedin', profile.linkedin)}
        ${field('GitHub', 'github', profile.github)}
      </form>
    </section>

    <section class="toolbar">
      <span class="muted">${resumes.length} ${resumes.length === 1 ? 'resume' : 'resumes'}</span>
      <label class="search">
        <span class="sr-only">Search</span>
        <input id="resume-search" type="search" placeholder="Search role, skill, or title…" />
      </label>
    </section>
    <section id="resume-grid" class="resume-grid"></section>
  `;

  const grid = app.querySelector('#resume-grid');
  const search = app.querySelector('#resume-search');
  const draw = (items) => {
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state"><h2>No resumes yet</h2><p>Create a resume for a target role. Your profile is reused; the resume content can be tailored.</p></div>`;
      return;
    }
    grid.innerHTML = items.map(cardHtml).join('');
  };
  draw(resumes);
  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    draw(resumes.filter((resume) => [resume.title, resume.summary, ...(resume.tags || [])].join(' ').toLowerCase().includes(query)));
  });

  app.querySelector('#new-resume').addEventListener('click', () => {
    createTitle.value = '';
    createDialog.showModal();
    createTitle.focus();
  });

  grid.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const slug = button.dataset.slug;
    if (button.dataset.action === 'delete') {
      if (!confirm(`Delete ${slug}? This cannot be undone.`)) return;
      await api(`/api/resumes/${slug}`, { method: 'DELETE' });
      await renderDashboard();
    }
    if (button.dataset.action === 'pdf') {
      button.disabled = true;
      try {
        await api(`/api/resumes/${slug}/pdf`, { method: 'POST' });
        window.location = `/api/resumes/${slug}/pdf`;
      } finally {
        button.disabled = false;
      }
    }
  });

  app.querySelector('#profile-form').addEventListener('input', () => {
    const data = Object.fromEntries(new FormData(app.querySelector('#profile-form')));
    queueSave(async () => {
      await api('/api/profile', { method: 'PUT', body: JSON.stringify(data) });
    });
  });
}

function cardHtml(resume) {
  const tags = (resume.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  return `
    <article class="resume-card">
      <div class="card-topline">
        <span class="badge">${escapeHtml(resume.status || 'draft')}</span>
        <span class="muted">${resume.updated ? `Updated ${escapeHtml(resume.updated)}` : ''}</span>
      </div>
      <h2>${escapeHtml(resume.title)}</h2>
      <p class="summary">${escapeHtml(resume.summary || 'No summary yet.')}</p>
      <div class="tags">${tags}</div>
      <div class="actions">
        <a class="primary" href="#/edit/${encodeURIComponent(resume.slug)}">Edit</a>
        <a class="secondary" href="/preview/${encodeURIComponent(resume.slug)}" target="_blank" rel="noreferrer">Preview</a>
        <button class="secondary" data-action="pdf" data-slug="${escapeHtml(resume.slug)}">PDF</button>
        <button class="danger" data-action="delete" data-slug="${escapeHtml(resume.slug)}">Delete</button>
      </div>
    </article>
  `;
}

async function renderEditor(slug) {
  const [profile, resume] = await Promise.all([
    api('/api/profile'),
    api(`/api/resumes/${slug}`),
  ]);
  editorState = { profile, resume };
  paintEditor();
}

function paintEditor() {
  if (!editorState) return;
  const { resume } = editorState;
  const slug = resume.slug;
  saveStatus.hidden = false;

  app.innerHTML = `
    <div class="editor">
      <form id="editor-form" class="editor-form">
        <div class="row">
          <a class="ghost" href="#/">← All resumes</a>
          <div class="actions">
            <button type="button" class="secondary" id="export-pdf">Download PDF</button>
          </div>
        </div>
        <h1>${escapeHtml(resume.title)}</h1>
        <div class="form-grid">
          ${field('Resume title', 'title', resume.title)}
          ${selectField('Status', 'status', resume.status, ['draft', 'active', 'archived'])}
          ${field('Tags', 'tags', (resume.tags || []).join(', '), 'Comma-separated', true)}
          ${areaField('Summary', 'summary', resume.summary, true)}
        </div>
        ${renderSkillBlocks(resume.skills)}
        ${renderExperienceBlocks(resume.experience)}
        ${renderProjectBlocks(resume.projects)}
        ${renderEducationBlocks(resume.education)}
      </form>
      <iframe class="preview-frame" id="preview" title="Resume preview" src="/preview/${encodeURIComponent(slug)}"></iframe>
    </div>
  `;

  const form = app.querySelector('#editor-form');
  form.addEventListener('input', () => {
    readEditorForm(form);
    queueSave(async () => {
      await saveEditor();
      refreshPreview();
    });
  });
  form.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-list-action]');
    if (!button) return;
    event.preventDefault();
    readEditorForm(form);
    mutateList(button.dataset.list, button.dataset.listAction, Number(button.dataset.index));
    await saveEditor();
    paintEditor();
  });
  app.querySelector('#export-pdf').addEventListener('click', async () => {
    await saveEditor();
    await api(`/api/resumes/${slug}/pdf`, { method: 'POST' });
    window.location = `/api/resumes/${slug}/pdf`;
  });
}

function renderSkillBlocks(skills) {
  const items = skills || [];
  return `<section class="block">
    <div class="row"><h3>Skills</h3><button type="button" class="secondary" data-list="skills" data-list-action="add">Add group</button></div>
    ${items.map((group, index) => `
      <div class="item-card">
        ${field('Group name', `skills.${index}.name`, group.name)}
        ${areaField('Items (one per line)', `skills.${index}.items`, (group.items || []).join('\n'))}
        <div class="item-toolbar">
          <button type="button" class="ghost" data-list="skills" data-list-action="up" data-index="${index}">Up</button>
          <button type="button" class="ghost" data-list="skills" data-list-action="down" data-index="${index}">Down</button>
          <button type="button" class="danger" data-list="skills" data-list-action="remove" data-index="${index}">Remove</button>
        </div>
      </div>
    `).join('')}
  </section>`;
}

function renderExperienceBlocks(experience) {
  const items = experience || [];
  return `<section class="block">
    <div class="row"><h3>Experience</h3><button type="button" class="secondary" data-list="experience" data-list-action="add">Add role</button></div>
    ${items.map((item, index) => `
      <div class="item-card">
        <div class="form-grid">
          ${field('Role', `experience.${index}.role`, item.role)}
          ${field('Company', `experience.${index}.company`, item.company)}
          ${field('Start', `experience.${index}.start`, item.start)}
          ${field('End', `experience.${index}.end`, item.end)}
          ${field('Location', `experience.${index}.location`, item.location, '', true)}
          ${areaField('Bullets (one per line)', `experience.${index}.bullets`, (item.bullets || []).join('\n'), true)}
        </div>
        <div class="item-toolbar">
          <button type="button" class="ghost" data-list="experience" data-list-action="up" data-index="${index}">Up</button>
          <button type="button" class="ghost" data-list="experience" data-list-action="down" data-index="${index}">Down</button>
          <button type="button" class="danger" data-list="experience" data-list-action="remove" data-index="${index}">Remove</button>
        </div>
      </div>
    `).join('')}
  </section>`;
}

function renderProjectBlocks(projects) {
  const items = projects || [];
  return `<section class="block">
    <div class="row"><h3>Projects</h3><button type="button" class="secondary" data-list="projects" data-list-action="add">Add project</button></div>
    ${items.map((item, index) => `
      <div class="item-card">
        <div class="form-grid">
          ${field('Name', `projects.${index}.name`, item.name)}
          ${field('URL', `projects.${index}.url`, item.url)}
          ${areaField('Summary', `projects.${index}.summary`, item.summary, true)}
          ${areaField('Bullets (one per line)', `projects.${index}.bullets`, (item.bullets || []).join('\n'), true)}
        </div>
        <div class="item-toolbar">
          <button type="button" class="ghost" data-list="projects" data-list-action="up" data-index="${index}">Up</button>
          <button type="button" class="ghost" data-list="projects" data-list-action="down" data-index="${index}">Down</button>
          <button type="button" class="danger" data-list="projects" data-list-action="remove" data-index="${index}">Remove</button>
        </div>
      </div>
    `).join('')}
  </section>`;
}

function renderEducationBlocks(education) {
  const items = education || [];
  return `<section class="block">
    <div class="row"><h3>Education</h3><button type="button" class="secondary" data-list="education" data-list-action="add">Add education</button></div>
    ${items.map((item, index) => `
      <div class="item-card">
        <div class="form-grid">
          ${field('School', `education.${index}.school`, item.school)}
          ${field('Degree', `education.${index}.degree`, item.degree)}
          ${field('Year', `education.${index}.year`, item.year)}
          ${areaField('Details', `education.${index}.details`, item.details, true)}
        </div>
        <div class="item-toolbar">
          <button type="button" class="ghost" data-list="education" data-list-action="up" data-index="${index}">Up</button>
          <button type="button" class="ghost" data-list="education" data-list-action="down" data-index="${index}">Down</button>
          <button type="button" class="danger" data-list="education" data-list-action="remove" data-index="${index}">Remove</button>
        </div>
      </div>
    `).join('')}
  </section>`;
}

function mutateList(listName, action, index) {
  if (!editorState) return;
  const list = editorState.resume[listName] || [];
  const blanks = {
    skills: { name: 'Skills', items: [] },
    experience: { company: '', role: '', location: '', start: '', end: '', bullets: [] },
    projects: { name: '', url: '', summary: '', bullets: [] },
    education: { school: '', degree: '', year: '', details: '' },
  };
  if (action === 'add') list.push(structuredClone(blanks[listName]));
  if (action === 'remove') list.splice(index, 1);
  if (action === 'up' && index > 0) [list[index - 1], list[index]] = [list[index], list[index - 1]];
  if (action === 'down' && index < list.length - 1) [list[index + 1], list[index]] = [list[index], list[index + 1]];
  editorState.resume[listName] = list;
}

function readEditorForm(form) {
  if (!editorState) return;
  const resume = editorState.resume;
  const data = Object.fromEntries(new FormData(form));
  resume.title = data.title || resume.title;
  resume.status = data.status || resume.status;
  resume.tags = splitList(data.tags, ',');
  resume.summary = data.summary || '';
  resume.skills = (resume.skills || []).map((group, index) => ({
    name: data[`skills.${index}.name`] || group.name,
    items: splitList(data[`skills.${index}.items`], '\n'),
  }));
  resume.experience = (resume.experience || []).map((item, index) => ({
    ...item,
    role: data[`experience.${index}.role`] || '',
    company: data[`experience.${index}.company`] || '',
    start: data[`experience.${index}.start`] || '',
    end: data[`experience.${index}.end`] || '',
    location: data[`experience.${index}.location`] || '',
    bullets: splitList(data[`experience.${index}.bullets`], '\n'),
  }));
  resume.projects = (resume.projects || []).map((item, index) => ({
    ...item,
    name: data[`projects.${index}.name`] || '',
    url: data[`projects.${index}.url`] || '',
    summary: data[`projects.${index}.summary`] || '',
    bullets: splitList(data[`projects.${index}.bullets`], '\n'),
  }));
  resume.education = (resume.education || []).map((item, index) => ({
    ...item,
    school: data[`education.${index}.school`] || '',
    degree: data[`education.${index}.degree`] || '',
    year: data[`education.${index}.year`] || '',
    details: data[`education.${index}.details`] || '',
  }));
}

async function saveEditor() {
  if (!editorState) return;
  saveStatus.textContent = 'Saving…';
  await api(`/api/resumes/${editorState.resume.slug}`, {
    method: 'PUT',
    body: JSON.stringify(editorState.resume),
  });
  saveStatus.textContent = 'Saved';
}

function refreshPreview() {
  const frame = document.querySelector('#preview');
  if (!frame || !editorState) return;
  frame.src = `/preview/${encodeURIComponent(editorState.resume.slug)}?t=${Date.now()}`;
}

function queueSave(fn) {
  saveStatus.hidden = false;
  saveStatus.textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fn().catch((error) => {
    saveStatus.textContent = error.message;
  }), 400);
}

function field(label, name, value = '', placeholder = '', span2 = false) {
  return `<label class="field${span2 ? ' span-2' : ''}"><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" /></label>`;
}

function areaField(label, name, value = '', span2 = false) {
  return `<label class="field${span2 ? ' span-2' : ''}"><span>${escapeHtml(label)}</span><textarea name="${escapeHtml(name)}">${escapeHtml(value)}</textarea></label>`;
}

function selectField(label, name, value, options) {
  const opts = options.map((option) => `<option value="${option}" ${option === value ? 'selected' : ''}>${option}</option>`).join('');
  return `<label class="field"><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}">${opts}</select></label>`;
}

function splitList(value, delimiter) {
  return String(value || '').split(delimiter).map((item) => item.trim()).filter(Boolean);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
