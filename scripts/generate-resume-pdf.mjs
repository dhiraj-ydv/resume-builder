import http from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const rootDir = process.cwd();
const outDir = path.join(rootDir, 'dist');
const outFile = path.join(outDir, 'resume.pdf');
const port = 4173;

await mkdir(outDir, { recursive: true });

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.woff2', 'font/woff2'],
]);

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    let requestPath = decodeURIComponent(requestUrl.pathname);
    if (requestPath === '/') requestPath = '/index.html';

    const resolvedPath = path.resolve(rootDir, `.${requestPath}`);
    if (!resolvedPath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const fileStat = await stat(resolvedPath);
    const filePath = fileStat.isDirectory() ? path.join(resolvedPath, 'index.html') : resolvedPath;
    const contents = await readFile(filePath);
    const contentType = mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(contents);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise((resolve) => server.listen(port, resolve));

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 2200 },
    deviceScaleFactor: 1,
  });

  await page.goto(`http://127.0.0.1:${port}/index.html`, {
    waitUntil: 'networkidle',
  });
  await page.emulateMedia({ media: 'print' });

  await page.pdf({
    path: outFile,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: '0',
      right: '0',
      bottom: '0',
      left: '0',
    },
  });

  console.log(`Wrote ${outFile}`);
} finally {
  await browser.close();
  server.close();
}
