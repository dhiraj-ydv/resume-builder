import { open, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const pendingWrites = new Map();

export function atomicWriteFile(filePath, data, encoding = 'utf8') {
  const resolved = path.resolve(filePath);
  const previous = pendingWrites.get(resolved) || Promise.resolve();
  const next = previous.catch(() => {}).then(() => writeAtomically(resolved, data, encoding));
  pendingWrites.set(resolved, next);
  return next.finally(() => {
    if (pendingWrites.get(resolved) === next) pendingWrites.delete(resolved);
  });
}

async function writeAtomically(filePath, data, encoding) {
  const temporary = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(data, encoding);
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporary, filePath);
  } catch (error) {
    await handle?.close().catch(() => {});
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}
