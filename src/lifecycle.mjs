export const PACKAGE_NAME = 'resume-builder';
export const DOWNLOAD_URL = process.env.RESUME_BUILDER_DOWNLOAD_URL || '<DOWNLOAD_URL>';
export const FLATPAK_APP_ID = 'io.github.exolithelabs.ResumeBuilder';
export const FLATPAK_REF_URL = `https://flatpak.exolithelabs.com/apps/${FLATPAK_APP_ID}.flatpakref`;

export function installApp() {
  console.log(`Windows: download the installer from ${DOWNLOAD_URL}`);
  console.log(`Linux: install the Flatpak from ${FLATPAK_REF_URL}`);
  return 0;
}

export function updateApp() {
  console.log(`Windows: download and run the latest Resume Builder installer from ${DOWNLOAD_URL}`);
  console.log(`Linux: run \`flatpak update ${FLATPAK_APP_ID}\` from a terminal.`);
  return 0;
}

export function uninstallApp() {
  if (process.platform === 'win32') {
    console.log('Uninstall Resume Builder from Windows Settings → Apps.');
  } else {
    console.log(`Run \`flatpak uninstall ${FLATPAK_APP_ID}\` from a terminal.`);
  }
  console.log('Your resume workspaces are not removed with the app.');
  return 0;
}
