import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class MoveCommand extends EditCommand {
  constructor(
    private readonly id: string,
    private readonly dx: number,
    private readonly dy: number,
  ) {
    super();
  }
  protected override apply(document: SvgDocument): string {
    const shape = document.require(this.id);
    shape.move(this.dx, this.dy);
    const detail = shape.summary();
    return `${shape.tag}#${shape.id} moved by (${this.dx},${this.dy})${detail ? `: ${detail}` : ''}`;
  }
}
