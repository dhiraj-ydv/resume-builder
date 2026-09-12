import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const thumbprint = process.env.WINDOWS_CERTIFICATE_THUMBPRINT?.replaceAll(/\s/g, '').toUpperCase();

if (!thumbprint || !/^[A-F0-9]{40}$/.test(thumbprint)) {
  throw new Error('WINDOWS_CERTIFICATE_THUMBPRINT must be the 40-character SHA-1 thumbprint of the imported code-signing certificate.');
}

const outputPath = path.join(repoRoot, 'src-tauri', 'tauri.windows-signing.conf.json');
const config = {
  bundle: {
    windows: {
      certificateThumbprint: thumbprint,
      digestAlgorithm: 'sha256',
      timestampUrl: process.env.WINDOWS_TIMESTAMP_URL || 'http://timestamp.digicert.com',
    },
  },
};

await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(`Wrote Windows signing configuration for certificate ${thumbprint}.`);
