# AGENTS.md — Resume Builder

This repository is the **Resume Builder product**: a Windows direct-download desktop app and a Linux Flatpak app with CLI-compatible entrypoints. It is not a personal resume catalog. User profile and resume data live in a separate workspace.

## Product model

- `bin/resume-builder.mjs` is the CLI entrypoint.
- `src/` is the Node CLI, workspace I/O, HTTP API, PDF export, and desktop launcher.
- `web/` is the localhost Web UI (browser and Tauri webview).
- `src-tauri/` is the Tauri desktop shell. Shipping packages bundle Node and the app sources as a self-contained sidecar and load `http://127.0.0.1:4173/`.
- The signed Windows installer is produced in GitHub Actions (`.github/workflows/desktop.yml`), not locally. Linux is distributed only as a signed Flatpak through the Exolithe Labs Flatpak repository.
- Windows packages are downloaded from the product website. Linux packages come only from the Exolithe Labs Flatpak repository; the old npm-global and direct source-install flows are not distribution channels.
- `templates/` renders structured JSON to print-ready HTML.
- User data is **never** stored in this repo. It belongs in the workspace:
  - `profile.json`
  - `resumes/<slug>/resume.json`
  - generated PDFs under `resumes/<slug>/dist/` and `dist/`

Do not add personal names, employers, emails, or resume content here.

## Commands

```bash
# Install on Windows from the product website, or on Linux from the Exolithe Labs Flatpak repository.
resume-builder init [dir]
resume-builder [dir]
resume-builder --browser [dir]
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

- End-user installs do not require Node.js or npm
- Windows is distributed as an NSIS installer
- The Windows installer adds its install directory to the current user's PATH and removes that entry on uninstall
- Public Windows installers are Authenticode-signed in GitHub Actions
- Linux is distributed only as the signed `io.github.exolithelabs.ResumeBuilder` Flatpak through the Exolithe Labs Flatpak repository
- `init` creates a workspace outside this repo
- First desktop launch creates a default workspace under Documents if none exists
- Default app launch opens the Tauri desktop window
- `--browser` still serves the same UI on localhost
- While running, MCP is at `http://127.0.0.1:4173/mcp` for external agents
- Website download packages come from the Desktop downloads GitHub Actions workflow
- Tagged Windows builds publish a GitHub Release, and the app checks that public release feed for newer-version notifications
- Release tags and npm/Tauri/Cargo versions must match; use `npm run version:set -- <semver>`
- Creating, editing, previewing, and exporting a resume works without touching app source
- PDFs print cleanly to A4
- No user data is committed to this repository
