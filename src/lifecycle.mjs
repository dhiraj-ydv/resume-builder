export const PACKAGE_NAME = 'resume-builder';
export const DOWNLOAD_URL = process.env.RESUME_BUILDER_DOWNLOAD_URL || '<DOWNLOAD_URL>';
export const NIX_FLAKE = 'github:exolithelabs/resume-builder#resume-builder';

export function installApp() {
  console.log(`Windows: download the installer from ${DOWNLOAD_URL}`);
  console.log(`Linux: nix profile install ${NIX_FLAKE}`);
  return 0;
}

export function updateApp() {
  console.log(`Windows: download and run the latest Resume Builder installer from ${DOWNLOAD_URL}`);
  console.log("Linux: nix profile upgrade '.*resume-builder'");
  return 0;
}

export function uninstallApp() {
  if (process.platform === 'win32') {
    console.log('Uninstall Resume Builder from Windows Settings → Apps.');
  } else {
    console.log("Run: nix profile remove '.*resume-builder'");
  }
  console.log('Your resume workspaces are not removed with the app.');
  return 0;
}
