import { spawn } from 'node:child_process';

export function openBrowser(url) {
  try {
    let child;
    const options = { detached: true, stdio: 'ignore' };

    if (process.platform === 'win32') {
      child = spawn('cmd', ['/c', 'start', '', url], options);
    } else if (process.platform === 'darwin') {
      child = spawn('open', [url], options);
    } else {
      child = spawn('xdg-open', [url], options);
    }

    child.once('error', (error) => {
      console.warn(`Could not open a browser: ${error.message}`);
    });
    child.unref();
  } catch (error) {
    console.warn(`Could not open a browser: ${error.message}`);
  }
}
