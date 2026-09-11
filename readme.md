# Resume Builder

A local resume builder you install from the terminal. By default it opens a **Tauri desktop window**; the Node server runs beside it as a sidecar. The same UI is also available in a normal browser at `http://127.0.0.1:4173/`.

The app and your resume data are separate: this repository is the product; after install, your profile and resumes live in their own workspace folder.

## Install / update / uninstall

No git clone. Node.js 20+ is required.

```bash
npx github:dhiraj-ydv/resume-builder install
resume-builder update
resume-builder uninstall
```

That installs the `resume-builder` command globally from this GitHub repo.

Equivalent npm commands:

```bash
npm install -g github:dhiraj-ydv/resume-builder
npm uninstall -g resume-builder
```

## Create a data workspace

Do this **outside** the app repo:

```bash
resume-builder init ~/Documents/my-resumes
```

On Windows:

```bash
resume-builder init $HOME\Documents\my-resumes
```

`init` writes a workspace marker, an empty profile, and a `resumes/` folder. It does not create a Git repository. You can run `git init` in the vault yourself if you want version control.

## Run

Default: desktop window (Tauri webview + Node sidecar):

```bash
resume-builder --dir ~/Documents/my-resumes
```

Or from inside the workspace:

```bash
cd ~/Documents/my-resumes
resume-builder
```

That starts the Node server on `http://127.0.0.1:4173/` and opens it in a desktop window. You can still open the same URL in Chrome/Edge/Firefox while the app is running.

Browser only:

```bash
resume-builder --browser --dir ~/Documents/my-resumes
```

Server only (no window):

```bash
resume-builder serve --dir ~/Documents/my-resumes
```

Edit your profile, then write each resume as Markdown. Use **Edit** and **Preview** modes, and export PDFs. Changes autosave into the workspace.

## Commands

```bash
npx github:dhiraj-ydv/resume-builder install
resume-builder update
resume-builder uninstall
resume-builder [dir]               # run (desktop window by default)
resume-builder run [dir]           # same
resume-builder --browser [dir]     # open in a web browser
resume-builder serve [dir]         # start the localhost server only
resume-builder init [dir]          # create a data workspace
resume-builder build [dir]         # generate PDFs for every resume
resume-builder --help
```

Options:

- `--dir <path>` — workspace directory
- `--port <number>` — Web UI port (default `4173`)
- `--browser` — open a web browser instead of the desktop window
- `--no-open` — do not open a browser (`serve` only)

## Workspace layout

```text
my-resumes/
  resume-builder.json
  profile.json
  resumes/
    <slug>/
      resume.json
      dist/resume.pdf
  dist/
    <slug>.pdf
```

The app never stores your resume content in this code repository.

## Development

```bash
npm install
node bin/resume-builder.mjs init ../my-resumes
node bin/resume-builder.mjs --browser --dir ../my-resumes
```

## Desktop builds (Windows and Linux)

Shipping builds are produced in **GitHub Actions**, not locally.

- Windows: NSIS installer (`windows-latest`, official MSVC)
- Linux: `.deb` and AppImage (`ubuntu-22.04`)
- macOS is not built yet

Run a build from the Actions tab (**Desktop** workflow) or push a version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

That creates a **draft GitHub Release** with the installers attached. Download those assets to install the desktop window. The Node CLI (`resume-builder`) still requires Node.js 20+.

The workflow is `.github/workflows/desktop.yml` and uses the official [`tauri-action`](https://github.com/tauri-apps/tauri-action). GitHub Actions needs **Read and write** permissions for `GITHUB_TOKEN` (Settings → Actions → Workflow permissions) so the workflow can create the draft release.

Node CLI smoke tests for Windows and Linux run on every push/PR via `.github/workflows/ci.yml`.

## AI authoring skills

While the app is running it hosts an MCP server at `http://127.0.0.1:4173/mcp`. Point Grok, Cursor, Codex, Gemini, or any other agent at that URL in its MCP config. The app does not run an LLM itself.

Optional writing guidance lives in `skills/` (built-in) and workspace `skills/` (yours). Agents can load those through MCP.
