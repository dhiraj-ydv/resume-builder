# Contributing to Resume Builder

Thanks for helping improve Resume Builder.

## Before opening a change

- Open an issue for substantial features or changes to workspace formats.
- Keep application source and user workspaces separate.
- Never commit real resumes, profile data, credentials, signing keys, or generated workspaces.
- Preserve the local-first design and the `127.0.0.1` network boundary.

## Development

Install Node.js 20+, Rust stable, and the Tauri prerequisites for your operating system.

```bash
npm ci
npm test
npm run version:check
cargo test --manifest-path src-tauri/Cargo.toml
```

Create test workspaces outside the source checkout:

```bash
node bin/resume-builder.mjs init ../resume-builder-test-workspace
node bin/resume-builder.mjs --browser --dir ../resume-builder-test-workspace
```

## Pull requests

- Keep each pull request focused.
- Add tests for behavior changes.
- Describe any data-format, installation, security, or release impact.
- Do not change version numbers in ordinary feature pull requests.
- Confirm that no workspace or personal resume data is included.

By contributing, you agree that your contribution is licensed under the MIT License.
