import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PACKAGE_NAME = 'resume-builder';
export const DOWNLOAD_URL = process.env.RESUME_BUILDER_DOWNLOAD_URL || '<DOWNLOAD_URL>';

export function installApp() {
  console.log(`Windows: download the installer from ${DOWNLOAD_URL}`);
  console.log('Linux: build the open-source project using the instructions in the repository README.');
  return 0;
}

export function updateApp() {
  console.log(`Windows: download and run the latest Resume Builder installer from ${DOWNLOAD_URL}`);
  console.log('Linux: pull the latest source and rebuild the application.');
  return 0;
}

export function uninstallApp() {
  if (process.platform === 'win32') {
    console.log('Uninstall Resume Builder from Windows Settings → Apps.');
  } else {
    const installer = fileURLToPath(new URL('../../install-linux.sh', import.meta.url));
    if (existsSync(installer)) {
      const result = spawnSync('sh', [installer, '--uninstall'], { stdio: 'inherit' });
      if (result.error) throw result.error;
      return result.status ?? 1;
    }
    console.log('Run `bash scripts/install-linux.sh --uninstall` from the source checkout.');
  }
  console.log('Your resume workspaces are not removed with the app.');
  return 0;
}
