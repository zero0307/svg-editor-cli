import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../domain/DomainError.js';
import type { FileStore } from '../application/ports/FileStore.js';

export class LocalFileStore implements FileStore {
  async read(path: string): Promise<string> {
    try { return await readFile(path, 'utf8'); }
    catch { throw new DomainError(`cannot read file: ${path}`); }
  }
  async write(path: string, content: string): Promise<void> {
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
      await rename(temporary, path);
    } catch {
      await unlink(temporary).catch(() => undefined);
      throw new DomainError(`cannot write file: ${path}`);
    }
  }
}
