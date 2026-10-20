import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { ShapeFactory } from '../ShapeFactory.js';
import { EditCommand } from './EditCommand.js';

export class CreateCommand extends EditCommand {
  constructor(
    private readonly factory: ShapeFactory,
    private readonly type: string,
    private readonly id: string,
    private readonly args: readonly string[],
    private readonly containerId?: string,
  ) {
    super();
  }
  protected override apply(document: SvgDocument): string {
    document.ensureAvailable(this.id);
    const parent =
      this.containerId === undefined ? document.root : document.container(this.containerId);
    const shape = this.factory.create(this.type, this.id, this.args);
    document.add(shape, parent);
    return `${shape.tag}#${shape.id} created${this.containerId === undefined ? '' : ` in g#${this.containerId}`}`;
  }
}
