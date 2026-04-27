# Resume HTML on Cloudflare Pages (via CircleCI)

This repo is set up to build `dist/resume.pdf` in CircleCI and deploy the site to Cloudflare Pages.

## CI/CD flow

1. Push to `main`.
2. CircleCI runs `.circleci/config.yml`.
3. It installs dependencies, installs Chromium, and runs:

```bash
npm run build:pdf
```

4. It deploys the repository to Cloudflare Pages using Wrangler.

## Required CircleCI environment variables

Add these in your CircleCI project settings:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CF_PAGES_PROJECT` (your Cloudflare Pages project name)

## Output

- PDF generated during CI: `dist/resume.pdf`

## Download button behavior

The button in `resume.html` downloads:

- `./dist/resume.pdf`
