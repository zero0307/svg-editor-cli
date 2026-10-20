import type { SvgDocument } from '../../domain/SvgDocument.js';

/** A command is applied only to a detached working document. */
export abstract class EditCommand {
  private before?: SvgDocument;
  private after?: SvgDocument;
  private result = '';
  execute(document: SvgDocument): { document: SvgDocument; message: string } {
    const candidate = document.clone();
    const message = this.apply(candidate);
    this.before = document;
    this.after = candidate;
    this.result = message;
    return { document: candidate, message };
  }
  undo(): { document: SvgDocument; message: string } {
    if (!this.before) throw new Error('command has not executed');
    return { document: this.before, message: `undone: ${this.result}` };
  }
  redo(): { document: SvgDocument; message: string } {
    if (!this.after) throw new Error('command has not executed');
    return { document: this.after, message: `redone: ${this.result}` };
  }
  protected abstract apply(document: SvgDocument): string;
}
