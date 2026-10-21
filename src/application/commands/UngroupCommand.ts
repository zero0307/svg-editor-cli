import { DomainError } from '../../domain/DomainError.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Group } from '../../domain/shapes/Group.js';
import type { Shape } from '../../domain/shapes/Shape.js';
import { EditCommand } from './EditCommand.js';

export class UngroupCommand extends EditCommand {
  private readonly inheritedDefaults: Readonly<Record<string, string>> = {
    fill: 'black',
    stroke: 'none',
    'stroke-width': '1',
    'font-size': 'medium',
    'font-family': 'serif',
    'font-weight': 'normal',
    'font-style': 'normal',
    'text-anchor': 'start',
    'dominant-baseline': 'auto',
    visibility: 'visible',
    color: 'black',
  };
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
    const inherited = shape.attributes();
    for (const child of children) {
      const own = child.attributes();
      for (const name of Object.keys(this.inheritedDefaults)) {
        const explicitlyInherits = own[name]?.trim().toLowerCase() === 'inherit';
        if ((name in own && !explicitlyInherits) || (!(name in inherited) && !explicitlyInherits))
          continue;
        const value = this.effectiveAttribute(shape, name);
        if (name === 'fill' || name === 'stroke' || name === 'stroke-width')
          child.setAttribute(name, value);
        else child.preserveAttribute(name, value);
      }
      parent.insert(child, position++);
    }
    parent.remove(shape);
    return `g#${this.id} ungrouped (${children.length} children)`;
  }
  private effectiveAttribute(shape: Shape, name: string): string {
    let current: Shape | null = shape;
    while (current) {
      const value = current.attributes()[name];
      if (value !== undefined && value.trim().toLowerCase() !== 'inherit') return value;
      current = current.parent;
    }
    return this.inheritedDefaults[name]!;
  }
}
