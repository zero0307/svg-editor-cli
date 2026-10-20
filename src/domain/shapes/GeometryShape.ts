import { DomainError } from '../DomainError.js';
import { Numbers } from '../Numbers.js';
import { Shape } from './Shape.js';

export abstract class GeometryShape extends Shape {
  private readonly values = new Map<string, number>();
  protected constructor(id: string, values: Record<string, number>, private readonly dimensions: readonly string[]) {
    super(id);
    for (const [name, value] of Object.entries(values)) this.assign(name, value);
  }
  protected get(name: string): number { return this.values.get(name)!; }
  private assign(name: string, value: number): void {
    this.values.set(name, this.dimensions.includes(name) ? Numbers.nonnegative(value, name) : Numbers.finite(value, name));
  }
  protected translate(xKeys: readonly string[], yKeys: readonly string[], dx: number, dy: number): void {
    Numbers.finite(dx, 'dx'); Numbers.finite(dy, 'dy');
    const updates = [...xKeys.map(key => [key, this.get(key) + dx] as const), ...yKeys.map(key => [key, this.get(key) + dy] as const)];
    updates.forEach(([name, value]) => Numbers.finite(value, name));
    updates.forEach(([name, value]) => this.assign(name, value));
  }
  override scale(factor: number): void {
    Numbers.positive(factor, 'scale factor');
    const updates = [...this.values].map(([name, value]) => [name, Numbers.finite(value * factor, name)] as const);
    updates.forEach(([name, value]) => this.assign(name, value));
  }
  override geometry(): Readonly<Record<string, string>> {
    return Object.freeze(Object.fromEntries([...this.values].map(([name, value]) => [name, Numbers.format(value)])));
  }
  protected override setSpecificAttribute(name: string, value: string): void {
    if (!this.values.has(name)) throw new DomainError(`unknown attribute: ${name}`);
    this.assign(name, Numbers.parse(value, name));
  }
}
