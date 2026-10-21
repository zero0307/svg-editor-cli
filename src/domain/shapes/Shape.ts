import { DomainError } from '../DomainError.js';
import { Numbers } from '../Numbers.js';
import { SvgString } from '../SvgString.js';
import type { Group } from './Group.js';

export abstract class Shape {
  private owner: Group | null = null;
  private readonly styles = new Map<string, string>();
  private readonly imported = new Map<string, string>();
  constructor(readonly id: string) {
    SvgString.validate(id, 'id');
    if (!id || /[\s\u0000-\u001f]/u.test(id)) throw new DomainError(`invalid id: ${id}`);
  }
  abstract readonly tag: string;
  get parent(): Group | null {
    return this.owner;
  }
  /** Internal tree link; Group owns structural changes. */
  attach(parent: Group | null): void {
    this.owner = parent;
  }
  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract clone(): Shape;
  abstract geometry(): Readonly<Record<string, string>>;
  abstract summary(): string;
  textContent(): string | null {
    return null;
  }
  children(): readonly Shape[] {
    return [];
  }
  attributes(): Readonly<Record<string, string>> {
    return Object.freeze({
      ...Object.fromEntries(this.imported),
      ...this.geometry(),
      ...Object.fromEntries(this.styles),
    });
  }
  setAttribute(name: string, value: string): void {
    SvgString.validate(value, `attribute ${name}`);
    if (name === 'fill' || name === 'stroke') {
      this.styles.set(name, value);
      return;
    }
    if (name === 'stroke-width') {
      this.styles.set(name, Numbers.format(Numbers.nonnegative(Numbers.parse(value, name), name)));
      return;
    }
    this.setSpecificAttribute(name, value);
  }
  protected setSpecificAttribute(name: string, _value: string): void {
    throw new DomainError(`unknown attribute: ${name}`);
  }
  preserveAttribute(name: string, value: string): void {
    SvgString.validate(value, `attribute ${name}`);
    this.imported.set(name, value);
  }
  protected copyPresentationTo(target: Shape): void {
    for (const [name, value] of this.styles) target.styles.set(name, value);
    for (const [name, value] of this.imported) target.imported.set(name, value);
  }
  protected styleSummary(): string {
    return [...this.styles].map(([name, value]) => ` ${name}=${value}`).join('');
  }
}
