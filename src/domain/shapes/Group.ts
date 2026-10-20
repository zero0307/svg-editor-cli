import { DomainError } from '../DomainError.js';
import { Numbers } from '../Numbers.js';
import { Shape } from './Shape.js';

export class Group extends Shape {
  readonly tag = 'g';
  private readonly members: Shape[] = [];
  override children(): readonly Shape[] {
    return [...this.members];
  }
  indexOf(shape: Shape): number {
    return this.members.indexOf(shape);
  }
  contains(shape: Shape): boolean {
    return this.members.some(
      (child) => child === shape || (child instanceof Group && child.contains(shape)),
    );
  }
  insert(shape: Shape, index = this.members.length): void {
    if (shape === this || (shape instanceof Group && shape.contains(this)))
      throw new DomainError(`cannot move a container into its own descendant: ${shape.id}`);
    if (!Number.isInteger(index) || index < 0 || index > this.members.length)
      throw new DomainError('invalid child position');
    shape.parent?.remove(shape);
    this.members.splice(Math.min(index, this.members.length), 0, shape);
    shape.attach(this);
  }
  remove(shape: Shape): void {
    const index = this.indexOf(shape);
    if (index < 0) throw new DomainError(`no such child: ${shape.id}`);
    this.members.splice(index, 1);
    shape.attach(null);
  }
  override move(dx: number, dy: number): void {
    Numbers.finite(dx, 'dx');
    Numbers.finite(dy, 'dy');
    this.members.forEach((child) => child.move(dx, dy));
  }
  override scale(factor: number): void {
    Numbers.positive(factor, 'scale factor');
    this.members.forEach((child) => child.scale(factor));
  }
  override clone(): Group {
    const copy = new Group(this.id);
    this.copyPresentationTo(copy);
    this.members.forEach((child) => copy.insert(child.clone()));
    return copy;
  }
  override geometry(): Readonly<Record<string, string>> {
    return Object.freeze({});
  }
  override summary(): string {
    return this.styleSummary().trim();
  }
}
