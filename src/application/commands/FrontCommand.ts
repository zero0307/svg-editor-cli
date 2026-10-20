import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class FrontCommand extends EditCommand {
  constructor(private readonly id: string) {
    super();
  }
  protected override apply(document: SvgDocument): string {
    const shape = document.require(this.id);
    shape.parent!.insert(shape);
    return `${shape.tag}#${shape.id} moved to front`;
  }
}
