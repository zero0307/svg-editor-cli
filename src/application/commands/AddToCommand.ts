import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class AddToCommand extends EditCommand {
  constructor(private readonly groupId: string, private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): string {
    const parent = document.container(this.groupId); const shape = document.require(this.id);
    parent.insert(shape); return `${shape.tag}#${shape.id} added to g#${parent.id}`;
  }
}
