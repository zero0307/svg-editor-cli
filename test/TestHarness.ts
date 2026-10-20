import assert from 'node:assert/strict';
import { ShapeFactory } from '../src/application/ShapeFactory.js';
import { SvgEditor } from '../src/application/SvgEditor.js';
import type { FileStore } from '../src/application/ports/FileStore.js';
import { CommandRouter } from '../src/cli/CommandRouter.js';
import { XmlSvgCodec } from '../src/infrastructure/XmlSvgCodec.js';
import { DomainError } from '../src/domain/DomainError.js';

export class TestHarness implements FileStore {
  readonly files = new Map<string, string>();
  readonly factory = new ShapeFactory();
  readonly codec = new XmlSvgCodec(this.factory);
  readonly editor = new SvgEditor(this, this.codec);
  readonly router = new CommandRouter(this.editor, this.factory);
  async read(path: string): Promise<string> {
    if (!this.files.has(path)) throw new DomainError(`cannot read file: ${path}`);
    return this.files.get(path)!;
  }
  async write(path: string, content: string): Promise<void> {
    if (path === 'readonly.svg') throw new DomainError(`cannot write file: ${path}`);
    this.files.set(path, content);
  }
  async run(...lines: string[]): Promise<void> {
    for (const line of lines) {
      const output = await this.router.execute(line);
      assert.equal(
        output.some((message) => message.startsWith('error:')),
        false,
        `${line}: ${output.join('\n')}`,
      );
    }
  }
  snapshot(): string {
    return this.codec.encode(this.editor.document());
  }
  ids(parentId?: string): readonly string[] {
    const document = this.editor.document();
    return (parentId ? document.container(parentId) : document.root)
      .children()
      .map((shape) => shape.id);
  }
}
