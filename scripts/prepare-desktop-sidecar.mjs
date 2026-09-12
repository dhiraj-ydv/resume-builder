import { cp, chmod, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resourcesRoot = path.join(projectRoot, 'src-tauri', 'resources');
const appRoot = path.join(resourcesRoot, 'app');
const runtimeRoot = path.join(resourcesRoot, 'runtime');

await rm(resourcesRoot, { recursive: true, force: true });
await mkdir(appRoot, { recursive: true });
await mkdir(runtimeRoot, { recursive: true });

for (const entry of ['bin', 'src', 'web', 'templates', 'skills']) {
  await cp(path.join(projectRoot, entry), path.join(appRoot, entry), { recursive: true });
}
for (const entry of ['package.json', 'package-lock.json']) {
  await cp(path.join(projectRoot, entry), path.join(appRoot, entry));
}

const npmCommand = process.platform === 'win32'
  ? [process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd', 'ci', '--omit=dev', '--ignore-scripts']]
  : ['npm', ['ci', '--omit=dev', '--ignore-scripts']];
execFileSync(npmCommand[0], npmCommand[1], {
  cwd: appRoot,
  stdio: 'inherit',
});

const nodeName = process.platform === 'win32' ? 'node.exe' : 'node';
const bundledNode = path.join(runtimeRoot, nodeName);
await cp(process.execPath, bundledNode);
if (process.platform !== 'win32') await chmod(bundledNode, 0o755);

console.log(`Desktop sidecar staged at ${resourcesRoot}`);
