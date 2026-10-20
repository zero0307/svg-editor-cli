import { DomainError } from '../domain/DomainError.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import type { EditCommand } from './commands/EditCommand.js';

export class CommandHistory {
  private readonly undoStack: EditCommand[] = [];
  private readonly redoStack: EditCommand[] = [];
  private blocked = false;
  constructor(private readonly limit = 100) {}
  execute(command: EditCommand, document: SvgDocument): { document: SvgDocument; message: string } {
    const result = command.execute(document);
    this.undoStack.push(command); if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0; this.blocked = false; return result;
  }
  barrier(): void { this.undoStack.length = 0; this.redoStack.length = 0; this.blocked = true; }
  undo(): { document: SvgDocument; message: string } {
    this.check(); const command = this.undoStack.at(-1);
    if (!command) throw new DomainError('nothing to undo');
    const result = command.undo(); this.undoStack.pop(); this.redoStack.push(command); return result;
  }
  redo(): { document: SvgDocument; message: string } {
    this.check(); const command = this.redoStack.at(-1);
    if (!command) throw new DomainError('nothing to redo');
    const result = command.redo(); this.redoStack.pop(); this.undoStack.push(command); return result;
  }
  private check(): void { if (this.blocked) throw new DomainError('undo not allowed after io command'); }
}
