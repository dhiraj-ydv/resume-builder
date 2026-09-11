# AGENTS.md — Resume Builder

This repository is the **Resume Builder product**: a CLI-installed local web app. It is not a personal resume catalog. User profile and resume data live in a separate workspace created by `resume-builder init`.

## Product model

- `bin/resume-builder.mjs` is the CLI entrypoint.
- `src/` is the Node CLI, workspace I/O, HTTP API, PDF export, and desktop launcher.
- `web/` is the localhost Web UI (browser and Tauri webview).
- `src-tauri/` is the Tauri desktop shell. It spawns the Node server as a sidecar and loads `http://127.0.0.1:4173/`.
- Windows and Linux desktop **shipping builds** are produced in GitHub Actions (`.github/workflows/desktop.yml`), not locally. Do not treat `npm run desktop:build` as the release path.
- `templates/` renders structured JSON to print-ready HTML.
- User data is **never** stored in this repo. It belongs in the workspace:
  - `profile.json`
  - `resumes/<slug>/resume.json`
  - generated PDFs under `resumes/<slug>/dist/` and `dist/`

Do not add personal names, employers, emails, or resume content here.

## Commands

```bash
npx github:dhiraj-ydv/resume-builder install
resume-builder update
resume-builder uninstall
resume-builder init [dir]
resume-builder [dir]            # run (Tauri desktop + Node sidecar)
resume-builder --browser [dir]  # same server, web browser
resume-builder serve [dir]
resume-builder build [dir]
```

The server binds to `127.0.0.1` only and reads/writes the workspace directory. The desktop window and the browser can use the same server at the same time.

## Creating or changing resume content

When helping a user write resume text (in their workspace, not this repo):

1. `skills/resume-research/SKILL.md`
2. `skills/impact-writer/SKILL.md`
3. `skills/ats-optimizer/SKILL.md`
4. `skills/resume-critic/SKILL.md`

Do not invent employers, dates, metrics, technologies, credentials, or outcomes. If a claim is not supported by the user's workspace, public materials they point to, or explicit user input, mark it as needing verification.

## Resume principles

- Tailor each resume to a target role. Do not only swap the title.
- Prefer specific evidence over generic adjectives.
- Use numbers only when supported.
- Surface AI/technical skills only when the user can defend them in an interview.
- Keep output ATS-friendly: semantic HTML, standard section names, real text.

## Quality bar for the app

- The CLI can be installed with `npm install -g .`
- `init` creates a workspace outside this repo
- Default `resume-builder` opens the Tauri desktop window
- `--browser` still serves the same UI on localhost
- Desktop installers for Windows and Linux come from the Desktop GitHub Actions workflow
- Creating, editing, previewing, and exporting a resume works without touching app source
- PDFs print cleanly to A4
- No user data is committed to this repository
