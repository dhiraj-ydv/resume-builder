# Resume HTML to PDF

This project generates a PDF resume from `resume.html` and saves it in `dist`.

## Prerequisites

- Node.js 20+ (recommended)
- npm

## Build PDF

1. Install dependencies:

```bash
npm install
```

2. Install Playwright Chromium (first time or after clean setup):

```bash
npx playwright install chromium
```

3. Generate the PDF:

```bash
npm run build:pdf
```

## Output

- Generated file: `dist/resume.pdf`

## Download button behavior

The download button in `resume.html` now points to:

- `./dist/resume.pdf`

Make sure `dist/resume.pdf` exists before using the download button.
