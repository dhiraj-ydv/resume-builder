# Resume Builder

Build focused, ATS-friendly resumes in a private local workspace.

Resume Builder combines a desktop editor, browser UI, CLI, PDF export, and an MCP endpoint for the AI agent you choose. Your profile and resumes remain ordinary Markdown files on your computer—the application does not upload them or bundle them into its installation.

[Overview](#overview) · [Features](#features) · [How it works](#how-it-works) · [Install](#install) · [CLI](#command-line) · [MCP](#connect-an-ai-agent-with-mcp) · [Privacy](#local-first-by-design) · [Development](#development) · [Releases](#releases-and-updates) · [License](#license)

> **Launch note:** Replace `{{DOWNLOAD_URL}}` with the production website download URL before publishing this content.

## Overview

Most resume tools lock career information inside a hosted account or proprietary document. Resume Builder keeps the application separate from the data: the app can be upgraded or removed without affecting the user's resume workspace.

Use the desktop window for a focused experience, open the same interface in a regular browser, automate work from the CLI, or connect an external AI agent over MCP.

### Designed for

- Role-specific resume variants instead of one generic document.
- Markdown files that remain readable without the application.
- Print-ready A4 PDF exports with real, selectable text.
- External AI tools without embedding an LLM or API credentials in the app.
- Local workflows that can optionally be placed under the user's own version control.

## Features

### Local Markdown workspace

Profiles, resumes, memory, and custom agent skills live outside the application installation. Users can inspect, edit, back up, or version these files with normal filesystem tools.

### Desktop and browser interface

The Tauri desktop application starts a Node server bound to `127.0.0.1`. The same interface can be opened in the desktop window and a normal browser at the same time.

### Resume variants

Create independent resumes for different roles while sharing profile and contact information. Each resume has its own Markdown source, preview, status, tags, and generated PDF.

### PDF export

Render the selected resume into print-ready A4 HTML and PDF. Chromium is installed by Playwright on the first PDF export if it is not already available, so that first export may require an internet connection.

### Bring your own AI agent

Resume Builder does not run or require a built-in LLM. Connect Grok, Cursor, Codex, Gemini, or another MCP-compatible client and decide which provider receives the information you explicitly expose to it.

### Built-in writing guidance

The repository includes skills for resume research, impact writing, ATS optimization, and critique. Users can create additional skills inside their own workspace.

## How it works

```text
Desktop window or browser
          |
          v
Local server on 127.0.0.1
          |
          +-- Web UI
          +-- CLI
          +-- MCP endpoint
          +-- PDF renderer
          |
          v
User-controlled workspace
```

On first desktop launch, Resume Builder creates `Documents/Resume Builder` unless another workspace is selected.

```text
Resume Builder/
  resume-builder.json
  profile.md
  memory.md
  skills/
  resumes/
    <slug>/
      resume.md
      dist/resume.pdf
  dist/
    <slug>.pdf
```

The application never creates a Git repository in the workspace. Version control remains optional and user-controlled.

## Install

### Windows

[Download Resume Builder for Windows]({{DOWNLOAD_URL}})

1. Download the `*-setup.exe` installer and its `.sha256` checksum.
2. Run the installer for the current Windows user.
3. Open Resume Builder from the Start menu or a newly opened terminal.

```powershell
resume-builder
```

The installer adds Resume Builder to the current user's PATH. Uninstall it from **Windows Settings > Apps**; uninstall also removes the installer-managed PATH entry and never deletes resume workspaces.

Windows packages include the Node sidecar, so users do not need Node.js, npm, Microsoft Store, or another package manager.

Early open-source releases may be unsigned and can display a Windows SmartScreen **Unknown publisher** warning. Verify the published SHA-256 checksum before running an unsigned installer. Code signing will be added when the project has an appropriate signing service.

### Linux

Linux is supported through an open-source build. Prebuilt `.deb`, AppImage, Flatpak, and store packages are not distributed.

Install Node.js 20+, Rust stable, and the Tauri system dependencies for your distribution. On Ubuntu or Debian:

```bash
sudo apt update
sudo apt install build-essential pkg-config curl wget file \
  libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
  librsvg2-dev libssl-dev libxdo-dev patchelf
```

Clone the repository and run the Linux-only per-user installer:

```bash
git clone https://github.com/exolithelabs/resume-builder.git
cd resume-builder
bash scripts/install-linux.sh
```

The installer:

- Builds the application from source.
- Installs the command at `~/.local/bin/resume-builder`.
- Places bundled resources under `~/.local/lib/resume-builder`.
- Adds `~/.local/bin` to `~/.profile` when necessary.
- Creates an application-menu entry and icon.
- Does not require `sudo` after the build dependencies are installed.

Start a new login session after the first installation so the PATH change is loaded.

## Command line

The installed executable provides the same commands on Windows and Linux:

```text
resume-builder [dir]               Open the desktop application
resume-builder --browser [dir]     Open the localhost UI in a browser
resume-builder serve [dir]         Start the localhost server only
resume-builder init [dir]          Create a resume workspace
resume-builder build [dir]         Generate PDFs for every resume
resume-builder update              Show platform update instructions
resume-builder uninstall           Uninstall on Linux; show Windows guidance
resume-builder --help              Show command help
```

Examples:

```bash
resume-builder init ~/Documents/my-resumes
resume-builder --browser ~/Documents/my-resumes
resume-builder build ~/Documents/my-resumes
```

The server uses `http://127.0.0.1:4173/` by default. If that port is occupied, the desktop launcher starts its own verified sidecar on a free localhost port instead of trusting or reusing the existing process.

## Connect an AI agent with MCP

While the server is running, MCP is available at:

```text
http://127.0.0.1:4173/mcp
```

Use the port displayed by the running application if the default port was unavailable.

Generic MCP configuration:

```json
{
  "mcpServers": {
    "resume-builder": {
      "url": "http://127.0.0.1:4173/mcp"
    }
  }
}
```

Available MCP operations include reading and writing resumes, profile data, memory, and user-created skills. Only connect clients you trust to the local endpoint.

## Local-first by design

- The server binds to `127.0.0.1`, not the public network.
- Resume data is stored in a user-selected workspace, never in this repository or the app installation.
- Removing or upgrading the application does not remove workspaces.
- The application contains no LLM credentials and does not choose an AI provider for the user.
- Connecting an external agent may send selected workspace content to that agent's provider under its own privacy policy.

## Development

Requirements:

- Node.js 20 or newer.
- Rust stable.
- Tauri system dependencies for the development operating system.

Install dependencies and start the browser development workflow:

```bash
npm ci
node bin/resume-builder.mjs init ../my-resumes
node bin/resume-builder.mjs --browser --dir ../my-resumes
```

Run the desktop development shell:

```bash
npm run desktop:dev
```

Useful verification commands:

```bash
npm run version:check
cargo test --manifest-path src-tauri/Cargo.toml
```

User data must never be added to this repository. Use a workspace outside the source checkout for development and testing.

## Releases and updates

### Windows releases

The [Windows desktop workflow](.github/workflows/desktop.yml) builds the NSIS installer when a `v*` tag is pushed or the workflow is started manually. The resulting `windows-installer` artifact and SHA-256 checksum are intended to be published on the product website.

Code signing is optional. With neither signing secret configured, the workflow produces an unsigned installer. If an exportable PFX certificate is available, configure both encrypted GitHub Actions secrets:

- `WINDOWS_CERTIFICATE`: base64-encoded PFX code-signing certificate.
- `WINDOWS_CERTIFICATE_PASSWORD`: PFX password.

If only one secret is configured, or the PFX is invalid, the workflow fails instead of silently publishing an unexpectedly unsigned build. When both are valid, the certificate is imported only into the ephemeral GitHub-hosted runner and Tauri signs and timestamps the Windows package. Certificate files and private keys must never be committed.

### Version management

The release version is synchronized across npm, Tauri, Cargo, and their lockfiles:

```bash
npm run version:set -- 0.2.0
npm run version:check
git tag v0.2.0
```

GitHub Actions rejects a version tag that does not match the packaged version.

### Updating

- **Windows:** download and run the newer installer over the existing installation.
- **Linux:** pull the latest source and rerun the installer.

```bash
git pull --ff-only
bash scripts/install-linux.sh
```

The app checks GitHub's latest public release in the background and displays a dismissible notification when a newer semantic version is available. Users can also run a fresh check from **Settings > Check for updates**. This uses GitHub's public API without credentials, is cached, and never blocks offline work. Automatic download and installation through the Tauri updater are not enabled yet; that requires a final HTTPS update-manifest URL and a separate updater-signing key pair.

## Uninstall

### Windows

Use **Windows Settings > Apps > Resume Builder > Uninstall**.

### Linux

```bash
resume-builder uninstall
```

Both uninstall paths preserve every resume workspace.

## Project status

Resume Builder is preparing for its initial open-source release. Review the issue tracker and release notes before relying on pre-release builds for critical data.

## Frequently asked questions

### Does Resume Builder upload my resumes?

No. The application itself reads and writes the selected local workspace. An external AI agent may transmit content according to that provider's behavior and privacy policy.

### Is an AI subscription required?

No. Resume editing, previewing, and PDF export work without an AI provider. MCP integration is optional.

### Can I use both the desktop app and a browser?

Yes. Use **Settings > Open in browser** while the desktop application is running.

### Will updating or uninstalling delete my resumes?

No. Application files and workspace data are deliberately stored separately.

### Where are Linux packages?

Linux is distributed as source for the initial open-source launch. Build and install it with `bash scripts/install-linux.sh`.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Report security vulnerabilities privately according to [SECURITY.md](SECURITY.md), without attaching real resume data.

## License

Resume Builder is open-source software available under the [MIT License](LICENSE).

---

Built for people who want polished resumes without giving up ownership of their career data.
