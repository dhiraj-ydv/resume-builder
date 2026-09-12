import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const PACKAGE_NAME = 'resume-builder';
export const DOWNLOAD_URL = process.env.RESUME_BUILDER_DOWNLOAD_URL || '<DOWNLOAD_URL>';
export const LINUX_INSTALL_URL = 'https://raw.githubusercontent.com/exolithelabs/resume-builder/main/scripts/install-linux.sh';

function linuxInstallerPath() {
  const candidates = [
    fileURLToPath(new URL('../../install-linux.sh', import.meta.url)),
    fileURLToPath(new URL('../scripts/install-linux.sh', import.meta.url)),
  ];
  if (process.env.RESUME_BUILDER_DESKTOP) {
    const executableDir = path.dirname(process.env.RESUME_BUILDER_DESKTOP);
    candidates.push(
      path.join(executableDir, 'install-linux.sh'),
      path.resolve(executableDir, '../../..', 'install-linux.sh'),
    );
  }
  return candidates.find((candidate) => existsSync(candidate));
}

function runLinuxInstaller(args) {
  const installer = linuxInstallerPath();
  if (!installer) {
    console.log(`Run: curl -fsSL ${LINUX_INSTALL_URL} | sh`);
    return 1;
  }
  const result = spawnSync('sh', [installer, ...args], { stdio: 'inherit' });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

export function installApp() {
  if (process.platform === 'linux') return runLinuxInstaller([]);
  console.log(`Download the Windows installer from ${DOWNLOAD_URL}`);
  return 0;
}

export function updateApp() {
  if (process.platform === 'linux') return runLinuxInstaller(['--update']);
  console.log(`Download and run the latest Resume Builder installer from ${DOWNLOAD_URL}`);
  return 0;
}

export function uninstallApp() {
  if (process.platform === 'win32') {
    console.log('Uninstall Resume Builder from Windows Settings → Apps.');
  } else {
    return runLinuxInstaller(['--uninstall']);
  }
  console.log('Your resume workspaces are not removed with the app.');
  return 0;
}
