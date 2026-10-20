import { DomainError } from '../../domain/DomainError.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Group } from '../../domain/shapes/Group.js';
import { EditCommand } from './EditCommand.js';

export class GroupCommand extends EditCommand {
  constructor(private readonly id: string, private readonly ids: readonly string[]) { super(); }
  protected override apply(document: SvgDocument): string {
    document.ensureAvailable(this.id);
    if (this.ids.length === 0) throw new DomainError('group requires at least one shape');
    if (new Set(this.ids).size !== this.ids.length) throw new DomainError('duplicate shape in group');
    const targets = new Set(this.ids.map(id => document.require(id)));
    for (const shape of targets) {
      let parent = shape.parent;
      while (parent && parent !== document.root) {
        if (targets.has(parent)) throw new DomainError(`cannot group a container into its own descendant: ${parent.id}`);
        parent = parent.parent;
      }
    }
    // Preserve document order, independent of the order of CLI arguments.
    const ordered = document.all().filter(shape => targets.has(shape));
    let parent = ordered[0]!.parent!;
    while (!ordered.every(shape => parent.contains(shape))) parent = parent.parent!;
    let anchor = ordered[0]!;
    while (anchor.parent !== parent) anchor = anchor.parent!;
    const position = parent.indexOf(anchor);
    const group = new Group(this.id);
    parent.insert(group, position);
    ordered.forEach(shape => group.insert(shape));
    return `g#${this.id} created with ${ordered.length} children`;
  }
}
