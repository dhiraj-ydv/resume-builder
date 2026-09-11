import { copyFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import path from 'node:path';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);

const execFileAsync = promisify(execFile);

export function pdfPaths(root, slug) {
  return {
    resumePdf: path.join(root, 'resumes', slug, 'dist', 'resume.pdf'),
    centralPdf: path.join(root, 'dist', `${slug}.pdf`),
  };
}

export async function writeResumePdf(root, slug, html) {
  const { resumePdf, centralPdf } = pdfPaths(root, slug);
  await mkdir(path.dirname(resumePdf), { recursive: true });
  await mkdir(path.dirname(centralPdf), { recursive: true });

  const browser = await launchChromium();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 2200 },
      deviceScaleFactor: 1,
    });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: resumePdf,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await page.close();
  } finally {
    await browser.close();
  }

  await copyFile(resumePdf, centralPdf);
  return resumePdf;
}

async function launchChromium() {
  try {
    return await chromium.launch({ headless: true });
  } catch {
    console.log('Installing Chromium for PDF export…');
    await execFileAsync(process.execPath, [playwrightCli(), 'install', 'chromium'], {
      stdio: 'inherit',
    });
    return chromium.launch({ headless: true });
  }
}

function playwrightCli() {
  return require.resolve('playwright/cli.js');
}
