import { spawnSync } from 'node:child_process';
import { WorkspaceError } from './workspace.mjs';

export const PACKAGE_NAME = 'resume-builder';
export const INSTALL_SPEC = 'github:dhiraj-ydv/resume-builder';

export function installApp() {
  console.log(`Installing ${PACKAGE_NAME} globally from ${INSTALL_SPEC}…`);
  const status = npm(['install', '-g', INSTALL_SPEC, '--omit=dev']);
  if (status === 0) {
    console.log(`Installed. Next:
  resume-builder init $HOME/Documents/my-resumes
  resume-builder`);
  }
  return status;
}

export function updateApp() {
  console.log(`Updating ${PACKAGE_NAME} from ${INSTALL_SPEC}…`);
  const status = npm(['install', '-g', INSTALL_SPEC, '--omit=dev']);
  if (status === 0) console.log('Updated.');
  return status;
}

export function uninstallApp() {
  console.log(`Uninstalling ${PACKAGE_NAME}…`);
  const status = npm(['uninstall', '-g', PACKAGE_NAME]);
  if (status === 0) {
    console.log('App removed. Resume data workspaces were not deleted.');
  }
  return status;
}

function npm(args) {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) {
    throw new WorkspaceError(result.error.message);
  }
  return result.status ?? 1;
}
