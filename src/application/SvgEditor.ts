import { DomainError } from '../domain/DomainError.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { CommandHistory } from './CommandHistory.js';
import type { EditCommand } from './commands/EditCommand.js';
import type { FileStore } from './ports/FileStore.js';
import type { SvgCodec } from './ports/SvgCodec.js';

export class SvgEditor {
  private current?: SvgDocument;
  private path?: string;
  private readonly history = new CommandHistory();
  constructor(
    private readonly files: FileStore,
    private readonly codec: SvgCodec,
  ) {}
  document(): SvgDocument {
    if (!this.current) throw new DomainError("no document. use 'init' or 'read' first");
    return this.current;
  }
  init(width = 800, height = 600): string {
    const candidate = new SvgDocument(width, height);
    this.current = candidate;
    this.path = undefined;
    this.history.barrier();
    return `canvas ${width}x${height} created`;
  }
  async read(path: string): Promise<readonly string[]> {
    const source = await this.files.read(path);
    const decoded = this.codec.decode(source);
    this.current = decoded.document;
    this.path = path;
    this.history.barrier();
    return [...decoded.warnings, `read ${path} (${decoded.document.all().length} elements)`];
  }
  async save(path?: string): Promise<string> {
    const document = this.document();
    const target = path ?? this.path;
    if (!target) throw new DomainError('no file path. use save <file.svg>');
    await this.files.write(target, this.codec.encode(document));
    // An explicit export must not change the default established by read.
    // A newly initialized document may remember its first successful save.
    this.path ??= target;
    this.history.barrier();
    return `saved to ${target} (${document.all().length} elements)`;
  }
  canvas(width?: number, height?: number): string {
    const document = this.document();
    if (width !== undefined && height !== undefined) {
      const candidate = document.clone();
      candidate.resize(width, height);
      this.current = candidate;
      this.history.barrier();
    }
    return `canvas ${this.document().width}x${this.document().height}`;
  }
  edit(command: EditCommand): string {
    const result = this.history.execute(command, this.document());
    this.current = result.document;
    return result.message;
  }
  undo(): string {
    this.document();
    const result = this.history.undo();
    this.current = result.document;
    return result.message;
  }
  redo(): string {
    this.document();
    const result = this.history.redo();
    this.current = result.document;
    return result.message;
  }
}
