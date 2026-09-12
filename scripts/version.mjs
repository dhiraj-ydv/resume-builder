import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = {
  package: path.join(repoRoot, 'package.json'),
  packageLock: path.join(repoRoot, 'package-lock.json'),
  tauri: path.join(repoRoot, 'src-tauri', 'tauri.conf.json'),
  cargo: path.join(repoRoot, 'src-tauri', 'Cargo.toml'),
  cargoLock: path.join(repoRoot, 'src-tauri', 'Cargo.lock'),
};
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function cargoPackageVersion(contents) {
  return contents.match(/\[package\][\s\S]*?\nversion\s*=\s*"([^"]+)"/)?.[1];
}

function cargoLockPackageVersion(contents) {
  return contents.match(/\[\[package\]\]\r?\nname = "resume-builder"\r?\nversion = "([^"]+)"/)?.[1];
}

async function readVersions() {
  const [packageText, lockText, tauriText, cargoText, cargoLockText] = await Promise.all(
    Object.values(files).map((file) => readFile(file, 'utf8')),
  );
  const packageJson = JSON.parse(packageText);
  const packageLock = JSON.parse(lockText);
  const tauri = JSON.parse(tauriText);
  return {
    versions: {
      'package.json': packageJson.version,
      'package-lock.json': packageLock.version,
      'package-lock.json (root package)': packageLock.packages?.['']?.version,
      'src-tauri/tauri.conf.json': tauri.version,
      'src-tauri/Cargo.toml': cargoPackageVersion(cargoText),
      'src-tauri/Cargo.lock': cargoLockPackageVersion(cargoLockText),
    },
    source: { packageJson, packageLock, tauri, cargoText, cargoLockText },
  };
}

function assertInSync(versions, expectedTag) {
  const expected = Object.values(versions)[0];
  const mismatches = Object.entries(versions).filter(([, version]) => version !== expected);
  if (!expected || mismatches.length > 0) {
    throw new Error(`Version mismatch:\n${Object.entries(versions).map(([file, version]) => `  ${file}: ${version ?? 'missing'}`).join('\n')}`);
  }
  if (expectedTag && expectedTag !== `v${expected}`) {
    throw new Error(`Release tag ${expectedTag} does not match version v${expected}.`);
  }
  console.log(`All package versions are ${expected}${expectedTag ? ` and match ${expectedTag}` : ''}.`);
}

const [command, value] = process.argv.slice(2);
const current = await readVersions();

if (!command || command === '--check') {
  assertInSync(current.versions, value);
  process.exit(0);
}

if (command !== '--set' || !semverPattern.test(value || '')) {
  throw new Error('Usage: npm run version:set -- <semver>\n       npm run version:check -- [v<semver>]');
}

const { packageJson, packageLock, tauri, cargoText, cargoLockText } = current.source;
packageJson.version = value;
packageLock.version = value;
packageLock.packages[''].version = value;
tauri.version = value;

const nextCargo = cargoText.replace(
  /(^\[package\]\s*$[\s\S]*?^version\s*=\s*")[^"]+(".*$)/m,
  (_match, prefix, suffix) => `${prefix}${value}${suffix}`,
);
const nextCargoLock = cargoLockText.replace(
  /(\[\[package\]\]\r?\nname = "resume-builder"\r?\nversion = ")[^"]+("\r?$)/m,
  (_match, prefix, suffix) => `${prefix}${value}${suffix}`,
);

await Promise.all([
  writeFile(files.package, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8'),
  writeFile(files.packageLock, `${JSON.stringify(packageLock, null, 2)}\n`, 'utf8'),
  writeFile(files.tauri, `${JSON.stringify(tauri, null, 2)}\n`, 'utf8'),
  writeFile(files.cargo, nextCargo, 'utf8'),
  writeFile(files.cargoLock, nextCargoLock, 'utf8'),
]);

assertInSync((await readVersions()).versions);
