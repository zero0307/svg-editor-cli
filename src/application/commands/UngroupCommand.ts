import { DomainError } from '../../domain/DomainError.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Group } from '../../domain/shapes/Group.js';
import { EditCommand } from './EditCommand.js';

export class UngroupCommand extends EditCommand {
  constructor(private readonly id: string) {
    super();
  }
  protected override apply(document: SvgDocument): string {
    const shape = document.require(this.id);
    if (!(shape instanceof Group)) throw new DomainError(`not a container: ${this.id}`);
    const parent = shape.parent!;
    if (parent === document.root)
      throw new DomainError(`cannot ungroup top-level container: ${this.id}`);
    let position = parent.indexOf(shape);
    const children = shape.children();
    // Materialize inherited presentation before removing the group.
    const inheritedNames = new Set([
      'fill',
      'stroke',
      'stroke-width',
      'font-size',
      'font-family',
      'font-weight',
      'font-style',
      'text-anchor',
      'dominant-baseline',
      'visibility',
      'color',
    ]);
    const inherited = Object.entries(shape.attributes()).filter(([name]) =>
      inheritedNames.has(name),
    );
    for (const child of children) {
      const own = child.attributes();
      for (const [name, value] of inherited) {
        if (name in own) continue;
        if (name === 'fill' || name === 'stroke' || name === 'stroke-width')
          child.setAttribute(name, value);
        else child.preserveAttribute(name, value);
      }
      parent.insert(child, position++);
    }
    parent.remove(shape);
    return `g#${this.id} ungrouped (${children.length} children)`;
  }
}
