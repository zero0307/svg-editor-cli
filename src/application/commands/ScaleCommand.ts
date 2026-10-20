import { DomainError } from '../../domain/DomainError.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class ScaleCommand extends EditCommand {
  constructor(private readonly id: string, private readonly factor: number) { super(); }
  protected override apply(document: SvgDocument): string {
    if (this.factor <= 0) throw new DomainError('scale factor must be positive');
    const shape = document.require(this.id); shape.scale(this.factor); return `${shape.tag}#${shape.id} scaled by ${this.factor}`;
  }
}
